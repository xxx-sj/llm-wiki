---
id: 2026-05-18-graph-visualization
title: Force-directed Graph 시각화
node_type: 의미
memory_type: world_fact
origin: external
created: 2026-05-18
last_reviewed: 2026-05-18
confidence: high
sources:
  - https://careerhackeralex.vercel.app/memory
links:
  - to: 2026-05-18-llm-wiki-pattern
    type: 확장
    note: wiki 패턴에 시각화 레이어를 더해 확장
  - to: 2026-05-18-knowledge-management
    type: 주제태그
tags: [시각화, 그래프]
---

# Force-directed Graph 시각화

노드 간 관계를 물리 시뮬레이션(스프링/반발력)으로 자동 배치하는 시각화 기법. 자기조직화된 레이아웃이 클러스터 구조를 자연스럽게 드러낸다.

## 주요 라이브러리

- `react-force-graph-2d/3d`: React API 단순, MVP에 적합
- `cytoscape.js`: 더 강력하지만 학습곡선 ↑
- `D3.js` 직접: 가장 유연, 가장 어려움

## 시각 매핑 패턴

- 노드 색 = 카테고리(타입)
- 노드 크기 = in-degree(허브성)
- 엣지 색 = 관계 타입
- 엣지 굵기 = 가중치/빈도(선택)
