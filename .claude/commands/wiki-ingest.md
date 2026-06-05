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

| 제안 id | node_type | scope (work/personal) | origin | 한 줄 요약 | 제안 forward links |
|---|---|---|---|---|---|

**자동 생성 금지** — 사용자 승인 후에만 진행.

### origin 분류 규칙

- 외부 글/대화 원본 인용 노드 → `origin: external`
- 외부 위에 본인 관점 추가/종합한 노드 → `origin: synthesized` (external 노드로 `extends`/`refines`/`supports`/`contradicts` 엣지 1개 이상 강제)
- 본인 직접 통찰/주장 → `origin: self`

## 3. 신뢰도 기반 중복 감지 (선택, embeddings.json 있을 때)

각 제안 노드의 (title + body) 텍스트를 OpenAI 임베딩으로 변환 → 기존 모든 노드의 임베딩과 cosine 유사도 계산 → 점수별 분기:

| score | 처리 | 사용자 확인 |
|---|---|---|
| ≥ 0.95 | 같은 주장 — **merge 권장** (기존 노드에 본문 보강 또는 sources 추가) | "기존 노드 X와 merge 할까요?" |
| 0.70 ~ 0.95 | 유사하나 다를 수도 — **검토 필요** | "merge / refine / new + 엣지 / skip 중?" |
| 0.50 ~ 0.70 | 별개지만 관련 — **new + 엣지 자동 추가** | "기존 노드 X와 `유사`/`확장` 엣지로 연결?" |
| < 0.50 | 새 주장 — **그냥 new** | (자동) |

embeddings.json이 없으면 이 단계 건너뛰고 4번으로.

### 외부 vs 본인 dedup 차이 (epistemological weight)

- external 두 명이 같은 주장 → `merge` OK (두 출처를 sources에 함께)
- external 노드와 본인 self/synthesized 노드가 비슷 → **절대 merge 금지**. `유사` 엣지로 연결 (인용 무게가 다름)

## 4. 승인된 노드만 작성

- 경로: `wiki/{scope}/{node_type}/YYYY-MM-DD-slug.md`
- frontmatter 모든 필수 필드 채움: id, title, node_type, memory_type, **origin**, created, last_reviewed, sources, links
- 슬러그는 ASCII만, 한글은 title에
- scope는 폴더 경로로 결정되므로 frontmatter에 적지 않음
- `meaning_version`은 기본 1 (frontmatter 생략 OK)

### 엣지 note

가능하면 각 forward link에 `note:` (한 줄 설명) 같이 작성 — RAG 답변 품질 ↑. 자명한 주제태그는 생략 가능.

### 엔티티 자동 추출 (선택)

본문에 자주 등장하는 named entity (사람·회사·이벤트)를 발견하면:
1. 해당 엔티티가 이미 `wiki/personal/엔티티/` 또는 `wiki/work/엔티티/`에 있는지 확인
2. 없으면 신규 엔티티 노드 작성 제안 (`node_type: 엔티티`, `origin: external`)
3. 새 노드에 `언급` 엣지로 연결

## 5. 기존 노드는 수정하지 않음

forward-only 정책. 백링크는 build-graph가 자동 계산. 사용자가 명시적으로 "기존 노드 X도 새 노드 Y를 가리키게 해줘"라고 지시할 때만 X 수정.

## 6. 로그

`wiki/log.md`에 한 줄 append:
`- YYYY-MM-DD HH:MM ingest <slug> (+N nodes, +M edges, dedup: X reused / Y new)`

## 7. 빌드 안내

자동 빌드 안 함. "viewer 확인하려면 `cd viewer && npm run dev`" 메시지만.
