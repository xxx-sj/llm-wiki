import fs from 'node:fs/promises';
import path from 'node:path';
import { remark } from 'remark';
import remarkHtml from 'remark-html';

export default async function LogPage() {
  const p = path.join(process.cwd(), '..', 'wiki', 'log.md');
  const md = await fs.readFile(p, 'utf8');
  const html = String(await remark().use(remarkHtml).process(md));
  return (
    <div className="max-w-3xl mx-auto p-8">
      <a href="/" className="text-sm text-blue-600">← graph</a>
      <article className="prose mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
