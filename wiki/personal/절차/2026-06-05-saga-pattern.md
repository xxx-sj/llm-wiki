---
id: 2026-06-05-saga-pattern
title: Saga 패턴 — 분산 트랜잭션
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
  - to: 2026-06-05-idempotency
    type: 전제
    note: at-least-once 전달 + 보상 액션 재시도 모두 멱등성이 전제
  - to: 2026-06-05-saga-reliability-trio
    type: 확장
    note: Saga를 실무에서 작동시키는 신뢰성 메커니즘
tags: [백엔드, Saga, 분산트랜잭션]
---

# Saga 패턴

같은 DB면 `BEGIN; 차감; 주문 INSERT; COMMIT;`으로 ACID가 원자성·자동 롤백을 공짜로 준다. 서비스/DB가 분리되면 두 DB를 감싸는 하나의 트랜잭션이 없어 "돈은 빠졌는데 주문은 없음"이 가능 → Saga.

## 결정 가이드

```
적립금·주문이 같은 DB?  ── yes ──▶  로컬 ACID 트랜잭션. 끝. (Saga 금지)
        │ no (분리 강제됨)
        ▼
즉시 강한 일관성이 절대 필요?  ── yes(희귀) ──▶  합치거나 2PC
        │ no (최종 일관성 OK)
        ▼
     Saga
   ├ 단계 적고 단순  →  Choreography (이벤트 구독/반응, 중앙 없음)
   └ 단계 多/분기 복잡 →  Orchestration (중앙 조정자 — 추적·디버깅 쉬움)
```

**right-size 먼저**: 분산 트랜잭션은 서비스 분리의 *대가*. "정말 나눠야 하나?"부터 점검. 같은 DB로 둘 수 있으면 로컬 ACID로 끝낸다.

## 후보 비교

| 안 | 방식 | 일관성 | 트레이드오프 |
|---|---|---|---|
| 2PC (XA) | 코디네이터 prepare→commit | 강한(즉시) | prepare 동안 락 점유, 코디네이터 SPOF, 지연↑, 가용성↓. MSA에서 거의 안 씀 |
| **Saga** | 로컬 트랜잭션 체인 + 실패 시 보상 | 최종(eventual) | 격리성(I) 없음 → 중간 상태 노출. 보상 로직 직접 작성 |
| 분리 안 함 | 한 DB 로컬 트랜잭션 | 강한 | 서비스 결합 |

## 핵심 개념

- **롤백이 아니라 보상(compensation)**: 이미 커밋됐으니 DB 롤백 불가. "차감"을 되돌리는 건 "환불"이라는 새 forward 액션
- **최종 일관성**: 차감만 되고 주문 없는 상태가 잠깐 실재하지만, 보상이 끝나면 일관된 상태로 수렴

## Orchestration 흐름 (적립금+주문)

```
성공: 1.주문 PENDING (보상:취소) → 2.적립금 차감(보상:환불) → 3.주문 CONFIRMED
실패(2단계 잔액부족): 1✅ 2❌ → 보상 cancelOrder(1) → 주문 CANCELLED, 적립금 그대로
실패(3단계 확정실패): 1✅ 2✅ 3❌ → 역순 보상 refundPoint(2) → cancelOrder(1)
```

보상은 항상 **역순**.

## 신뢰성을 떠받치는 메커니즘

`2026-06-05-saga-reliability-trio` 참조 (Outbox + 멱등성 + semantic lock + pivot transaction).
