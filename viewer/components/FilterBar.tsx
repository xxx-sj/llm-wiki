'use client';

import { NODE_TYPES, NODE_TYPE_EN } from '@/lib/schema';
import type { NodeType, GraphData } from '@/lib/schema';
import { NODE_COLOR } from '@/lib/color-map';

interface Props {
  enabled: Set<NodeType>;
  onChange: (next: Set<NodeType>) => void;
  graph: GraphData;
}

export default function FilterBar({ enabled, onChange, graph }: Props) {
  function toggle(t: NodeType) {
    const next = new Set(enabled);
    if (next.has(t)) next.delete(t); else next.add(t);
    onChange(next);
  }

  const counts: Record<NodeType, number> = NODE_TYPES.reduce((acc, t) => {
    acc[t] = graph.nodes.filter(n => n.node_type === t).length;
    return acc;
  }, {} as Record<NodeType, number>);

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">노드 유형</h2>
      <ul className="space-y-1.5">
        {NODE_TYPES.map(t => {
          const on = enabled.has(t);
          return (
            <li key={t}>
              <button
                onClick={() => toggle(t)}
                className={`w-full flex items-center gap-3 px-2 py-1.5 rounded text-sm transition-colors ${
                  on ? 'hover:bg-neutral-800' : 'opacity-40 hover:opacity-70'
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: NODE_COLOR[t] }}
                />
                <span className="text-neutral-200">{t}</span>
                <span className="text-xs text-neutral-500 lowercase">{NODE_TYPE_EN[t]}</span>
                <span className="ml-auto text-xs text-neutral-500 tabular-nums">{counts[t]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
