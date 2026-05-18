# LLM Wiki Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Karpathy 패턴 기반 개인 LLM Wiki(콘텐츠 markdown + Next.js 정적 viewer) V1을 `resume/memory/`에 구축하고 Vercel 무료 플랜에 배포한다.

**Architecture:** 3계층(raw / wiki / viewer) + 스키마(CLAUDE.md). 콘텐츠는 forward-only `links:` 가진 markdown. viewer는 빌드 타임에 `markdown → graph.json` 변환 후 force-directed graph로 렌더. Vercel은 repo root에서 `vercel.json`을 따라 `viewer/`를 빌드, `wiki/personal/`만 빌드 대상에 포함시켜 회사 자료 노출 차단.

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS (+ `@tailwindcss/typography` for `prose` 클래스) + react-force-graph-2d + gray-matter + remark + **fast-glob**(파일 탐색) + **Vitest**(build-graph 테스트, ESM 네이티브). 배포: GitHub private repo + Vercel.

**spec에 없던 신규 결정** (이 plan에서 도입):
- `fast-glob`: Node 20에 `fs.promises.glob` 없음 → 패키지 추가
- `Vitest` (Jest 아님): `remark`/`remark-html` 최신 메이저가 pure ESM이라 ts-jest 호환 어려움. Vitest는 ESM 네이티브
- `@tailwindcss/typography`: NodePanel의 `prose` 스타일링용
- Vercel Root Directory = `viewer/` (전체 repo는 빌드 sandbox에 체크아웃되므로 `viewer/`에서 `../wiki/` 접근 가능)
- 9 엣지 색 매핑은 spec §10의 "best-effort" 결정을 lib/color-map.ts에서 구체화

**Spec 참조:** `/Users/overlay/Documents/workspace/resume/memory/docs/2026-05-18-llm-wiki-design.md`

---

## 0. 사전 조건

- Node.js 20+ 설치 (Next.js 14 요구사항)
- GitHub 계정 + `gh` CLI 또는 웹 UI 접근
- Vercel 계정 (GitHub 로그인 무료)
- 작업 디렉토리: `/Users/overlay/Documents/workspace/resume/memory/`

## 0.1 파일 구조 (최종 산출물)

```
resume/memory/                                     # git repo root
├── .gitignore
├── .claude/
│   └── commands/
│       ├── wiki-ingest.md
│       ├── wiki-lint.md
│       ├── wiki-stats.md
│       └── wiki-validate.md
├── CLAUDE.md                                      # 스키마 + 워크플로우
├── README.md                                      # 사람용 사용 설명
├── docs/
│   ├── 2026-05-18-llm-wiki-design.md              # spec (이미 존재)
│   └── 2026-05-18-llm-wiki-implementation-plan.md # 이 파일 (이미 존재)
├── raw/                                           # 빈 폴더 (.gitkeep)
├── wiki/
│   ├── index.md
│   ├── log.md
│   ├── personal/
│   │   ├── 의미/
│   │   │   ├── 2026-05-18-llm-wiki-pattern.md
│   │   │   └── 2026-05-18-graph-visualization.md
│   │   ├── 통찰/
│   │   │   └── 2026-05-18-static-hosting-suffices.md
│   │   ├── 절차/
│   │   │   └── 2026-05-18-vercel-static-deploy.md
│   │   ├── 사건/                                 # 빈 폴더 (.gitkeep)
│   │   ├── 주장/                                 # 빈 폴더 (.gitkeep)
│   │   └── 주제/
│   │       └── 2026-05-18-knowledge-management.md
│   └── work/                                      # 빈 폴더 (.gitkeep)
└── viewer/                                        # Vercel Root Directory = 여기
    ├── .gitignore
    ├── vercel.json                                # viewer/ 안에 위치
    ├── package.json                               # "type": "module"
    ├── tsconfig.json
    ├── next.config.mjs                            # ESM (.mjs)
    ├── tailwind.config.ts
    ├── postcss.config.mjs                         # ESM (.mjs)
    ├── vitest.config.ts                           # ts-jest 대신 Vitest
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── ClientGraphPage.tsx
    │   ├── globals.css
    │   ├── node/[id]/page.tsx
    │   ├── log/page.tsx
    │   └── stats/page.tsx
    ├── components/
    │   ├── ForceGraphCanvas.tsx        # 'use client' 동적 import
    │   ├── NodePanel.tsx
    │   ├── FilterBar.tsx
    │   ├── EdgeLegend.tsx
    │   └── NodeBadge.tsx
    ├── lib/
    │   ├── schema.ts                   # TypeScript 타입 + filterGraph 순수 함수
    │   ├── color-map.ts                # node/edge type → 색
    │   └── build-graph.ts              # markdown → graph (라이브러리만, CLI 없음)
    ├── scripts/
    │   └── build.ts                    # CLI 엔트리: lib/build-graph.ts를 호출해 public/graph.json 출력
    ├── public/
    │   └── graph.json                  # 빌드 산출물 (.gitignore)
    └── __tests__/
        ├── fixtures/
        │   ├── wiki/personal/semantic/sample.md     # ASCII 폴더명 (실제 wiki/는 한글 폴더)
        │   ├── wiki/personal/semantic/another.md
        │   └── wiki/work/insight/secret.md
        └── lib/
            ├── build-graph.test.ts
            └── filter-graph.test.ts
```

## 0.2 시드 데이터 명세 (V1 acceptance 기준)

**5 노드** (모두 `wiki/personal/` 아래):

| ID | 폴더(node_type) | 한 줄 요약 |
|---|---|---|
| `2026-05-18-llm-wiki-pattern` | 의미 | Karpathy의 LLM Wiki 패턴 정의 |
| `2026-05-18-graph-visualization` | 의미 | force-directed graph 시각화란 |
| `2026-05-18-static-hosting-suffices` | 통찰 | 임베딩 빌드타임 처리면 정적 호스팅으로 충분 |
| `2026-05-18-vercel-static-deploy` | 절차 | Next.js SSG → Vercel 배포 절차 |
| `2026-05-18-knowledge-management` | 주제 | 지식 관리 시스템 분류 |

**6 forward 엣지** (frontmatter `links:`에 기재):

| Source | Target | Type | 이유 |
|---|---|---|---|
| `llm-wiki-pattern` | `vercel-static-deploy` | 전제 | wiki 패턴을 알아야 deploy 의미 있음 |
| `llm-wiki-pattern` | `knowledge-management` | 주제태그 | 지식관리 주제에 속함 |
| `graph-visualization` | `llm-wiki-pattern` | 확장 | wiki를 어떻게 보일지 확장 |
| `graph-visualization` | `knowledge-management` | 주제태그 | 같은 주제 |
| `static-hosting-suffices` | `llm-wiki-pattern` | 지지 | wiki 아이디어를 지지 |
| `static-hosting-suffices` | `knowledge-management` | 주제태그 | 같은 주제 |

**기대 in_degree** (build-graph가 자동 계산):
- `llm-wiki-pattern`: 2 (from graph-visualization, static-hosting-suffices)
- `vercel-static-deploy`: 1 (from llm-wiki-pattern)
- `knowledge-management`: 3 (from 3개)
- `graph-visualization`: 0
- `static-hosting-suffices`: 0

---

## Chunk 1: 콘텐츠 레이어 기반

이 chunk는 viewer 없이도 작동하는 마크다운 wiki 자체를 완성한다. git repo, CLAUDE.md(스키마), 4개 슬래시 커맨드, 시드 노드 5개, index/log 파일.

### Task 1.1: Git repo 초기화 + .gitignore

**Files:**
- Create: `resume/memory/.gitignore`

- [ ] **Step 1: git init**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git init
git config user.email "vtylecontact@gmail.com"
git config user.name "$(git -C /Users/overlay/Documents/workspace/resume config user.name 2>/dev/null || echo overlay)"
```

Expected: `Initialized empty Git repository in .../resume/memory/.git/`

- [ ] **Step 2: .gitignore 작성**

`.gitignore` 내용:
```
# Node
node_modules/
npm-debug.log*
.npm

# Next.js
.next/
out/

# Build artifacts (viewer 빌드 산출물은 commit 안 함)
viewer/public/graph.json

# Env
.env
.env.local
.env*.local

# IDE/OS
.DS_Store
.vscode/
.idea/

# Jest
coverage/
```

- [ ] **Step 3: 초기 commit (spec/plan docs 포함)**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add .gitignore docs/
git commit -m "chore: init repo, add spec and plan docs"
```

Expected: 3 files changed (`.gitignore`, `docs/2026-05-18-llm-wiki-design.md`, `docs/2026-05-18-llm-wiki-implementation-plan.md`).

---

### Task 1.2: 디렉토리 골격 + .gitkeep

**Files:**
- Create: `raw/.gitkeep`, `wiki/work/.gitkeep`, `wiki/personal/사건/.gitkeep`, `wiki/personal/주장/.gitkeep`

- [ ] **Step 1: 빈 폴더 생성 + .gitkeep**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
mkdir -p raw wiki/work wiki/personal/{의미,통찰,절차,사건,주장,주제}
touch raw/.gitkeep wiki/work/.gitkeep wiki/personal/사건/.gitkeep wiki/personal/주장/.gitkeep
```

- [ ] **Step 2: 디렉토리 구조 확인**

```bash
find /Users/overlay/Documents/workspace/resume/memory -type d -not -path '*/\.git*' -not -path '*/node_modules*' | sort
```

Expected 출력에 다음 경로가 모두 포함:
```
/Users/overlay/Documents/workspace/resume/memory
/Users/overlay/Documents/workspace/resume/memory/docs
/Users/overlay/Documents/workspace/resume/memory/raw
/Users/overlay/Documents/workspace/resume/memory/wiki
/Users/overlay/Documents/workspace/resume/memory/wiki/personal
/Users/overlay/Documents/workspace/resume/memory/wiki/personal/사건
/Users/overlay/Documents/workspace/resume/memory/wiki/personal/의미
/Users/overlay/Documents/workspace/resume/memory/wiki/personal/절차
/Users/overlay/Documents/workspace/resume/memory/wiki/personal/주장
/Users/overlay/Documents/workspace/resume/memory/wiki/personal/주제
/Users/overlay/Documents/workspace/resume/memory/wiki/personal/통찰
/Users/overlay/Documents/workspace/resume/memory/wiki/work
```

---

### Task 1.3: `resume/memory/CLAUDE.md` 작성

**Files:**
- Create: `resume/memory/CLAUDE.md`

- [ ] **Step 1: 파일 작성**

전체 내용:

````markdown
# LLM Wiki — Claude 운영 지침

이 폴더는 개인 LLM Wiki다. 콘텐츠는 markdown, 시각화는 `viewer/`의 Next.js 정적 사이트.

설계 스펙: [`docs/2026-05-18-llm-wiki-design.md`](docs/2026-05-18-llm-wiki-design.md).

## 상위 폴더 규칙 오버라이드

- `resume/CLAUDE.md`의 "md → html 자동 변환" 규칙(`convert.mjs`)은 `resume/memory/` 트리에 적용하지 않는다.
- 이유: wiki는 Next.js viewer가 렌더링하고, raw/는 viewer가 직접 참조하지 않으며, docs/는 사람이 마크다운으로 직접 읽음.
- 예외: 향후 `resume/memory/docs/` 안에 외부 공유용 정적 페이지를 만들 필요가 생기면 그때 개별적으로 변환.

## 노드 타입 (6)

| 타입 | 정의 |
|---|---|
| 의미 | 개념/용어의 정의·해설 |
| 통찰 | 관찰에서 추출한 인사이트 |
| 절차 | 단계적 how-to |
| 사건 | 특정 시점의 일/경험 |
| 주장 | 누군가의 의견/논증 |
| 주제 | 다른 노드를 묶는 카테고리 |

## 엣지 타입 (9)

| 타입 | 의미 |
|---|---|
| 지지 | A가 B를 뒷받침 |
| 반박 | A가 B를 반박 |
| 확장 | A가 B를 확장/심화 |
| 구체화 | A가 B의 구체 사례 |
| 정련 | A가 B를 다듬은 후속 |
| 유사 | A와 B가 비슷한 패턴 |
| 촉발 | A가 B 생각의 계기 |
| 주제태그 | A가 주제 B에 속함 |
| 전제 | A가 B의 전제 조건 |

엣지는 directed. 양방향이면 두 엣지로 표현.

## 노드 frontmatter 필수 형식

```yaml
---
id: 2026-05-18-some-slug                # ASCII만, 파일명 - .md
title: 한글 제목 가능
node_type: 의미                         # 6종 중 하나
memory_type: mental_model               # mental_model | observation | world_fact | experience
created: 2026-05-18
last_reviewed: 2026-05-18
confidence: high                        # high | medium | low (optional)
sources:                                # optional
  - raw/...
  - https://...
links:                                  # optional, forward-only
  - to: 다른-노드-id
    type: 전제
tags: [자유태그]                        # optional
---
```

### 진실 출처 (Source of Truth)

- `scope` (work/personal): **파일 경로**에서 자동 추출. frontmatter에 적지 않음.
- `node_type`: **frontmatter**. 폴더(`wiki/.../의미/`)는 사람 편의용. lint가 폴더-frontmatter 불일치 보고.
- 엣지: **frontmatter `links:`(forward-only)**. 본문 `[[id]]`는 사람 가독성용, viewer가 파싱하지 않음.
- `id`: **파일명**. frontmatter `id`는 redundant 사본.

### 링크 규칙

- `links:`는 forward(나가는) 엣지만 기재.
- 백링크/in-degree는 build-graph가 자동 계산.
- 새 노드 만들 때 기존 노드의 frontmatter를 수정하지 않는다(인용받는 쪽은 수정 X).

## node_type ↔ memory_type 권장 매핑

| node_type | 권장 memory_type |
|---|---|
| 의미 | world_fact 또는 mental_model |
| 통찰 | mental_model 또는 observation |
| 절차 | world_fact 또는 experience |
| 사건 | experience 또는 observation |
| 주장 | world_fact 또는 observation |
| 주제 | mental_model |

비전형 조합은 허용되나 `/wiki-lint`가 경고만 보고.

## 슬러그 규약

- 파일명 = `YYYY-MM-DD-ascii-slug.md` (ASCII만)
- 한글은 `title` frontmatter에만 사용

## 슬래시 커맨드

- `/wiki-ingest [입력]` — URL/파일/텍스트를 raw/ 저장 후 노드 분해 제안
- `/wiki-lint` — 깨진 링크, 고아, 중복, stale, frontmatter 누락 보고 (수정 X)
- `/wiki-stats` — 노드/엣지 수, 타입별 분포, 허브 노드
- `/wiki-validate [glob]` — 직접 쓴 markdown의 frontmatter/링크/슬러그/타입 정합성 보강

상세 정의는 `.claude/commands/wiki-*.md`.

## 질문 응답 규칙

- 이 폴더에서 질문 받으면 먼저 `wiki/index.md`와 관련 노드를 grep으로 찾는다.
- 답변에 사용한 노드는 `(id)` 형태로 인용.
- 답변 과정에서 새 통찰이 나오면 "이거 노드로 저장할까요?" 제안.
- wiki 외부 지식으로 답할 때는 명시.

## Claude auto-memory와의 관계

`~/.claude/projects/-Users-overlay-Documents-workspace-resume-memory/memory/`의 auto-memory(MEMORY.md 인덱스 + 작은 메모리 파일들)는 Claude 행동/사용자 선호 기억용. **이 wiki와 별개**로 운영한다 — V1에서는 어느 방향으로도 동기화/ingest 안 함.

## viewer

- 위치: `viewer/` (Next.js 14, App Router)
- 빌드: `cd viewer && npm install && npm run build`
- 로컬: `cd viewer && npm run dev` → http://localhost:3000
- 빌드 시 환경변수 `WIKI_INCLUDE_WORK=true`일 때만 `wiki/work/` 포함. 기본값(미설정)은 `wiki/personal/`만.
- Vercel 배포는 항상 personal만 포함(회사 자료 노출 방지).
````

- [ ] **Step 2: 핵심 키워드 포함 여부 검증**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
for kw in "노드 타입" "엣지 타입" "frontmatter" "진실 출처" "forward-only" "wiki-ingest" "wiki-lint" "wiki-stats" "wiki-validate" "convert.mjs"; do
  grep -q "$kw" CLAUDE.md && echo "OK: $kw" || echo "MISSING: $kw"
done
```

Expected: 10줄, 모두 `OK:`.

---

### Task 1.4: 4개 슬래시 커맨드 파일

**Files:**
- Create: `.claude/commands/wiki-ingest.md`, `.claude/commands/wiki-lint.md`, `.claude/commands/wiki-stats.md`, `.claude/commands/wiki-validate.md`

- [ ] **Step 1: `.claude/commands/wiki-ingest.md`**

```markdown
# /wiki-ingest

$ARGUMENTS

다음 절차를 순서대로 실행한다. 각 단계마다 사용자 승인을 받는다.

## 1. raw 저장

- $ARGUMENTS가 URL이면 WebFetch로 가져와 `raw/YYYY-MM-DD-slug.md`로 저장
  - frontmatter: `source: <url>`, `fetched_at: <iso>`, `title: ...`
- 파일 경로이면 raw/로 복사
- 인라인 텍스트이면 raw/에 그대로 저장

## 2. 분해 제안

원본에서 추출 가능한 노드 후보를 표로 제시:

| 제안 id | node_type | scope (work/personal) | 한 줄 요약 | 제안 forward links |
|---|---|---|---|---|

**자동 생성 금지** — 사용자 승인 후에만 진행.

## 3. 승인된 노드만 작성

- 경로: `wiki/{scope}/{node_type}/YYYY-MM-DD-slug.md`
- frontmatter 모든 필수 필드 채움: id, title, node_type, memory_type, created, last_reviewed, sources, links
- 슬러그는 ASCII만, 한글은 title에
- scope는 폴더 경로로 결정되므로 frontmatter에 적지 않음

## 4. 기존 노드는 수정하지 않음

forward-only 정책. 백링크는 build-graph가 자동 계산. 사용자가 명시적으로 "기존 노드 X도 새 노드 Y를 가리키게 해줘"라고 지시할 때만 X 수정.

## 5. 로그

`wiki/log.md`에 한 줄 append:
`- YYYY-MM-DD HH:MM ingest <slug> (+N nodes, +M edges)`

## 6. 빌드 안내

자동 빌드 안 함. "viewer 확인하려면 `cd viewer && npm run dev`" 메시지만.
```

- [ ] **Step 2: `.claude/commands/wiki-lint.md`**

```markdown
# /wiki-lint

`wiki/` 전체를 읽기 전용으로 스캔해 다음을 보고. **자동 수정 금지**.

## 점검 항목

1. **깨진 링크**: 어떤 노드의 `links[].to`가 존재하지 않는 id를 가리키는지
2. **고아 노드**: in-edge가 0개인 노드 (build-graph 인덱싱과 동일 로직)
3. **중복 후보**: 같은 node_type 내 title 유사도 높은 쌍 (Levenshtein distance < 5)
4. **stale**: `last_reviewed`가 90일 이상 지난 노드
5. **frontmatter 누락**: 필수 필드(id, title, node_type, memory_type, created, last_reviewed) 빠진 노드
6. **타입 불일치**: 폴더 경로의 node_type과 frontmatter `node_type`이 다른 노드
7. **비전형 memory_type**: node_type ↔ memory_type 권장 매핑(CLAUDE.md)에서 벗어난 노드 (warning)
8. **id-파일명 불일치**: frontmatter `id`와 파일명(`.md` 제거)이 다른 노드

## 출력 형식

각 항목을 섹션으로 나눠 표로 출력. 사용자가 항목별로 "이거 고쳐"라고 지시하면 그때 별도 Edit/Write로 수정.
```

- [ ] **Step 3: `.claude/commands/wiki-stats.md`**

```markdown
# /wiki-stats

빠른 헬스 체크.

## 출력

- **총 노드 수**, **총 엣지 수** (build-graph 로직 재사용 — Bash로 `wiki/**/*.md` glob 후 frontmatter `links:` 카운트)
- **node_type별 분포** (6종 카운트 표)
- **scope별 분포** (work/personal 카운트)
- **memory_type별 분포** (4종 카운트)
- **최근 추가 노드**: 7일/30일 (log.md 또는 frontmatter `created` 기준)
- **허브 노드 Top 10**: in-degree 큰 순서 (build-graph와 동일 인덱싱)
- **주제 노드 자식 수 Top**: 주제 노드별 `주제태그` in-edge 카운트

모두 표 형태로 출력.
```

- [ ] **Step 4: `.claude/commands/wiki-validate.md`**

```markdown
# /wiki-validate

$ARGUMENTS

`$ARGUMENTS`가 glob 패턴이면 그 파일들을, 비어있으면 가장 최근 변경된 wiki/ 파일들을 대상으로 한다.

## 보강 항목 (각각 사용자 승인 후 적용)

1. **frontmatter 추정 채움**: 빠진 필수 필드를 본문/파일경로/날짜에서 추정해 제안
   - id ← 파일명 - .md
   - created ← 파일 stat 또는 git log first-add
   - last_reviewed ← 오늘
   - title ← 본문 첫 H1
   - node_type ← 폴더명 (`wiki/.../의미/` → "의미")
   - memory_type ← node_type 권장 매핑(CLAUDE.md)에서 첫 옵션 제안
2. **본문 wikilink → `links:` 승격**: 본문에 `[[id]]`가 있으면 forward `links:`로 추가 제안. 엣지 타입은 사용자에게 물음
3. **폴더-node_type 정합성**: 폴더와 frontmatter `node_type`이 다르면 파일 이동 제안
4. **폴더-scope 정합성**: 파일이 `wiki/work/` 아래인지 `wiki/personal/` 아래인지 확인. frontmatter에 잔존 `scope:` 필드 있으면 제거 제안
5. **id-파일명 정합성**: frontmatter `id`와 파일명(`.md` 제거)이 다르면 둘 중 하나로 통일 제안
6. **ASCII 슬러그 검증**: 파일명에 non-ASCII 있으면 영문 슬러그로 rename 제안

## 결과

모든 변경을 diff로 보여주고 승인 후 적용. 백링크 양방향 동기화는 수행하지 않음(forward-only 정책).
```

- [ ] **Step 5: 4개 파일 존재 확인**

```bash
ls /Users/overlay/Documents/workspace/resume/memory/.claude/commands/
```

Expected: `wiki-ingest.md  wiki-lint.md  wiki-stats.md  wiki-validate.md`

---

### Task 1.5: 시드 노드 5개 작성

각 노드는 frontmatter + 본문(2-5 문단). 본문은 spec의 내용을 풀어 쓴 요약 수준.

**Files:**
- Create:
  - `wiki/personal/의미/2026-05-18-llm-wiki-pattern.md`
  - `wiki/personal/의미/2026-05-18-graph-visualization.md`
  - `wiki/personal/통찰/2026-05-18-static-hosting-suffices.md`
  - `wiki/personal/절차/2026-05-18-vercel-static-deploy.md`
  - `wiki/personal/주제/2026-05-18-knowledge-management.md`

- [ ] **Step 1: `llm-wiki-pattern.md`**

```markdown
---
id: 2026-05-18-llm-wiki-pattern
title: LLM Wiki 패턴
node_type: 의미
memory_type: mental_model
created: 2026-05-18
last_reviewed: 2026-05-18
confidence: high
sources:
  - https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
links:
  - to: 2026-05-18-vercel-static-deploy
    type: 전제
  - to: 2026-05-18-knowledge-management
    type: 주제태그
tags: [지식관리, AI]
---

# LLM Wiki 패턴

Andrej Karpathy가 제안한 개인 지식 베이스 아키텍처 패턴. 기존 RAG와 달리 **LLM이 markdown 위키를 지속적으로 유지보수**하며 지식을 누적한다. "지식이 컴파일되어 유지되지, 매번 재파생되지 않는다"가 핵심 주장.

## 3계층 구조

1. **raw/** — 변경 불가능한 원본
2. **wiki/** — LLM이 작성·유지하는 상호연결된 markdown
3. **스키마(CLAUDE.md)** — 워크플로우와 규약을 정의

## 워크플로우

- **Ingest**: 새 자료 추가 시 요약 작성 + 관련 페이지 5~15개 업데이트
- **Query**: wiki에서 관련 페이지 찾아 합성된 답변
- **Lint**: 모순/고아/누락 교차참조 주기 점검
```

- [ ] **Step 2: `graph-visualization.md`**

```markdown
---
id: 2026-05-18-graph-visualization
title: Force-directed Graph 시각화
node_type: 의미
memory_type: world_fact
created: 2026-05-18
last_reviewed: 2026-05-18
confidence: high
sources:
  - https://careerhackeralex.vercel.app/memory
links:
  - to: 2026-05-18-llm-wiki-pattern
    type: 확장
  - to: 2026-05-18-knowledge-management
    type: 주제태그
tags: [시각화, 그래프]
---

# Force-directed Graph 시각화

노드 간 관계를 물리 시뮬레이션(스프링/반발력)으로 자동 배치하는 시각화 기법. 자기조직화된 레이아웃이 클러스터 구조를 자연스럽게 드러낸다.

## 주요 라이브러리

- `react-force-graph-2d/3d`: React API 단순, MVP에 적합
- `cytoscape.js`: 더 강력하지만 학습곡선 ↑
- `D3.js` 직접: 가장 유연, 가장 어려움

## 시각 매핑 패턴

- 노드 색 = 카테고리(타입)
- 노드 크기 = in-degree(허브성)
- 엣지 색 = 관계 타입
- 엣지 굵기 = 가중치/빈도(선택)
```

- [ ] **Step 3: `static-hosting-suffices.md`**

```markdown
---
id: 2026-05-18-static-hosting-suffices
title: 정적 호스팅으로 충분하다
node_type: 통찰
memory_type: mental_model
created: 2026-05-18
last_reviewed: 2026-05-18
confidence: high
sources: []
links:
  - to: 2026-05-18-llm-wiki-pattern
    type: 지지
  - to: 2026-05-18-knowledge-management
    type: 주제태그
tags: [아키텍처, 비용]
---

# 정적 호스팅으로 충분하다

읽기 전용 wiki를 viewer로 보여줄 때, **검색/그래프 데이터를 빌드 타임에 미리 계산**하면 런타임 서버가 전혀 필요 없다. 결과는 정적 JSON으로 deploy되고, 모든 인터랙션은 클라이언트 자바스크립트로 처리.

## 함의

- Vercel/Cloudflare Pages/Netlify 무료 플랜으로 충분
- 인증/DB 없음 → 운영 부담 0
- 편집은 git push로만 → 자연스러운 history/diff
- 임베딩도 빌드 타임에 미리 계산하면 클라이언트에서 코사인 유사도 가능 (수천 노드 이하)

## 한계

- 실시간 협업 불가
- 사용자별 권한 분리 불가 → 회사 자료는 빌드 input에서 통째로 제외 필요
- 노드 수가 만 단위로 가면 graph.json 크기와 클라이언트 렌더링 비용 ↑
```

- [ ] **Step 4: `vercel-static-deploy.md`**

```markdown
---
id: 2026-05-18-vercel-static-deploy
title: Next.js SSG를 Vercel에 배포하기
node_type: 절차
memory_type: experience
created: 2026-05-18
last_reviewed: 2026-05-18
confidence: medium
sources: []
links: []
tags: [Vercel, 배포]
---

# Next.js SSG를 Vercel에 배포하기

## 단계

1. GitHub repo에 코드 push (private 가능)
2. https://vercel.com/new 에서 repo import
3. Framework Preset: "Other" (또는 monorepo면 Root Directory를 적절히)
4. `vercel.json`에 `buildCommand`, `outputDirectory` 명시
5. 환경변수 필요하면 Vercel 프로젝트 설정에서 추가
6. Deploy 클릭 → 첫 빌드 1~3분
7. Production URL 발급, push 시 자동 재배포

## monorepo / 부모 폴더 접근 필요한 경우

Vercel `Root Directory: viewer/`로 설정하면 빌드 sandbox가 viewer/만 보므로 `../wiki/` 접근 불가. 해결: Root는 repo root로 두고 `vercel.json`의 `buildCommand`를 `cd viewer && npm run build`로 명시.

## 무료 플랜 제약

- Password Protection 없음 (Pro만)
- Edge Functions 제한
- 빌드 시간 6000분/월 (개인 wiki는 충분)
```

- [ ] **Step 5: `knowledge-management.md`**

```markdown
---
id: 2026-05-18-knowledge-management
title: 지식 관리 시스템
node_type: 주제
memory_type: mental_model
created: 2026-05-18
last_reviewed: 2026-05-18
confidence: high
sources: []
links: []
tags: [메타]
---

# 지식 관리 시스템

개인이 누적한 지식을 구조화·검색·연결하는 시스템 전반의 카테고리.

## 하위 분류

- **개인 wiki**: Karpathy 패턴, Obsidian, Logseq
- **시각화**: 그래프 기반, 캘린더 기반, 카드 기반
- **에이전트 메모리**: Hindsight, mem0, LangChain memory
- **참고 관리**: Zotero, Notion 클리퍼

## 이 주제에 속하는 노드들

이 노드는 주제 허브로, 다른 노드가 `links: [{to, type: 주제태그}]`로 가리킨다. build-graph가 in-edge를 자동 계산.
```

- [ ] **Step 6: 5개 파일 존재 확인**

```bash
find /Users/overlay/Documents/workspace/resume/memory/wiki -name "*.md" -not -name ".gitkeep" | sort
```

Expected 5줄:
```
.../wiki/personal/의미/2026-05-18-graph-visualization.md
.../wiki/personal/의미/2026-05-18-llm-wiki-pattern.md
.../wiki/personal/절차/2026-05-18-vercel-static-deploy.md
.../wiki/personal/주제/2026-05-18-knowledge-management.md
.../wiki/personal/통찰/2026-05-18-static-hosting-suffices.md
```

- [ ] **Step 7: frontmatter 파싱 가능 여부 sanity check**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
find wiki/personal -name '*.md' -type f -print0 | while IFS= read -r -d '' f; do
  if head -1 "$f" | grep -q '^---$'; then
    echo "OK: $f"
  else
    echo "FAIL: $f"
  fi
done
```

Expected: 5줄, 모두 `OK:`로 시작.

---

### Task 1.6: `wiki/index.md`, `wiki/log.md`, `README.md`

**Files:**
- Create: `wiki/index.md`, `wiki/log.md`, `README.md`

- [ ] **Step 1: `wiki/index.md`**

```markdown
# Wiki Index

마지막 갱신: 2026-05-18

## personal

### 의미
- [LLM Wiki 패턴](personal/의미/2026-05-18-llm-wiki-pattern.md) — Karpathy 패턴 정의
- [Force-directed Graph 시각화](personal/의미/2026-05-18-graph-visualization.md) — 그래프 시각화 기법

### 통찰
- [정적 호스팅으로 충분하다](personal/통찰/2026-05-18-static-hosting-suffices.md) — 빌드 타임 처리로 서버 불필요

### 절차
- [Next.js SSG를 Vercel에 배포하기](personal/절차/2026-05-18-vercel-static-deploy.md) — 단계별 배포 절차

### 주제
- [지식 관리 시스템](personal/주제/2026-05-18-knowledge-management.md) — 메타 카테고리

## work

(비어 있음)
```

- [ ] **Step 2: `wiki/log.md`**

```markdown
# Wiki Change Log

새 노드/엣지/리뷰 변경을 한 줄씩 append. 시간 역순(최신이 위).

---

- 2026-05-18 14:00 seed: 5 nodes, 6 edges (initial)
```

- [ ] **Step 3: `README.md`**

````markdown
# LLM Wiki

Karpathy의 [LLM Wiki 패턴](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)을 따라 구현한 개인 지식 베이스.

## 사용법

### 콘텐츠 추가

```bash
# 1. Claude를 통해 (긴 글 → 여러 노드 분해)
# Claude Code 안에서:
/wiki-ingest https://...

# 2. 직접 markdown 작성
echo '---' > wiki/personal/통찰/$(date +%F)-새-노드.md
# ... frontmatter + 본문 작성
/wiki-validate wiki/personal/통찰/$(date +%F)-새-노드.md
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
````

---

### Task 1.7: Chunk 1 commit

- [ ] **Step 1: 변경 사항 확인**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git status --short
```

Expected에 포함:
- `.claude/commands/wiki-*.md` (4개)
- `CLAUDE.md`
- `README.md`
- `docs/2026-05-18-llm-wiki-implementation-plan.md`
- `raw/.gitkeep`
- `wiki/index.md`, `wiki/log.md`
- `wiki/personal/.../*.md` (5개) + `.gitkeep` 2개
- `wiki/work/.gitkeep`

- [ ] **Step 2: 모두 add + commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add .
git commit -m "feat(content): seed wiki with 5 nodes, schema, slash commands"
```

Expected: commit 성공, 약 15개 파일 변경.

---

## Chunk 2: Viewer Scaffold + Type System

### Task 2.1: Next.js 프로젝트 셋업

**Files:**
- Create: `viewer/package.json`, `viewer/tsconfig.json`, `viewer/next.config.js`, `viewer/tailwind.config.ts`, `viewer/postcss.config.js`, `viewer/.gitignore`, `viewer/app/globals.css`, `viewer/app/layout.tsx`, `viewer/app/page.tsx`

- [ ] **Step 1: 디렉토리 생성**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
mkdir -p viewer/app viewer/components viewer/lib viewer/scripts viewer/public \
         viewer/__tests__/lib \
         viewer/__tests__/fixtures/wiki/personal/semantic \
         viewer/__tests__/fixtures/wiki/work/insight
```

(테스트 fixture는 ASCII 폴더명으로 — 한글 폴더는 NFC/NFD 차이로 CI에서 깨질 수 있음. 실제 `wiki/`는 한글 폴더 그대로 사용 — Vercel 빌드 환경(Linux NFC)에서 git-tracked 한글 경로는 정상 동작 확인됨.)

- [ ] **Step 2: `viewer/package.json`**

```json
{
  "name": "llm-wiki-viewer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "prebuild": "tsx scripts/build.ts",
    "predev": "tsx scripts/build.ts",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "gray-matter": "^4.0.3",
    "remark": "^15.0.1",
    "remark-html": "^16.0.1",
    "react-force-graph-2d": "^1.25.5",
    "fast-glob": "^3.3.2"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.4.5",
    "tailwindcss": "^3.4.4",
    "@tailwindcss/typography": "^0.5.13",
    "postcss": "^8.4.38",
    "autoprefixer": "^10.4.19",
    "vitest": "^1.6.0",
    "tsx": "^4.16.2"
  }
}
```

⚠️ 중요: `"type": "module"`이 필요 (vitest + ESM imports). Next.js 14는 ESM/CJS 혼용 OK. `scripts/build.ts`는 `import.meta.url`로 `__dirname` 흉내 가능.

- [ ] **Step 3: `viewer/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: `viewer/next.config.mjs`** (확장자 주의 — ESM)

`package.json`의 `"type": "module"` 때문에 `.js`로 두면 Node가 ESM으로 파싱하면서 `module.exports`에서 `ReferenceError`. ESM 형태로 작성하고 확장자를 `.mjs`로 강제.

```js
/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true
};

export default config;
```

(spec에서 `output: 'standalone'`은 V2 검토 — V1은 SSG만으로 충분, standalone은 serverless function 번들링 용이라 Vercel 무관.)

- [ ] **Step 5: `viewer/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [typography]
};
export default config;
```

- [ ] **Step 6: `viewer/postcss.config.mjs`** (ESM, 같은 이유)

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
};
```

- [ ] **Step 7: `viewer/.gitignore`**

```
node_modules/
.next/
out/
public/graph.json
.env*.local
coverage/
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 8: `viewer/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #__next { height: 100%; margin: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
```

- [ ] **Step 9: `viewer/app/layout.tsx` (최소)**

```tsx
import './globals.css';

export const metadata = { title: 'LLM Wiki', description: 'Personal knowledge graph' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: `viewer/app/page.tsx` (placeholder, Chunk 4에서 본격 구현)**

```tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">LLM Wiki</h1>
      <p>그래프는 Chunk 4에서 구현됩니다.</p>
    </main>
  );
}
```

- [ ] **Step 11: 의존성 설치만 (dev 부팅은 Task 3.5 이후에 검증)**

```bash
cd /Users/overlay/Documents/workspace/resume/memory/viewer
npm install
```

Expected: warnings 허용, errors 0개. `node_modules/` 생성. peer dependency 경고가 있어도 next, react는 정상 설치돼야 함.

```bash
ls node_modules/.bin/ | grep -E "^(next|tsx|vitest)$"
```

Expected: 3줄 (next, tsx, vitest).

⚠️ 이 시점에는 `scripts/build.ts`가 없어 `npm run dev`가 실패한다. dev 부팅 검증은 Task 3.5에서.

---

### Task 2.2: `viewer/lib/schema.ts` — TypeScript 타입

**Files:**
- Create: `viewer/lib/schema.ts`

- [ ] **Step 1: 타입 정의**

```ts
export const NODE_TYPES = ['의미', '통찰', '절차', '사건', '주장', '주제'] as const;
export type NodeType = typeof NODE_TYPES[number];

export const EDGE_TYPES = [
  '지지', '반박', '확장', '구체화', '정련', '유사', '촉발', '주제태그', '전제'
] as const;
export type EdgeType = typeof EDGE_TYPES[number];

export const MEMORY_TYPES = [
  'mental_model', 'observation', 'world_fact', 'experience'
] as const;
export type MemoryType = typeof MEMORY_TYPES[number];

export type Scope = 'work' | 'personal';
export type Confidence = 'high' | 'medium' | 'low';

export interface NodeFrontmatter {
  id: string;
  title: string;
  node_type: NodeType;
  memory_type: MemoryType;
  created: string;             // YYYY-MM-DD
  last_reviewed: string;
  confidence?: Confidence;
  sources?: string[];
  links?: Array<{ to: string; type: EdgeType }>;
  tags?: string[];
}

export interface GraphNode {
  id: string;
  title: string;
  node_type: NodeType;
  memory_type: MemoryType;
  scope: Scope;
  in_degree: number;
  out_degree: number;
  last_reviewed: string;
  confidence?: Confidence;
  tags?: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  contents: Record<string, string>;   // id → html
  generated_at: string;
}
```

---

### Task 2.3: `viewer/lib/color-map.ts`

**Files:**
- Create: `viewer/lib/color-map.ts`

- [ ] **Step 1: 색 매핑**

```ts
import type { NodeType, EdgeType } from './schema';

export const NODE_COLOR: Record<NodeType, string> = {
  '의미':   '#3b82f6', // blue
  '통찰':   '#eab308', // yellow
  '절차':   '#22c55e', // green
  '사건':   '#f97316', // orange
  '주장':   '#ef4444', // red
  '주제':   '#a855f7'  // purple
};

export const EDGE_COLOR: Record<EdgeType, string> = {
  '지지':     '#22c55e',
  '반박':     '#ef4444',
  '확장':     '#3b82f6',
  '구체화':   '#06b6d4',
  '정련':     '#8b5cf6',
  '유사':     '#94a3b8',
  '촉발':     '#f59e0b',
  '주제태그': '#a855f7',
  '전제':     '#0ea5e9'
};

export const NODE_TYPE_LABEL_EMOJI: Record<NodeType, string> = {
  '의미': '🔵', '통찰': '🟡', '절차': '🟢', '사건': '🟠', '주장': '🔴', '주제': '🟣'
};
```

---

### Task 2.4: `viewer/vitest.config.ts` + Vitest 셋업

**Files:**
- Create: `viewer/vitest.config.ts`, `viewer/__tests__/fixtures/...`

- [ ] **Step 1: `viewer/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    globals: false
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') }
  }
});
```

(Vitest는 ESM 네이티브라 remark/remark-html 등 pure ESM 모듈을 import해도 추가 설정 불필요.)

- [ ] **Step 2: Fixture 1: `__tests__/fixtures/wiki/personal/semantic/sample.md`**

```markdown
---
id: sample-personal-node
title: 샘플 개인 노드
node_type: 의미
memory_type: world_fact
created: 2026-05-18
last_reviewed: 2026-05-18
links:
  - to: another-node
    type: 전제
---

# 샘플

본문 내용.
```

- [ ] **Step 3: Fixture 2: `__tests__/fixtures/wiki/personal/semantic/another.md`**

```markdown
---
id: another-node
title: 다른 노드
node_type: 의미
memory_type: world_fact
created: 2026-05-18
last_reviewed: 2026-05-18
---

# 다른 노드
```

- [ ] **Step 4: Fixture 3 (work, secret): `__tests__/fixtures/wiki/work/insight/secret.md`**

```markdown
---
id: secret-work-node
title: 회사 비밀
node_type: 통찰
memory_type: experience
created: 2026-05-18
last_reviewed: 2026-05-18
---

# 회사 비밀

이건 work 폴더라 빌드에서 제외돼야 한다.
```

⚠️ Fixture의 폴더명(`semantic`, `insight`)은 실제 wiki의 폴더명(`의미`, `통찰`)과 다르다. 이유: CI에서 한글 경로 인코딩 이슈를 fixture에서 만나지 않기 위함. fixture의 `node_type` frontmatter는 실제 한글 값(`의미`/`통찰`) 그대로. parseNode는 frontmatter의 `node_type`을 신뢰하고, scope는 path[1](`personal`/`work`)만 본다.

- [ ] **Step 5: vitest 빈 실행 확인**

```bash
cd /Users/overlay/Documents/workspace/resume/memory/viewer
npm test
```

Expected: "No test files found" — exit code 0이거나, 1이지만 명확한 메시지. 다음 task에서 첫 테스트 추가.

---

### Task 2.5: `viewer/vercel.json`

**Files:**
- Create: `viewer/vercel.json`

Vercel Project 설정에서 Root Directory를 `viewer/`로 지정한다(Task 5.2). Vercel은 Root Directory 설정 시 **전체 repo를 체크아웃한 뒤 viewer/에서 빌드 실행**하므로, `viewer/lib/build-graph.ts`에서 `../wiki/`(즉 repo-root/wiki/) 접근 가능.

- [ ] **Step 1: `viewer/vercel.json` 작성**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "git": {
    "deploymentEnabled": { "main": true }
  }
}
```

(buildCommand/outputDirectory는 Next.js 빌더 기본값 사용. `framework: nextjs` 명시는 안전장치.)

- [ ] **Step 2: 파일 존재 확인**

```bash
test -f /Users/overlay/Documents/workspace/resume/memory/viewer/vercel.json && echo OK
```

Expected: `OK`.

⚠️ **거부된 대안 — repo root에 vercel.json 두기**: Vercel은 framework auto-detect를 위해 Root Directory에 package.json을 찾는다. repo root에 package.json이 없으면 "No Next.js version detected" 에러. Root Directory를 viewer/로 두는 게 더 직접적이고 vercel.json도 viewer/에 같이 두는 게 일관성 있음.

---

### Task 2.6: Chunk 2 commit

- [ ] **Step 1: git status**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git status --short
```

- [ ] **Step 2: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/
git commit -m "feat(viewer): scaffold Next.js project, types, vitest fixtures"
```

Expected: commit 성공.

---

## Chunk 3: build-graph.ts + filter-graph.ts (TDD)

이 chunk는 **build-graph.ts와 filter-graph.ts를 TDD로 구현**한다. 각 동작마다 실패하는 테스트 → 실행해서 fail 확인 → 최소 구현 → 통과 → commit 사이클. **lib/build-graph.ts는 순수 라이브러리(CLI 없음)**. CLI 엔트리는 `scripts/build.ts`로 분리(ESM에서 `__dirname` 등 안전하게 처리).

### Task 3.1: 첫 테스트 — 단일 markdown 파일 파싱

**Files:**
- Create: `viewer/__tests__/lib/build-graph.test.ts`, `viewer/lib/build-graph.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`viewer/__tests__/lib/build-graph.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNode } from '../../lib/build-graph.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '../fixtures');

describe('parseNode', () => {
  it('parses frontmatter and extracts scope from path', async () => {
    const filePath = path.join(FIXTURES, 'wiki/personal/semantic/sample.md');
    const result = await parseNode(filePath, path.join(FIXTURES, 'wiki'));

    expect(result.id).toBe('sample-personal-node');
    expect(result.title).toBe('샘플 개인 노드');
    expect(result.node_type).toBe('의미');
    expect(result.memory_type).toBe('world_fact');
    expect(result.scope).toBe('personal');
    expect(result.links).toEqual([{ to: 'another-node', type: '전제' }]);
    expect(result.bodyHtml).toContain('본문 내용');
  });
});
```

(`'../../lib/build-graph.js'` — `.js` 확장자: ESM TypeScript에서 import는 컴파일 후 확장자를 적는 게 표준이며 vitest는 이를 알아서 .ts로 해석.)

- [ ] **Step 2: 테스트 실행 → FAIL 확인**

```bash
cd /Users/overlay/Documents/workspace/resume/memory/viewer
npm test
```

Expected: `Failed to load url ../../lib/build-graph.js` 또는 `parseNode is not exported`. **fail-first 확인 후** 다음 step.

- [ ] **Step 3: 최소 구현**

`viewer/lib/build-graph.ts`:

```ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import type { NodeFrontmatter, Scope, EdgeType } from './schema.js';

export interface ParsedNode {
  id: string;
  title: string;
  node_type: NodeFrontmatter['node_type'];
  memory_type: NodeFrontmatter['memory_type'];
  scope: Scope;
  created: string;
  last_reviewed: string;
  confidence?: NodeFrontmatter['confidence'];
  sources?: string[];
  links: Array<{ to: string; type: EdgeType }>;
  tags?: string[];
  bodyHtml: string;
}

export async function parseNode(absFilePath: string, wikiRoot: string): Promise<ParsedNode> {
  const raw = await readFile(absFilePath, 'utf8');
  const { data, content } = matter(raw);
  const fm = data as NodeFrontmatter;

  const relative = path.relative(wikiRoot, absFilePath);
  const segments = relative.split(path.sep);
  // 예: ['personal', 'semantic', 'sample.md'] → scope = 'personal'
  const scope = segments[0] as Scope;

  const bodyHtml = String(await remark().use(remarkHtml).process(content));

  return {
    id: fm.id,
    title: fm.title,
    node_type: fm.node_type,
    memory_type: fm.memory_type,
    scope,
    created: fm.created,
    last_reviewed: fm.last_reviewed,
    confidence: fm.confidence,
    sources: fm.sources,
    links: fm.links ?? [],
    tags: fm.tags,
    bodyHtml
  };
}
```

(**중요**: 테스트는 `wikiRoot = FIXTURES/wiki`로 넘기고, scope는 path[0]에서 추출. Task 3.3의 `loadAllNodes`도 같은 wikiRoot를 사용하면 일관성 보장.)

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd /Users/overlay/Documents/workspace/resume/memory/viewer
npm test
```

Expected: 1 test passing.

- [ ] **Step 5: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/lib/build-graph.ts viewer/__tests__/
git commit -m "feat(viewer): parseNode reads frontmatter and extracts scope"
```

---

### Task 3.2: work scope 추출 테스트

- [ ] **Step 1: 실패 테스트 추가** (`build-graph.test.ts`의 `describe('parseNode'...)` 안에 it 블록 추가)

```ts
it('extracts scope=work from wiki/work/ path', async () => {
  const filePath = path.join(FIXTURES, 'wiki/work/insight/secret.md');
  const result = await parseNode(filePath, path.join(FIXTURES, 'wiki'));
  expect(result.scope).toBe('work');
});
```

- [ ] **Step 2: 실행 → 이미 통과해야 함 (regression test)**

```bash
cd /Users/overlay/Documents/workspace/resume/memory/viewer
npm test
```

Expected: 2 tests passing.

(commit은 다음 task와 묶음.)

---

### Task 3.3: `loadAllNodes` — glob + WIKI_INCLUDE_WORK 게이트

- [ ] **Step 1: 실패 테스트 추가**

`build-graph.test.ts`에 추가:

```ts
import { loadAllNodes } from '../../lib/build-graph.js';

describe('loadAllNodes', () => {
  it('loads only personal/ when WIKI_INCLUDE_WORK is unset', async () => {
    delete process.env.WIKI_INCLUDE_WORK;
    const wikiRoot = path.join(FIXTURES, 'wiki');
    const nodes = await loadAllNodes(wikiRoot);
    const ids = nodes.map(n => n.id).sort();
    expect(ids).toEqual(['another-node', 'sample-personal-node']);
    expect(nodes.find(n => n.id === 'secret-work-node')).toBeUndefined();
  });

  it('loads both when WIKI_INCLUDE_WORK=true', async () => {
    process.env.WIKI_INCLUDE_WORK = 'true';
    try {
      const wikiRoot = path.join(FIXTURES, 'wiki');
      const nodes = await loadAllNodes(wikiRoot);
      const ids = nodes.map(n => n.id).sort();
      expect(ids).toEqual(['another-node', 'sample-personal-node', 'secret-work-node']);
    } finally {
      delete process.env.WIKI_INCLUDE_WORK;
    }
  });
});
```

- [ ] **Step 2: 실행 → FAIL 확인**

```bash
npm test
```

Expected: `loadAllNodes is not exported`.

- [ ] **Step 3: 구현**

`viewer/lib/build-graph.ts`에 추가:

```ts
import fg from 'fast-glob';

export async function loadAllNodes(wikiRoot: string): Promise<ParsedNode[]> {
  const includeWork = process.env.WIKI_INCLUDE_WORK === 'true';
  const patterns = includeWork
    ? ['personal/**/*.md', 'work/**/*.md']
    : ['personal/**/*.md'];

  const files = await fg(patterns, {
    cwd: wikiRoot,
    absolute: true,
    ignore: ['**/index.md', '**/log.md', '**/.gitkeep']
  });

  return Promise.all(files.map(f => parseNode(f, wikiRoot)));
}
```

- [ ] **Step 4: 테스트 실행 → PASS**

```bash
npm test
```

Expected: 4 tests passing.

- [ ] **Step 5: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/
git commit -m "feat(viewer): loadAllNodes with WIKI_INCLUDE_WORK gate"
```

---

### Task 3.4: `buildGraph` — 엣지 평탄화 + in_degree 계산

- [ ] **Step 1: 실패 테스트 추가**

```ts
import { buildGraph } from '../../lib/build-graph.js';

describe('buildGraph', () => {
  it('flattens forward links into edges and computes degrees', async () => {
    delete process.env.WIKI_INCLUDE_WORK;
    const wikiRoot = path.join(FIXTURES, 'wiki');
    const graph = await buildGraph(wikiRoot);

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toEqual({
      source: 'sample-personal-node',
      target: 'another-node',
      type: '전제'
    });

    const sample = graph.nodes.find(n => n.id === 'sample-personal-node')!;
    const another = graph.nodes.find(n => n.id === 'another-node')!;
    expect(sample.out_degree).toBe(1);
    expect(sample.in_degree).toBe(0);
    expect(another.out_degree).toBe(0);
    expect(another.in_degree).toBe(1);
  });

  it('embeds rendered html in contents map', async () => {
    delete process.env.WIKI_INCLUDE_WORK;
    const graph = await buildGraph(path.join(FIXTURES, 'wiki'));
    expect(graph.contents['sample-personal-node']).toContain('본문 내용');
  });
});
```

- [ ] **Step 2: FAIL 확인**

```bash
npm test
```

Expected: `buildGraph is not exported`.

- [ ] **Step 3: 구현**

`build-graph.ts`에 추가:

```ts
import type { GraphData, GraphNode, GraphEdge } from './schema.js';

export async function buildGraph(wikiRoot: string): Promise<GraphData> {
  const parsed = await loadAllNodes(wikiRoot);

  const edges: GraphEdge[] = [];
  for (const p of parsed) {
    for (const link of p.links) {
      edges.push({ source: p.id, target: link.to, type: link.type });
    }
  }

  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1);
  }

  const nodes: GraphNode[] = parsed.map(p => ({
    id: p.id,
    title: p.title,
    node_type: p.node_type,
    memory_type: p.memory_type,
    scope: p.scope,
    in_degree: inDegree.get(p.id) ?? 0,
    out_degree: outDegree.get(p.id) ?? 0,
    last_reviewed: p.last_reviewed,
    confidence: p.confidence,
    tags: p.tags
  }));

  const contents: Record<string, string> = {};
  for (const p of parsed) contents[p.id] = p.bodyHtml;

  return {
    nodes,
    edges,
    contents,
    generated_at: new Date().toISOString()
  };
}
```

- [ ] **Step 4: PASS 확인**

```bash
npm test
```

Expected: 6 tests passing.

- [ ] **Step 5: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/
git commit -m "feat(viewer): buildGraph flattens edges and computes degrees"
```

---

### Task 3.5: `writeGraph` + 별도 CLI 엔트리 (`scripts/build.ts`)

CLI는 lib/에 두지 않는다(M argv 인스펙션과 ESM `__dirname` 함정 회피). lib는 순수 라이브러리, scripts에서 호출.

- [ ] **Step 1: 실패 테스트 — writeGraph가 파일을 생성**

```ts
import { writeGraph } from '../../lib/build-graph.js';
import { rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import { afterEach } from 'vitest';

describe('writeGraph', () => {
  const tmpOut = path.join(os.tmpdir(), `graph-test-${process.pid}.json`);

  afterEach(async () => {
    await rm(tmpOut, { force: true });
  });

  it('writes graph.json to the given path', async () => {
    delete process.env.WIKI_INCLUDE_WORK;
    const graph = await buildGraph(path.join(FIXTURES, 'wiki'));
    await writeGraph(graph, tmpOut);

    const content = JSON.parse(await readFile(tmpOut, 'utf8'));
    expect(content.nodes).toHaveLength(2);
    expect(content.edges).toHaveLength(1);
    expect(typeof content.generated_at).toBe('string');
  });
});
```

- [ ] **Step 2: FAIL 확인**

```bash
npm test
```

- [ ] **Step 3: writeGraph 구현 (`lib/build-graph.ts`에 추가)**

```ts
import { writeFile, mkdir } from 'node:fs/promises';

export async function writeGraph(graph: GraphData, outPath: string): Promise<void> {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(graph, null, 2), 'utf8');
}
```

(CLI guard는 추가하지 않음 — 별도 scripts/build.ts에서 호출.)

- [ ] **Step 4: `viewer/scripts/build.ts` 작성 (CLI 엔트리)**

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph, writeGraph } from '../lib/build-graph.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wikiRoot = path.resolve(__dirname, '../../wiki');
const outPath = path.resolve(__dirname, '../public/graph.json');

const mode = process.env.WIKI_INCLUDE_WORK === 'true' ? 'work+personal' : 'personal only';

buildGraph(wikiRoot)
  .then(g => writeGraph(g, outPath))
  .then(() => console.log(`[build-graph] wrote ${outPath} (${mode})`))
  .catch(e => {
    console.error('[build-graph] failed:', e);
    process.exit(1);
  });
```

- [ ] **Step 5: 테스트 PASS + 실제 빌드 검증**

```bash
cd /Users/overlay/Documents/workspace/resume/memory/viewer
npm test
```

Expected: 7 tests passing.

```bash
npx tsx scripts/build.ts
```

Expected 출력: `[build-graph] wrote .../viewer/public/graph.json (personal only)`.

```bash
jq '.nodes | length' public/graph.json
```

Expected: `5`.

```bash
jq '.edges | length' public/graph.json
```

Expected: `6`.

```bash
jq '[.nodes[] | select(.scope=="work")] | length' public/graph.json
```

Expected: `0`.

```bash
jq '.nodes[] | select(.id=="2026-05-18-knowledge-management") | .in_degree' public/graph.json
```

Expected: `3` (허브 노드 검증).

- [ ] **Step 6: dev 서버 부팅 확인 (predev로 build.ts 자동 실행됨)**

```bash
cd /Users/overlay/Documents/workspace/resume/memory/viewer
npm run dev > /tmp/wiki-dev.log 2>&1 &
DEV_PID=$!
sleep 12
if curl -sf http://localhost:3000 | grep -q "LLM Wiki"; then
  echo "OK"
else
  echo "FAIL"
  cat /tmp/wiki-dev.log
fi
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
```

Expected: `OK`. (실패 시 dev.log를 확인 — 흔한 원인: tsx ESM 호환성, port 충돌, build-graph 에러)

- [ ] **Step 7: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/
git commit -m "feat(viewer): writeGraph + scripts/build.ts CLI entry"
```

---

### Task 3.6: `lib/filter-graph.ts` — 필터링 순수 함수 (TDD)

UI의 FilterBar 동작(특정 node_type 끄면 그 노드와 그 노드를 끝점으로 하는 엣지 모두 제거)을 순수 함수로 추출해 테스트.

**Files:**
- Create: `viewer/lib/filter-graph.ts`, `viewer/__tests__/lib/filter-graph.test.ts`

- [ ] **Step 1: 실패 테스트**

`viewer/__tests__/lib/filter-graph.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterGraph } from '../../lib/filter-graph.js';
import type { GraphData } from '../../lib/schema.js';

const SAMPLE: GraphData = {
  nodes: [
    { id: 'A', title: 'A', node_type: '의미', memory_type: 'world_fact', scope: 'personal', in_degree: 0, out_degree: 1, last_reviewed: '2026-05-18' },
    { id: 'B', title: 'B', node_type: '통찰', memory_type: 'mental_model', scope: 'personal', in_degree: 1, out_degree: 0, last_reviewed: '2026-05-18' },
    { id: 'C', title: 'C', node_type: '주제', memory_type: 'mental_model', scope: 'personal', in_degree: 0, out_degree: 0, last_reviewed: '2026-05-18' }
  ],
  edges: [{ source: 'A', target: 'B', type: '지지' }],
  contents: {},
  generated_at: '2026-05-18T00:00:00Z'
};

describe('filterGraph', () => {
  it('keeps all when all types enabled', () => {
    const out = filterGraph(SAMPLE, new Set(['의미', '통찰', '주제']));
    expect(out.nodes).toHaveLength(3);
    expect(out.edges).toHaveLength(1);
  });

  it('removes node and edges touching it when type disabled', () => {
    const out = filterGraph(SAMPLE, new Set(['의미', '주제']));   // 통찰 끔
    expect(out.nodes.map(n => n.id).sort()).toEqual(['A', 'C']);
    expect(out.edges).toHaveLength(0);   // A→B 엣지 사라짐
  });

  it('keeps node with no edges when its type enabled', () => {
    const out = filterGraph(SAMPLE, new Set(['주제']));
    expect(out.nodes.map(n => n.id)).toEqual(['C']);
    expect(out.edges).toHaveLength(0);
  });
});
```

- [ ] **Step 2: FAIL 확인**

```bash
npm test
```

- [ ] **Step 3: 구현**

`viewer/lib/filter-graph.ts`:

```ts
import type { GraphData, NodeType } from './schema.js';

export function filterGraph(graph: GraphData, enabledTypes: Set<NodeType>): GraphData {
  const nodes = graph.nodes.filter(n => enabledTypes.has(n.node_type));
  const ids = new Set(nodes.map(n => n.id));
  const edges = graph.edges.filter(e => ids.has(e.source) && ids.has(e.target));
  return { ...graph, nodes, edges };
}
```

- [ ] **Step 4: PASS 확인**

```bash
npm test
```

Expected: 10 tests passing (3 새 + 7 기존).

- [ ] **Step 5: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/
git commit -m "feat(viewer): filterGraph pure function with tests"
```

---

## Chunk 4: Viewer UI Components

각 task가 self-contained — 작성 + commit. 큰 commit 하나로 묶지 않음.

### Task 4.1: NodeBadge

**Files:**
- Create: `viewer/components/NodeBadge.tsx`

- [ ] **Step 1: 작성**

```tsx
import { NODE_COLOR } from '@/lib/color-map';
import type { NodeType } from '@/lib/schema';

export default function NodeBadge({ type }: { type: NodeType }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs text-white"
      style={{ backgroundColor: NODE_COLOR[type] }}
    >
      {type}
    </span>
  );
}
```

- [ ] **Step 2: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/components/NodeBadge.tsx
git commit -m "feat(viewer): NodeBadge component"
```

---

### Task 4.2: FilterBar

**Files:**
- Create: `viewer/components/FilterBar.tsx`

- [ ] **Step 1: 작성**

```tsx
'use client';

import { NODE_TYPES } from '@/lib/schema';
import type { NodeType } from '@/lib/schema';
import { NODE_COLOR } from '@/lib/color-map';

interface Props {
  enabled: Set<NodeType>;
  onChange: (next: Set<NodeType>) => void;
}

export default function FilterBar({ enabled, onChange }: Props) {
  function toggle(t: NodeType) {
    const next = new Set(enabled);
    if (next.has(t)) next.delete(t); else next.add(t);
    onChange(next);
  }

  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold mb-2">필터 (노드 타입)</h2>
      <div className="flex flex-wrap gap-2">
        {NODE_TYPES.map(t => (
          <button
            key={t}
            onClick={() => toggle(t)}
            className={`px-2 py-1 rounded text-xs ${
              enabled.has(t) ? 'text-white' : 'text-gray-400 bg-gray-100'
            }`}
            style={enabled.has(t) ? { backgroundColor: NODE_COLOR[t] } : {}}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/components/FilterBar.tsx
git commit -m "feat(viewer): FilterBar component"
```

---

### Task 4.3: EdgeLegend

**Files:**
- Create: `viewer/components/EdgeLegend.tsx`

- [ ] **Step 1: 작성**

```tsx
import { EDGE_TYPES } from '@/lib/schema';
import { EDGE_COLOR } from '@/lib/color-map';

export default function EdgeLegend() {
  return (
    <div>
      <h2 className="text-sm font-bold mb-2 mt-4">엣지 타입</h2>
      <ul className="space-y-1">
        {EDGE_TYPES.map(t => (
          <li key={t} className="flex items-center gap-2 text-xs">
            <span className="inline-block w-4 h-1" style={{ backgroundColor: EDGE_COLOR[t] }} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/components/EdgeLegend.tsx
git commit -m "feat(viewer): EdgeLegend component"
```

---

### Task 4.4: NodePanel

**Files:**
- Create: `viewer/components/NodePanel.tsx`

- [ ] **Step 1: 작성**

```tsx
import type { GraphData, GraphNode } from '@/lib/schema';
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
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <NodeBadge type={node.node_type} />
        <span className="text-xs text-gray-500">{node.scope}</span>
      </div>
      <h2 className="text-xl font-bold mb-2">{node.title}</h2>
      <div className="text-xs text-gray-500 mb-4">
        last reviewed: {node.last_reviewed} · in: {node.in_degree} · out: {node.out_degree}
      </div>
      <article className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />

      {outgoing.length > 0 && (
        <section className="mt-6">
          <h3 className="font-bold mb-2">→ outgoing</h3>
          <ul className="text-sm">
            {outgoing.map((e, i) => (
              <li key={i}>
                <span className="text-gray-500">[{e.type}]</span>{' '}
                <a href={`/node/${e.target}`} className="text-blue-600">{e.target}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {incoming.length > 0 && (
        <section className="mt-4">
          <h3 className="font-bold mb-2">← incoming</h3>
          <ul className="text-sm">
            {incoming.map((e, i) => (
              <li key={i}>
                <a href={`/node/${e.source}`} className="text-blue-600">{e.source}</a>{' '}
                <span className="text-gray-500">[{e.type}]</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/components/NodePanel.tsx
git commit -m "feat(viewer): NodePanel component"
```

---

### Task 4.5: ForceGraphCanvas

**Files:**
- Create: `viewer/components/ForceGraphCanvas.tsx`

- [ ] **Step 1: 작성**

```tsx
'use client';

import dynamic from 'next/dynamic';
import type { GraphNode, GraphEdge } from '@/lib/schema';
import { NODE_COLOR, EDGE_COLOR } from '@/lib/color-map';

const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
);

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (id: string) => void;
}

export default function ForceGraphCanvas({ nodes, edges, onNodeClick }: Props) {
  const data = {
    nodes: nodes.map(n => ({ ...n, val: 1 + n.in_degree })),
    links: edges.map(e => ({ ...e }))
  };
  return (
    <ForceGraph2D
      graphData={data}
      nodeLabel={(n: any) => `${n.title} (${n.node_type})`}
      nodeColor={(n: any) => NODE_COLOR[n.node_type as keyof typeof NODE_COLOR]}
      linkColor={(l: any) => EDGE_COLOR[l.type as keyof typeof EDGE_COLOR]}
      linkDirectionalArrowLength={4}
      linkDirectionalArrowRelPos={1}
      onNodeClick={(n: any) => onNodeClick(n.id)}
      cooldownTicks={100}
    />
  );
}
```

⚠️ `react-force-graph-2d`는 dynamic import + `ssr: false` 필수 — 내부적으로 canvas/window를 참조하기 때문에 Next.js SSG 빌드 단계에서 import만 해도 에러가 남. dynamic import 형태로만 사용.

- [ ] **Step 2: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/components/ForceGraphCanvas.tsx
git commit -m "feat(viewer): ForceGraphCanvas with dynamic import"
```

---

### Task 4.6: 메인 페이지 + ClientGraphPage

**Files:**
- Modify: `viewer/app/page.tsx`
- Create: `viewer/app/ClientGraphPage.tsx`

- [ ] **Step 1: `viewer/app/page.tsx` 재작성**

```tsx
import fs from 'node:fs/promises';
import path from 'node:path';
import type { GraphData } from '@/lib/schema';
import ClientGraphPage from './ClientGraphPage';

async function loadGraph(): Promise<GraphData> {
  const p = path.join(process.cwd(), 'public', 'graph.json');
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

export default async function Home() {
  const graph = await loadGraph();
  return <ClientGraphPage graph={graph} />;
}
```

⚠️ 빌드 타임 vs 런타임: 이 페이지는 Next.js SSG로 build 시 한 번 렌더됨. 그때 `process.cwd()`는 `viewer/`이고 `public/graph.json`은 prebuild가 방금 생성한 상태. 런타임에 다시 읽지 않음(SSG는 HTML로 굳음).

- [ ] **Step 2: `viewer/app/ClientGraphPage.tsx`**

```tsx
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
```

- [ ] **Step 3: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/app/page.tsx viewer/app/ClientGraphPage.tsx
git commit -m "feat(viewer): main page + client graph layout"
```

---

### Task 4.7: 보조 페이지 — /node/[id]

**Files:**
- Create: `viewer/app/node/[id]/page.tsx`

- [ ] **Step 1: 작성**

```tsx
import fs from 'node:fs/promises';
import path from 'node:path';
import type { GraphData } from '@/lib/schema';
import NodePanel from '@/components/NodePanel';
import { notFound } from 'next/navigation';

async function loadGraph(): Promise<GraphData> {
  const p = path.join(process.cwd(), 'public', 'graph.json');
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

export default async function NodePage({ params }: { params: { id: string } }) {
  const graph = await loadGraph();
  const node = graph.nodes.find(n => n.id === params.id);
  if (!node) notFound();
  return (
    <div className="max-w-3xl mx-auto p-8">
      <a href="/" className="text-sm text-blue-600">← graph</a>
      <NodePanel node={node!} html={graph.contents[node!.id]} graph={graph} />
    </div>
  );
}

export async function generateStaticParams() {
  const graph = await loadGraph();
  return graph.nodes.map(n => ({ id: n.id }));
}
```

- [ ] **Step 2: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/app/node/
git commit -m "feat(viewer): /node/[id] dynamic route"
```

---

### Task 4.8: /log 페이지

**Files:**
- Create: `viewer/app/log/page.tsx`

- [ ] **Step 1: 작성**

```tsx
import fs from 'node:fs/promises';
import path from 'node:path';
import { remark } from 'remark';
import remarkHtml from 'remark-html';

export default async function LogPage() {
  const p = path.join(process.cwd(), '..', 'wiki', 'log.md');
  const md = await fs.readFile(p, 'utf8');
  const html = String(await remark().use(remarkHtml).process(md));
  return (
    <div className="max-w-3xl mx-auto p-8">
      <a href="/" className="text-sm text-blue-600">← graph</a>
      <article className="prose mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
```

⚠️ `process.cwd()`는 빌드 시 `viewer/`이므로 `..` 한 단계 위가 `resume/memory/`, 거기서 `wiki/log.md`. Vercel 빌드 환경에서도 동일하게 동작 (전체 repo가 sandbox에 있음).

- [ ] **Step 2: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/app/log/
git commit -m "feat(viewer): /log page rendering wiki/log.md"
```

---

### Task 4.9: /stats 페이지

**Files:**
- Create: `viewer/app/stats/page.tsx`

- [ ] **Step 1: 작성**

```tsx
import fs from 'node:fs/promises';
import path from 'node:path';
import type { GraphData } from '@/lib/schema';
import { NODE_TYPES, EDGE_TYPES } from '@/lib/schema';

async function loadGraph(): Promise<GraphData> {
  const p = path.join(process.cwd(), 'public', 'graph.json');
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

export default async function StatsPage() {
  const g = await loadGraph();
  const byNodeType = Object.fromEntries(NODE_TYPES.map(t => [t, g.nodes.filter(n => n.node_type === t).length]));
  const byScope = { work: g.nodes.filter(n => n.scope === 'work').length, personal: g.nodes.filter(n => n.scope === 'personal').length };
  const byEdgeType = Object.fromEntries(EDGE_TYPES.map(t => [t, g.edges.filter(e => e.type === t).length]));
  const hubs = [...g.nodes].sort((a, b) => b.in_degree - a.in_degree).slice(0, 10);

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <a href="/" className="text-sm text-blue-600">← graph</a>
      <h1 className="text-2xl font-bold">Stats</h1>

      <section>
        <h2 className="font-bold">총량</h2>
        <p>노드 {g.nodes.length} · 엣지 {g.edges.length}</p>
      </section>

      <section>
        <h2 className="font-bold">노드 타입별</h2>
        <ul className="text-sm">{NODE_TYPES.map(t => <li key={t}>{t}: {byNodeType[t]}</li>)}</ul>
      </section>

      <section>
        <h2 className="font-bold">scope별</h2>
        <p className="text-sm">personal: {byScope.personal} · work: {byScope.work}</p>
      </section>

      <section>
        <h2 className="font-bold">엣지 타입별</h2>
        <ul className="text-sm">{EDGE_TYPES.map(t => <li key={t}>{t}: {byEdgeType[t]}</li>)}</ul>
      </section>

      <section>
        <h2 className="font-bold">허브 Top 10 (in-degree)</h2>
        <ol className="text-sm list-decimal pl-6">
          {hubs.map(n => <li key={n.id}><a href={`/node/${n.id}`} className="text-blue-600">{n.title}</a> — {n.in_degree}</li>)}
        </ol>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: commit**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git add viewer/app/stats/
git commit -m "feat(viewer): /stats page"
```

---

### Task 4.10: 로컬 검증 (수동 acceptance)

- [ ] **Step 1: 빌드 + dev 서버 부팅**

```bash
cd /Users/overlay/Documents/workspace/resume/memory/viewer
npm run build
```

Expected: `Compiled successfully`, `Generating static pages` 메시지, `5 static pages generated` (메인 + node/[5] + log + stats — 정확한 카운트는 generateStaticParams에 따라 다름).

```bash
cd /Users/overlay/Documents/workspace/resume/memory/viewer
npm run dev > /tmp/wiki-dev.log 2>&1 &
DEV_PID=$!
sleep 12
curl -sf http://localhost:3000 > /dev/null && echo OK_root || echo FAIL_root
curl -sf http://localhost:3000/log > /dev/null && echo OK_log || echo FAIL_log
curl -sf http://localhost:3000/stats > /dev/null && echo OK_stats || echo FAIL_stats
curl -sf http://localhost:3000/node/2026-05-18-llm-wiki-pattern > /dev/null && echo OK_node || echo FAIL_node
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
```

Expected 4줄 모두 `OK_*`.

- [ ] **Step 2: 브라우저 수동 체크**

```bash
cd /Users/overlay/Documents/workspace/resume/memory/viewer
npm run dev
```

브라우저에서 http://localhost:3000 열고 확인:
- [ ] 5개 노드가 그래프에 모두 표시
- [ ] 6개 엣지가 모두 표시 (화살표 있음)
- [ ] 노드 색이 타입별로 구분 (의미=파랑, 통찰=노랑, 절차=초록, 주제=보라)
- [ ] `knowledge-management` 노드가 in-degree 3으로 가장 큼 (크기로 확인)
- [ ] 노드 클릭 → 우측 패널에 본문 표시
- [ ] FilterBar에서 "의미" 토글하면 의미 노드 2개와 그 노드를 끝점으로 하는 엣지 사라짐 (knowledge-management의 in-degree가 시각적으로 작아짐)
- [ ] /node/2026-05-18-llm-wiki-pattern 직링크 동작
- [ ] /log 페이지에 wiki/log.md 내용 렌더
- [ ] /stats 페이지에 분포 표 렌더
- [ ] DevTools Console에 에러 0개 (React hydration 경고는 허용)

- [ ] **Step 3: dev 서버 종료**

Ctrl+C 또는 `pkill -f "next dev"`.

---

## Chunk 5: Deployment + Acceptance

### Task 5.1: GitHub private repo 생성 + push

- [ ] **Step 1: `gh` CLI 설치 확인**

```bash
gh --version
```

없으면 https://cli.github.com/ 에서 설치 + `gh auth login`.

- [ ] **Step 2: private repo 생성 + push**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
gh repo create llm-wiki --private --source=. --remote=origin --push
```

Expected: GitHub에 private repo 생성, `origin` 추가, main 브랜치 push 완료.

대안 (gh CLI 없을 때): GitHub 웹에서 private repo 생성 후 수동 push.

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git branch -M main
git remote add origin https://github.com/<USERNAME>/llm-wiki.git
git push -u origin main
```

- [ ] **Step 3: GitHub에서 repo 확인**

```bash
gh repo view --web
```

웹에서 모든 파일이 올라갔는지 확인.

---

### Task 5.2: Vercel 연결 + 배포

Vercel은 **Root Directory를 `viewer/`로 설정**한다 — viewer/에 package.json과 vercel.json이 있어서 framework auto-detection이 동작하고, predev/prebuild 스크립트가 자연스럽게 호출됨. `viewer/lib/build-graph.ts`와 `viewer/scripts/build.ts`는 `../..` 또는 `../wiki/` 형태로 repo root의 `wiki/`에 접근 가능 (Vercel은 Root Directory 외부 파일을 sandbox에 보존함).

- [ ] **Step 1: Vercel 로그인**

```bash
npx vercel login
```

브라우저 인증 흐름 따름.

- [ ] **Step 2: 프로젝트 link**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
npx vercel link
```

프롬프트 응답:
- Set up "...resume/memory"? → **Y**
- Which scope? → 본인 계정
- Link to existing project? → **N**
- Project name: → `llm-wiki` (또는 원하는 이름)
- In which directory is your code located? → **`./viewer`**

이 단계가 Vercel 프로젝트의 Root Directory를 `viewer/`로 설정.

- [ ] **Step 3: 첫 production deploy**

```bash
cd /Users/overlay/Documents/workspace/resume/memory
npx vercel --prod
```

Expected 빌드 로그 (요약):
1. Repo 체크아웃
2. `cd viewer` (Root Directory)
3. `npm install`
4. `npm run build` → `predev`/`prebuild`가 `tsx scripts/build.ts` 실행 → `public/graph.json` 생성
5. `next build` → SSG 빌드
6. Production URL 발급 (예: `https://llm-wiki-xxxx.vercel.app`)

⚠️ 빌드 실패 시 점검 순서:
1. Build log에서 `scripts/build.ts`가 실행됐는지 — 안 됐으면 predev/prebuild가 안 걸린 것 → package.json scripts 확인
2. `[build-graph] failed: ENOENT .../wiki`이면 Root Directory 외부 파일 접근 실패
3. `tsx: command not found`이면 `tsx`가 devDependencies에 있는지 + Vercel이 devDeps 설치하는지 확인 (Vercel은 빌드 단계에서는 devDeps 설치 기본)

**Fallback A (Root Directory 외부 접근이 실패할 경우)**:

만약 Vercel sandbox에 `../wiki/`가 보이지 않는다면 (build log에 일시 `ls -la ..`를 추가해 확인), 다음으로 전환:

1. Vercel project settings → General → Root Directory를 **`./` (repo root)**로 변경
2. `viewer/vercel.json`을 삭제하고 repo root에 새 `vercel.json` 작성:
   ```json
   {
     "framework": "nextjs",
     "buildCommand": "cd viewer && npm install && npm run build",
     "outputDirectory": "viewer/.next",
     "installCommand": "echo 'skip root install'"
   }
   ```
3. **단, repo root에 `package.json`을 최소한 하나 만들어야** Vercel framework auto-detection이 동작:
   ```json
   { "name": "llm-wiki-monorepo", "private": true }
   ```
4. 다시 `npx vercel --prod`

**Fallback B (devDeps 미설치)**:

`tsx`/`vitest` 등이 누락되면 Vercel 환경변수 `NPM_CONFIG_PRODUCTION=false` 추가 (Vercel Project Settings → Environment Variables).

- [ ] **Step 4: production URL 수동 acceptance**

브라우저로 production URL 열기. Task 4.10 Step 2의 체크리스트 동일 적용:
- [ ] 5 노드 + 6 엣지 표시
- [ ] 노드 클릭 → 본문
- [ ] 필터 토글 동작
- [ ] /log, /stats, /node/[id] 동작
- [ ] DevTools Console 에러 0

---

### Task 5.3: 배포 후 work 노드 제외 검증

- [ ] **Step 1: production graph.json 다운로드 + 검증**

production URL을 `$PROD` 변수에 담아 사용:

```bash
PROD="https://<your-prod-url>"   # 본인 URL로 교체
curl -sf "$PROD/graph.json" -o /tmp/prod-graph.json
jq '.nodes | length' /tmp/prod-graph.json
```

Expected: `5` (시드 5개만)

```bash
jq '[.nodes[] | select(.scope=="work")] | length' /tmp/prod-graph.json
```

Expected: `0` (work 노드 0개 — 빌드에서 통째로 제외 확인)

- [ ] **Step 2: 로컬 work-포함 빌드 sanity check (commit 금지)**

`wiki/work/통찰/2026-05-18-temp-sanity.md` 임시 생성. **이 파일은 commit하면 안 됨** — 임시 sanity check 용도.

먼저 `.gitignore`에 임시 패턴 추가:

```bash
cd /Users/overlay/Documents/workspace/resume/memory
echo "wiki/work/**/*-temp-sanity.md" >> .gitignore
git add .gitignore
git commit -m "chore: gitignore temp sanity files"
```

임시 파일 생성:

```bash
cat > /Users/overlay/Documents/workspace/resume/memory/wiki/work/통찰/2026-05-18-temp-sanity.md <<'EOF'
---
id: 2026-05-18-temp-sanity
title: 임시 sanity 노드 (배포 검증용, commit 금지)
node_type: 통찰
memory_type: experience
created: 2026-05-18
last_reviewed: 2026-05-18
---

# sanity

work scope 빌드 sanity check.
EOF
```

work 포함 빌드 + 카운트:

```bash
cd /Users/overlay/Documents/workspace/resume/memory/viewer
WIKI_INCLUDE_WORK=true npx tsx scripts/build.ts
jq '[.nodes[] | select(.scope=="work")] | length' public/graph.json
```

Expected: `1` (로컬에서 work 포함하면 1개 추가).

- [ ] **Step 3: 임시 파일 제거 + 빌드 원복**

```bash
rm /Users/overlay/Documents/workspace/resume/memory/wiki/work/통찰/2026-05-18-temp-sanity.md
cd /Users/overlay/Documents/workspace/resume/memory/viewer
unset WIKI_INCLUDE_WORK
npx tsx scripts/build.ts
jq '.nodes | length' public/graph.json
```

Expected: `5` (원복).

```bash
cd /Users/overlay/Documents/workspace/resume/memory
git status --short
```

Expected: 변경 없음 (임시 파일은 gitignore + 삭제, public/graph.json은 viewer/.gitignore).

---

### Task 5.4: V1 Acceptance Criteria 전체 체크

spec §8의 acceptance criteria를 차례로 verify:

- [ ] `resume/memory/CLAUDE.md`가 다음 모두 포함: 노드 6종, 엣지 9종, frontmatter 필드 정의, source-of-truth 규칙, forward-only 링크 규약, 4개 슬래시 커맨드 워크플로우 요약, convert.mjs 오버라이드 명시 → grep으로 확인
- [ ] `resume/memory/.claude/commands/` 4개 파일 존재 → `ls`
- [ ] `wiki/personal/` 시드 노드 5개, ASCII 슬러그 → `find`
- [ ] `wiki/index.md`, `wiki/log.md` 생성 → `ls`
- [ ] `cd viewer && npm install` 성공 (warnings 허용, errors 0) → 이미 수행
- [ ] `cd viewer && npm run build` → `viewer/public/graph.json` 생성, `jq '.nodes | length'` → 5, `jq '.edges | length'` → 6
- [ ] `npm run dev` → 로컬 그래프 렌더 (브라우저 콘솔 에러 0)
- [ ] 노드 색이 node_type별 구분
- [ ] 노드 클릭 → 우측 패널 본문
- [ ] FilterBar 토글 → 노드 + 엣지 함께 사라짐
- [ ] `WIKI_INCLUDE_WORK` 미설정 시 빌드에서 work 노드 0개
- [ ] GitHub private repo push 완료
- [ ] Vercel deploy 성공 (build log 에러 0)
- [ ] production URL 접속 시 로컬과 동일 그래프
- [ ] production graph.json에 work 노드 0개

각 항목 ✓ 표시 완료 후 별도 commit은 만들지 않음. acceptance verification은 사용자 confirm이지 코드 변경이 아님.

⚠️ **main push 규칙**: 사용자 전역 가드레일 "main은 PR 머지로만 배포"가 있으나, **V1 첫 셋업은 예외** — 아직 PR을 만들 base가 없는 빈 repo이고, 첫 push는 main 초기화 목적. 이후 변경부터는 PR 흐름:

```bash
# 두 번째 변경부터는 다음 흐름
git checkout -b feature/add-new-node
# ... 작업
git push -u origin feature/add-new-node
gh pr create --title "..." --body "..."
# 머지 후 main에서 pull
```

첫 V1 셋업 단계 끝.

---

## 완료 후

- Production URL을 README.md에 적기 (선택)
- spec의 §9 V2 deferred 항목을 GitHub Issue로 변환 (선택)
- 첫 본격 콘텐츠 ingest 시도: `/wiki-ingest <어떤 URL>`
