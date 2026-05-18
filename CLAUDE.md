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
