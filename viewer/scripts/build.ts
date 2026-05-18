import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph, writeGraph } from '../lib/build-graph.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wikiRoot = path.resolve(__dirname, '../../wiki');
const outPath = path.resolve(__dirname, '../public/graph.json');

const mode = process.env.WIKI_INCLUDE_WORK === 'true' ? 'work+personal' : 'personal only';

buildGraph(wikiRoot)
  .then(g => writeGraph(g, outPath))
  .then(() => console.log(`[build-graph] wrote ${outPath} (${mode})`))
  .catch(e => {
    console.error('[build-graph] failed:', e);
    process.exit(1);
  });
