/// <reference types="node"/>

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
import { withGracefulFailureAsync } from "./graceful.js";

export class RagHttpClient {
  private readonly config: TwinMindRagConfig;
  private readonly logger: Logger;

  constructor(config: TwinMindRagConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Search the RAG index. Tries primary host first; on network failure,
   * falls back to the fallback host. Returns empty array on any failure.
   */
  async search(query: string): Promise<RagSearchResponse> {
    const { ragHost, ragFallbackHost, topK, timeoutMs } = this.config;

    // Try primary host
    const primaryResult = await withGracefulFailureAsync(
      () => this._doSearch(ragHost, query, topK, timeoutMs),
      null,
      this.logger,
      `RagHttpClient.search(primary: ${ragHost})`
    );

    if (primaryResult !== null) {
      return primaryResult;
    }

    // Try fallback host
    this.logger.info(`Primary RAG host failed, trying fallback: ${ragFallbackHost}`);
    return await withGracefulFailureAsync(
      () => this._doSearch(ragFallbackHost, query, topK, timeoutMs),
      { hits: [] },
      this.logger,
      `RagHttpClient.search(fallback: ${ragFallbackHost})`
    );
  }

  private async _doSearch(
    host: string,
    query: string,
    topK: number,
    timeoutMs: number
  ): Promise<RagSearchResponse> {
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
        this.logger.warn(
          `RAG HTTP error ${response.status} from ${host}: ${response.statusText}`
        );
        return { hits: [] };
      }

      const data = await response.json() as RagSearchResponse;

      // Validate structure
      if (!data || !Array.isArray(data.hits)) {
        this.logger.warn(`RAG response missing or malformed 'hits' field from ${host}`);
        return { hits: [] };
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        this.logger.warn(`RAG request timed out after ${timeoutMs}ms: ${host}`);
      } else {
        this.logger.warn(`RAG request failed: ${host}`, err as Error);
      }
      throw err; // Re-throw so withGracefulFailureAsync catches it
    }
  }
}
