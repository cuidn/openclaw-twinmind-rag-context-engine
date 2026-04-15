/**
 * OpenClaw SDK Type Stubs
 *
 * These stubs mirror the OpenClaw Plugin SDK types needed by this plugin.
 * When loaded by OpenClaw at runtime, the real SDK types are used.
 * When building/testing standalone, these local stubs are used.
 */
export interface ContextEngineInfo {
    readonly id: string;
    readonly name: string;
    readonly version?: string;
    readonly ownsCompaction?: boolean;
    readonly turnMaintenanceMode?: "foreground" | "background";
}
export interface AgentMessage {
    id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string | ContentBlock[];
    createdAt?: number;
    [key: string]: unknown;
}
export interface ContentBlock {
    type: "text" | "image" | "tool_use" | "tool_result";
    text?: string;
    source?: unknown;
    id?: string;
    name?: string;
    input?: unknown;
    content?: string | ContentBlock[];
}
export interface ContextEnginePlugin {
    readonly info: ContextEngineInfo;
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
}
export interface AssembleResult {
    messages: AgentMessage[];
    estimatedTokens: number;
    systemPromptAddition?: string;
}
//# sourceMappingURL=sdk-stubs.d.ts.map