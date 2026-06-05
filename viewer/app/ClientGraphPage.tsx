'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { GraphData, GraphNode, NodeType } from '@/lib/schema';
import ForceGraphCanvas from '@/components/ForceGraphCanvas';
import NodePanel from '@/components/NodePanel';
import FilterBar from '@/components/FilterBar';
import EdgeLegend from '@/components/EdgeLegend';
import ChatPanel from '@/components/ChatPanel';
import { NODE_TYPES } from '@/lib/schema';
import { filterGraph } from '@/lib/filter-graph';

const PANEL_MIN = 280;
const PANEL_MAX = 900;
const PANEL_DEFAULT = 384; // = w-96
const PANEL_LS_KEY = 'llm-wiki:node-panel-width';

export default function ClientGraphPage({ graph }: { graph: GraphData }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enabledTypes, setEnabledTypes] = useState<Set<NodeType>>(new Set(NODE_TYPES));
  const [chatCitedIds, setChatCitedIds] = useState<string[]>([]);
  const [sideOpen, setSideOpen] = useState(false); // 모바일 사이드바 toggle
  const [panelWidth, setPanelWidth] = useState<number>(PANEL_DEFAULT);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; width: number } | null>(null);

  // localStorage에서 폭 복원 (첫 mount)
  useEffect(() => {
    const saved = localStorage.getItem(PANEL_LS_KEY);
    if (saved) {
      const n = parseInt(saved, 10);
      if (!Number.isNaN(n) && n >= PANEL_MIN && n <= PANEL_MAX) {
        setPanelWidth(n);
      }
    }
  }, []);

  // 드래그 중 mousemove/mouseup 글로벌 핸들러
  useEffect(() => {
    if (!isDragging) return;
    function onMove(e: MouseEvent) {
      if (!dragStartRef.current) return;
      const dx = dragStartRef.current.x - e.clientX; // 오른쪽 패널이라 왼쪽으로 끌면 폭 증가
      const next = Math.max(PANEL_MIN, Math.min(PANEL_MAX, dragStartRef.current.width + dx));
      setPanelWidth(next);
    }
    function onUp() {
      setIsDragging(false);
      dragStartRef.current = null;
      try { localStorage.setItem(PANEL_LS_KEY, String(panelWidth)); } catch {}
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, panelWidth]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, width: panelWidth };
    setIsDragging(true);
  }, [panelWidth]);

  const handleDoubleClick = useCallback(() => {
    setPanelWidth(PANEL_DEFAULT);
    try { localStorage.setItem(PANEL_LS_KEY, String(PANEL_DEFAULT)); } catch {}
  }, []);

  const filtered = useMemo(
    () => filterGraph(graph, enabledTypes),
    [graph, enabledTypes]
  );

  const selected: GraphNode | undefined = selectedId
    ? graph.nodes.find(n => n.id === selectedId)
    : undefined;

  function handleCitationClick(id: string) {
    setSelectedId(id);
  }

  // ESC 키로 모바일 drawer 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (selectedId) setSelectedId(null);
        else if (sideOpen) setSideOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, sideOpen]);

  const sidebarContent = (
    <>
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
    </>
  );

  return (
    <div
      className="flex h-[100dvh] overflow-hidden"
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--fg-2)',
        cursor: isDragging ? 'col-resize' : undefined,
        userSelect: isDragging ? 'none' : undefined
      }}
    >
      {/* 데스크탑 좌측 사이드바 */}
      <aside
        className="hidden md:block md:w-72 flex-shrink-0 overflow-y-auto"
        style={{
          backgroundColor: 'var(--surface-1)',
          borderRight: '1px solid var(--border-1)'
        }}
      >
        {sidebarContent}
      </aside>

      {/* 모바일 사이드바 drawer */}
      {sideOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setSideOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={`md:hidden fixed top-0 bottom-0 left-0 w-72 z-50 overflow-y-auto transition-transform ${
          sideOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--surface-1)',
          borderRight: '1px solid var(--border-1)'
        }}
      >
        {sidebarContent}
      </aside>

      {/* 메인 그래프 영역 */}
      <main className="flex-1 relative min-w-0">
        <ForceGraphCanvas
          nodes={filtered.nodes}
          edges={filtered.edges}
          selectedId={selectedId}
          chatCitedIds={chatCitedIds}
          onNodeClick={(id) => setSelectedId(id)}
        />

        {/* 모바일 햄버거 (좌상단) */}
        <button
          onClick={() => setSideOpen(true)}
          className="md:hidden absolute top-3 left-3 z-20 p-2 rounded-md"
          style={{
            backgroundColor: 'rgba(20, 20, 20, 0.92)',
            border: '1px solid var(--border-2)',
            backdropFilter: 'blur(8px)'
          }}
          aria-label="메뉴 열기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--fg-2)' }}>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* ChatPanel — 그래프 상단 floating */}
        <div className="absolute top-3 left-14 right-3 md:left-0 md:right-0 md:px-4 z-10 pointer-events-none">
          <div className="pointer-events-auto">
            <ChatPanel
              onCitedChange={setChatCitedIds}
              onCitationClick={handleCitationClick}
            />
          </div>
        </div>
      </main>

      {/* 데스크탑 우측 리사이즈 핸들 (데스크탑 only) */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="우측 패널 폭 조절 (드래그) / 더블클릭하면 기본값 복원"
        title="드래그로 폭 조절 / 더블클릭하면 기본값"
        onMouseDown={handleDragStart}
        onDoubleClick={handleDoubleClick}
        className="hidden md:block flex-shrink-0 relative"
        style={{
          width: 4,
          backgroundColor: isDragging ? 'var(--accent)' : 'var(--border-1)',
          cursor: 'col-resize',
          transition: isDragging ? undefined : 'background-color 150ms'
        }}
        onMouseEnter={(e) => { if (!isDragging) e.currentTarget.style.backgroundColor = 'var(--border-3)'; }}
        onMouseLeave={(e) => { if (!isDragging) e.currentTarget.style.backgroundColor = 'var(--border-1)'; }}
      />

      {/* 데스크탑 우측 NodePanel (폭 조절 가능) */}
      <aside
        className="hidden md:block flex-shrink-0 overflow-y-auto"
        style={{
          width: panelWidth,
          backgroundColor: 'var(--surface-1)'
        }}
      >
        {selected ? (
          <NodePanel node={selected} html={graph.contents[selected.id]} graph={graph} />
        ) : (
          <div className="p-5 text-sm" style={{ color: 'var(--fg-5)' }}>
            노드를 클릭하면 본문이 표시됩니다.
            <div className="mt-3 text-[11px]" style={{ color: 'var(--fg-6)' }}>
              💡 좌측 경계를 드래그해 패널 폭을 조절할 수 있어요. 더블클릭으로 기본값 복원.
            </div>
          </div>
        )}
      </aside>

      {/* 모바일 NodePanel — 하단 sheet (선택 노드 있을 때만) */}
      {selected && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setSelectedId(null)}
            aria-hidden
          />
          <div
            className="md:hidden fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: 'var(--surface-1)',
              borderTop: '1px solid var(--border-2)',
              maxHeight: '85dvh'
            }}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border-1)' }}>
              <div className="w-10 h-1 rounded-full mx-auto" style={{ backgroundColor: 'var(--border-3)' }} />
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full z-10"
              style={{ color: 'var(--fg-3)' }}
              aria-label="닫기"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="overflow-y-auto flex-1">
              <NodePanel node={selected} html={graph.contents[selected.id]} graph={graph} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
