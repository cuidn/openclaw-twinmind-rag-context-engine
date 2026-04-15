/**
 * TwinMind RAG Context Engine — OpenClaw Plugin Entry Point
 *
 * Exports the plugin object with id + register(api) function.
 * OpenClaw calls register(api) on startup; the api lets the plugin
 * register tools, context engines, hooks, and commands.
 *
 * Usage in openclaw.json:
 * {
 *   "plugins": {
 *     "entries": {
 *       "twinmind-rag-context-engine": {
 *         "enabled": true,
 *         "config": {
 *           "ragHost": "http://100.71.2.13:18790",
 *           "ragFallbackHost": "http://127.0.0.1:18790",
 *           "maxChars": 4000,
 *           "maxChunks": 8,
 *           "topK": 5,
 *           "timeoutMs": 5000
 *         }
 *       }
 *     }
 *   }
 * }
 */
declare const twinMindPlugin: {
    id: string;
    /**
     * Called by OpenClaw when the plugin is activated.
     * @param api - OpenClaw plugin API (provides registerContextEngine, on, registerTool, etc.)
     */
    register(api: any): void;
};
export { twinMindPlugin as default };
export { TwinMindContextEngine } from "./TwinMindContextEngine.js";
export { RagHttpClient } from "./RagHttpClient.js";
export { assembleContextFromHits } from "./assembleContext.js";
export { withGracefulFailure, withGracefulFailureAsync } from "./graceful.js";
export type { TwinMindRagConfig, DEFAULT_CONFIG } from "./types.js";
//# sourceMappingURL=index.d.ts.map