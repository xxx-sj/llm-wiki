---
id: 2026-05-18-llm-wiki-pattern
title: LLM Wiki 패턴
node_type: 의미
memory_type: mental_model
origin: external
created: 2026-05-18
last_reviewed: 2026-05-18
confidence: high
sources:
  - https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
links:
  - to: 2026-05-18-vercel-static-deploy
    type: 전제
    note: wiki 패턴 이해가 정적 배포 절차의 전제
  - to: 2026-05-18-knowledge-management
    type: 주제태그
tags: [지식관리, AI]
---

# LLM Wiki 패턴

Andrej Karpathy가 제안한 개인 지식 베이스 아키텍처 패턴. 기존 RAG와 달리 **LLM이 markdown 위키를 지속적으로 유지보수**하며 지식을 누적한다. "지식이 컴파일되어 유지되지, 매번 재파생되지 않는다"가 핵심 주장.

## 3계층 구조

1. **raw/** — 변경 불가능한 원본
2. **wiki/** — LLM이 작성·유지하는 상호연결된 markdown
3. **스키마(CLAUDE.md)** — 워크플로우와 규약을 정의

## 워크플로우

- **Ingest**: 새 자료 추가 시 요약 작성 + 관련 페이지 5~15개 업데이트
- **Query**: wiki에서 관련 페이지 찾아 합성된 답변
- **Lint**: 모순/고아/누락 교차참조 주기 점검
