/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // 순수 정적 export — Vercel / Cloudflare Pages / Netlify / GitHub Pages 모두 호환
  // 빌드 출력: viewer/out/
  output: 'export',
  // export 모드는 next/image 최적화 미지원 — 우리는 이미지 안 씀
  images: { unoptimized: true }
};

export default config;
