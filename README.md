# TwinMind RAG Context Engine Plugin

An OpenClaw Context Engine plugin (`kind: "context-engine"`) that **automatically injects TwinMind RAG search results into every LLM prompt**, without requiring the agent to manually invoke a RAG tool.

---

## What It Does

On every model run, the plugin intercepts the assemble phase, queries the TwinMind RAG HTTP API with the user's latest message, and prepends the retrieved context to the system prompt via `systemPromptAddition`. If RAG is unavailable or returns no results, the plugin degrades gracefully and the model run proceeds normally.

---

## How It Works

```
User sends message
        │
        ▼
OpenClaw — assemble phase
        │
        ▼
TwinMindContextEngine.assemble()
        │
        ├─ Extract latest user prompt
        │
        ├─ GET /search?query=<prompt>&k=<topK>
        │       └─ Primary: http://100.71.2.13:18790
        │       └─ Fallback: http://127.0.0.1:18790
        │
        ├─ assembleContextFromHits() → "[source: file :: section]\ncontent..."
        │
        └─ return { systemPromptAddition: "..." }
                │
                ▼
        OpenClaw prepends to system prompt
                │
                ▼
            LLM receives prompt WITH relevant RAG context
```

---

## Installation

### 1. Copy to extensions directory

```bash
cp -r twinmind-rag-plugin/ ~/.openclaw/extensions/twinmind-rag-plugin/
```

### 2. Add to openclaw.json

```json
{
  "plugins": {
    "entries": {
      "twinmind-rag-context-engine": {
        "enabled": true,
        "config": {
          "ragHost": "http://100.71.2.13:18790",
          "ragFallbackHost": "http://127.0.0.1:18790",
          "maxChars": 4000,
          "maxChunks": 8,
          "topK": 5,
          "timeoutMs": 5000
        }
      }
    }
  }
}
```

### 3. Restart gateway

```bash
systemctl --user restart openclaw-gateway
```

---

## Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Master switch — set to `false` to disable without uninstalling |
| `ragHost` | `string` | `http://100.71.2.13:18790` | Primary RAG HTTP server |
| `ragFallbackHost` | `string` | `http://127.0.0.1:18790` | Fallback RAG server (used when primary fails) |
| `maxChars` | `integer` | `4000` | Max characters of context to inject into system prompt |
| `maxChunks` | `integer` | `8` | Max number of RAG document chunks to include |
| `topK` | `integer` | `5` | Number of top RAG results to retrieve per query |
| `timeoutMs` | `integer` | `5000` | HTTP timeout per RAG request in milliseconds |
| `fallbackOnError` | `boolean` | `true` | Whether to try fallback host on primary failure |

---

## Failure Modes

| Scenario | Plugin Behavior |
|----------|----------------|
| RAG primary host down | Try fallback host; if fallback also fails → return empty (model runs normally) |
| HTTP timeout | Log warning, return empty |
| 0 RAG hits | Return `systemPromptAddition: ""` (valid zero-result state, model runs normally) |
| Malformed RAG response | Log error, return empty |
| Plugin throws exception | Caught internally, log, return empty |

**Guarantee: `assemble()` never throws. The model run always proceeds.**

---

## Disabling / Uninstalling

### Disable (keep plugin installed)
Set `enabled: false` in the config, then `systemctl --user restart openclaw-gateway`.

### Uninstall
```bash
# 1. Remove from openclaw.json entries
# 2. Delete the plugin directory
rm -rf ~/.openclaw/extensions/twinmind-rag-plugin/
# 3. Restart gateway
systemctl --user restart openclaw-gateway
```

---

## Building & Testing

```bash
cd ~/.openclaw/extensions/twinmind-rag-plugin

# Install dependencies
npm install

# Run tests
npm test

# Build TypeScript
npm run build
```

---

## Architecture

| File | Purpose |
|------|---------|
| `src/TwinMindContextEngine.ts` | Core `ContextEngine` implementation — `assemble()` hook |
| `src/RagHttpClient.ts` | HTTP client for RAG `/search` endpoint with primary+fallback |
| `src/assembleContext.ts` | TypeScript port of the Python `assemble_context()` algorithm |
| `src/graceful.ts` | Error wrapping utilities — ensures `assemble()` never throws |
| `src/types.ts` | `TwinMindRagConfig` interface and defaults |
| `src/logger.ts` | Simple stderr logger with `[TwinMindRAG]` prefix |
| `src/index.ts` | Plugin entry point — exports `createTwinMindContextEngine()` |
| `openclaw.plugin.json` | Plugin manifest (kind: context-engine, configSchema, uiHints) |

---

## Requirements

- Node.js >= 18.0.0
- OpenClaw 2026.4.14+
- TwinMind RAG server running at `ragHost` (default: `100.71.2.13:18790`)
