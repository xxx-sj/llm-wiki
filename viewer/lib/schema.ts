export const NODE_TYPES = ['의미', '통찰', '절차', '사건', '주장', '주제', '엔티티'] as const;
export type NodeType = typeof NODE_TYPES[number];

export const NODE_TYPE_EN: Record<NodeType, string> = {
  '의미': 'semantic',
  '통찰': 'reflective',
  '절차': 'procedural',
  '사건': 'episodic',
  '주장': 'thesis',
  '주제': 'topic',
  '엔티티': 'entity'
};

export const EDGE_TYPES = [
  '지지', '반박', '확장', '구체화', '정련', '유사', '촉발', '주제태그', '전제', '언급'
] as const;
export type EdgeType = typeof EDGE_TYPES[number];

export const EDGE_TYPE_EN: Record<EdgeType, string> = {
  '지지': 'supports',
  '반박': 'contradicts',
  '확장': 'extends',
  '구체화': 'instantiates',
  '정련': 'refines',
  '유사': 'near-miss',
  '촉발': 'triggered-by',
  '주제태그': 'topic-tag',
  '전제': 'requires',
  '언급': 'mentions'
};

export const MEMORY_TYPES = [
  'mental_model', 'observation', 'world_fact', 'experience'
] as const;
export type MemoryType = typeof MEMORY_TYPES[number];

/**
 * 노드의 인식론적 출처. careerhackeralex Second Brain 모델에서 도입.
 * - self: 본인이 직접 작성한 1차 주장/통찰
 * - external: 외부 글/대화를 인용 (Karpathy 글, 카카오 발표 등)
 * - synthesized: external 위에 본인이 추론/종합한 것
 *
 * RAG 답변 시 "당신의 통찰" vs "X가 한 말"을 구분 가능.
 */
export const ORIGINS = ['self', 'external', 'synthesized'] as const;
export type Origin = typeof ORIGINS[number];

/**
 * 노드가 어떤 표면(surface)에 쓰일 수 있는지 표시.
 * 같은 노드를 여러 표면으로 렌더할 때 어느 표면에 적합한지 lint/검색이 활용.
 * - rag-eligible: 챗봇 답변에 인용 가능 (default)
 * - lecture-ready: 강의/발표에 쓸 만큼 정제됨
 * - blog-ready: 블로그 글로 펼칠 만함
 * - private-only: 내부용, 외부 발행 금지
 */
export const SURFACES = ['rag-eligible', 'lecture-ready', 'blog-ready', 'private-only'] as const;
export type Surface = typeof SURFACES[number];

export type Scope = 'work' | 'personal';
export type Confidence = 'high' | 'medium' | 'low';

export interface NodeFrontmatter {
  id: string;
  title: string;
  node_type: NodeType;
  memory_type: MemoryType;
  /** 인식론적 출처. 미지정 시 'self' 기본 */
  origin?: Origin;
  /**
   * 의미 버전. 노드의 의미가 변할 때마다 사용자가 증가.
   * build-graph가 엣지의 to_meaning_version과 비교해 stale 감지 (Phase 3 lint).
   * 미지정 시 1 default.
   */
  meaning_version?: number;
  /** 이 노드가 쓰일 수 있는 표면 (선택, default ['rag-eligible']) */
  surfaces?: Surface[];
  created: string;             // YYYY-MM-DD
  last_reviewed: string;
  confidence?: Confidence;
  sources?: string[];
  /**
   * Forward-only 엣지.
   * - note: 관계 설명 (선택)
   * - to_meaning_version: 엣지 작성 시점의 target 의미 버전 스냅샷 (선택, Phase 3 stale lint용)
   */
  links?: Array<{ to: string; type: EdgeType; note?: string; to_meaning_version?: number }>;
  tags?: string[];
}

export interface GraphNode {
  id: string;
  title: string;
  node_type: NodeType;
  memory_type: MemoryType;
  origin: Origin;
  meaning_version: number;
  surfaces: Surface[];
  scope: Scope;
  in_degree: number;
  out_degree: number;
  last_reviewed: string;
  confidence?: Confidence;
  tags?: string[];
  /** 본문(title + body) SHA-256 — incremental build 캐시 키 + 변경 감지 */
  fingerprint: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  /** 관계 설명 (선택). RAG 답변에서 인용 시 맥락 보존 */
  note?: string;
  /** target 노드의 의미 버전 스냅샷 (선택). 현재 meaning_version과 다르면 stale */
  to_meaning_version?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  contents: Record<string, string>;   // id → html
  generated_at: string;
}
