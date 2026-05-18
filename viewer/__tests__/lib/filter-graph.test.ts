import { describe, it, expect } from 'vitest';
import { filterGraph } from '../../lib/filter-graph.js';
import type { GraphData, NodeType } from '../../lib/schema.js';

const SAMPLE: GraphData = {
  nodes: [
    { id: 'A', title: 'A', node_type: '의미', memory_type: 'world_fact', scope: 'personal', in_degree: 0, out_degree: 1, last_reviewed: '2026-05-18' },
    { id: 'B', title: 'B', node_type: '통찰', memory_type: 'mental_model', scope: 'personal', in_degree: 1, out_degree: 0, last_reviewed: '2026-05-18' },
    { id: 'C', title: 'C', node_type: '주제', memory_type: 'mental_model', scope: 'personal', in_degree: 0, out_degree: 0, last_reviewed: '2026-05-18' }
  ],
  edges: [{ source: 'A', target: 'B', type: '지지' }],
  contents: {},
  generated_at: '2026-05-18T00:00:00Z'
};

describe('filterGraph', () => {
  it('keeps all when all types enabled', () => {
    const out = filterGraph(SAMPLE, new Set<NodeType>(['의미', '통찰', '주제']));
    expect(out.nodes).toHaveLength(3);
    expect(out.edges).toHaveLength(1);
  });

  it('removes node and edges touching it when type disabled', () => {
    const out = filterGraph(SAMPLE, new Set<NodeType>(['의미', '주제']));   // 통찰 끔
    expect(out.nodes.map(n => n.id).sort()).toEqual(['A', 'C']);
    expect(out.edges).toHaveLength(0);   // A→B 엣지 사라짐
  });

  it('keeps node with no edges when its type enabled', () => {
    const out = filterGraph(SAMPLE, new Set<NodeType>(['주제']));
    expect(out.nodes.map(n => n.id)).toEqual(['C']);
    expect(out.edges).toHaveLength(0);
  });
});
