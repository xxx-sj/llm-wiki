import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, mkdir } from 'node:fs/promises';
import { buildGraph } from '../lib/build-graph.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wikiRoot = path.resolve(__dirname, '../../wiki');
const outPath = path.resolve(__dirname, '../public/embeddings.json');

const MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100;
const MAX_CHARS_PER_NODE = 8000; // ~2k tokens

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
}

async function embed(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model: MODEL, input: texts })
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as OpenAIEmbeddingResponse;
  return data.data.map(d => d.embedding);
}

function htmlToText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('[build-embeddings] OPENAI_API_KEY not set — skipping (search will fall back to keyword)');
    return;
  }

  console.log('[build-embeddings] building graph...');
  const graph = await buildGraph(wikiRoot);
  console.log(`[build-embeddings] embedding ${graph.nodes.length} nodes via ${MODEL}...`);

  // title + body 텍스트 추출
  const texts = graph.nodes.map(n => {
    const body = htmlToText(graph.contents[n.id] ?? '');
    return `${n.title}\n\n${body}`.slice(0, MAX_CHARS_PER_NODE);
  });

  // 배치 임베딩
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const result = await embed(batch, apiKey);
    embeddings.push(...result);
    console.log(`[build-embeddings] ${i + batch.length}/${texts.length}`);
  }

  const dim = embeddings[0]?.length ?? 0;
  const map: Record<string, number[]> = {};
  graph.nodes.forEach((n, i) => { map[n.id] = embeddings[i]; });

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(
    outPath,
    JSON.stringify({
      model: MODEL,
      dimensions: dim,
      nodes: map,
      generated_at: new Date().toISOString()
    })
  );

  const sizeKb = Math.round((JSON.stringify({ nodes: map }).length / 1024) * 10) / 10;
  console.log(`[build-embeddings] wrote ${outPath} (${graph.nodes.length} nodes, ${dim} dim, ~${sizeKb}KB)`);
}

main().catch(e => {
  console.error('[build-embeddings] failed:', e);
  process.exit(1);
});
