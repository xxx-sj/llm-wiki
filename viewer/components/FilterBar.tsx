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
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-4)' }}>노드 유형</h2>
      <ul className="space-y-1.5">
        {NODE_TYPES.map(t => {
          const on = enabled.has(t);
          // ON: 노드 자체 색 (의미·통찰·절차·사건·주제 = fg-2 흰색, 주장 = red)
          // OFF: fg-5 (disabled gray)
          const dotColor = on ? NODE_COLOR[t] : 'var(--fg-5)';
          const textColor = on ? 'var(--fg-2)' : 'var(--fg-5)';
          const subColor = on ? 'var(--fg-4)' : 'var(--fg-5)';
          return (
            <li key={t}>
              <button
                onClick={() => toggle(t)}
                className="w-full flex items-center gap-3 px-2 py-1.5 rounded text-sm transition-colors hover:bg-neutral-800/50"
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors"
                  style={{ backgroundColor: dotColor }}
                />
                <span style={{ color: textColor }}>{t}</span>
                <span className="text-xs lowercase" style={{ color: subColor }}>
                  {NODE_TYPE_EN[t]}
                </span>
                <span className="ml-auto text-xs tabular-nums" style={{ color: subColor }}>
                  {counts[t]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
