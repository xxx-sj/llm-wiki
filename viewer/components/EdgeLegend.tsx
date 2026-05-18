import { EDGE_TYPES, EDGE_TYPE_EN } from '@/lib/schema';
import type { EdgeType, GraphData } from '@/lib/schema';
import { EDGE_COLOR } from '@/lib/color-map';

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
      <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">엣지 유형</h2>
      <ul className="space-y-1.5">
        {EDGE_TYPES.map(t => (
          <li key={t} className="flex items-center gap-3 px-2 py-1 text-sm">
            <span
              className="inline-block w-4 h-0.5 flex-shrink-0"
              style={{ backgroundColor: EDGE_COLOR[t] }}
            />
            <span className="text-neutral-200">{t}</span>
            <span className="text-xs text-neutral-500 lowercase">{EDGE_TYPE_EN[t]}</span>
            <span className="ml-auto text-xs text-neutral-500 tabular-nums">{counts[t]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
