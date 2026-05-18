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
