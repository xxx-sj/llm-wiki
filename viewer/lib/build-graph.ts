import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import fg from 'fast-glob';
import type { NodeFrontmatter, Scope, EdgeType, Origin, Surface, GraphData, GraphNode, GraphEdge } from './schema.js';

export interface ParsedNode {
  id: string;
  title: string;
  node_type: NodeFrontmatter['node_type'];
  memory_type: NodeFrontmatter['memory_type'];
  origin: Origin;
  meaning_version: number;
  surfaces: Surface[];
  scope: Scope;
  created: string;
  last_reviewed: string;
  confidence?: NodeFrontmatter['confidence'];
  sources?: string[];
  links: Array<{ to: string; type: EdgeType; note?: string; to_meaning_version?: number }>;
  tags?: string[];
  bodyHtml: string;
  /** SHA-256 of (title + plain text body). 변경 감지 + 캐시 키. */
  fingerprint: string;
}

function htmlToText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function computeFingerprint(title: string, bodyHtml: string): string {
  const text = `${title}\n\n${htmlToText(bodyHtml)}`;
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function parseNode(absFilePath: string, wikiRoot: string): Promise<ParsedNode> {
  const raw = await readFile(absFilePath, 'utf8');
  const { data, content } = matter(raw);
  const fm = data as NodeFrontmatter;

  const relative = path.relative(wikiRoot, absFilePath);
  const segments = relative.split(path.sep);
  // 예: ['personal', 'semantic', 'sample.md'] → scope = 'personal'
  const scope = segments[0] as Scope;

  const bodyHtml = String(await remark().use(remarkHtml).process(content));
  const fingerprint = computeFingerprint(fm.title, bodyHtml);

  return {
    id: fm.id,
    title: fm.title,
    node_type: fm.node_type,
    memory_type: fm.memory_type,
    origin: fm.origin ?? 'self',
    meaning_version: fm.meaning_version ?? 1,
    surfaces: fm.surfaces ?? ['rag-eligible'],
    scope,
    created: fm.created,
    last_reviewed: fm.last_reviewed,
    confidence: fm.confidence,
    sources: fm.sources,
    links: fm.links ?? [],
    tags: fm.tags,
    bodyHtml,
    fingerprint
  };
}

export async function loadAllNodes(wikiRoot: string): Promise<ParsedNode[]> {
  const includeWork = process.env.WIKI_INCLUDE_WORK === 'true';
  const patterns = includeWork
    ? ['personal/**/*.md', 'work/**/*.md']
    : ['personal/**/*.md'];

  const files = await fg(patterns, {
    cwd: wikiRoot,
    absolute: true,
    ignore: ['**/index.md', '**/log.md', '**/.gitkeep']
  });

  return Promise.all(files.map(f => parseNode(f, wikiRoot)));
}

/**
 * wiki/edges.jsonl을 읽어 추가 엣지로 반환 (선택).
 * 한 줄 = 한 엣지 JSON. 형식:
 *   {"source":"id1","target":"id2","type":"전제","note":"...","to_meaning_version":1,"created":"YYYY-MM-DD"}
 * frontmatter links와 양립 — 둘 다 빌드 시 합쳐짐.
 */
async function loadEdgesJsonl(wikiRoot: string): Promise<GraphEdge[]> {
  const edgesPath = path.join(wikiRoot, 'edges.jsonl');
  try {
    const raw = await readFile(edgesPath, 'utf8');
    const lines = raw.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    return lines.map(line => {
      const obj = JSON.parse(line);
      const e: GraphEdge = { source: obj.source, target: obj.target, type: obj.type };
      if (obj.note) e.note = obj.note;
      if (obj.to_meaning_version !== undefined) e.to_meaning_version = obj.to_meaning_version;
      return e;
    });
  } catch {
    return []; // edges.jsonl 없으면 빈 배열
  }
}

export async function buildGraph(wikiRoot: string): Promise<GraphData> {
  const parsed = await loadAllNodes(wikiRoot);

  const edges: GraphEdge[] = [];
  // (1) frontmatter links
  for (const p of parsed) {
    for (const link of p.links) {
      const edge: GraphEdge = { source: p.id, target: link.to, type: link.type };
      if (link.note) edge.note = link.note;
      if (link.to_meaning_version !== undefined) edge.to_meaning_version = link.to_meaning_version;
      edges.push(edge);
    }
  }
  // (2) wiki/edges.jsonl (있으면)
  const jsonlEdges = await loadEdgesJsonl(wikiRoot);
  edges.push(...jsonlEdges);

  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1);
  }

  const nodes: GraphNode[] = parsed.map(p => ({
    id: p.id,
    title: p.title,
    node_type: p.node_type,
    memory_type: p.memory_type,
    origin: p.origin,
    meaning_version: p.meaning_version,
    surfaces: p.surfaces,
    scope: p.scope,
    in_degree: inDegree.get(p.id) ?? 0,
    out_degree: outDegree.get(p.id) ?? 0,
    last_reviewed: p.last_reviewed,
    confidence: p.confidence,
    tags: p.tags,
    fingerprint: p.fingerprint
  }));

  const contents: Record<string, string> = {};
  for (const p of parsed) contents[p.id] = p.bodyHtml;

  return {
    nodes,
    edges,
    contents,
    generated_at: new Date().toISOString()
  };
}

export async function writeGraph(graph: GraphData, outPath: string): Promise<void> {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(graph, null, 2), 'utf8');
}
