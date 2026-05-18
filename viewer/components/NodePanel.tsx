import type { GraphData, GraphNode } from '@/lib/schema';
import { NODE_TYPE_EN } from '@/lib/schema';
import NodeBadge from './NodeBadge';

interface Props {
  node: GraphNode;
  html: string;
  graph: GraphData;
}

export default function NodePanel({ node, html, graph }: Props) {
  const outgoing = graph.edges.filter(e => e.source === node.id);
  const incoming = graph.edges.filter(e => e.target === node.id);

  return (
    <div className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <NodeBadge type={node.node_type} />
        <span className="text-[12px] lowercase" style={{ color: 'var(--fg-5)' }}>{NODE_TYPE_EN[node.node_type]}</span>
        <span className="text-[12px]" style={{ color: 'var(--fg-6)' }}>·</span>
        <span className="text-[12px]" style={{ color: 'var(--fg-5)' }}>{node.scope}</span>
      </div>
      <h2 className="text-[20px] font-bold mb-2" style={{ color: 'var(--fg-1)', letterSpacing: 'var(--ls-tight-l)' }}>{node.title}</h2>
      <div className="text-[12px] mb-4" style={{ color: 'var(--fg-5)' }}>
        last reviewed: {node.last_reviewed} · in: {node.in_degree} · out: {node.out_degree}
      </div>
      <article className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />

      {outgoing.length > 0 && (
        <section className="mt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-5)' }}>→ outgoing</h3>
          <ul className="text-[13px] space-y-1">
            {outgoing.map((e, i) => (
              <li key={i}>
                <span style={{ color: 'var(--fg-5)' }}>[{e.type}]</span>{' '}
                <a href={`/node/${e.target}`} className="hover:underline" style={{ color: 'var(--fg-2)' }}>{e.target}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {incoming.length > 0 && (
        <section className="mt-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-5)' }}>← incoming</h3>
          <ul className="text-[13px] space-y-1">
            {incoming.map((e, i) => (
              <li key={i}>
                <a href={`/node/${e.source}`} className="hover:underline" style={{ color: 'var(--fg-2)' }}>{e.source}</a>{' '}
                <span style={{ color: 'var(--fg-5)' }}>[{e.type}]</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
