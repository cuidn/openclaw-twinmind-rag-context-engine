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
export declare class TwinMindContextEngine {
    readonly info: ContextEngineInfo;
    private readonly config;
    private readonly logger;
    private readonly ragClient;
    constructor(config?: Partial<TwinMindRagConfig>);
    /**
     * assemble — called by OpenClaw before every model run.
     *
     * Extracts the user prompt, queries RAG, returns context to inject.
     */
    assemble(params: {
        sessionId: string;
        sessionKey?: string;
        messages: AgentMessage[];
        tokenBudget?: number;
        availableTools?: Set<string>;
        citationsMode?: string;
        model?: string;
        prompt?: string;
    }): Promise<AssembleResult>;
    /**
     * ingest — called when a message is added to the session transcript.
     * RAG-based engines don't ingest; this is a no-op.
     */
    ingest(params: {
        sessionId: string;
        sessionKey?: string;
        message: AgentMessage;
        isHeartbeat?: boolean;
    }): Promise<{
        ingested: boolean;
    }>;
    /**
     * compact — called during transcript compaction.
     * RAG-based engines don't manage compaction; this is a no-op.
     */
    compact(params: {
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
    }>;
}
//# sourceMappingURL=TwinMindContextEngine.d.ts.map