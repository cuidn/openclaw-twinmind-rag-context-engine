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

import type { TwinMindRagConfig } from "./types.js";
import { TwinMindContextEngine } from "./TwinMindContextEngine.js";

// ── Plugin definition ──────────────────────────────────────────────────────────

const twinMindPlugin = {
  id: "twinmind-rag-context-engine",

  /**
   * Called by OpenClaw when the plugin is activated.
   * @param api - OpenClaw plugin API (provides registerContextEngine, on, registerTool, etc.)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(api: any): void {
    // Resolve the effective config (user overrides + defaults)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawEntry = (api.config as any)?.plugins?.entries?.["twinmind-rag-context-engine"] as
      | { config?: Partial<TwinMindRagConfig> }
      | undefined;

    const effectiveConfig: TwinMindRagConfig = {
      ragHost: "http://100.71.2.13:18790",
      ragFallbackHost: "http://127.0.0.1:18790",
      maxChars: 4000,
      maxChunks: 8,
      topK: 5,
      timeoutMs: 5000,
      fallbackOnError: true,
      ...(rawEntry?.config ?? {}),
    };

    const engine = new TwinMindContextEngine(effectiveConfig);

    // Register as the "twinmind-rag" context engine slot
    api.registerContextEngine("twinmind-rag-context-engine", () => engine);
  },
};

// ── Exports ────────────────────────────────────────────────────────────────────

export { twinMindPlugin as default };

// Named exports for testing / programmatic use
export { TwinMindContextEngine } from "./TwinMindContextEngine.js";
export { RagHttpClient } from "./RagHttpClient.js";
export { assembleContextFromHits } from "./assembleContext.js";
export { withGracefulFailure, withGracefulFailureAsync } from "./graceful.js";
export type { TwinMindRagConfig, DEFAULT_CONFIG } from "./types.js";
