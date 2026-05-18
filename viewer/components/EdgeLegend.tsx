import { EDGE_TYPES } from '@/lib/schema';
import { EDGE_COLOR } from '@/lib/color-map';

export default function EdgeLegend() {
  return (
    <div>
      <h2 className="text-sm font-bold mb-2 mt-4">엣지 타입</h2>
      <ul className="space-y-1">
        {EDGE_TYPES.map(t => (
          <li key={t} className="flex items-center gap-2 text-xs">
            <span className="inline-block w-4 h-1" style={{ backgroundColor: EDGE_COLOR[t] }} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
