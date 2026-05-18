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
