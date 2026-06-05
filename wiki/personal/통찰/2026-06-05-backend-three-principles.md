---
id: 2026-06-05-backend-three-principles
title: 백엔드 개발 3대 관통 원칙
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
  - to: 2026-06-05-backend-feature-cycle
    type: 확장
    note: 사이클 11단계 전체를 관통하는 원칙
tags: [백엔드, 원칙, 시니어]
---

# 백엔드 개발 3대 관통 원칙

기능 개발 사이클 전체를 관통하는 원칙. 단계마다 흩어진 결정을 한 줄로 묶음.

## 1. 단방향 흐름

요구사항 → 기능 정의 → 설계는 **위에서 아래로만**.

- 아래에서 빈틈 발견 시 → 위로 올라가 메우고 내려온다
- 설계 중 즉흥 결정 금지 (명세와 코드 어긋남)
- 의문이 떠오르면 그건 "한 단계 위가 미흡하다"는 신호

## 2. right-size

작은 변경에 전 단계를 다 밟지 않는다. 변경의 **위험도(비가역성·blast radius)에 비례해** design doc / 테스트 / 배포 전략의 깊이를 조절.

- "이건 design doc 필요 / 이건 PR 설명으로 충분"을 판단하는 게 시니어
- 오버엔지니어링도 underengineering도 둘 다 안 됨
- 변경의 "되돌리기 비용"을 측정해서 정도를 조절

## 3. 롤백 가능성을 설계에 내장

배포·마이그레이션·flag 모두 "잘못됐을 때 빠르게 되돌리는 법"이 기준.

- 롤백은 사이클 끝에 *생각하는 것*이 아니라 배포의 *전제*
- DB 마이그레이션은 Expand-Contract로 단계 분리 (`2026-06-05-expand-contract-migration`)
- 기능은 feature flag 뒤에 가려서 deploy ≠ release 분리
- "롤백 어떻게 할지" 정의 없는 변경은 배포 거부

## 시니어의 사고

> "비관락 썼습니다"가 아니라 "경합이 드물고 강정합 필요해 비관락, 경합 늘면 조건부 atomic으로 전환"

- 택한 이유 + 한계 + 진화 경로까지
- 어떤 axis가 먼저 깨질지 예측 + 그 시점 시그널 + 그때 어떻게 진화할지
