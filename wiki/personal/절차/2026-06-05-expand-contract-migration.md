---
id: 2026-06-05-expand-contract-migration
title: Expand-Contract 무중단 마이그레이션
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
tags: [백엔드, 배포, 마이그레이션]
---

# Expand-Contract 무중단 마이그레이션

무중단 배포에선 구·신 코드가 공존하므로 스키마 변경은 단계 분리.

## 4단계

1. **Expand**: 새 컬럼/테이블 추가 (구 코드도 안 깨지게 nullable·기본값)
2. 신 코드 배포 (양쪽 읽기 호환)
3. 데이터 백필
4. **Contract**: 구 컬럼 제거 (모든 인스턴스가 신 코드 된 후)

## 흔한 사고

> "컬럼 drop + 코드 배포 동시"

= 배포 중 구버전 인스턴스가 죽는 사고로 직결. rolling deploy 중에는 구·신 인스턴스가 동시에 떠 있으므로, 둘 다 호환되는 중간 상태를 거쳐야.

## 예시 — 적립금 컬럼 분리

기존: `point_balance` 컬럼 1개
신규: `point_balance`, `point_pending` 두 컬럼으로 분리

| 단계 | 작업 | 구·신 코드 상태 |
|---|---|---|
| 1. Expand | `point_pending` 컬럼 추가 (nullable, default 0) | 구 코드: 신 컬럼 무시. 신 코드: 양쪽 다 읽기 가능 |
| 2. 신 코드 배포 | rolling | 일부 구·일부 신 |
| 3. 백필 | 기존 데이터에서 pending 계산해 채움 | 둘 다 정상 |
| 4. Contract | 다음 release에서 구 컬럼 사용 코드 제거 | 모두 신 코드 |

각 단계는 **별도 release**. 한 PR에 다 묶으면 안 됨.

## 관련

- 사이클 배포 단계의 구체화: `2026-06-05-backend-feature-cycle`
- 3대 원칙 중 "롤백 가능성" 사례: `2026-06-05-backend-three-principles`
