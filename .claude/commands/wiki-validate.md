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
   - **origin** ← sources에 외부 URL이 있으면 `external` 제안, 없으면 `self` 제안
2. **본문 wikilink → `links:` 승격**: 본문에 `[[id]]`가 있으면 forward `links:`로 추가 제안. 엣지 타입은 사용자에게 물음. 가능하면 `note:` 한 줄도 같이 제안 (관계 설명)
3. **폴더-node_type 정합성**: 폴더와 frontmatter `node_type`이 다르면 파일 이동 제안
4. **폴더-scope 정합성**: 파일이 `wiki/work/` 아래인지 `wiki/personal/` 아래인지 확인. frontmatter에 잔존 `scope:` 필드 있으면 제거 제안
5. **id-파일명 정합성**: frontmatter `id`와 파일명(`.md` 제거)이 다르면 둘 중 하나로 통일 제안
6. **ASCII 슬러그 검증**: 파일명에 non-ASCII 있으면 영문 슬러그로 rename 제안
7. **synthesized voice check**: `origin: synthesized`이면 external 노드로 가는 forward 엣지 1개 이상 있는지 확인. 없으면 사용자에게 "이 종합 주장의 출처 노드는?" 물어 엣지 추가 제안

## 결과

모든 변경을 diff로 보여주고 승인 후 적용. 백링크 양방향 동기화는 수행하지 않음(forward-only 정책).
