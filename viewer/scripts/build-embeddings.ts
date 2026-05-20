import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildGraph } from '../lib/build-graph.js';

/**
 * 빌드 타임 임베딩 생성기 (incremental caching).
 *
 * 흐름:
 *   1. 이전 빌드의 viewer/public/embeddings.json을 읽기 (있으면)
 *   2. 각 노드의 (title + body) SHA-256 hash 계산
 *   3. 이전 hash와 같은 노드 → 이전 임베딩 그대로 재사용 (API 호출 0)
 *   4. hash 다른 노드 + 신규 노드 → OpenAI 호출
 *   5. 삭제된 노드 → 자동 제외 (현재 graph.nodes에 없는 id는 그냥 안 담음)
 *   6. 모델 변경 시 캐시 전체 무효화 (전체 재계산)
 *
 * 캐싱 효과:
 *   - embeddings.json을 git에 commit하면 Cloudflare 빌드도 변경된 노드만 임베딩 호출
 *   - 1만 노드 중 1개만 수정한 push → API 호출 1번
 *   - 모델 미변경 + 본문 미변경이면 push마다 비용 0
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wikiRoot = path.resolve(__dirname, '../../wiki');
const outPath = path.resolve(__dirname, '../public/embeddings.json');

const MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100;
const MAX_CHARS_PER_NODE = 8000; // ~2k tokens

interface EmbeddingsFile {
  model: string;
  dimensions: number;
  nodes: Record<string, number[]>;
  /** 각 노드의 (title + body) SHA-256 — 다음 빌드의 변경 감지용 */
  hashes?: Record<string, string>;
  generated_at: string;
}

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

function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function loadCache(): Promise<EmbeddingsFile | null> {
  try {
    const raw = await readFile(outPath, 'utf8');
    const parsed = JSON.parse(raw) as EmbeddingsFile;
    if (parsed.model !== MODEL) {
      console.log(
        `[build-embeddings] cache model mismatch (${parsed.model} vs ${MODEL}) — invalidating entire cache`
      );
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('[build-embeddings] OPENAI_API_KEY not set — skipping (search will fall back to keyword)');
    return;
  }

  console.log('[build-embeddings] building graph...');
  const graph = await buildGraph(wikiRoot);

  const cache = await loadCache();
  const newNodes: Record<string, number[]> = {};
  const newHashes: Record<string, string> = {};

  const toEmbedIds: string[] = [];
  const toEmbedTexts: string[] = [];
  let reused = 0;

  for (const n of graph.nodes) {
    const body = htmlToText(graph.contents[n.id] ?? '');
    const text = `${n.title}\n\n${body}`.slice(0, MAX_CHARS_PER_NODE);
    const hash = hashText(text);

    const cachedHash = cache?.hashes?.[n.id];
    const cachedVec = cache?.nodes?.[n.id];

    if (cachedHash === hash && cachedVec) {
      newNodes[n.id] = cachedVec;
      newHashes[n.id] = hash;
      reused++;
    } else {
      toEmbedIds.push(n.id);
      toEmbedTexts.push(text);
    }
  }

  if (toEmbedIds.length === 0) {
    console.log(`[build-embeddings] all ${graph.nodes.length} nodes cached — no OpenAI calls`);
  } else {
    console.log(
      `[build-embeddings] ${reused} reused, ${toEmbedIds.length} to embed via ${MODEL}...`
    );
    for (let i = 0; i < toEmbedTexts.length; i += BATCH_SIZE) {
      const batchTexts = toEmbedTexts.slice(i, i + BATCH_SIZE);
      const batchIds = toEmbedIds.slice(i, i + BATCH_SIZE);
      const results = await embed(batchTexts, apiKey);
      batchIds.forEach((id, idx) => {
        newNodes[id] = results[idx];
        newHashes[id] = hashText(batchTexts[idx]);
      });
      console.log(
        `[build-embeddings] ${Math.min(i + BATCH_SIZE, toEmbedTexts.length)}/${toEmbedTexts.length}`
      );
    }
  }

  const firstEmb = Object.values(newNodes)[0];
  const dim = firstEmb?.length ?? cache?.dimensions ?? 0;

  const output: EmbeddingsFile = {
    model: MODEL,
    dimensions: dim,
    nodes: newNodes,
    hashes: newHashes,
    generated_at: new Date().toISOString()
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(output));

  const sizeKb = Math.round(JSON.stringify({ nodes: newNodes }).length / 1024);
  console.log(
    `[build-embeddings] wrote ${outPath} (${graph.nodes.length} nodes, ${dim} dim, ~${sizeKb}KB) — ${reused} reused, ${toEmbedIds.length} new`
  );
}

main().catch(e => {
  console.error('[build-embeddings] failed:', e);
  process.exit(1);
});
