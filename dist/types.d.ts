export interface TwinMindRagConfig {
    ragHost: string;
    ragFallbackHost: string;
    maxChars: number;
    maxChunks: number;
    topK: number;
    timeoutMs: number;
    fallbackOnError: boolean;
}
export declare const DEFAULT_CONFIG: TwinMindRagConfig;
export interface RagHit {
    source: string;
    section_title: string;
    child_text: string;
    score: number;
}
export interface RagSearchResponse {
    hits: RagHit[];
}
export interface Chunk {
    source: string;
    section_title: string;
    content: string;
    score: number;
    order_hint: number;
}
//# sourceMappingURL=types.d.ts.map