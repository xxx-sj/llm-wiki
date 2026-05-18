import { NODE_COLOR } from '@/lib/color-map';
import type { NodeType } from '@/lib/schema';

export default function NodeBadge({ type }: { type: NodeType }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs text-white"
      style={{ backgroundColor: NODE_COLOR[type] }}
    >
      {type}
    </span>
  );
}
