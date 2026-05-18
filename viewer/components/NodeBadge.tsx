import { NODE_COLOR } from '@/lib/color-map';
import type { NodeType } from '@/lib/schema';

export default function NodeBadge({ type }: { type: NodeType }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-300">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: NODE_COLOR[type] }}
      />
      {type}
    </span>
  );
}
