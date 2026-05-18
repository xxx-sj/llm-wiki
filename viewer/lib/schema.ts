export const NODE_TYPES = ['의미', '통찰', '절차', '사건', '주장', '주제'] as const;
export type NodeType = typeof NODE_TYPES[number];

export const EDGE_TYPES = [
  '지지', '반박', '확장', '구체화', '정련', '유사', '촉발', '주제태그', '전제'
] as const;
export type EdgeType = typeof EDGE_TYPES[number];

export const MEMORY_TYPES = [
  'mental_model', 'observation', 'world_fact', 'experience'
] as const;
export type MemoryType = typeof MEMORY_TYPES[number];

export type Scope = 'work' | 'personal';
export type Confidence = 'high' | 'medium' | 'low';

export interface NodeFrontmatter {
  id: string;
  title: string;
  node_type: NodeType;
  memory_type: MemoryType;
  created: string;             // YYYY-MM-DD
  last_reviewed: string;
  confidence?: Confidence;
  sources?: string[];
  links?: Array<{ to: string; type: EdgeType }>;
  tags?: string[];
}

export interface GraphNode {
  id: string;
  title: string;
  node_type: NodeType;
  memory_type: MemoryType;
  scope: Scope;
  in_degree: number;
  out_degree: number;
  last_reviewed: string;
  confidence?: Confidence;
  tags?: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  contents: Record<string, string>;   // id → html
  generated_at: string;
}
