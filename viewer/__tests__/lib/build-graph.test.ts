import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import { parseNode, loadAllNodes, buildGraph, writeGraph } from '../../lib/build-graph.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '../fixtures');

describe('parseNode', () => {
  it('parses frontmatter and extracts scope from path', async () => {
    const filePath = path.join(FIXTURES, 'wiki/personal/semantic/sample.md');
    const result = await parseNode(filePath, path.join(FIXTURES, 'wiki'));

    expect(result.id).toBe('sample-personal-node');
    expect(result.title).toBe('샘플 개인 노드');
    expect(result.node_type).toBe('의미');
    expect(result.memory_type).toBe('world_fact');
    expect(result.scope).toBe('personal');
    expect(result.links).toEqual([{ to: 'another-node', type: '전제' }]);
    expect(result.bodyHtml).toContain('본문 내용');
    // 새 필드 — origin default 'self', fingerprint 64자 hex
    expect(result.origin).toBe('self');
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('preserves edge note when present in frontmatter links', async () => {
    // sample.md의 links에는 note가 없으므로 undefined여야 함
    const filePath = path.join(FIXTURES, 'wiki/personal/semantic/sample.md');
    const result = await parseNode(filePath, path.join(FIXTURES, 'wiki'));
    expect(result.links[0].note).toBeUndefined();
  });

  it('extracts scope=work from wiki/work/ path', async () => {
    const filePath = path.join(FIXTURES, 'wiki/work/insight/secret.md');
    const result = await parseNode(filePath, path.join(FIXTURES, 'wiki'));
    expect(result.scope).toBe('work');
  });
});

describe('loadAllNodes', () => {
  it('loads only personal/ when WIKI_INCLUDE_WORK is unset', async () => {
    delete process.env.WIKI_INCLUDE_WORK;
    const wikiRoot = path.join(FIXTURES, 'wiki');
    const nodes = await loadAllNodes(wikiRoot);
    const ids = nodes.map(n => n.id).sort();
    expect(ids).toEqual(['another-node', 'sample-personal-node']);
    expect(nodes.find(n => n.id === 'secret-work-node')).toBeUndefined();
  });

  it('loads both when WIKI_INCLUDE_WORK=true', async () => {
    process.env.WIKI_INCLUDE_WORK = 'true';
    try {
      const wikiRoot = path.join(FIXTURES, 'wiki');
      const nodes = await loadAllNodes(wikiRoot);
      const ids = nodes.map(n => n.id).sort();
      expect(ids).toEqual(['another-node', 'sample-personal-node', 'secret-work-node']);
    } finally {
      delete process.env.WIKI_INCLUDE_WORK;
    }
  });
});

describe('buildGraph', () => {
  it('flattens forward links into edges and computes degrees', async () => {
    delete process.env.WIKI_INCLUDE_WORK;
    const wikiRoot = path.join(FIXTURES, 'wiki');
    const graph = await buildGraph(wikiRoot);

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      source: 'sample-personal-node',
      target: 'another-node',
      type: '전제'
    });
    // note 없는 엣지는 note 필드도 없음
    expect(graph.edges[0].note).toBeUndefined();

    const sample = graph.nodes.find(n => n.id === 'sample-personal-node')!;
    const another = graph.nodes.find(n => n.id === 'another-node')!;
    expect(sample.out_degree).toBe(1);
    expect(sample.in_degree).toBe(0);
    expect(another.out_degree).toBe(0);
    expect(another.in_degree).toBe(1);
  });

  it('embeds rendered html in contents map', async () => {
    delete process.env.WIKI_INCLUDE_WORK;
    const graph = await buildGraph(path.join(FIXTURES, 'wiki'));
    expect(graph.contents['sample-personal-node']).toContain('본문 내용');
  });
});

describe('writeGraph', () => {
  const tmpOut = path.join(os.tmpdir(), `graph-test-${process.pid}.json`);

  afterEach(async () => {
    await rm(tmpOut, { force: true });
  });

  it('writes graph.json to the given path', async () => {
    delete process.env.WIKI_INCLUDE_WORK;
    const graph = await buildGraph(path.join(FIXTURES, 'wiki'));
    await writeGraph(graph, tmpOut);

    const content = JSON.parse(await readFile(tmpOut, 'utf8'));
    expect(content.nodes).toHaveLength(2);
    expect(content.edges).toHaveLength(1);
    expect(typeof content.generated_at).toBe('string');
  });
});
