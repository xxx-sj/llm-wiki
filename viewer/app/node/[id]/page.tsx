import fs from 'node:fs/promises';
import path from 'node:path';
import type { GraphData } from '@/lib/schema';
import NodePanel from '@/components/NodePanel';
import { notFound } from 'next/navigation';

async function loadGraph(): Promise<GraphData> {
  const p = path.join(process.cwd(), 'public', 'graph.json');
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

export default async function NodePage({ params }: { params: { id: string } }) {
  const graph = await loadGraph();
  const node = graph.nodes.find(n => n.id === params.id);
  if (!node) notFound();
  return (
    <div className="max-w-3xl mx-auto p-8">
      <a href="/" className="text-sm text-blue-600">← graph</a>
      <NodePanel node={node!} html={graph.contents[node!.id]} graph={graph} />
    </div>
  );
}

export async function generateStaticParams() {
  const graph = await loadGraph();
  return graph.nodes.map(n => ({ id: n.id }));
}
