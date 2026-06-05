---
id: 2026-06-05-nfr-non-functional-requirements
title: NFR — 비기능 요구사항 7종
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
  - to: 2026-06-05-idempotency
    type: 확장
    note: 멱등성이 NFR 중 핵심 1종
tags: [백엔드, 요구사항, NFR]
---

# NFR (Non-Functional Requirements) — 비기능 요구사항

기획서에 안 적혀 있고 **서버 개발자가 끄집어내야 하는** 비기능 요구사항. happy path만 보면 놓치고, 구현 다 한 뒤 "동시 결제 이중 차감" 같은 사고로 터진다.

## 7종 + 끄집어내는 질문

| NFR | 질문 |
|---|---|
| **정합성** | 차감+주문이 원자적이어야 하나? (돈→yes) |
| **동시성** | 동시에 두 번 누르면? |
| **멱등성** | 재시도로 같은 요청 두 번 오면? |
| **성능** | P95 목표·피크 QPS |
| **가용성** | 적립금 서비스 죽으면 주문도 막히나? |
| **관측성** | 차감 실패를 어떻게 감지·추적 |
| **감사/규정** | 변동 이력 보관 기간 |

## 시니어 포인트

- 요구사항의 모순·빈틈·암묵 가정을 질문으로 드러냄
- "적립금 결제도 환불되나? 환불하면 적립금/현금 중 무엇으로?"
- NFR을 기능 정의 단계로 가져가 "관찰 가능한 동작"으로 번역해야 (예: "이중 차감 금지" → "동일 멱등키 요청은 1회만 처리하고 같은 응답 반환")

## 관련

- 3단계 경계: `2026-06-05-three-stages-boundary`
- 멱등성 상세: `2026-06-05-idempotency`
