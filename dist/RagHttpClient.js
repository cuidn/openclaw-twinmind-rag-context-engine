/// <reference types="node"/>
import { withGracefulFailureAsync } from "./graceful.js";
export class RagHttpClient {
    config;
    logger;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }
    /**
     * Search the RAG index. Tries primary host first; on network failure,
     * falls back to the fallback host. Returns empty array on any failure.
     */
    async search(query) {
        const { ragHost, ragFallbackHost, topK, timeoutMs } = this.config;
        // Try primary host
        const primaryResult = await withGracefulFailureAsync(() => this._doSearch(ragHost, query, topK, timeoutMs), null, this.logger, `RagHttpClient.search(primary: ${ragHost})`);
        if (primaryResult !== null) {
            return primaryResult;
        }
        // Try fallback host
        this.logger.info(`Primary RAG host failed, trying fallback: ${ragFallbackHost}`);
        return await withGracefulFailureAsync(() => this._doSearch(ragFallbackHost, query, topK, timeoutMs), { hits: [] }, this.logger, `RagHttpClient.search(fallback: ${ragFallbackHost})`);
    }
    async _doSearch(host, query, topK, timeoutMs) {
        const url = `${host}/search?query=${encodeURIComponent(query)}&k=${topK}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { Accept: "application/json" },
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                this.logger.warn(`RAG HTTP error ${response.status} from ${host}: ${response.statusText}`);
                return { hits: [] };
            }
            const data = await response.json();
            // Validate structure
            if (!data || !Array.isArray(data.hits)) {
                this.logger.warn(`RAG response missing or malformed 'hits' field from ${host}`);
                return { hits: [] };
            }
            return data;
        }
        catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === "AbortError") {
                this.logger.warn(`RAG request timed out after ${timeoutMs}ms: ${host}`);
            }
            else {
                this.logger.warn(`RAG request failed: ${host}`, err);
            }
            throw err; // Re-throw so withGracefulFailureAsync catches it
        }
    }
}
//# sourceMappingURL=RagHttpClient.js.map