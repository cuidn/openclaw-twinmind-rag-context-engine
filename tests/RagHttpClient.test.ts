/**
 * RagHttpClient.test.ts — Unit tests for RagHttpClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RagHttpClient } from "../src/RagHttpClient.js";
import { createLogger } from "../src/logger.js";

const logger = createLogger();

function mockFetch(response: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      statusText: status === 200 ? "OK" : "Error",
      async json() {
        return response;
      },
    })
  );
}

function mockFetchThrows(error: Error) {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
}

describe("RagHttpClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("search — happy path", () => {
    it("returns hits from primary host", async () => {
      const hits = [{ source: "/test.md", section_title: "T", child_text: "Hello", score: 0.9 }];
      mockFetch({ hits });

      const client = new RagHttpClient(
        { ragHost: "http://primary:18790", ragFallbackHost: "http://fallback:18790", topK: 5, timeoutMs: 5000, maxChars: 4000, maxChunks: 8, fallbackOnError: true },
        logger
      );
      const result = await client.search("test query");

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].child_text).toBe("Hello");

      const fetchCalls = vi.mocked(fetch).mock.calls;
      expect(fetchCalls[0][0]).toContain("http://primary:18790");
      expect(fetchCalls[0][0]).toContain("query=test%20query");
    });

    it("passes topK as k param", async () => {
      mockFetch({ hits: [] });
      const client = new RagHttpClient(
        { ragHost: "http://p:18790", ragFallbackHost: "http://f:18790", topK: 10, timeoutMs: 5000, maxChars: 4000, maxChunks: 8, fallbackOnError: true },
        logger
      );
      await client.search("q");
      expect(vi.mocked(fetch).mock.calls[0][0]).toContain("&k=10");
    });
  });

  describe("search — graceful failure paths", () => {
    it("falls back to fallback host on primary network error", async () => {
      const fallbackHits = [{ source: "/b.md", section_title: "", child_text: "Fallback result", score: 0.8 }];

      // First call (primary) throws
      mockFetchThrows(new Error("ECONNREFUSED"));
      // Second call (fallback) succeeds
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockRejectedValueOnce(new Error("ECONNREFUSED"))
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: "OK",
            async json() {
              return { hits: fallbackHits };
            },
          })
      );

      const client = new RagHttpClient(
        { ragHost: "http://primary:18790", ragFallbackHost: "http://fallback:18790", topK: 5, timeoutMs: 5000, maxChars: 4000, maxChunks: 8, fallbackOnError: true },
        logger
      );
      const result = await client.search("test");

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].child_text).toBe("Fallback result");
    });

    it("returns empty hits on non-OK HTTP response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Internal Server Error" })
      );

      const client = new RagHttpClient(
        { ragHost: "http://p:18790", ragFallbackHost: "http://f:18790", topK: 5, timeoutMs: 5000, maxChars: 4000, maxChunks: 8, fallbackOnError: true },
        logger
      );
      const result = await client.search("test");

      expect(result.hits).toHaveLength(0);
    });

    it("returns empty hits on malformed JSON", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          statusText: "OK",
          async json() {
            throw new Error("Invalid JSON");
          },
        })
      );

      const client = new RagHttpClient(
        { ragHost: "http://p:18790", ragFallbackHost: "http://f:18790", topK: 5, timeoutMs: 5000, maxChars: 4000, maxChunks: 8, fallbackOnError: true },
        logger
      );
      const result = await client.search("test");

      expect(result.hits).toHaveLength(0);
    });

    it("returns empty hits when hits field is missing", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK", async json() { return { notHits: [] }; } })
      );

      const client = new RagHttpClient(
        { ragHost: "http://p:18790", ragFallbackHost: "http://f:18790", topK: 5, timeoutMs: 5000, maxChars: 4000, maxChunks: 8, fallbackOnError: true },
        logger
      );
      const result = await client.search("test");

      expect(result.hits).toHaveLength(0);
    });

    it("returns empty hits on timeout (AbortError)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"))
      );

      const client = new RagHttpClient(
        { ragHost: "http://p:18790", ragFallbackHost: "http://f:18790", topK: 5, timeoutMs: 5000, maxChars: 4000, maxChunks: 8, fallbackOnError: true },
        logger
      );
      const result = await client.search("test");

      expect(result.hits).toHaveLength(0);
    });

    it("returns empty hits when both primary and fallback fail", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("All hosts failed"))
      );

      const client = new RagHttpClient(
        { ragHost: "http://p:18790", ragFallbackHost: "http://f:18790", topK: 5, timeoutMs: 5000, maxChars: 4000, maxChunks: 8, fallbackOnError: true },
        logger
      );
      const result = await client.search("test");

      expect(result.hits).toHaveLength(0);
    });
  });
});
