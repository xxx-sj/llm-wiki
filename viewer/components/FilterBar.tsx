'use client';

import { NODE_TYPES } from '@/lib/schema';
import type { NodeType } from '@/lib/schema';
import { NODE_COLOR } from '@/lib/color-map';

interface Props {
  enabled: Set<NodeType>;
  onChange: (next: Set<NodeType>) => void;
}

export default function FilterBar({ enabled, onChange }: Props) {
  function toggle(t: NodeType) {
    const next = new Set(enabled);
    if (next.has(t)) next.delete(t); else next.add(t);
    onChange(next);
  }

  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold mb-2">필터 (노드 타입)</h2>
      <div className="flex flex-wrap gap-2">
        {NODE_TYPES.map(t => (
          <button
            key={t}
            onClick={() => toggle(t)}
            className={`px-2 py-1 rounded text-xs ${
              enabled.has(t) ? 'text-white' : 'text-gray-400 bg-gray-100'
            }`}
            style={enabled.has(t) ? { backgroundColor: NODE_COLOR[t] } : {}}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
