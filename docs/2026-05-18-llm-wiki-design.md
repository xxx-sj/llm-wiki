# LLM Wiki 설계 스펙

- **작성일**: 2026-05-18
- **상태**: 합의된 디자인 (구현 전)
- **참고**:
  - [Karpathy의 LLM Wiki 패턴](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — 3계층(raw / wiki / 스키마) + Ingest·Query·Lint 워크플로우
  - [careerhackeralex/memory](https://careerhackeralex.vercel.app/memory) — 시각화 모델(6 node + 9 edge, force-directed graph)
  - [Hindsight](https://hindsight.vectorize.io/) — 메모리 타입 / 신선도 / 워크플로우 명칭

## 1. 목표와 범위

### 목표

- 개인 지식 베이스 구축 (회사용 + 개인용 통합)
- LLM(Claude)이 markdown 위키를 지속적으로 유지보수
- 결과를 force-directed graph viewer로 시각화 (careerhackeralex 스타일)
- Vercel 무료 호스팅으로 배포, git push 한 번에 갱신
- 개인 사용 → 향후 팀/대중에게 공유 가능한 구조

### 비목표 (V1에서 명시적으로 제외)

- 임베딩 기반 semantic search (V2 검토)
- 웹에서 직접 편집 (편집은 모두 git push)
- 사용자 인증/권한 관리
- 다중 사용자 실시간 협업
- AI 에이전트 자동 reflection (Hindsight 식 자동 추론)

### 사용 시나리오

- **회사**: 서비스 브레인스토밍, 아이디어 기록, 회사 정보를 새 상황에 적용
- **개인**: 읽은 글·대화·생각의 누적 — Karpathy 원형에 가장 가까움
- **공유**: 향후 같은 repo fork 또는 같은 URL 공유로 팀원과 같은 wiki 사용

## 2. 아키텍처

### 3계층 + Viewer

```
┌─────────────────────────────────────────────────────────┐
│ Layer 0: 스키마 (resume/memory/CLAUDE.md)                │
│   - 6 node types, 9 edge types                           │
│   - frontmatter 포맷, [[wikilink]] 규칙                  │
│   - Ingest / Query / Lint 워크플로우 정의                │
└─────────────────────────────────────────────────────────┘
                          │ Claude가 참조
                          ▼
┌────────────────┐     ┌─────────────────────────────────┐
│ Layer 1: raw/  │ ──▶ │ Layer 2: wiki/                  │
│ (원본, 불변)   │  LLM│   work/ (회사용)                 │
│  - URL 클립    │  유 │   personal/ (개인용)             │
│  - 노트 덤프   │  지 │   index.md, log.md              │
└────────────────┘     └─────────────────────────────────┘
                                    │ npm run build
                                    ▼
                       ┌─────────────────────────────────┐
                       │ Layer 3: Viewer (Next.js)        │
                       │   - markdown → graph.json        │
                       │   - force-directed graph         │
                       │   - 노드 클릭 → 본문 표시        │
                       └─────────────────────────────────┘
                                    │ git push
                                    ▼
                              Vercel (무료)
```

### 핵심 디자인 결정

| 결정 | 이유 |
|---|---|
| 콘텐츠는 순수 markdown + frontmatter | 도구 종속성 없음. Claude 없어도 어느 에디터로든 쓰고 읽을 수 있음. Obsidian 등 호환. |
| 엣지의 단일 진실 출처는 frontmatter `links:` | 본문 `[[wikilink]]`는 사람 가독성용. viewer는 frontmatter만 신뢰. |
| 한 git repo에 콘텐츠 + viewer | git push 한 번에 모두 배포. 운영 단순. |
| 정적 빌드 (SSG) | 서버 불필요. Vercel 무료 플랜 안에서 충분. |
| **V1 배포 빌드는 `wiki/personal/`만 포함** | Vercel 무료 플랜에 인증 기능 없음. 회사 자료(title 포함)가 노출될 위험을 원천 차단. 로컬 `npm run dev`에서는 `wiki/work/`도 포함 가능. (자세한 사유는 §7) |
| 기존 Claude auto-memory(`~/.claude/projects/-Users-overlay-Documents-workspace-resume-memory/memory/`)와 분리 | 역할이 다름 — auto-memory는 Claude 행동/사용자 선호 기억(MEMORY.md + 작은 .md 파일들), wiki는 지식 누적. V1에서는 어느 방향으로도 ingest/동기화 안 함. V2 검토 항목. |

## 3. 디렉토리 구조

```
resume/memory/                    ← git repo root
├── CLAUDE.md                     ← wiki 전용 스키마 (Layer 0)
├── README.md                     ← 사람용 사용 설명
├── .claude/
│   └── commands/
│       ├── wiki-ingest.md
│       ├── wiki-lint.md
│       ├── wiki-stats.md
│       └── wiki-validate.md
│
├── raw/                          ← Layer 1: 변경 불가 원본 (append-only)
│   ├── 2026-05-18-karpathy-llm-wiki.md
│   ├── 2026-05-18-claude-session-xyz.md
│   └── ...
│
├── wiki/                         ← Layer 2: LLM 유지 노드
│   ├── index.md                  ← 목차 (자동 갱신)
│   ├── log.md                    ← 변경 연대기 (자동 append)
│   ├── work/
│   │   ├── 의미/
│   │   ├── 통찰/
│   │   ├── 절차/
│   │   ├── 사건/
│   │   ├── 주장/
│   │   └── 주제/
│   └── personal/
│       └── (같은 구조)
│
├── viewer/                       ← Layer 3: Next.js
│   ├── app/
│   │   ├── page.tsx              ← / (메인 그래프)
│   │   ├── node/[id]/page.tsx    ← /node/:id
│   │   ├── log/page.tsx
│   │   └── stats/page.tsx
│   ├── components/
│   │   ├── ForceGraph2D.tsx
│   │   ├── NodePanel.tsx
│   │   ├── FilterBar.tsx
│   │   └── EdgeLegend.tsx
│   ├── lib/
│   │   └── build-graph.ts        ← markdown → graph.json
│   ├── public/
│   │   └── graph.json            ← 빌드 산출물
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.js
│
├── docs/
│   └── 2026-05-18-llm-wiki-design.md  ← 이 문서
│
└── .gitignore
```

### 파일명 규약

- raw/ 파일: `YYYY-MM-DD-slug.md` (날짜는 인입일)
- wiki/ 노드 파일: `YYYY-MM-DD-slug.md` (날짜는 노드 작성일)
- **슬러그는 ASCII만 허용** (a-z, 0-9, `-`). 한글은 `title` frontmatter에만 사용.
  - 이유: id가 그래프 노드 키 + URL 경로(`/node/[id]`) + 파일명 + glob 패턴 매칭에 모두 사용됨. macOS(NFD)와 Linux(NFC, Vercel) 파일시스템 정규화 차이로 한글 파일명이 깨지는 사례 다수.
  - 예: 파일 `2026-05-18-llm-wiki-pattern.md`, frontmatter `title: LLM Wiki 패턴`
- 파일명에서 `.md`를 제거한 것이 노드의 `id` (frontmatter `id:`와 동일하게 유지)

### 상위 `resume/CLAUDE.md`의 convert.mjs 규칙 오버라이드

`resume/CLAUDE.md`는 "이 폴더 트리 내 모든 `.md`는 `convert.mjs`로 HTML 변환" 규칙을 가지지만, `resume/memory/` 트리는 자체 viewer(Next.js)가 렌더링하므로 이 규칙 적용 제외. `resume/memory/CLAUDE.md`에 다음을 명시:

```markdown
## 상위 폴더 규칙 오버라이드
- `resume/CLAUDE.md`의 "md → html 자동 변환" 규칙은 `resume/memory/` 트리에 적용하지 않는다.
- 이유: wiki는 Next.js viewer가 렌더링하고, raw/는 viewer가 직접 참조하지 않으며, docs/는 사람이 마크다운으로 직접 읽음.
- 예외: 향후 `resume/memory/docs/` 안에 외부 공유용 정적 페이지를 만들 필요가 생기면 그때 개별적으로 변환.
```

## 4. 스키마

### 노드 타입 6종

| 타입 | 정의 | 예 |
|---|---|---|
| **의미** | 개념/용어의 정의·해설 | "LLM Wiki란 무엇인가" |
| **통찰** | 관찰에서 추출한 인사이트 | "임베딩 빌드타임 계산이면 서버 불필요" |
| **절차** | 단계적 how-to, 워크플로우 | "Vercel에 정적 사이트 배포하는 법" |
| **사건** | 특정 시점의 일/경험 | "2026-05-18 Karpathy 글 읽음" |
| **주장** | 누군가의 의견/논증 (출처 추적) | "Karpathy: RAG보다 wiki가 낫다" |
| **주제** | 다른 노드를 묶는 카테고리 | "지식관리 시스템" |

### 엣지 타입 9종

| 타입 | 의미 | 일반적 사용 |
|---|---|---|
| **지지** | A가 B를 뒷받침 | 통찰 → 주장 |
| **반박** | A가 B를 반박 | 통찰/주장 → 주장 |
| **확장** | A가 B를 확장/심화 | 모든 타입 |
| **구체화** | A가 B의 구체 사례 | 사건/절차 → 의미/주장 |
| **정련** | A가 B를 다듬은 후속 버전 | 같은 타입 간 |
| **유사** | A와 B가 비슷한 패턴 | 모든 타입 |
| **촉발** | A가 B 생각의 계기 | 사건/주장 → 통찰 |
| **주제태그** | A가 주제 B에 속함 | 모든 타입 → 주제 |
| **전제** | A가 B의 전제 조건 | 의미/주장 → 절차/주장 |

엣지는 방향성을 가짐 (directed). 양방향 관계는 두 엣지로 표현.

### 노드 frontmatter

```yaml
---
id: 2026-05-18-llm-wiki-pattern        # 불변 식별자 (= 파일명 - .md)
title: LLM Wiki 패턴                    # 사람이 읽는 제목
node_type: 의미                         # 6종 중 하나
memory_type: mental_model               # mental_model | observation | world_fact | experience
scope: personal                         # work | personal
visibility: public                      # public | private (빌드 시 private은 본문 제외)
created: 2026-05-18                     # YYYY-MM-DD
last_reviewed: 2026-05-18               # YYYY-MM-DD
confidence: high                        # high | medium | low
sources:                                # raw/ 또는 외부 URL
  - raw/2026-05-18-karpathy-llm-wiki.md
  - https://gist.github.com/karpathy/...
links:                                  # 엣지 (구조화)
  - to: 2026-05-18-vercel-static-host
    type: 전제
  - to: 2026-05-18-claude-auto-memory
    type: 유사
tags: [지식관리, AI]                    # 자유 보조 태그
---

# LLM Wiki 패턴

## 요약 (2-3줄)
...

## 본문
... [[2026-05-18-vercel-static-host]] 본문 안에서도 wikilink 사용 가능 ...
```

### 필드 정의

| 필드 | 필수 | 타입 | 설명 |
|---|---|---|---|
| `id` | ✅ | string (ASCII) | 불변. 파일명에서 `.md` 제거한 값과 동일 |
| `title` | ✅ | string | 사람이 읽는 제목. 한글 허용 |
| `node_type` | ✅ | enum(6) | 의미/통찰/절차/사건/주장/주제 |
| `memory_type` | ✅ | enum(4) | mental_model/observation/world_fact/experience |
| `scope` | derived | enum(2) | **폴더 경로에서 자동 추론**(work/personal). frontmatter에는 적지 않음. (아래 "진실 출처" 참고) |
| `created` | ✅ | date | 노드 작성일 (YYYY-MM-DD) |
| `last_reviewed` | ✅ | date | 마지막 리뷰. Lint가 90일 초과 stale로 보고 |
| `confidence` | optional | enum(3) | high/medium/low. 미지정 시 medium 가정 |
| `sources` | optional | array | raw/ 경로 또는 외부 URL |
| `links` | optional | array | `[{to: id, type: edge_type}, ...]` — **forward-only, 단방향** (아래 "링크 규칙" 참고) |
| `tags` | optional | array | 자유 보조 태그 |

**삭제된 필드**:
- `visibility`: V1에서는 빌드가 `wiki/personal/`만 포함하므로 노드 단위 visibility 플래그 불필요. work/는 빌드에서 통째로 제외. (V2에서 인증 도입 시 재검토)

### 진실 출처 (Source of Truth) 규칙

| 정보 | 진실 출처 | 비고 |
|---|---|---|
| `scope` (work/personal) | **파일 경로** (`wiki/work/...` vs `wiki/personal/...`) | frontmatter에 적지 않음. build-graph가 경로에서 추출 |
| `node_type` | **frontmatter `node_type`** | 폴더(`wiki/.../의미/`)는 사람 편의용. Lint가 폴더-frontmatter 불일치 보고 |
| 엣지 (그래프 연결) | **frontmatter `links:` (forward-only)** | 본문 `[[id]]`는 사람 가독성용. build-graph가 본문 wikilink는 무시 |
| 본문 | markdown 본문 | 변경 가능 |
| `id` | **파일명** | frontmatter `id`는 redundant 사본 (lint가 검증) |

### node_type ↔ memory_type 권장 매핑

두 분류축은 독립이지만 자연스러운 조합이 있음. Lint가 비전형 조합을 경고로 보고 (에러 X).

| `node_type` | 권장 `memory_type` | 비전형(허용되나 경고) |
|---|---|---|
| **의미** | `world_fact` (객관적 정의) 또는 `mental_model` (내 해석) | `experience` 비전형 |
| **통찰** | `mental_model` (내 모델) 또는 `observation` (관찰 기반) | `world_fact` 비전형 |
| **절차** | `world_fact` (검증된 방법) 또는 `experience` (내 시행착오) | `mental_model` 비전형 |
| **사건** | `experience` (내가 겪음) 또는 `observation` (다른 사람이 한 일을 관찰) | `world_fact`/`mental_model` 비전형 |
| **주장** | `world_fact` (검증 완료) 또는 `observation` (누군가의 주장 인용) | `experience` 비전형 |
| **주제** | `mental_model` (분류 체계 자체가 내 모델) | 나머지 모두 비전형 |

### 링크 규칙 (Forward-only, 단방향)

**핵심 원칙**: `links:`는 **forward-only(나가는 엣지)만 기록**. 백링크(들어오는 엣지)는 frontmatter에 적지 않음.

- viewer의 그래프 엣지는 frontmatter `links:`만 사용 (유일한 진실 출처)
- 본문의 `[[id]]`는 사람 가독성용 — viewer는 본문 wikilink를 파싱하지 않음
- **백링크/in-degree는 build-graph가 모든 노드의 `links:`를 스캔해 자동 계산** (frontmatter에 역방향 엣지 적지 않음)
- 이유: frontmatter에 양방향을 모두 적으면 한쪽만 git revert 등으로 깨지는 race condition. 단방향 + 빌드 시 인덱싱으로 race 원천 차단.
- `/wiki-validate`가 본문 wikilink를 발견하면 `links:`로 승격 제안 (forward 방향만)
- `/wiki-ingest`도 새 노드의 forward `links:`만 작성. 인용받는 기존 노드는 수정하지 않음.

**예**:
```
노드 A의 frontmatter links: [{to: B, type: 전제}]
→ build-graph가 엣지 (A→B, 전제) 1개를 graph.json에 출력
→ B의 in_degree는 build 시 자동으로 +1 (B의 frontmatter는 변경 없음)
```

## 5. 워크플로우 (Slash Commands)

위치: `resume/memory/.claude/commands/*.md`

### `/wiki-ingest [입력]`

**입력**: URL, 파일 경로, 또는 인라인 텍스트

**절차**:

1. **저장**: URL이면 WebFetch로 가져와 `raw/YYYY-MM-DD-slug.md`로 저장. 파일/텍스트면 raw/에 복사. frontmatter에 `source: <url>`, `fetched_at: <iso>` 포함.
2. **분해 제안**: 원본에서 추출 가능한 노드 후보를 표로 제시 — 제안 id, node_type, 한 줄 요약, 제안 forward `links:`. **자동 생성 금지**, 사용자 승인 필수.
3. **승인된 노드만 작성**: `wiki/{scope}/{node_type}/YYYY-MM-DD-slug.md`로 저장. frontmatter 모든 필수 필드 채움. scope는 사용자에게 물음(work/personal). `links:`는 새 노드에서 기존 노드로 가는 **forward 방향만** 작성.
4. **기존 노드는 수정하지 않음**: 백링크(역방향 엣지)는 frontmatter에 적지 않으므로 기존 노드 파일은 그대로. in-degree는 build-graph가 자동 계산.
   - 예외: 사용자가 명시적으로 "기존 노드 X에서 이 새 노드 Y로의 엣지도 추가해줘"라고 지시하면 X의 frontmatter 수정 (의미적 forward 엣지로 추가).
5. **로그**: `wiki/log.md`에 `- YYYY-MM-DD HH:MM ingest <slug> (+N nodes, +M edges from new nodes)` 형태로 append.
6. **빌드 안내**: 자동 빌드 안 함. "viewer 확인하려면 `cd viewer && npm run dev`" 메시지만.

### `/wiki-lint`

읽기 전용 헬스 체크. 다음 보고:

1. **깨진 링크**: `links[].to`가 존재하지 않는 id를 가리키는 노드
2. **고아 노드**: in-edge가 0개인 노드
3. **중복 후보**: 같은 node_type 내 title 유사도 높은 쌍
4. **stale**: `last_reviewed`가 90일 이상 지난 노드
5. **frontmatter 누락**: 필수 필드 빠진 노드
6. **타입 불일치**: 폴더 경로의 node_type과 frontmatter `node_type`이 다른 노드

자동 수정 X. 사용자가 항목별로 지시하면 그때 수정.

### `/wiki-stats`

빠른 헬스 표:

- 총 노드 수, 엣지 수
- node_type별 / scope별 분포
- 최근 7일/30일 추가 노드 수 (log.md 기반)
- 인용 상위 10개 허브 노드
- 주제 노드별 자식 수 상위

### `/wiki-validate [glob, 기본=변경된 파일]`

대화형 보강. 다음 동작:

1. **frontmatter 추정 채움**: 빠진 필수 필드(id, title, node_type, memory_type, created, last_reviewed)를 본문/파일경로/날짜에서 추정해 제안. scope는 폴더 경로에서 자동 추출.
2. **본문 wikilink → `links:` 승격**: `[[id]]` 발견 시 엣지 타입을 사용자에게 물어 forward `links:`로 추가 (forward 방향만).
3. **폴더-node_type 정합성**: 폴더와 frontmatter `node_type`이 다르면 파일 이동 제안.
4. **폴더-scope 정합성**: 파일이 `wiki/work/` 아래인지 `wiki/personal/` 아래인지 확인 (scope 진실 출처). frontmatter에 잔존하는 `scope:` 필드가 있으면 제거 제안.
5. **id-파일명 정합성**: frontmatter `id`와 파일명(`.md` 제거)이 다르면 둘 중 하나로 통일 제안.
6. **ASCII 슬러그 검증**: 파일명에 non-ASCII가 있으면 영문 슬러그로 rename 제안.
7. **모든 변경을 diff로 보여주고 승인 후 적용**

**참고**: 백링크 양방향 동기화는 더 이상 수행하지 않음 (forward-only 정책). in-degree 비대칭은 build-graph 단계에서 자동 해결.

### 질문 응답 규칙 (slash command 없이 CLAUDE.md 상주 지시)

```markdown
## 질문 응답 규칙
- 이 폴더에서 질문 받으면 먼저 wiki/index.md와 관련 노드를 grep으로 찾음
- 답변에 사용한 노드는 `(id)` 형태로 인용
- 답변 과정에서 새 통찰이 나오면 "이거 노드로 저장할까요?" 제안
- wiki 외부 지식으로 답할 때는 명시
```

## 6. Viewer

### 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 14 (App Router, SSG) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| 그래프 | react-force-graph-2d |
| Markdown 파싱 | gray-matter + remark + remark-html |

### 빌드 파이프라인

`viewer/lib/build-graph.ts` — `npm run build` 전에 실행 (prebuild script):

1. **포함 범위 결정**: 환경변수 `WIKI_INCLUDE_WORK`를 확인. `"true"`이면 `glob('../wiki/**/*.md')`, 그 외에는 `glob('../wiki/personal/**/*.md')`만. Vercel 배포 빌드는 항상 후자(work 노드는 graph.json에 흔적도 없음).
2. `gray-matter`로 frontmatter 파싱, 본문 분리.
3. **`scope` 추출**: 파일 경로에서 `wiki/work/...` 또는 `wiki/personal/...`을 보고 `scope` 결정 (frontmatter에는 없음).
4. 노드 객체 생성: `{id, title, node_type, memory_type, scope, in_degree, out_degree, last_reviewed}`.
5. 엣지 객체 생성: 모든 노드의 forward `links:`를 평탄화. 같은 패스에서 각 노드의 `in_degree`/`out_degree`를 자동 계산.
6. 본문 markdown → HTML (remark).
7. `viewer/public/graph.json` 저장.

### `graph.json` 구조

```json
{
  "nodes": [
    {
      "id": "2026-05-18-llm-wiki-pattern",
      "title": "LLM Wiki 패턴",
      "node_type": "의미",
      "memory_type": "mental_model",
      "scope": "personal",
      "in_degree": 3,
      "out_degree": 2,
      "last_reviewed": "2026-05-18"
    }
  ],
  "edges": [
    {"source": "2026-05-18-llm-wiki-pattern", "target": "2026-05-18-vercel-static-host", "type": "전제"}
  ],
  "contents": {
    "2026-05-18-llm-wiki-pattern": "<h1>...</h1><p>...</p>"
  }
}
```

### 페이지 라우트

| 라우트 | 내용 |
|---|---|
| `/` | 전체 그래프, 좌측 필터/검색, 우측 노드 패널 |
| `/node/[id]` | 노드 본문 + 인/아웃 엣지 목록 (딥링크용) |
| `/log` | 변경 연대기 (wiki/log.md 렌더) |
| `/stats` | node_type/scope별 분포, 허브 노드 |

### 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `<ForceGraph2D>` | 메인 시각화. 노드 드래그/줌/클릭 지원 |
| `<NodePanel>` | 클릭한 노드의 본문 + 인/아웃 엣지 리스트 |
| `<FilterBar>` | node_type(6)/scope(2)/memory_type(4) 토글 + 검색 박스 |
| `<EdgeLegend>` | 9 엣지 타입 색 범례 |
| `<NodeBadge>` | 노드 타입별 칩 |

### 시각 매핑

- **노드 색**: node_type별 6색
- **노드 크기**: in-degree (인용 많은 허브 노드일수록 큼)
- **엣지 색**: edge_type별 9색 (반박=빨강, 지지=초록 등)
- **엣지 굵기**: 균일 (V1)

## 7. 배포 & 운영

### Git

- `resume/memory/`를 git repo로 init
- GitHub private repo로 push (회사 콘텐츠 보호)
- Vercel에 연결 — push 시 자동 재배포

### Vercel 설정

**Root Directory를 repo root로 두고, `vercel.json`으로 빌드 위임**:

| 항목 | 값 |
|---|---|
| Framework Preset | Other (Next.js로 두면 root에 package.json 찾음 → 실패) |
| Root Directory | repo root (`./`) |
| Production Branch | `main` |

repo 루트의 `vercel.json`:
```json
{
  "buildCommand": "cd viewer && npm install && npm run build",
  "outputDirectory": "viewer/.next",
  "installCommand": "echo 'skip root install'",
  "framework": "nextjs"
}
```

이렇게 하면 빌드 컨테이너에 `wiki/`, `raw/`, `viewer/`가 모두 체크아웃되어, `viewer/lib/build-graph.ts`에서 `glob('../wiki/personal/**/*.md')` 접근 가능.

**거부된 대안**:
- ❌ Vercel Root = `viewer/` + `includeFiles`: `includeFiles`는 Serverless Function 번들링용이지 빌드 input 확장이 아님. 빌드 컨테이너에 `../wiki/`가 존재하지 않아 glob 실패.
- ❌ prebuild에서 `cp -r ../wiki viewer/_wiki`: Vercel Root = `viewer/`면 `../`가 빌드 sandbox 바깥 → 실패.

### 콘텐츠 민감도 (V1 정책)

**V1은 `wiki/work/`를 배포 빌드에 통째로 포함하지 않음.** 이유:

- Vercel 무료 플랜에 Password Protection 없음 — 배포 URL을 아는 사람은 누구나 graph.json을 다운로드 가능
- `graph.json`에서 본문만 제거해도 `title`, `tags`, `id`, `links` 구조가 노출됨 → 회사 자료의 title이 본문보다 더 민감한 경우 다수
- "추측하기 어려운 URL"은 보안이 아님 (security through obscurity)

**구체적 동작**:

- `viewer/lib/build-graph.ts`는 환경변수 `WIKI_INCLUDE_WORK`를 봄
  - `WIKI_INCLUDE_WORK !== "true"` (기본값): `glob('../wiki/personal/**/*.md')`만 — work는 graph.json에 흔적도 없음
  - `WIKI_INCLUDE_WORK === "true"`: 양쪽 모두 포함
- Vercel은 이 변수를 설정하지 않으므로 배포 빌드에는 항상 personal만
- 로컬 `npm run dev`는 사용자가 `.env.local`에 `WIKI_INCLUDE_WORK=true` 적으면 work까지 보임 (로컬 브라우저만 접근, 배포 안 됨)

**V2에서 검토**:
- NextAuth + 사용자 인증 → 인증된 사용자에게만 work 그래프 제공
- 또는 `wiki/work/`를 별도 private repo로 분리, 인증 게이트된 별도 배포

### 접근 제어 (V1)

- 배포 URL은 personal 콘텐츠만 포함하므로 공개돼도 회사 정보 노출 없음
- 본인 외 공유 시점에는 URL을 자유롭게 공유 가능 (personal 콘텐츠 공개 의향이 있는 노드만)
- 회사 동료와 공유는 V2에서 인증 도입 후

### 백업

- git push만으로 GitHub이 백업
- 월 1회 `git bundle create wiki.bundle HEAD` 로컬 보관 권장

## 8. V1 완료 기준 (Acceptance Criteria)

각 항목은 측정 가능. 콘텐츠 시드는 다음을 가정:
- **시드 노드 5개** (모두 `wiki/personal/` 아래)
  - 의미 2개, 통찰 1개, 절차 1개, 주제 1개
- **시드 엣지 6개** (forward `links:`로 기록)
  - 통찰 → 의미 (지지) 1
  - 절차 → 의미 (전제) 1
  - 의미 → 주제 (주제태그) 2
  - 의미 → 의미 (확장) 1
  - 통찰 → 주제 (주제태그) 1

**콘텐츠 레이어**:

- [ ] `resume/memory/CLAUDE.md`가 다음을 모두 포함: 노드 6종, 엣지 9종, frontmatter 필드 정의, source-of-truth 규칙, forward-only 링크 규약, 4개 슬래시 커맨드 워크플로우 요약, 상위 폴더 convert.mjs 오버라이드 명시
- [ ] `resume/memory/.claude/commands/` 아래에 `wiki-ingest.md`, `wiki-lint.md`, `wiki-stats.md`, `wiki-validate.md` 4개 파일 존재
- [ ] `wiki/personal/` 아래 시드 노드 5개 작성, 모든 필수 frontmatter 필드 채워짐, ASCII 슬러그 사용
- [ ] `wiki/index.md` (목차)와 `wiki/log.md` (초기 줄 1개라도) 생성

**Viewer 레이어**:

- [ ] `viewer/` Next.js 14 프로젝트 생성, `cd viewer && npm install` 성공 (warning 허용, error 없음)
- [ ] `cd viewer && npm run build` 실행 시 `viewer/public/graph.json`이 생성되고, JSON 안에 시드 노드 5개와 엣지 6개가 모두 포함됨 (jq로 확인: `jq '.nodes | length' viewer/public/graph.json` → 5, `jq '.edges | length'` → 6)
- [ ] `cd viewer && npm run dev` → `http://localhost:3000` 접속 시 force-directed graph에 5개 노드와 6개 엣지가 모두 렌더됨 (브라우저 콘솔 에러 0개)
- [ ] 노드 색이 `node_type`별로 구분됨 (의미·통찰·절차·주제 각각 다른 색)
- [ ] 노드 클릭 시 우측 패널에 해당 노드의 본문(HTML)이 표시됨
- [ ] `<FilterBar>`의 node_type 토글로 특정 타입 노드를 숨기면, 그래프에서 해당 노드와 그 노드를 끝점으로 하는 엣지가 모두 사라짐 (남은 노드는 그대로 표시)
- [ ] `WIKI_INCLUDE_WORK` 환경변수를 설정하지 않고 `npm run build`했을 때, `graph.json`에 `wiki/work/` 경로의 노드가 0개 포함됨 (work 노드가 시드에 있다면 빌드 시 제외 확인)

**배포**:

- [ ] `resume/memory/`가 git repo이고 GitHub private repo로 push 완료
- [ ] Vercel에 연결, 한 번 deploy 성공 (build log 에러 없음)
- [ ] 공개 URL로 접속 시 로컬 `npm run dev`와 동일한 그래프 표시 (시드 5 노드 + 6 엣지)
- [ ] 공개 URL에서 다운로드한 `graph.json`에 `wiki/work/` 경로 노드가 0개 (정책 적용 확인)

## 9. V2 이후 (명시적 deferred)

- Semantic search (빌드 시 임베딩 → 클라이언트 코사인 유사도)
- `/wiki-lint` GitHub Actions 자동화
- 웹 UI에서 노드 신규 생성 (서버 필요)
- 사용자 인증 (NextAuth)
- 모바일 친화 레이아웃
- 노드 버전 히스토리 시각화
- AI 자동 reflection (관련 노드 자동 통합 제안)
- Notion/Obsidian export → wiki import 스크립트
- 엣지 굵기를 confidence/reference count로 매핑

## 10. 미해결 사항 / 결정 보류

| 항목 | 보류 사유 |
|---|---|
| 9 엣지 타입의 정확한 색 매핑 | 시각 디자인 단계에서 careerhackeralex 참고해 결정. V1 acceptance에는 "node_type 색 구분"만 필수, 엣지 색은 best-effort |
| 6 node_type의 색 매핑 | 같이 시각 단계에서 결정 |
| `wiki/log.md` 포맷 상세 (machine-readable vs human-only) | V1은 human-only 한 줄 append, V2에서 stats 자동화 시 재검토 |
| 빈 `wiki/` 상태에서 viewer 첫 빌드 동작 | 시드 노드 5개 먼저 작성한 뒤 viewer 셋업하므로 V1에서는 발생하지 않음. V2에서 새 사용자가 fork할 때 빈 wiki 핸들링 추가 |
