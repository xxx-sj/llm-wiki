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
    <div className="p-5 text-neutral-200">
      <div className="mb-3 flex items-center gap-2">
        <NodeBadge type={node.node_type} />
        <span className="text-xs text-neutral-500 lowercase">{NODE_TYPE_EN[node.node_type]}</span>
        <span className="text-xs text-neutral-500">·</span>
        <span className="text-xs text-neutral-500">{node.scope}</span>
      </div>
      <h2 className="text-xl font-bold mb-2 text-neutral-50">{node.title}</h2>
      <div className="text-xs text-neutral-500 mb-4">
        last reviewed: {node.last_reviewed} · in: {node.in_degree} · out: {node.out_degree}
      </div>
      <article className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />

      {outgoing.length > 0 && (
        <section className="mt-6">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">→ outgoing</h3>
          <ul className="text-sm space-y-1">
            {outgoing.map((e, i) => (
              <li key={i}>
                <span className="text-neutral-500">[{e.type}]</span>{' '}
                <a href={`/node/${e.target}`} className="text-sky-400 hover:underline">{e.target}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {incoming.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">← incoming</h3>
          <ul className="text-sm space-y-1">
            {incoming.map((e, i) => (
              <li key={i}>
                <a href={`/node/${e.source}`} className="text-sky-400 hover:underline">{e.source}</a>{' '}
                <span className="text-neutral-500">[{e.type}]</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
