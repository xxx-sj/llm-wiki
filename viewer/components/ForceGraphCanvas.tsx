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
  /** 챗봇 답변에 인용된 노드 id (그래프에서 강조). hover보다 우선순위 낮음. */
  chatCitedIds?: string[];
  onNodeClick: (id: string) => void;
}

// dim한 색 (hover/chat 활성 아닌 노드/엣지)
const DIM_NODE = '#444';
const DIM_EDGE = '#1a1a1a';

export default function ForceGraphCanvas({ nodes, edges, selectedId, chatCitedIds, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    function update() {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        // 새 폭이 0보다 작으면 무시 (mount 이전 상태 등)
        if (r.width > 0 && r.height > 0) {
          setSize(prev => (prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height }));
        }
      }
    }
    update();
    window.addEventListener('resize', update);
    // ResizeObserver — 부모(main)의 폭이 panel drag 등으로 변할 때 감지
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(update);
      ro.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
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

  // hover 우선, hover 없으면 chat cited 적용
  const highlightSet = useMemo(() => {
    if (hoveredId) {
      const s = new Set<string>([hoveredId]);
      const adj = adjacency.get(hoveredId);
      if (adj) for (const id of adj) s.add(id);
      return s;
    }
    if (chatCitedIds && chatCitedIds.length > 0) {
      return new Set<string>(chatCitedIds);
    }
    return null;
  }, [hoveredId, adjacency, chatCitedIds]);

  // graphData는 nodes/edges가 실제 바뀔 때만 새 reference 발급.
  // hover state 변경 시 새 객체를 만들면 react-force-graph가 시뮬레이션을 재시작해서 노드가 "튐".
  // react-force-graph는 노드 객체에 직접 x/y/vx/vy를 mutate하므로 같은 객체 reference 유지가 필수.
  const data = useMemo(() => ({
    nodes: nodes.map(n => ({ ...n, val: 1 + n.in_degree })),
    links: edges.map(e => ({ ...e }))
  }), [nodes, edges]);

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
