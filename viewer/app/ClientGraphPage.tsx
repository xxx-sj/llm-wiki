'use client';

import { useState, useMemo } from 'react';
import type { GraphData, GraphNode, NodeType } from '@/lib/schema';
import ForceGraphCanvas from '@/components/ForceGraphCanvas';
import NodePanel from '@/components/NodePanel';
import FilterBar from '@/components/FilterBar';
import EdgeLegend from '@/components/EdgeLegend';
import { NODE_TYPES } from '@/lib/schema';
import { filterGraph } from '@/lib/filter-graph';

export default function ClientGraphPage({ graph }: { graph: GraphData }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enabledTypes, setEnabledTypes] = useState<Set<NodeType>>(new Set(NODE_TYPES));

  const filtered = useMemo(
    () => filterGraph(graph, enabledTypes),
    [graph, enabledTypes]
  );

  const selected: GraphNode | undefined = selectedId
    ? graph.nodes.find(n => n.id === selectedId)
    : undefined;

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--fg-2)' }}>
      <aside
        className="w-72 flex-shrink-0 overflow-y-auto"
        style={{
          backgroundColor: 'var(--surface-1)',
          borderRight: '1px solid var(--border-1)'
        }}
      >
        <div className="p-5" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--fg-5)' }}>
            지식 그래프
          </div>
          <h1 className="text-[22px] font-bold mt-1" style={{ color: 'var(--fg-1)', letterSpacing: 'var(--ls-tight-l)' }}>
            LLM Wiki
          </h1>
          <div className="text-[12px] mt-2 tabular-nums" style={{ color: 'var(--fg-5)' }}>
            {graph.nodes.length} 노드 · {graph.edges.length} 엣지
          </div>
        </div>
        <div className="p-5">
          <FilterBar enabled={enabledTypes} onChange={setEnabledTypes} graph={graph} />
          <EdgeLegend graph={graph} />
          <nav className="mt-6 pt-6 text-xs space-y-1" style={{ borderTop: '1px solid var(--border-1)' }}>
            <a href="/log" className="block hover:text-fg-2" style={{ color: 'var(--fg-4)' }}>→ /log</a>
            <a href="/stats" className="block hover:text-fg-2" style={{ color: 'var(--fg-4)' }}>→ /stats</a>
          </nav>
        </div>
      </aside>
      <main className="flex-1 relative">
        <ForceGraphCanvas
          nodes={filtered.nodes}
          edges={filtered.edges}
          selectedId={selectedId}
          onNodeClick={(id) => setSelectedId(id)}
        />
      </main>
      <aside
        className="w-96 flex-shrink-0 overflow-y-auto"
        style={{
          backgroundColor: 'var(--surface-1)',
          borderLeft: '1px solid var(--border-1)'
        }}
      >
        {selected ? (
          <NodePanel node={selected} html={graph.contents[selected.id]} graph={graph} />
        ) : (
          <div className="p-5 text-sm" style={{ color: 'var(--fg-5)' }}>
            노드를 클릭하면 본문이 표시됩니다.
          </div>
        )}
      </aside>
    </div>
  );
}
