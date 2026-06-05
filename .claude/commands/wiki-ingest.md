# /wiki-ingest

$ARGUMENTS

careerhackeralex Second Brain 인바운드 패턴 기반 **8단계 파이프라인**. 각 단계마다 사용자 승인을 받는다.

---

## 1단계 · 동기화 (sync / 탐지)

- $ARGUMENTS가 URL이면 WebFetch로 fetch
- 이미 raw/에 같은 source URL이 있으면 SHA-256 비교 (변경/동일/404 판별)
  - 동일 → 다음 step skip (이미 ingest됨)
  - 변경 → 원문 수정됐다고 사용자에게 안내 (refine 모드)
- 파일 경로/인라인 텍스트는 비교 없이 진행

## 2단계 · 보관 (raw 동결, 변경 불가)

- `raw/YYYY-MM-DD-slug.md`로 저장
- frontmatter: `source: <url>`, `fetched_at: <iso>`, `content_hash: <sha256>`, `title: ...`
- raw/는 append-only. 한 번 저장된 후 수정/삭제 금지

## 3단계 · 정제 (정리어 제거, PII 검사)

- STT/대화 트랜스크립트면 "음/어/아" 같은 filler 제거 제안
- 이메일/전화번호/주민번호 패턴 검출 → 사용자에게 마스킹 여부 물음
- 원문(raw/)은 그대로 보존, **정제는 새 메모리에서만**

## 4단계 · 원자화 (분할)

원본에서 추출 가능한 노드 후보를 표로 제시:

| 제안 id | node_type | scope | origin | surfaces | 한 줄 요약 | 제안 forward links |
|---|---|---|---|---|---|---|

### origin 자동 분류
- 외부 글/대화 원본 인용 노드 → `origin: external`
- 외부 위에 본인 관점 추가/종합 → `origin: synthesized` (external 노드로 `extends`/`refines`/`supports`/`contradicts`/`triggered-by` 엣지 1개 이상 강제 — voice firewall)
- 사용자가 직접 통찰/주장 → `origin: self`

### surfaces 자동 분류
- 외부 사실/요약은 보통 `[rag-eligible]`
- 본인 회사 자료/사적 정보가 섞이면 `[private-only]` 또는 `[rag-eligible]` 둘 다
- 정제된 강의 슬라이드급 노드는 `[rag-eligible, lecture-ready]`

**자동 생성 금지** — 사용자 승인 후에만 다음 step.

## 5단계 · 중복제거 (cross-language 검색, embeddings.json 있을 때)

각 제안 노드 텍스트 → OpenAI 임베딩 → 기존 모든 노드 임베딩과 cosine 유사도 → 점수 버킷:

| score | 처리 | 사용자 확인 |
|---|---|---|
| ≥ 0.95 | 같은 주장 — **merge 권장** | "기존 노드 X와 merge 할까요?" (sources에 새 출처 추가 + 본문 보강) |
| 0.70 ~ 0.95 | 유사하나 다를 수도 — **검토 필요** | "merge / refine / new + 엣지 / skip 중?" |
| 0.50 ~ 0.70 | 별개지만 관련 — **new + 자동 엣지** | "기존 노드 X와 `유사`/`확장` 엣지로 연결?" |
| < 0.50 | 새 주장 — **그냥 new** | (자동) |

### epistemological weight 차이
- external 두 명이 같은 주장 → `merge` OK
- external 노드와 본인 self/synthesized 노드가 비슷 → **절대 merge 금지**. `유사` 엣지로 연결 (인용 무게 다름)

embeddings.json이 없으면 이 단계 건너뜀.

## 6단계 · 체크포인트 (사용자 결정 게이트)

5단계 결과를 사용자에게 표로 보여주고 각 노드별로 명시적 결정 받음:

| 후보 | 점수 | 추천 | 사용자 결정 |
|---|---|---|---|
| node-1 | 0.92 | merge with X | (대기) |
| node-2 | 0.65 | new + 유사 엣지 to Y | (대기) |

승인 후에만 다음 step.

## 7단계 · 반영 (커밋 — 단일 git commit 1개)

- `wiki/{scope}/{node_type}/YYYY-MM-DD-slug.md` 작성
- frontmatter 필수 필드 채움: id, title, node_type, memory_type, **origin**, created, last_reviewed, sources, links
- 선택 필드: meaning_version (default 1 생략 OK), surfaces (default ['rag-eligible'] 생략 OK), confidence, tags
- 슬러그는 ASCII만, 한글은 title에
- scope는 폴더 경로로 결정 → frontmatter에 적지 않음
- 각 forward link에 `note:` 같이 작성 권장

### 엔티티 자동 추출
본문에 자주 등장하는 named entity (사람·회사·이벤트):
1. 이미 `wiki/{scope}/엔티티/`에 있는지 확인
2. 없으면 신규 엔티티 노드 작성 제안 (`node_type: 엔티티`, `origin: external`)
3. 새 노드에 `언급` 엣지로 연결

### Voice firewall 강제 (CRITICAL)
`origin: synthesized` 노드 만들 때 external 노드로 가는 엣지 0개면 **저장 거부**. 사용자에게 "이 종합 주장의 출처 노드는?" 물어 엣지 추가 받은 후에만 저장.

## 8단계 · 수확 (목소리 플래그)

이번 인제스트에서 새로 등장한 어휘/표현이 본인 평소 어조와 다르면 (예: 너무 영어식, 너무 격식체 등) 검토용으로 표면화:
- "다음 새 시그니처 표현이 본인 평소와 다를 수 있습니다: …"
- "자동 수정은 안 하고 사용자가 직접 다듬도록 안내만"

목소리는 **절대 자동 수정 X**.

---

## 로그

`wiki/log.md`에 한 줄 append:
```
- YYYY-MM-DD HH:MM ingest <slug> (+N nodes, +M edges, dedup: X reused / Y new)
```

## 빌드 안내

자동 빌드 안 함. "viewer 확인하려면 `cd viewer && npm run dev`" 메시지만.
