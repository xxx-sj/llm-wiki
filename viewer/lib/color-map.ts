import type { NodeType, EdgeType } from './schema';

export const NODE_COLOR: Record<NodeType, string> = {
  '의미':   '#3b82f6', // blue
  '통찰':   '#eab308', // yellow
  '절차':   '#22c55e', // green
  '사건':   '#f97316', // orange
  '주장':   '#ef4444', // red
  '주제':   '#a855f7'  // purple
};

export const EDGE_COLOR: Record<EdgeType, string> = {
  '지지':     '#22c55e',
  '반박':     '#ef4444',
  '확장':     '#3b82f6',
  '구체화':   '#06b6d4',
  '정련':     '#8b5cf6',
  '유사':     '#94a3b8',
  '촉발':     '#f59e0b',
  '주제태그': '#a855f7',
  '전제':     '#0ea5e9'
};

export const NODE_TYPE_LABEL_EMOJI: Record<NodeType, string> = {
  '의미': '🔵', '통찰': '🟡', '절차': '🟢', '사건': '🟠', '주장': '🔴', '주제': '🟣'
};
