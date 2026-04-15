/**
 * RagHttpClient — HTTP client for TwinMind RAG /search endpoint.
 *
 * Supports:
 * - Primary + fallback host with automatic failover
 * - Configurable timeout via AbortController
 * - JSON response parsing with error handling
 */
import type { Logger } from "./logger.js";
import type { RagSearchResponse, TwinMindRagConfig } from "./types.js";
export declare class RagHttpClient {
    private readonly config;
    private readonly logger;
    constructor(config: TwinMindRagConfig, logger: Logger);
    /**
     * Search the RAG index. Tries primary host first; on network failure,
     * falls back to the fallback host. Returns empty array on any failure.
     */
    search(query: string): Promise<RagSearchResponse>;
    private _doSearch;
}
//# sourceMappingURL=RagHttpClient.d.ts.map