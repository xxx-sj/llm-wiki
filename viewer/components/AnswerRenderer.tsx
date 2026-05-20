'use client';

import ReactMarkdown from 'react-markdown';

interface Props {
  text: string;
  onCitationClick?: (id: string) => void;
}

// [2026-05-18-some-slug] 패턴을 마크다운 링크로 치환
function linkifyCitations(text: string): string {
  return text.replace(
    /\[(\d{4}-\d{2}-\d{2}-[a-z0-9-]+)\]/g,
    (_match, id: string) => `[\`${id}\`](#cite-${id})`
  );
}

export default function AnswerRenderer({ text, onCitationClick }: Props) {
  const linkified = linkifyCitations(text);

  return (
    <div className="prose prose-sm prose-invert max-w-none" style={{ color: 'var(--fg-2)' }}>
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            const id = href?.startsWith('#cite-') ? href.slice(6) : null;
            if (id) {
              return (
                <button
                  type="button"
                  onClick={() => onCitationClick?.(id)}
                  className="font-mono text-[12px] px-1.5 py-0.5 rounded hover:underline"
                  style={{ color: 'var(--fg-1)', backgroundColor: 'var(--surface-3)' }}
                  title={`노드 ${id} 보기`}
                >
                  {children}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-9)' }}>
                {children}
              </a>
            );
          }
        }}
      >
        {linkified}
      </ReactMarkdown>
    </div>
  );
}
