'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { parseChatStream, type CitedNode } from '@/lib/parse-sse';
import AnswerRenderer from './AnswerRenderer';

interface Props {
  onCitedChange?: (ids: string[]) => void;
  onCitationClick?: (id: string) => void;
}

type Status = 'idle' | 'loading' | 'streaming' | 'error';

export default function ChatPanel({ onCitedChange, onCitationClick }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [cited, setCited] = useState<CitedNode[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  async function ask() {
    const q = question.trim();
    if (!q || status === 'loading' || status === 'streaming') return;

    // 이전 요청 abort
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAnswer('');
    setCited([]);
    setErrorMsg('');
    setStatus('loading');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
        signal: controller.signal
      });

      setStatus('streaming');

      for await (const ev of parseChatStream(res)) {
        if (controller.signal.aborted) return;

        if (ev.type === 'cited') {
          setCited(ev.data);
          onCitedChange?.(ev.data.map(c => c.id));
        } else if (ev.type === 'delta') {
          setAnswer(prev => prev + ev.content);
        } else if (ev.type === 'done') {
          setStatus('idle');
          return;
        } else if (ev.type === 'error') {
          setErrorMsg(ev.message);
          setStatus('error');
          return;
        }
      }
      // stream ended without [DONE]
      setStatus('idle');
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setErrorMsg(String(e?.message ?? e));
      setStatus('error');
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      ask();
    }
  }

  function clear() {
    abortRef.current?.abort();
    setQuestion('');
    setAnswer('');
    setCited([]);
    setErrorMsg('');
    setStatus('idle');
    onCitedChange?.([]);
  }

  const isBusy = status === 'loading' || status === 'streaming';
  const hasContent = answer || cited.length > 0 || errorMsg;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* 입력바 */}
      <div
        className="flex items-center gap-2 rounded-xl border px-4 py-2.5"
        style={{
          backgroundColor: 'rgba(20, 20, 20, 0.92)',
          borderColor: 'var(--border-2)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--fg-5)' }}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="이 wiki에 질문해 보세요…"
          disabled={isBusy}
          className="flex-1 bg-transparent outline-none text-[14px]"
          style={{ color: 'var(--fg-2)' }}
        />
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--fg-5)' }}>
          {isBusy ? '…' : 'Enter'}
        </span>
        {hasContent && (
          <button
            onClick={clear}
            className="text-[11px] px-2 py-0.5 rounded hover:bg-neutral-800"
            style={{ color: 'var(--fg-5)' }}
            title="닫기"
          >
            ✕
          </button>
        )}
      </div>

      {/* 답변 영역 */}
      {hasContent && (
        <div
          className="mt-2 rounded-xl border p-5 max-h-[60vh] overflow-y-auto"
          style={{
            backgroundColor: 'rgba(20, 20, 20, 0.92)',
            borderColor: 'var(--border-2)',
            backdropFilter: 'blur(8px)'
          }}
        >
          {cited.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {cited.map(c => (
                <button
                  key={c.id}
                  onClick={() => onCitationClick?.(c.id)}
                  className="text-[11px] px-2 py-1 rounded hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--surface-3)',
                    color: 'var(--fg-3)'
                  }}
                  title={`relevance ${c.score}`}
                >
                  <span className="font-mono" style={{ color: 'var(--fg-2)' }}>{c.title}</span>
                  <span className="ml-1.5" style={{ color: 'var(--fg-5)' }}>{c.score.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}

          {errorMsg ? (
            <div className="text-[13px]" style={{ color: 'var(--accent)' }}>
              ⚠ {errorMsg}
            </div>
          ) : answer ? (
            <AnswerRenderer text={answer} onCitationClick={onCitationClick} />
          ) : (
            <div className="text-[13px]" style={{ color: 'var(--fg-5)' }}>
              답변 생성 중…
            </div>
          )}

          {status === 'streaming' && answer && (
            <span className="inline-block w-2 h-4 ml-0.5 align-middle animate-pulse" style={{ backgroundColor: 'var(--fg-3)' }} />
          )}
        </div>
      )}
    </div>
  );
}
