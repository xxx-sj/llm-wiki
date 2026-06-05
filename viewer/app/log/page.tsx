import fs from 'node:fs/promises';
import path from 'node:path';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

export default async function LogPage() {
  const p = path.join(process.cwd(), '..', 'wiki', 'log.md');
  const md = await fs.readFile(p, 'utf8');
  const html = String(await remark().use(remarkGfm).use(remarkHtml).process(md));
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <div className="max-w-3xl mx-auto p-8">
        <a href="/" className="text-sm text-sky-400 hover:underline">← graph</a>
        <article className="prose prose-sm prose-invert mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
