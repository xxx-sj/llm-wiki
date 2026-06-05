---
id: 2026-05-18-static-hosting-suffices
title: 정적 호스팅으로 충분하다
node_type: 통찰
memory_type: mental_model
origin: self
created: 2026-05-18
last_reviewed: 2026-05-18
confidence: high
sources: []
links:
  - to: 2026-05-18-llm-wiki-pattern
    type: 지지
    note: wiki를 정적으로 빌드해도 검색/그래프 모두 동작함을 뒷받침
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
