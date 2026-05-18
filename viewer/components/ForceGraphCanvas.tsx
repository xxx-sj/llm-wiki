'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GraphNode, GraphEdge } from '@/lib/schema';
import { NODE_COLOR, EDGE_COLOR, EDGE_DASH, COLORS, FG, BORDER } from '@/lib/color-map';

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

// dim한 색 (hover 활성 아닌 노드/엣지)
const DIM_NODE = '#444';
const DIM_EDGE = '#1a1a1a';

export default function ForceGraphCanvas({ nodes, edges, selectedId, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  // hover 노드의 인접 노드 id set 미리 계산
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    }
    return map;
  }, [edges]);

  const highlightSet = useMemo(() => {
    if (!hoveredId) return null;
    const s = new Set<string>([hoveredId]);
    const adj = adjacency.get(hoveredId);
    if (adj) for (const id of adj) s.add(id);
    return s;
  }, [hoveredId, adjacency]);

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
        linkColor={(l: any) => {
          if (highlightSet) {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            const isHit = sId === hoveredId || tId === hoveredId;
            return isHit ? FG['2'] : DIM_EDGE;
          }
          return EDGE_COLOR[l.type as keyof typeof EDGE_COLOR];
        }}
        linkLineDash={(l: any) => EDGE_DASH[l.type as keyof typeof EDGE_DASH]}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        linkWidth={(l: any) => {
          if (!highlightSet) return 1;
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          return (sId === hoveredId || tId === hoveredId) ? 1.5 : 0.5;
        }}
        onNodeClick={(n: any) => onNodeClick(n.id)}
        onNodeHover={(n: any) => {
          setHoveredId(n ? n.id : null);
          if (containerRef.current) {
            containerRef.current.style.cursor = n ? 'pointer' : 'default';
          }
        }}
        cooldownTicks={120}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const isSelected = node.id === selectedId;
          const isHovered = node.id === hoveredId;
          const isHighlighted = highlightSet ? highlightSet.has(node.id) : true;

          const radius = (4 + node.in_degree * 1.5);

          // 색 결정
          let color: string;
          if (highlightSet) {
            if (isHighlighted) {
              // hover 자신 + 인접 → 본연의 색
              color = NODE_COLOR[node.node_type as keyof typeof NODE_COLOR];
            } else {
              color = DIM_NODE;
            }
          } else {
            color = NODE_COLOR[node.node_type as keyof typeof NODE_COLOR];
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();

          if (isHovered) {
            // hover 노드 — 흰 외곽선
            ctx.lineWidth = 2;
            ctx.strokeStyle = FG['1'];
            ctx.stroke();
          } else if (isSelected) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = FG['1'];
            ctx.stroke();
          }

          // 라벨 — hover 모드일 땐 활성 노드만 표시, 아니면 평소대로
          const showLabel = highlightSet ? isHighlighted : globalScale > 0.7;
          if (showLabel) {
            const label = node.title as string;
            const fontSize = Math.max(10, 12 / globalScale);
            ctx.font = `${fontSize}px -apple-system, "Pretendard Variable", "Noto Sans KR", sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isHighlighted ? FG['1'] : FG['5'];
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
