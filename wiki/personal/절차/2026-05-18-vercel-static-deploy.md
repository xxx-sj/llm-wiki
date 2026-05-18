---
id: 2026-05-18-vercel-static-deploy
title: Next.js SSG를 Vercel에 배포하기
node_type: 절차
memory_type: experience
created: 2026-05-18
last_reviewed: 2026-05-18
confidence: medium
sources: []
links: []
tags: [Vercel, 배포]
---

# Next.js SSG를 Vercel에 배포하기

## 단계

1. GitHub repo에 코드 push (private 가능)
2. https://vercel.com/new 에서 repo import
3. Framework Preset: "Other" (또는 monorepo면 Root Directory를 적절히)
4. `vercel.json`에 `buildCommand`, `outputDirectory` 명시
5. 환경변수 필요하면 Vercel 프로젝트 설정에서 추가
6. Deploy 클릭 → 첫 빌드 1~3분
7. Production URL 발급, push 시 자동 재배포

## monorepo / 부모 폴더 접근 필요한 경우

Vercel `Root Directory: viewer/`로 설정하면 전체 repo가 sandbox에 체크아웃되어 `../wiki/` 접근 가능. 단, framework auto-detection은 Root Directory의 package.json을 본다.

## 무료 플랜 제약

- Password Protection 없음 (Pro만)
- Edge Functions 제한
- 빌드 시간 6000분/월 (개인 wiki는 충분)
