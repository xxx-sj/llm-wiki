import { EDGE_TYPES, EDGE_TYPE_EN } from '@/lib/schema';
import type { EdgeType, GraphData } from '@/lib/schema';
import { EDGE_COLOR, EDGE_DASH } from '@/lib/color-map';

interface Props {
  graph: GraphData;
}

export default function EdgeLegend({ graph }: Props) {
  const counts: Record<EdgeType, number> = EDGE_TYPES.reduce((acc, t) => {
    acc[t] = graph.edges.filter(e => e.type === t).length;
    return acc;
  }, {} as Record<EdgeType, number>);

  return (
    <div>
      <h2
        className="text-[11px] font-semibold uppercase tracking-wider mb-3"
        style={{ color: 'var(--fg-5)' }}
      >
        엣지 유형
      </h2>
      <ul className="space-y-0.5">
        {EDGE_TYPES.map(t => {
          const dashed = EDGE_DASH[t] !== null;
          const color = EDGE_COLOR[t];
          // 강조 엣지(반박)는 fg-2 톤으로 텍스트 표시. 나머지는 fg-3.
          const isAccent = t === '반박';
          return (
            <li key={t} className="flex items-center gap-3 px-2 py-1 text-[13px]">
              <svg width="16" height="6" className="flex-shrink-0">
                <line
                  x1="0" y1="3" x2="16" y2="3"
                  stroke={isAccent ? color : '#555'}
                  strokeWidth="1.5"
                  strokeDasharray={dashed ? '3,3' : undefined}
                />
              </svg>
              <span style={{ color: isAccent ? color : 'var(--fg-3)' }}>{t}</span>
              <span className="text-[12px] lowercase" style={{ color: 'var(--fg-5)' }}>
                {EDGE_TYPE_EN[t]}
              </span>
              <span className="ml-auto text-[12px] tabular-nums" style={{ color: 'var(--fg-5)' }}>
                {counts[t]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
