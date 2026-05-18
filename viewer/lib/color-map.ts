import type { NodeType, EdgeType } from './schema';

// CSS 변수 --fg-N 미러 (canvas는 raw 값 필요)
export const FG = {
  '1': '#ffffff',
  '2': '#ededed',  // ON / primary
  '3': '#a1a1a1',  // secondary
  '4': '#707070',  // muted
  '5': '#525252'   // disabled
} as const;

// 노드: 기본 fg-2(흰색), 주장(thesis)만 빨강 강조 — 레퍼런스 컨벤션
export const NODE_COLOR: Record<NodeType, string> = {
  '의미':   FG['2'],
  '통찰':   FG['2'],
  '절차':   FG['2'],
  '사건':   FG['2'],
  '주장':   '#f87171', // 강조 (thesis)
  '주제':   FG['2']
};

export const NODE_COLOR_DISABLED = FG['5'];

// 엣지: 모두 회색 톤, 반박만 빨강 강조
export const EDGE_COLOR: Record<EdgeType, string> = {
  '지지':     FG['5'],
  '반박':     '#f87171', // 강조 (반박)
  '확장':     FG['5'],
  '구체화':   FG['5'],
  '정련':     FG['5'],
  '유사':     FG['5'],
  '촉발':     FG['5'],
  '주제태그': FG['5'],
  '전제':     FG['5']
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
  textPrimary: FG['2'],
  textSecondary: FG['3'],
  textMuted: FG['4'],
  textDisabled: FG['5'],
  accent: '#f87171'
};
