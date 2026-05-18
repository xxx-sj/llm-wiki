import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import fg from 'fast-glob';
import type { NodeFrontmatter, Scope, EdgeType, GraphData, GraphNode, GraphEdge } from './schema.js';

export interface ParsedNode {
  id: string;
  title: string;
  node_type: NodeFrontmatter['node_type'];
  memory_type: NodeFrontmatter['memory_type'];
  scope: Scope;
  created: string;
  last_reviewed: string;
  confidence?: NodeFrontmatter['confidence'];
  sources?: string[];
  links: Array<{ to: string; type: EdgeType }>;
  tags?: string[];
  bodyHtml: string;
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

  return {
    id: fm.id,
    title: fm.title,
    node_type: fm.node_type,
    memory_type: fm.memory_type,
    scope,
    created: fm.created,
    last_reviewed: fm.last_reviewed,
    confidence: fm.confidence,
    sources: fm.sources,
    links: fm.links ?? [],
    tags: fm.tags,
    bodyHtml
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

export async function buildGraph(wikiRoot: string): Promise<GraphData> {
  const parsed = await loadAllNodes(wikiRoot);

  const edges: GraphEdge[] = [];
  for (const p of parsed) {
    for (const link of p.links) {
      edges.push({ source: p.id, target: link.to, type: link.type });
    }
  }

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
    scope: p.scope,
    in_degree: inDegree.get(p.id) ?? 0,
    out_degree: outDegree.get(p.id) ?? 0,
    last_reviewed: p.last_reviewed,
    confidence: p.confidence,
    tags: p.tags
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
