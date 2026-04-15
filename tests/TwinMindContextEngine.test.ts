/**
 * TwinMindContextEngine.test.ts — Unit tests for TwinMindContextEngine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TwinMindContextEngine } from "../src/TwinMindContextEngine.js";
import type { AgentMessage } from "openclaw/plugin-sdk/context-engine/types";

function makeUserMessage(content: string): AgentMessage {
  return {
    id: "msg1",
    role: "user",
    content,
    createdAt: Date.now(),
  } as AgentMessage;
}

function mockFetch(response: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      async json() {
        return response;
      },
    })
  );
}

describe("TwinMindContextEngine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("assemble — prompt extraction", () => {
    it("uses params.prompt when available", async () => {
      mockFetch({ hits: [] });
      const engine = new TwinMindContextEngine({
        ragHost: "http://p:18790",
        ragFallbackHost: "http://f:18790",
        topK: 5,
        timeoutMs: 5000,
        maxChars: 4000,
        maxChunks: 8,
        fallbackOnError: true,
      });

      await engine.assemble({
        sessionId: "sess1",
        prompt: "My custom prompt",
        messages: [],
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(fetchCall).toContain("query=My%20custom%20prompt");
    });

    it("falls back to last user message when params.prompt is empty", async () => {
      mockFetch({ hits: [] });
      const engine = new TwinMindContextEngine({
        ragHost: "http://p:18790",
        ragFallbackHost: "http://f:18790",
        topK: 5,
        timeoutMs: 5000,
        maxChars: 4000,
        maxChunks: 8,
        fallbackOnError: true,
      });

      await engine.assemble({
        sessionId: "sess1",
        messages: [
          makeUserMessage("First message"),
          makeUserMessage("Second message"),
        ],
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(fetchCall).toContain("query=Second%20message");
    });

    it("returns empty result for empty/short prompt", async () => {
      const engine = new TwinMindContextEngine({});

      const result = await engine.assemble({
        sessionId: "sess1",
        prompt: "",
        messages: [],
      });

      expect(result.systemPromptAddition).toBe("");
      expect(result.messages).toEqual([]);
    });
  });

  describe("assemble — RAG integration", () => {
    it("returns systemPromptAddition with assembled context on hits", async () => {
      const hits = [
        {
          source: "/home/openclaw/workspace/MEMORY.md",
          section_title: "Overview",
          child_text: "This is the memory overview.",
          score: 0.95,
        },
      ];
      mockFetch({ hits });

      const engine = new TwinMindContextEngine({
        ragHost: "http://p:18790",
        ragFallbackHost: "http://f:18790",
        topK: 5,
        timeoutMs: 5000,
        maxChars: 4000,
        maxChunks: 8,
        fallbackOnError: true,
      });

      const result = await engine.assemble({
        sessionId: "sess1",
        prompt: "Tell me about memory",
        messages: [],
      });

      expect(result.systemPromptAddition).toContain("MEMORY.md");
      expect(result.systemPromptAddition).toContain("This is the memory overview.");
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it("returns empty systemPromptAddition when RAG returns 0 hits", async () => {
      mockFetch({ hits: [] });

      const engine = new TwinMindContextEngine({
        ragHost: "http://p:18790",
        ragFallbackHost: "http://f:18790",
        topK: 5,
        timeoutMs: 5000,
        maxChars: 4000,
        maxChunks: 8,
        fallbackOnError: true,
      });

      const result = await engine.assemble({
        sessionId: "sess1",
        prompt: "something unrelated",
        messages: [],
      });

      expect(result.systemPromptAddition).toBe("");
    });
  });

  describe("assemble — graceful failure", () => {
    it("returns empty result when fetch throws (RAG down)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("RAG server is down")));

      const engine = new TwinMindContextEngine({
        ragHost: "http://p:18790",
        ragFallbackHost: "http://f:18790",
        topK: 5,
        timeoutMs: 5000,
        maxChars: 4000,
        maxChunks: 8,
        fallbackOnError: true,
      });

      const result = await engine.assemble({
        sessionId: "sess1",
        prompt: "test query",
        messages: [],
      });

      // Should not throw, should return safe empty result
      expect(result).toBeDefined();
      expect(result.systemPromptAddition ?? "").toBe("");
    });

    it("returns empty result when fetch returns malformed JSON", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          async json() {
            throw new Error("Invalid JSON");
          },
        })
      );

      const engine = new TwinMindContextEngine({
        ragHost: "http://p:18790",
        ragFallbackHost: "http://f:18790",
        topK: 5,
        timeoutMs: 5000,
        maxChars: 4000,
        maxChunks: 8,
        fallbackOnError: true,
      });

      const result = await engine.assemble({
        sessionId: "sess1",
        prompt: "test",
        messages: [],
      });

      expect(result).toBeDefined();
      expect(result.systemPromptAddition ?? "").toBe("");
    });
  });

  describe("info", () => {
    it("reports correct plugin info", () => {
      const engine = new TwinMindContextEngine({});
      expect(engine.info.id).toBe("twinmind-rag-context-engine");
      expect(engine.info.name).toBe("TwinMind RAG Context Engine");
      expect(engine.info.version).toBe("1.0.0");
      expect(engine.info.ownsCompaction).toBe(false);
    });
  });
});
