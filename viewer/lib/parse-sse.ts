/**
 * /api/chat SSE 스트림 파서.
 * Function이 보내는 두 종류 이벤트:
 *   1. event: cited\ndata: [{id, title, node_type, score}, ...]
 *   2. data: {"choices":[{"delta":{"content":"..."}}]}    (OpenAI Chat Completions chunk)
 *   3. data: [DONE]                                        (종료)
 */

export interface CitedNode {
  id: string;
  title: string;
  node_type: string;
  score: number;
}

export type ChatStreamEvent =
  | { type: 'cited'; data: CitedNode[] }
  | { type: 'delta'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export async function* parseChatStream(
  response: Response
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch {}
    yield { type: 'error', message: `HTTP ${response.status}: ${detail.slice(0, 200)}` };
    return;
  }
  if (!response.body) {
    yield { type: 'error', message: 'no response body' };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 이벤트 블록은 빈 줄(\n\n)로 구분
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        if (!block.trim()) continue;

        let eventName = 'message';
        let dataLines: string[] = [];
        for (const line of block.split('\n')) {
          if (line.startsWith('event: ')) eventName = line.slice(7).trim();
          else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
        }
        const dataStr = dataLines.join('\n');
        if (!dataStr) continue;

        // cited 이벤트 — 우리 Function이 emit
        if (eventName === 'cited') {
          try {
            yield { type: 'cited', data: JSON.parse(dataStr) as CitedNode[] };
          } catch {
            yield { type: 'error', message: 'failed to parse cited' };
          }
          continue;
        }

        // OpenAI 종료
        if (dataStr === '[DONE]') {
          yield { type: 'done' };
          continue;
        }

        // OpenAI delta chunk
        try {
          const chunk = JSON.parse(dataStr);
          const token: string | undefined = chunk?.choices?.[0]?.delta?.content;
          if (token) yield { type: 'delta', content: token };
        } catch {
          // 빈 keep-alive 등 무시
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
