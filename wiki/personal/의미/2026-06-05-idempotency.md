---
id: 2026-06-05-idempotency
title: 멱등성 (Idempotency)
node_type: 의미
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
tags: [백엔드, 멱등성, NFR]
---

# 멱등성 (Idempotency)

같은 요청을 N번 실행해도 효과가 1번과 동일한 성질. 네트워크 재시도/사용자 더블클릭/at-least-once 메시지 환경에서 부작용 1회만 보장.

## 적립금 예시 (실무)

### 요구사항
> "돈이 두 번 빠지면 안 됨" (NFR / 정합성)

### 기능 정의 (밖에서 본 동작)
> "같은 멱등키(Idempotency-Key)는 1회만 처리, 동일 응답 반환"

### 기술 설계 (HOW)
- `Idempotency-Key` 헤더로 클라이언트가 요청별 고유 키 부여
- DB의 `idempotency_keys` 테이블에 **유니크 제약** + 결과 캐싱
- 같은 키 두 번째 요청 → 유니크 위반 → 캐시된 응답 반환
- 또는 조건부 atomic update (`WHERE balance>=amt AND NOT EXISTS (...)`)로 함께 처리

## 분산 시스템에서

- 메시지 큐 at-least-once 전달 → 중복 도착 가능 → 처리한 `eventId`를 유니크 제약으로 1회만 처리
- Saga 보상 액션도 멱등 필수 (재시도 가능)

## 흔한 실수

- 클라이언트가 같은 키 안 보내면 무용지물 → 클라이언트 SDK에서 자동 생성 권장
- 캐시 응답 없이 2번째 요청을 "성공"으로만 답하면 클라이언트가 실제 처리 결과를 모름

## 관련

- NFR 분류: `2026-06-05-nfr-non-functional-requirements`
- Saga가 전제로 함: `2026-06-05-saga-pattern`
- Saga 신뢰성 3종 중 하나: `2026-06-05-saga-reliability-trio`
