# TwinMind RAG Context Engine Plugin — PRD

**Project:** TwinMind RAG Context Engine Plugin
**Date:** 2026-04-15
**Status:** Draft

---

## 1. Overview

Build an OpenClaw plugin (`twinmind-rag-context-engine`) that acts as a **Context Engine plugin** (kind: `context-engine`). On every model run, it intercepts the assemble phase, queries the TwinMind RAG HTTP API with the user's latest message/prompt, and injects the retrieved context into the system prompt via `systemPromptAddition`.

---

## 2. Functional Requirements

### FR-1: Plugin Registration
- Plugin registers with OpenClaw as a context engine via the plugin manifest
- Declares kind: `context-engine` in `openclaw.plugin.json`
- Implements the `ContextEnginePlugin` interface from the SDK

### FR-2: Assemble Hook (Core)
- The `assemble(params)` method is called before each model run
- Extracts the latest user prompt from `params.prompt` or `params.messages`
- Sends the prompt as a query to `http://RAG_HOST:18790/search?query=<prompt>&k=5`
- Calls `assemble_context(hits, max_chars=4000, max_chunks=8)` from `~/rag/src/rag/context_assembly.py`
- Returns `AssembleResult` with `systemPromptAddition` set to the assembled context

### FR-3: Graceful Failure
- RAG server down → log warning, return `{}` (empty AssembleResult, no error thrown)
- RAG returns 0 hits → return empty string as `systemPromptAddition` (valid zero-result state)
- HTTP timeout (5s) → log warning, return empty
- JSON parse error in RAG response → log error, return empty
- Never throws; never blocks model run

### FR-4: Configuration (via openclaw.json plugin entry)
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
          "timeoutMs": 5000,
          "fallbackOnError": true
        }
      }
    }
  }
}
```

### FR-5: Hot-Pluggable
- Adding/removing the plugin entry from `openclaw.json` and restarting gateway activates/deactivates it
- No other system components need to change

### FR-6: Test Suite
- Unit tests for `assemble_context` integration (mock RAG HTTP responses)
- Unit tests for graceful failure paths (RAG down, empty results, timeout)
- Unit tests for config parsing
- Integration test: verify the plugin is loadable and the assemble hook returns expected shape

### FR-7: Documentation
- README.md: installation, configuration, how it works, failure modes
- Inline code comments for all public interfaces

---

## 3. Non-Functional Requirements

- NFR-1: RAG query must complete in <5s or fall back gracefully
- NFR-2: Plugin must not increase model run latency by >2s in the normal path
- NFR-3: All errors must be logged, not thrown
- NFR-4: Plugin must be installable via `openclaw plugins install -l <path>` or manual copy
- NFR-5: No changes to existing RAG MCP tool or RAG daemon

---

## 4. Plugin File Structure

```
twinmind-rag-plugin/
├── openclaw.plugin.json        # Plugin manifest
├── package.json                # Node.js package
├── tsconfig.json
├── src/
│   ├── index.ts               # Plugin entry, registers the context engine
│   ├── TwinMindContextEngine.ts   # Core ContextEnginePlugin implementation
│   ├── RagHttpClient.ts        # HTTP client for RAG /search endpoint
│   ├── assembleContext.ts     # Wrapper that calls assemble_context from Python
│   ├── types.ts               # Plugin config types
│   └── graceful.ts            # Error handling / fallback utilities
├── tests/
│   ├── TwinMindContextEngine.test.ts
│   ├── RagHttpClient.test.ts
│   └── graceful.test.ts
├── README.md
└── ASSEMBLY_INTEGRATION.md    # How to call Python assemble_context from Node.js
```

---

## 5. Technical Approach

### 5.1 Context Engine Interface
The plugin implements `ContextEnginePlugin` from `openclaw/dist/plugin-sdk/src/context-engine/`. The key method:

```typescript
class TwinMindContextEngine implements ContextEnginePlugin {
  assemble(params: ContextEngineAssembleParams): Promise<AssembleResult> {
    // 1. Extract latest user prompt
    // 2. Query RAG HTTP API
    // 3. Return { systemPromptAddition: assembledContext }
  }
}
```

### 5.2 Calling Python `assemble_context` from Node.js
Since `assemble_context()` is in `~/rag/src/rag/context_assembly.py`, the plugin calls it via:
- Option A: spawn a short Python subprocess (`python3 -c "..."`)
- Option B: re-implement `assemble_context` logic in TypeScript (preferred for simplicity and testability)

**Decision: re-implement in TypeScript.** The algorithm is simple (sort, deduplicate, truncate). Do not add a Python subprocess dependency.

### 5.3 RAG HTTP API
```
GET http://RAG_HOST:18790/search?query=<prompt>&k=<topK>
Response: { "hits": [{ "source", "section_title", "child_text", "score" }, ...] }
```

### 5.4 Fallback Strategy
1. Try primary RAG_HOST
2. On failure, try ragFallbackHost
3. On failure, return empty `systemPromptAddition` (graceful degradation)

---

## 6. Open Questions

- [ ] Does OpenClaw require context engine plugins to be ESM or CJS?
- [ ] Is there a maximum character limit for `systemPromptAddition` enforced by OpenClaw?
- [ ] Should the plugin also expose a tool so agents can explicitly trigger RAG search? (Out of scope for now)
