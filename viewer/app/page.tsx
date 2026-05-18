import fs from 'node:fs/promises';
import path from 'node:path';
import type { GraphData } from '@/lib/schema';
import ClientGraphPage from './ClientGraphPage';

async function loadGraph(): Promise<GraphData> {
  const p = path.join(process.cwd(), 'public', 'graph.json');
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

export default async function Home() {
  const graph = await loadGraph();
  return <ClientGraphPage graph={graph} />;
}
