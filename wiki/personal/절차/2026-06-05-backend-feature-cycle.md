---
id: 2026-06-05-backend-feature-cycle
title: 백엔드 기능 개발 사이클 (11단계)
node_type: 절차
memory_type: world_fact
origin: self
created: 2026-06-05
last_reviewed: 2026-06-05
confidence: high
sources:
  - raw/2026-06-05-backend-feature-cycle.md
links:
  - to: 2026-06-05-backend-methodology
    type: 주제태그
  - to: 2026-06-05-three-stages-boundary
    type: 전제
    note: 3단계(요구사항/기능정의/기술설계) 경계 이해가 사이클 적용의 전제
  - to: 2026-06-05-saga-pattern
    type: 확장
    note: 분산 환경 시 Saga로 확장되는 케이스
  - to: 2026-06-05-expand-contract-migration
    type: 확장
    note: 배포 단계의 무중단 마이그레이션 패턴
tags: [백엔드, 사이클, SDLC]
---

# 백엔드 기능 개발 사이클

일반적인 실무 기준의 기능 개발 한 사이클. 프로젝트 무관 공용 방법론.

## 전체 흐름

```
요구사항 정의        왜·누구·성공이 뭔가 (비즈니스)
  → 기능 정의        시스템이 밖에서 어떻게 동작하나 (블랙박스)
  → 기술 설계        내부를 어떻게 구현하나 (API계약·스키마/마이그레이션·트레이드오프)
  → 작업 분해        배포 가능한 작은 단위로 쪼갬
  → 테스트 리스트업   인수조건·엣지케이스에서 케이스 도출
  → 구현             feature 브랜치 + flag
  → 테스트 진행       단위·통합 (CI 자동화)
  → PR·코드 리뷰·CI   ← 머지 게이트
  → e2e 테스트        staging 환경
  → 배포             롤백 전략은 *전제* / 점진 출시(canary·flag)
  → 모니터링          메트릭·로그·트레이싱·알람
  → 이상 시 롤백 실행
  → 회고 + 정리       flag·임시코드 제거 → 다음 사이클
```

## 단계별 핵심

| 단계 | 핵심 |
|---|---|
| 작업 분해 | 큰 PR 하나 < 작은 PR 여럿. 의존 순서(스키마→API→연동). 프론트와 계약 먼저 합의 → 병렬 작업 |
| 테스트 리스트업 | 인수조건+엣지에서 케이스 도출. 피라미드(단위 多 / 통합 中 / e2e 少). 관찰 가능한 최종 상태 검증(mock 호출 단언 X) |
| 구현 | feature 브랜치, 외과적 수정, 미완성은 flag로 가림 |
| 테스트 진행 | 단위·통합 통과, lint·타입체크, CI 자동화 |
| PR·리뷰·CI ← 게이트 | 리뷰 맹목수용도 방어도 아닌 기술 검증. PR에 배포영향(마이그레이션·env·설정) 체크리스트 명시 |
| e2e (staging) | 느린 전체흐름 검증을 배포 전 환경에서 |
| 배포 | 무중단 전략(rolling/blue-green/canary), 마이그레이션 expand-contract, 롤백 전략은 *전제*, 점진 출시 |
| 모니터링 | 메트릭·로그·트레이싱 3종 + 알람. 배포 직후 대시보드 주시 |
| 롤백 실행 | 지표 악화 시: 이전 이미지 재배포 / flag off / blue-green 전환 |
| 회고 + 정리 | 포스트모템(비난 없는 원인분석), flag·임시코드·deprecated 컬럼 제거 |

세부 단계 멘탈 모델은 `2026-06-05-three-stages-boundary`, 관통 원칙은 `2026-06-05-backend-three-principles`.
