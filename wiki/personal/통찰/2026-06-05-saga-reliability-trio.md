---
id: 2026-06-05-saga-reliability-trio
title: Saga 신뢰성 3종 — Outbox + 멱등성 + semantic lock
node_type: 통찰
memory_type: mental_model
origin: self
created: 2026-06-05
last_reviewed: 2026-06-05
confidence: high
sources:
  - raw/2026-06-05-backend-feature-cycle.md
links:
  - to: 2026-06-05-backend-methodology
    type: 주제태그
  - to: 2026-06-05-saga-pattern
    type: 확장
    note: Saga를 실무에서 작동시키는 구체적 메커니즘
  - to: 2026-06-05-idempotency
    type: 전제
    note: at-least-once 전달이 작동하려면 멱등성이 필수
tags: [백엔드, Saga, Outbox, 신뢰성]
---

# Saga 신뢰성 3종 + α

Saga를 "이론적으로 잘 작동시키는" 게 진짜 어려운 부분. 책에는 안 쓰여 있는 4가지 메커니즘이 받쳐줘야 실무에서 굴러간다.

## 1. Dual-write 문제 → Transactional Outbox

"로컬 커밋 + 이벤트 발행"을 원자적으로:
- 같은 트랜잭션에서 `outbox` 테이블에 INSERT
- 별도 릴레이/CDC가 outbox를 읽어 메시지 큐로 발행
- → **이벤트 유실 방지**

DB 커밋과 외부 시스템 발행이 별도 IO면 한쪽만 성공하는 사고 발생 — outbox로 단일 트랜잭션 안에 묶어서 해결.

## 2. At-least-once 전달 → 멱등성 필수

메시지 큐는 보통 at-least-once. 같은 메시지가 N번 도착할 수 있음 → consumer가 멱등해야:
- 처리한 `eventId`를 유니크 제약으로 1회만 처리
- 또는 idempotency_key 테이블 + 캐시

`2026-06-05-idempotency` 참조.

## 3. 격리성(I) 없음 → semantic lock

Saga는 ACID의 I(격리성)가 없음. 중간 상태가 다른 트랜잭션에 노출됨:
- 적립금 차감 직후 다른 결제가 진행 중인 잔액을 읽음
- → 비즈니스 상 "처리 중" 상태를 명시 (`PENDING`, `RESERVED` 등)
- 다른 트랜잭션은 "처리 중" 자원에 접근 시 거부 또는 대기

## 4. 보상 불가 액션 → pivot transaction

못 되돌리는 액션 (보낸 메일, PG 승인, 외부 API 호출 등):
- pivot 이후로 배치
- pivot 넘으면 보상 대신 **재시도로 끝까지 전진**

예: 결제 승인 → 메일 발송 → 주문 확정에서, "메일 발송"이 pivot. 그 이후 실패는 메일 회수 불가 → forward retry only.

## 한 줄 본질

분산 환경에선 원자적 롤백이 불가능하니, 여러 로컬 커밋을 이어 붙이고 + 실패하면 의미적 취소(보상)로 되돌려 + 최종적으로 일관시킨다. **떠받치는 게 Outbox + 멱등성 + semantic lock + pivot**.
