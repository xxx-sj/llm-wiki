import type { NodeType, EdgeType } from './schema';

// 노드: 기본 흰색, 주장(thesis)만 빨강 강조 — 레퍼런스 컨벤션
export const NODE_COLOR: Record<NodeType, string> = {
  '의미':   '#e5e5e5',
  '통찰':   '#e5e5e5',
  '절차':   '#e5e5e5',
  '사건':   '#e5e5e5',
  '주장':   '#f87171', // 강조 (thesis)
  '주제':   '#e5e5e5'
};

export const NODE_COLOR_DISABLED = '#3f3f46'; // zinc-700, 어둡게

// 엣지: 모두 회색 톤, 반박만 빨강 강조
export const EDGE_COLOR: Record<EdgeType, string> = {
  '지지':     '#525252',
  '반박':     '#f87171', // 강조 (반박)
  '확장':     '#525252',
  '구체화':   '#525252',
  '정련':     '#525252',
  '유사':     '#525252',
  '촉발':     '#525252',
  '주제태그': '#525252',
  '전제':     '#525252'
};

// 점선 패턴 (유사·주제태그 — 약한/메타 관계)
export const EDGE_DASH: Record<EdgeType, number[] | null> = {
  '지지':     null,
  '반박':     null,
  '확장':     null,
  '구체화':   null,
  '정련':     null,
  '유사':     [3, 3],
  '촉발':     null,
  '주제태그': [3, 3],
  '전제':     null
};

// 사이드바 dot 색 (NODE_COLOR와 동일)
export const NODE_DOT_COLOR = NODE_COLOR;

// 배경 / UI 색
export const COLORS = {
  bg: '#0a0a0a',
  sidebar: '#171717',
  border: '#262626',
  textPrimary: '#e5e5e5',
  textSecondary: '#a3a3a3',
  textMuted: '#737373',
  textDisabled: '#52525b',
  accent: '#f87171'
};
