import type { GraphData, GraphNode } from '@/lib/schema';
import { NODE_TYPE_EN } from '@/lib/schema';
import NodeBadge from './NodeBadge';

interface Props {
  node: GraphNode;
  html: string;
  graph: GraphData;
}

const ORIGIN_LABEL: Record<string, string> = {
  self: '본인',
  external: '인용',
  synthesized: '종합'
};

export default function NodePanel({ node, html, graph }: Props) {
  const outgoing = graph.edges.filter(e => e.source === node.id);
  const incoming = graph.edges.filter(e => e.target === node.id);

  return (
    <div className="p-5 min-w-0 w-full break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <NodeBadge type={node.node_type} />
        <span className="text-[12px] lowercase" style={{ color: 'var(--fg-5)' }}>{NODE_TYPE_EN[node.node_type]}</span>
        <span className="text-[12px]" style={{ color: 'var(--fg-6)' }}>·</span>
        <span className="text-[12px]" style={{ color: 'var(--fg-5)' }}>{node.scope}</span>
        {node.origin && (
          <>
            <span className="text-[12px]" style={{ color: 'var(--fg-6)' }}>·</span>
            <span
              className="text-[11px] px-1.5 py-0.5 rounded"
              style={{
                color: node.origin === 'external' ? 'var(--accent-soft)' : 'var(--fg-4)',
                backgroundColor: 'var(--surface-3)'
              }}
              title={`origin: ${node.origin}`}
            >
              {ORIGIN_LABEL[node.origin] ?? node.origin}
            </span>
          </>
        )}
      </div>
      <h2
        className="text-[20px] font-bold mb-2"
        style={{ color: 'var(--fg-1)', letterSpacing: 'var(--ls-tight-l)', wordBreak: 'keep-all' }}
      >
        {node.title}
      </h2>
      <div className="text-[12px] mb-4" style={{ color: 'var(--fg-5)' }}>
        last reviewed: {node.last_reviewed} · in: {node.in_degree} · out: {node.out_degree}
      </div>
      <article
        className="prose prose-sm max-w-none"
        style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {outgoing.length > 0 && (
        <section className="mt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-5)' }}>→ outgoing</h3>
          <ul className="text-[13px] space-y-1.5">
            {outgoing.map((e, i) => (
              <li key={i} className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-1">
                  <span className="flex-shrink-0" style={{ color: 'var(--fg-5)' }}>[{e.type}]</span>
                  <a
                    href={`/node/${e.target}`}
                    className="hover:underline min-w-0"
                    style={{ color: 'var(--fg-2)', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                  >
                    {e.target}
                  </a>
                </div>
                {e.note && (
                  <div
                    className="text-[11px] mt-0.5 pl-2"
                    style={{ color: 'var(--fg-5)', borderLeft: '2px solid var(--border-2)', wordBreak: 'break-word' }}
                  >
                    {e.note}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {incoming.length > 0 && (
        <section className="mt-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-5)' }}>← incoming</h3>
          <ul className="text-[13px] space-y-1.5">
            {incoming.map((e, i) => (
              <li key={i} className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-1">
                  <a
                    href={`/node/${e.source}`}
                    className="hover:underline min-w-0"
                    style={{ color: 'var(--fg-2)', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                  >
                    {e.source}
                  </a>
                  <span className="flex-shrink-0" style={{ color: 'var(--fg-5)' }}>[{e.type}]</span>
                </div>
                {e.note && (
                  <div
                    className="text-[11px] mt-0.5 pl-2"
                    style={{ color: 'var(--fg-5)', borderLeft: '2px solid var(--border-2)', wordBreak: 'break-word' }}
                  >
                    {e.note}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
