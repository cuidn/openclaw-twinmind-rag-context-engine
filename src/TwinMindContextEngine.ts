/// <reference types="node"/>

/**
 * TwinMindContextEngine — OpenClaw Context Engine Plugin.
 *
 * Implements the ContextEngine interface. On every model run, it:
 *  1. Extracts the latest user prompt
 *  2. Queries the TwinMind RAG HTTP API
 *  3. Injects the assembled context via systemPromptAddition
 *
 * Never throws. All failures return an empty AssembleResult.
 */

import type { ContextEngineInfo, AgentMessage, AssembleResult } from "./sdk-stubs.js";
import type { TwinMindRagConfig } from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";
import { createLogger, type Logger } from "./logger.js";
import { RagHttpClient } from "./RagHttpClient.js";
import { assembleContextFromHits } from "./assembleContext.js";
import { withGracefulFailureAsync } from "./graceful.js";

// ── Plugin Info ────────────────────────────────────────────────────────────────

const PLUGIN_INFO: ContextEngineInfo = {
  id: "twinmind-rag-context-engine",
  name: "TwinMind RAG Context Engine",
  version: "1.0.0",
  ownsCompaction: false,
  turnMaintenanceMode: "foreground",
};

// ── Main Class ────────────────────────────────────────────────────────────────

export class TwinMindContextEngine {
  readonly info = PLUGIN_INFO;
  private readonly config: TwinMindRagConfig;
  private readonly logger: Logger;
  private readonly ragClient: RagHttpClient;

  constructor(config: Partial<TwinMindRagConfig> = {}) {
    // Merge user config with defaults
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = createLogger();
    this.ragClient = new RagHttpClient(this.config, this.logger);
    this.logger.info("TwinMindContextEngine initialized", {
      ragHost: this.config.ragHost,
      fallbackHost: this.config.ragFallbackHost,
      maxChars: this.config.maxChars,
      maxChunks: this.config.maxChunks,
      topK: this.config.topK,
      timeoutMs: this.config.timeoutMs,
    });
  }

  /**
   * assemble — called by OpenClaw before every model run.
   *
   * Extracts the user prompt, queries RAG, returns context to inject.
   */
  async assemble(params: {
    sessionId: string;
    sessionKey?: string;
    messages: AgentMessage[];
    tokenBudget?: number;
    availableTools?: Set<string>;
    citationsMode?: string;
    model?: string;
    prompt?: string;
  }): Promise<AssembleResult> {
    // Step 1: Extract the latest user prompt
    const query = extractUserPrompt(params.prompt, params.messages);

    // No meaningful query → return empty
    if (!query || query.trim().length < 2) {
      return emptyResult();
    }

    // Step 2: Query RAG (wrapped in graceful failure)
    const ragResponse = await withGracefulFailureAsync(
      () => this.ragClient.search(query),
      { hits: [] },
      this.logger,
      "RagHttpClient.search"
    );

    // No hits → return empty string (valid zero-result state)
    if (!ragResponse.hits || ragResponse.hits.length === 0) {
      this.logger.debug(`RAG returned 0 hits for query: "${query}"`);
      return { messages: [], estimatedTokens: 0, systemPromptAddition: "" };
    }

    // Step 3: Assemble context
    const context = assembleContextFromHits(ragResponse.hits, {
      maxChars: this.config.maxChars,
      maxChunks: this.config.maxChunks,
    });

    this.logger.debug(
      `assemble: query="${query}", hits=${ragResponse.hits.length}, chars=${context.length}`
    );

    // Step 4: Return with systemPromptAddition
    return {
      messages: [],
      estimatedTokens: estimateTokens(context),
      systemPromptAddition: context,
    };
  }

  /**
   * ingest — called when a message is added to the session transcript.
   * RAG-based engines don't ingest; this is a no-op.
   */
  async ingest(params: {
    sessionId: string;
    sessionKey?: string;
    message: AgentMessage;
    isHeartbeat?: boolean;
  }): Promise<{ ingested: boolean }> {
    this.logger.debug(`ingest: session=${params.sessionId}, isHeartbeat=${params.isHeartbeat ?? false}`);
    return { ingested: false };
  }

  /**
   * compact — called during transcript compaction.
   * RAG-based engines don't manage compaction; this is a no-op.
   */
  async compact(params: {
    sessionId: string;
    sessionKey?: string;
    sessionFile: string;
    tokenBudget?: number;
    force?: boolean;
    currentTokenCount?: number;
    compactionTarget?: "budget" | "threshold";
    customInstructions?: string;
    runtimeContext?: unknown;
  }): Promise<{
    ok: boolean;
    compacted: boolean;
    reason?: string;
    result?: {
      summary?: string;
      firstKeptEntryId?: string;
      tokensBefore: number;
      tokensAfter?: number;
      details?: unknown;
    };
  }> {
    this.logger.debug(`compact: session=${params.sessionId}, force=${params.force ?? false}`);
    return {
      ok: true,
      compacted: false,
      reason: "twinmind-rag-context-engine does not manage compaction — RAG is pull-based",
      result: { tokensBefore: params.currentTokenCount ?? 0 },
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the latest user prompt from assemble params.
 * Prefers params.prompt (set by some OpenClaw versions); otherwise
 * falls back to the last user message in the messages array.
 */
function extractUserPrompt(
  prompt: string | undefined,
  messages: AgentMessage[]
): string {
  if (prompt && prompt.trim().length > 0) {
    return prompt.trim();
  }

  // Walk messages in reverse to find the last user message
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user" && msg.content) {
      if (typeof msg.content === "string") {
        return msg.content.trim();
      }
      if (Array.isArray(msg.content)) {
        const textPart = msg.content.find(
          (block: { type: string; text?: string }) =>
            block.type === "text" && typeof block.text === "string"
        );
        if (textPart && typeof textPart.text === "string") {
          return textPart.text.trim();
        }
      }
    }
  }

  return prompt ?? "";
}

function emptyResult(): AssembleResult {
  return { messages: [], estimatedTokens: 0, systemPromptAddition: "" };
}

/**
 * Rough character-to-token estimate (≈4 chars per token).
 * Used for AssembleResult.estimatedTokens field.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
