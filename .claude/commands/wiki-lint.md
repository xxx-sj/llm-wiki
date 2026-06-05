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
9. **origin 누락**: frontmatter에 `origin` 필드 없는 노드 (default: self로 기록 권장)
10. **외부 인용 엣지 누락** (voice firewall 약식): `origin: synthesized`인 노드인데 `external` 노드로 향하는 forward 엣지가 0개면 warning

## 출력 형식

각 항목을 섹션으로 나눠 표로 출력. 사용자가 항목별로 "이거 고쳐"라고 지시하면 그때 별도 Edit/Write로 수정.
