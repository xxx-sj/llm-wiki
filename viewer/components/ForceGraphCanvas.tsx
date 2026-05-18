'use client';

import dynamic from 'next/dynamic';
import type { GraphNode, GraphEdge } from '@/lib/schema';
import { NODE_COLOR, EDGE_COLOR } from '@/lib/color-map';

const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
);

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (id: string) => void;
}

export default function ForceGraphCanvas({ nodes, edges, onNodeClick }: Props) {
  const data = {
    nodes: nodes.map(n => ({ ...n, val: 1 + n.in_degree })),
    links: edges.map(e => ({ ...e }))
  };
  return (
    <ForceGraph2D
      graphData={data}
      nodeLabel={(n: any) => `${n.title} (${n.node_type})`}
      nodeColor={(n: any) => NODE_COLOR[n.node_type as keyof typeof NODE_COLOR]}
      linkColor={(l: any) => EDGE_COLOR[l.type as keyof typeof EDGE_COLOR]}
      linkDirectionalArrowLength={4}
      linkDirectionalArrowRelPos={1}
      onNodeClick={(n: any) => onNodeClick(n.id)}
      cooldownTicks={100}
    />
  );
}
