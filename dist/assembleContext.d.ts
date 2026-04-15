/**
 * assembleContext — TypeScript port of ~/rag/src/rag/context_assembly.py assemble_context()
 *
 * Transforms raw RAG hits into an LLM-ready context string.
 *
 * Algorithm:
 *  1. Parse hits into Chunk objects
 *  2. Deduplicate by (source, section_title) — keep highest score
 *  3. Sort by source filename (groups same-file chunks together)
 *  4. Within same file, preserve original retrieval order
 *  5. Limit to maxChunks
 *  6. Build "[source: filename :: section]\ncontent\n" headers
 *  7. Truncate to maxChars
 */
import type { RagHit } from "./types.js";
export interface AssembleContextOptions {
    maxChars: number;
    maxChunks: number;
}
/**
 * Convert raw RAG hits to an LLM-ready context string.
 * Returns empty string if hits is empty.
 */
export declare function assembleContextFromHits(hits: RagHit[], options: AssembleContextOptions): string;
//# sourceMappingURL=assembleContext.d.ts.map