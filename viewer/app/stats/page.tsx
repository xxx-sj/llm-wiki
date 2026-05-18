import fs from 'node:fs/promises';
import path from 'node:path';
import type { GraphData } from '@/lib/schema';
import { NODE_TYPES, EDGE_TYPES, NODE_TYPE_EN, EDGE_TYPE_EN } from '@/lib/schema';
import { NODE_COLOR, EDGE_COLOR } from '@/lib/color-map';

async function loadGraph(): Promise<GraphData> {
  const p = path.join(process.cwd(), 'public', 'graph.json');
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

export default async function StatsPage() {
  const g = await loadGraph();
  const byNodeType = Object.fromEntries(NODE_TYPES.map(t => [t, g.nodes.filter(n => n.node_type === t).length]));
  const byScope = { work: g.nodes.filter(n => n.scope === 'work').length, personal: g.nodes.filter(n => n.scope === 'personal').length };
  const byEdgeType = Object.fromEntries(EDGE_TYPES.map(t => [t, g.edges.filter(e => e.type === t).length]));
  const hubs = [...g.nodes].sort((a, b) => b.in_degree - a.in_degree).slice(0, 10);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <div className="max-w-3xl mx-auto p-8 space-y-8">
        <a href="/" className="text-sm text-sky-400 hover:underline">← graph</a>
        <h1 className="text-2xl font-bold text-neutral-50">Stats</h1>

        <section>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">총량</h2>
          <p className="tabular-nums">노드 {g.nodes.length} · 엣지 {g.edges.length}</p>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">노드 타입별</h2>
          <ul className="text-sm space-y-1">
            {NODE_TYPES.map(t => (
              <li key={t} className="flex items-center gap-3">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLOR[t] }} />
                <span>{t}</span>
                <span className="text-xs text-neutral-500 lowercase">{NODE_TYPE_EN[t]}</span>
                <span className="ml-auto tabular-nums text-neutral-400">{byNodeType[t]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">scope별</h2>
          <p className="text-sm tabular-nums">personal: {byScope.personal} · work: {byScope.work}</p>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">엣지 타입별</h2>
          <ul className="text-sm space-y-1">
            {EDGE_TYPES.map(t => (
              <li key={t} className="flex items-center gap-3">
                <span className="inline-block w-4 h-0.5" style={{ backgroundColor: EDGE_COLOR[t] }} />
                <span>{t}</span>
                <span className="text-xs text-neutral-500 lowercase">{EDGE_TYPE_EN[t]}</span>
                <span className="ml-auto tabular-nums text-neutral-400">{byEdgeType[t]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">허브 Top 10 (in-degree)</h2>
          <ol className="text-sm list-decimal pl-6 space-y-1">
            {hubs.map(n => (
              <li key={n.id}>
                <a href={`/node/${n.id}`} className="text-sky-400 hover:underline">{n.title}</a>{' '}
                <span className="text-neutral-500">— {n.in_degree}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
