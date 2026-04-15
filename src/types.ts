// ── Plugin Configuration ────────────────────────────────────────────────────────

export interface TwinMindRagConfig {
  ragHost: string;
  ragFallbackHost: string;
  maxChars: number;
  maxChunks: number;
  topK: number;
  timeoutMs: number;
  fallbackOnError: boolean;
}

export const DEFAULT_CONFIG: TwinMindRagConfig = {
  ragHost: "http://100.71.2.13:18790",
  ragFallbackHost: "http://127.0.0.1:18790",
  maxChars: 4000,
  maxChunks: 8,
  topK: 5,
  timeoutMs: 5000,
  fallbackOnError: true,
};

// ── RAG HTTP Response Types ───────────────────────────────────────────────────

export interface RagHit {
  source: string;
  section_title: string;
  child_text: string;
  score: number;
}

export interface RagSearchResponse {
  hits: RagHit[];
}

// ── Internal Assemble Types ───────────────────────────────────────────────────

export interface Chunk {
  source: string;
  section_title: string;
  content: string;
  score: number;
  order_hint: number;
}
