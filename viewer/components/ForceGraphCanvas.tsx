'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { GraphNode, GraphEdge } from '@/lib/schema';
import { NODE_COLOR, EDGE_COLOR, EDGE_DASH, COLORS } from '@/lib/color-map';

const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
);

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  onNodeClick: (id: string) => void;
}

export default function ForceGraphCanvas({ nodes, edges, selectedId, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    function update() {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setSize({ w: r.width, h: r.height });
      }
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const data = {
    nodes: nodes.map(n => ({ ...n, val: 1 + n.in_degree })),
    links: edges.map(e => ({ ...e }))
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      <ForceGraph2D
        width={size.w}
        height={size.h}
        backgroundColor={COLORS.bg}
        graphData={data}
        nodeRelSize={6}
        nodeLabel={() => ''}
        linkColor={(l: any) => EDGE_COLOR[l.type as keyof typeof EDGE_COLOR]}
        linkLineDash={(l: any) => EDGE_DASH[l.type as keyof typeof EDGE_DASH]}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        linkWidth={1}
        onNodeClick={(n: any) => onNodeClick(n.id)}
        cooldownTicks={120}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const isSelected = node.id === selectedId;
          const radius = (4 + node.in_degree * 1.5);
          const color = NODE_COLOR[node.node_type as keyof typeof NODE_COLOR];

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();

          if (isSelected) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
          }

          // 노드 라벨
          if (globalScale > 0.7) {
            const label = node.title as string;
            const fontSize = Math.max(10, 12 / globalScale);
            ctx.font = `${fontSize}px -apple-system, "Noto Sans KR", sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = COLORS.textPrimary;
            ctx.fillText(label, node.x + radius + 4, node.y);
          }
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          const radius = (4 + (node.in_degree ?? 0) * 1.5) + 4;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();
        }}
      />
    </div>
  );
}
