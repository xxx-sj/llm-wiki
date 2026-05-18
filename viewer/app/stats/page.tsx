import fs from 'node:fs/promises';
import path from 'node:path';
import type { GraphData } from '@/lib/schema';
import { NODE_TYPES, EDGE_TYPES } from '@/lib/schema';

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
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <a href="/" className="text-sm text-blue-600">← graph</a>
      <h1 className="text-2xl font-bold">Stats</h1>

      <section>
        <h2 className="font-bold">총량</h2>
        <p>노드 {g.nodes.length} · 엣지 {g.edges.length}</p>
      </section>

      <section>
        <h2 className="font-bold">노드 타입별</h2>
        <ul className="text-sm">{NODE_TYPES.map(t => <li key={t}>{t}: {byNodeType[t]}</li>)}</ul>
      </section>

      <section>
        <h2 className="font-bold">scope별</h2>
        <p className="text-sm">personal: {byScope.personal} · work: {byScope.work}</p>
      </section>

      <section>
        <h2 className="font-bold">엣지 타입별</h2>
        <ul className="text-sm">{EDGE_TYPES.map(t => <li key={t}>{t}: {byEdgeType[t]}</li>)}</ul>
      </section>

      <section>
        <h2 className="font-bold">허브 Top 10 (in-degree)</h2>
        <ol className="text-sm list-decimal pl-6">
          {hubs.map(n => <li key={n.id}><a href={`/node/${n.id}`} className="text-blue-600">{n.title}</a> — {n.in_degree}</li>)}
        </ol>
      </section>
    </div>
  );
}
