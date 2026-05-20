# LLM Wiki

Karpathy의 [LLM Wiki 패턴](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)을 따라 구현한 개인 지식 베이스.

## 사용법

### 콘텐츠 추가

```bash
# 1. Claude를 통해 (긴 글 → 여러 노드 분해)
# Claude Code 안에서:
/wiki-ingest https://...

# 2. 직접 markdown 작성
echo '---' > wiki/personal/통찰/$(date +%F)-new-node.md
# ... frontmatter + 본문 작성
/wiki-validate wiki/personal/통찰/$(date +%F)-new-node.md
```

### viewer 실행

```bash
cd viewer
npm install   # 첫 실행 시
npm run dev   # http://localhost:3000

# work 콘텐츠도 보고 싶을 때 (로컬만, deploy 안 됨)
WIKI_INCLUDE_WORK=true npm run dev
```

### 배포

GitHub에 push하면 Vercel/Cloudflare Pages가 자동으로 재배포. **회사 자료(`wiki/work/`)는 배포에서 통째로 제외**됨.

라이브: https://llm-wiki-9t8.pages.dev (Cloudflare Pages)

## 구조

- `CLAUDE.md` — 스키마/규약/슬래시 커맨드 정의
- `docs/` — 설계 문서
- `raw/` — 원본 자료 (append-only)
- `wiki/personal/`, `wiki/work/` — 노드 markdown
- `viewer/` — Next.js 시각화 앱
- `functions/api/chat.ts` — Cloudflare Pages Function (RAG 챗봇)
- `viewer/public/embeddings.json` — 임베딩 캐시 (commit해서 incremental build)

## 챗봇 임베딩 캐시 정책

`viewer/public/embeddings.json`은 빌드 산출물이자 **다음 빌드의 캐시**. SHA-256 hash로 노드 (title + body) 변경 감지해서 변경된 것만 OpenAI 호출.

**`.gitignore`에서 빠져 있어 commit해야 작동**. 매 push 전:
```bash
cd viewer && OPENAI_API_KEY=sk-... npm run build && cd ..
git add wiki/ viewer/public/embeddings.json
git commit -m "..."
git push
```

### 캐시를 외부 storage로 옮길 시점

지금은 git이 정답. 아래 트리거 중 하나라도 닿으면 옮기기:

| 트리거 | 한계치 | 도달 시점 추정 |
|---|---|---|
| `embeddings.json` 크기 | > 50~100MB | 약 3,500 노드 (현 5) |
| 노드 수 | > 5,000 | 동일 |
| `git clone` 시간 | > 10초 | 100MB 가까이 |
| GitHub 단일 파일 한계 | 100MB hard limit | 위 도달 시 강제 분리 |

### 옮길 때 옵션

| 옵션 | 무료 한도 | 코드 변경 | 추천 시점 |
|---|---|---|---|
| **GitHub LFS** | 1GB/월 | 0 (lfs track만) | 단일 큰 파일 |
| **Cloudflare KV** | 1GB, 100k reads/일 | ~20줄 | 작고 자주 접근 |
| **Cloudflare R2** | 10GB, 1M reads/월 | ~30줄 + bucket | 큰 데이터 |

**미리 옮기지 마세요 — YAGNI**. 트리거 닿을 때 반나절 작업으로 처리. 그 사이에 V2 architecture(DB 도입 등) 자체가 진화할 가능성도 있음.
