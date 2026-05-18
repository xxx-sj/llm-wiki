import type { NodeType, EdgeType } from './schema';

// careerhackeralex.vercel.app/memory 다크 토큰 미러 (canvas는 raw 값 필요)
export const FG = {
  '1': '#ffffff',
  '2': '#cccccc',  // ON / primary
  '3': '#a1a1a1',
  '4': '#888888',
  '5': '#777777',  // OFF / disabled
  '6': '#737373',
  '7': '#888888',
  '8': '#a1a1a1',
  '9': '#d4d4d4'
} as const;

export const BORDER = {
  '1': '#1e1e1e',
  '2': '#2a2a2a',
  '3': '#333333'
} as const;

export const SURFACE = {
  '1': '#111111',
  '2': '#141414',
  '3': '#1a1a1a',
  '4': '#222222'
} as const;

export const ACCENT = {
  main: '#b00d26',
  soft: '#ff4d64',
  hover: '#8e0a1e'
} as const;

// 노드: 기본 fg-2(#ccc), 주장(thesis)만 accent 강조
export const NODE_COLOR: Record<NodeType, string> = {
  '의미':   FG['2'],
  '통찰':   FG['2'],
  '절차':   FG['2'],
  '사건':   FG['2'],
  '주장':   ACCENT.main, // 강조
  '주제':   FG['2']
};

export const NODE_COLOR_DISABLED = FG['5'];

// 엣지: 모두 border-3 톤(#333), 반박만 accent
export const EDGE_COLOR: Record<EdgeType, string> = {
  '지지':     BORDER['3'],
  '반박':     ACCENT.main, // 강조
  '확장':     BORDER['3'],
  '구체화':   BORDER['3'],
  '정련':     BORDER['3'],
  '유사':     BORDER['3'],
  '촉발':     BORDER['3'],
  '주제태그': BORDER['3'],
  '전제':     BORDER['3']
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

// 배경 / UI 색 (canvas/inline style용)
export const COLORS = {
  bg: '#0a0a0a',
  sidebar: SURFACE['1'],
  border: BORDER['1'],
  textPrimary: FG['2'],
  textSecondary: FG['3'],
  textMuted: FG['4'],
  textDisabled: FG['5'],
  accent: ACCENT.main
};
