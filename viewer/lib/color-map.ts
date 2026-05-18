import type { NodeType, EdgeType } from './schema';

// 다크 배경(#0a0a0a) 위에서 잘 보이는 muted 톤
export const NODE_COLOR: Record<NodeType, string> = {
  '의미':   '#60a5fa', // sky-400
  '통찰':   '#fbbf24', // amber-400
  '절차':   '#34d399', // emerald-400
  '사건':   '#fb923c', // orange-400
  '주장':   '#f87171', // red-400 (강조)
  '주제':   '#c084fc'  // purple-400
};

export const EDGE_COLOR: Record<EdgeType, string> = {
  '지지':     '#4ade80',  // green-400
  '반박':     '#f87171',  // red-400
  '확장':     '#60a5fa',  // sky-400
  '구체화':   '#22d3ee',  // cyan-400
  '정련':     '#a78bfa',  // violet-400
  '유사':     '#9ca3af',  // gray-400 (점선처럼 약하게)
  '촉발':     '#fbbf24',  // amber-400
  '주제태그': '#c084fc',  // purple-400
  '전제':     '#38bdf8'   // sky-400 (조금 다른 톤)
};

// 사이드바 점 표시용 (NODE_COLOR와 동일)
export const NODE_DOT_COLOR = NODE_COLOR;

// 배경 / UI 색
export const COLORS = {
  bg: '#0a0a0a',
  sidebar: '#171717',
  border: '#262626',
  textPrimary: '#e5e5e5',
  textSecondary: '#a3a3a3',
  textMuted: '#737373',
  accent: '#f87171'
};
