# /wiki-lint

`wiki/` 전체를 읽기 전용으로 스캔해 다음을 보고. **자동 수정 금지**.

## 점검 항목

### 구조
1. **깨진 링크**: 어떤 노드의 `links[].to`가 존재하지 않는 id를 가리키는지
2. **고아 노드**: in-edge가 0개인 노드 (build-graph 인덱싱과 동일 로직)
3. **id-파일명 불일치**: frontmatter `id`와 파일명(`.md` 제거)이 다른 노드
4. **타입 불일치**: 폴더 경로의 node_type과 frontmatter `node_type`이 다른 노드
5. **frontmatter 누락**: 필수 필드(id, title, node_type, memory_type, created, last_reviewed) 빠진 노드

### 콘텐츠
6. **중복 후보**: 같은 node_type 내 title 유사도 높은 쌍 (Levenshtein distance < 5)
7. **stale**: `last_reviewed`가 90일 이상 지난 노드
8. **비전형 memory_type**: node_type ↔ memory_type 권장 매핑(CLAUDE.md)에서 벗어난 노드 (warning)

### 인식론 (Phase 2/3 신규)
9. **origin 누락**: frontmatter에 `origin` 필드 없는 노드 (default: self로 기록 권장)
10. **목소리 방화벽 (voice firewall) — CRITICAL**:
    - `origin: synthesized`인 노드는 `external` 노드로 향하는 forward 엣지가 **최소 1개 필수**
      (`extends`/`refines`/`supports`/`contradicts`/`triggered-by` 중 하나)
    - 없으면 ERROR로 보고 — synthesized 주장은 출처 흔적이 보존되어야 함
    - 본인 목소리가 외부 자료에 흘러가지 않게 강제
11. **origin과 sources 정합성**:
    - `origin: external`인데 `sources:` 비어있음 → warning (출처가 어디인가)
    - `origin: self`인데 `sources:`에 외부 URL 있음 → warning (external/synthesized 검토)

### 의미 버전 (Phase 3 신규)
12. **stale 엣지 — meaning_version drift**:
    - 엣지가 `to_meaning_version: N`인데 target 노드의 현재 `meaning_version`이 더 크면 stale
    - 의미가 바뀌었으니 인용 노드가 새 의미와 맞는지 재검토 필요
    - 보고 형식: `[stale edge] source.id → target.id : edge.to_meaning_version=N, target.meaning_version=M`

### Surfaces (Phase 3 신규)
13. **private-only RAG 누출 검사**:
    - `surfaces: [private-only]` 노드를 다른 `rag-eligible` 노드가 forward 엣지로 가리키면 warning
    - 챗봇 답변 시 그 엣지를 따라가 private 본문이 인용에 흘러갈 위험
14. **빈 surfaces**: surfaces 명시 안 한 노드는 default `[rag-eligible]` 가정 — 의도 검증

## 출력 형식

각 항목을 섹션으로 나눠 표로 출력. CRITICAL/ERROR/warning 분류. 사용자가 항목별로 "이거 고쳐"라고 지시하면 그때 별도 Edit/Write로 수정.

## 작업 우선순위 권장

1. CRITICAL (목소리 방화벽 위반, 깨진 링크)
2. ERROR (frontmatter 누락, 타입 불일치)
3. warning (stale, 중복 후보, 정합성)
