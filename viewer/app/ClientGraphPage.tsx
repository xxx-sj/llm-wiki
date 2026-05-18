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
    <div className="flex h-screen bg-neutral-950 text-neutral-200">
      <aside className="w-72 flex-shrink-0 border-r border-neutral-800 bg-neutral-900 overflow-y-auto">
        <div className="p-5 border-b border-neutral-800">
          <div className="text-xs text-neutral-500 uppercase tracking-wider">지식 그래프</div>
          <h1 className="text-2xl font-bold text-neutral-50 mt-1">LLM Wiki</h1>
          <div className="text-xs text-neutral-500 mt-2 tabular-nums">
            {graph.nodes.length} 노드 · {graph.edges.length} 엣지
          </div>
        </div>
        <div className="p-5">
          <FilterBar enabled={enabledTypes} onChange={setEnabledTypes} graph={graph} />
          <EdgeLegend graph={graph} />
          <nav className="mt-6 pt-6 border-t border-neutral-800 text-xs space-y-1">
            <a href="/log" className="block text-neutral-400 hover:text-neutral-200">→ /log</a>
            <a href="/stats" className="block text-neutral-400 hover:text-neutral-200">→ /stats</a>
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
      <aside className="w-96 flex-shrink-0 border-l border-neutral-800 bg-neutral-900 overflow-y-auto">
        {selected ? (
          <NodePanel node={selected} html={graph.contents[selected.id]} graph={graph} />
        ) : (
          <div className="p-5 text-neutral-500 text-sm">노드를 클릭하면 본문이 표시됩니다.</div>
        )}
      </aside>
    </div>
  );
}
