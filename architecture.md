# TwinMind RAG Context Engine Plugin — Architecture

**Project:** twinmind-rag-plugin
**Date:** 2026-04-15
**Status:** Draft

---

## 1. System Overview

The plugin acts as an OpenClaw Context Engine. On every model run, it:
1. Receives the `assemble` call with the user's latest prompt
2. Queries the TwinMind RAG HTTP API (`/search`)
3. Assembles the hits into a context string
4. Returns the context as `systemPromptAddition` in `AssembleResult`

```
User prompt
    │
    ▼
OpenClaw (assemble phase)
    │
    ▼
TwinMindContextEngine.assemble()
    │
    ▼
RAG HTTP API (/search?query=<prompt>&k=5)
    │
    ▼
assemble_context() (TS re-implementation)
    │
    ▼
return { systemPromptAddition: "[source: ...]\n..." }
    │
    ▼
OpenClaw prepends to system prompt → LLM
```

---

## 2. Plugin Structure

```
twinmind-rag-plugin/
├── openclaw.plugin.json          # Plugin manifest (kind: context-engine)
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Plugin entry — registers the context engine
│   ├── TwinMindContextEngine.ts # implements ContextEnginePlugin.assemble()
│   ├── RagHttpClient.ts         # HTTP client for RAG /search endpoint
│   ├── assembleContext.ts       # TS re-implementation of assemble_context logic
│   ├── types.ts                # PluginConfig interface + configSchema
│   └── graceful.ts             # Error handling utilities
├── tests/
│   ├── TwinMindContextEngine.test.ts
│   ├── RagHttpClient.test.ts
│   └── graceful.test.ts
└── README.md
```

---

## 3. Component Design

### 3.1 `TwinMindContextEngine` (main class)
- Implements `ContextEnginePlugin` interface
- `assemble(params: ContextEngineAssembleParams): Promise<AssembleResult>`
- Extracts `params.prompt` or the last user message from `params.messages`
- Calls `RagHttpClient.search(query, { topK, timeoutMs })`
- Calls `assembleContextFromHits(hits, { maxChars, maxChunks })`
- Returns `{ systemPromptAddition: assembledContext }`

### 3.2 `RagHttpClient`
- Sends GET request to `http://{host}:{port}/search`
- Query params: `query`, `k` (topK)
- Parses JSON response: `{ hits: [{ source, section_title, child_text, score }] }`
- Handles timeout via AbortController
- Falls back to fallbackHost on connection failure

### 3.3 `assembleContext` (TypeScript port of Python logic)
Re-implements the `assemble_context()` algorithm from `~/rag/src/rag/context_assembly.py`:
1. Parse hits into `Chunk` objects
2. Deduplicate by `(source, section_title)` keeping highest score
3. Sort by source filename
4. Limit to `maxChunks`
5. Build `[source: filename :: section]` headers + content
6. Truncate to `maxChars`

### 3.4 `graceful.ts`
- `withGracefulFailure<T>(fn, fallback, logMsg)` — wraps async fn, returns fallback on any error
- `buildEmptyResult()` — returns `{}` (empty AssembleResult)

### 3.5 `types.ts`
```typescript
interface TwinMindRagConfig {
  ragHost: string;           // default: "http://100.71.2.13:18790"
  ragFallbackHost: string;   // default: "http://127.0.0.1:18790"
  maxChars: number;           // default: 4000
  maxChunks: number;          // default: 8
  topK: number;               // default: 5
  timeoutMs: number;          // default: 5000
  fallbackOnError: boolean;   // default: true
}
```

---

## 4. Configuration Schema

Matches OpenClaw plugin config pattern (following lossless-claw):

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "ragHost": { "type": "string" },
    "ragFallbackHost": { "type": "string" },
    "maxChars": { "type": "integer", "minimum": 100, "maximum": 50000 },
    "maxChunks": { "type": "integer", "minimum": 1, "maximum": 50 },
    "topK": { "type": "integer", "minimum": 1, "maximum": 20 },
    "timeoutMs": { "type": "integer", "minimum": 500, "maximum": 30000 },
    "fallbackOnError": { "type": "boolean" }
  }
}
```

---

## 5. Failure Modes

| Scenario | Behavior |
|----------|----------|
| RAG server down (primary) | Try fallback; if fallback also fails → return `{}` |
| HTTP timeout | Log warning, return `{}` |
| 0 hits returned | Return empty string in `systemPromptAddition` (valid state) |
| JSON parse error | Log error, return `{}` |
| Exception thrown | `withGracefulFailure` catches, logs, returns `{}` |
| Gateway restart | State resets; next `assemble()` call re-queries RAG |

**Key guarantee:** `assemble()` never throws. Even in failure, it always returns a valid `AssembleResult` (possibly empty).

---

## 6. Installation

```bash
# Manual (copy to extensions dir)
cp -r twinmind-rag-plugin/ ~/.openclaw/extensions/twinmind-rag-plugin/

# Or via openclaw plugins install
openclaw plugins install -l ./twinmind-rag-plugin
```

Then in `~/.openclaw/openclaw.json`:
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
          "maxChunks": 8
        }
      }
    }
  }
}
```

Restart: `systemctl --user restart openclaw-gateway`

---

## 7. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Call Python `assemble_context` | **Re-implement in TypeScript** | Avoid subprocess; simplify testing; reduce dependencies |
| Fallback on RAG failure | **Return empty, never block** | Core NFR: RAG failure must not affect model run |
| Plugin config | **Via `openclaw.json` plugin entry** | Matches established lossless-claw pattern; no separate config file needed |
| RAG query params | **topK=5, maxChars=4000, maxChunks=8** | Reasonable defaults that fit inside most model context windows |

---

## 8. Open Questions & Resolved

| Question | Resolution |
|----------|-----------|
| Does context engine plugin need its own skills dir? | No — this plugin is fully passive (no skill invocation) |
| ESM vs CJS? | Use ESM (`"type": "module"`) — matches OpenClaw SDK pattern |
| AbortController for timeout? | Use native browser-compatible AbortController (works in Node 18+) |
| Max `systemPromptAddition` length? | No hard limit known from OpenClaw 2026.4.14; set conservative `maxChars=4000` default |
