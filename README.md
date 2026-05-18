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

GitHub에 push하면 Vercel이 자동으로 재배포. **회사 자료(`wiki/work/`)는 배포에서 통째로 제외**됨.

## 구조

- `CLAUDE.md` — 스키마/규약/슬래시 커맨드 정의
- `docs/` — 설계 문서
- `raw/` — 원본 자료 (append-only)
- `wiki/personal/`, `wiki/work/` — 노드 markdown
- `viewer/` — Next.js 시각화 앱
