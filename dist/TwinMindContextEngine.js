/// <reference types="node"/>
import { DEFAULT_CONFIG } from "./types.js";
import { createLogger } from "./logger.js";
import { RagHttpClient } from "./RagHttpClient.js";
import { assembleContextFromHits } from "./assembleContext.js";
import { withGracefulFailureAsync } from "./graceful.js";
// ── Plugin Info ────────────────────────────────────────────────────────────────
const PLUGIN_INFO = {
    id: "twinmind-rag-context-engine",
    name: "TwinMind RAG Context Engine",
    version: "1.0.0",
    ownsCompaction: false,
    turnMaintenanceMode: "foreground",
};
// ── Main Class ────────────────────────────────────────────────────────────────
export class TwinMindContextEngine {
    info = PLUGIN_INFO;
    config;
    logger;
    ragClient;
    constructor(config = {}) {
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
    async assemble(params) {
        // Step 1: Extract the latest user prompt
        const query = extractUserPrompt(params.prompt, params.messages);
        // No meaningful query → return empty
        if (!query || query.trim().length < 2) {
            return emptyResult();
        }
        // Step 2: Query RAG (wrapped in graceful failure)
        const ragResponse = await withGracefulFailureAsync(() => this.ragClient.search(query), { hits: [] }, this.logger, "RagHttpClient.search");
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
        this.logger.debug(`assemble: query="${query}", hits=${ragResponse.hits.length}, chars=${context.length}`);
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
    async ingest(params) {
        this.logger.debug(`ingest: session=${params.sessionId}, isHeartbeat=${params.isHeartbeat ?? false}`);
        return { ingested: false };
    }
    /**
     * compact — called during transcript compaction.
     * RAG-based engines don't manage compaction; this is a no-op.
     */
    async compact(params) {
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
function extractUserPrompt(prompt, messages) {
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
                const textPart = msg.content.find((block) => block.type === "text" && typeof block.text === "string");
                if (textPart && typeof textPart.text === "string") {
                    return textPart.text.trim();
                }
            }
        }
    }
    return prompt ?? "";
}
function emptyResult() {
    return { messages: [], estimatedTokens: 0, systemPromptAddition: "" };
}
/**
 * Rough character-to-token estimate (≈4 chars per token).
 * Used for AssembleResult.estimatedTokens field.
 */
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
//# sourceMappingURL=TwinMindContextEngine.js.map