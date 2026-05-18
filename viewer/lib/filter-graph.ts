import type { GraphData, NodeType } from './schema.js';

export function filterGraph(graph: GraphData, enabledTypes: Set<NodeType>): GraphData {
  const nodes = graph.nodes.filter(n => enabledTypes.has(n.node_type));
  const ids = new Set(nodes.map(n => n.id));
  const edges = graph.edges.filter(e => ids.has(e.source) && ids.has(e.target));
  return { ...graph, nodes, edges };
}
