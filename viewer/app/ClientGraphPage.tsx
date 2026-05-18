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
    <div className="flex h-screen">
      <aside className="w-64 border-r p-4 overflow-y-auto bg-gray-50">
        <h1 className="font-bold mb-4">LLM Wiki</h1>
        <FilterBar enabled={enabledTypes} onChange={setEnabledTypes} />
        <EdgeLegend />
        <nav className="mt-6 text-xs space-y-1">
          <a href="/log" className="block text-blue-600">→ /log</a>
          <a href="/stats" className="block text-blue-600">→ /stats</a>
        </nav>
      </aside>
      <main className="flex-1 relative">
        <ForceGraphCanvas
          nodes={filtered.nodes}
          edges={filtered.edges}
          onNodeClick={(id) => setSelectedId(id)}
        />
      </main>
      <aside className="w-96 border-l overflow-y-auto">
        {selected ? (
          <NodePanel node={selected} html={graph.contents[selected.id]} graph={graph} />
        ) : (
          <div className="p-4 text-gray-500">노드를 클릭하면 본문이 표시됩니다.</div>
        )}
      </aside>
    </div>
  );
}
