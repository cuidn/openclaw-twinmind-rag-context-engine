# TwinMind RAG Context Engine Plugin — Brief

**Date:** 2026-04-15
**Author:** Rook (coordinator)
**Status:** Draft

---

## 1. Problem Statement

Currently, RAG search results are delivered as a tool result from `rag__rag_search()`, but the `assembled_context` field does not automatically inject into the system prompt. Agents must manually read the tool result and incorporate it. This is fragile, non-automatic, and relies on `SOUL.md` as a static relay — which is unreliable.

The goal: **automatically inject RAG-retrieved context into every LLM prompt**, without requiring the agent to explicitly invoke or parse RAG results.

---

## 2. Success Criteria

1. A hot-pluggable OpenClaw plugin (`kind: "context-engine"`) that wraps the TwinMind RAG system
2. On every model run, the plugin intercepts the assemble phase, queries RAG with the user's latest prompt, and injects the assembled context into `systemPromptAddition`
3. The plugin fails gracefully — if RAG is down or returns no results, the assemble phase returns empty (no error, no blocking)
4. The plugin is installable/uninstallable without touching other system components
5. Includes a functional test suite with >80% pass rate on core paths
6. Documentation: README covering installation, configuration, and failure modes

---

## 3. Constraints

- Must use OpenClaw Plugin SDK (`@openclaw/plugin-sdk`)
- Must implement the `ContextEngine` interface (from `openclaw/dist/plugin-sdk/src/context-engine/`)
- RAG query via existing HTTP API (`http://RAG_HOST:18790/search`) — do NOT re-implement the RAG core
- Plugin state must survive gateway restarts (stateful but lightweight)
- No changes to core OpenClaw codebase
- Compatible with OpenClaw 2026.4.14

---

## 4. Out of Scope

- Re-implementing RAG ingestion, indexing, or search logic
- Modifying the RAG daemon or server
- Supporting non-RAG context sources in this plugin
- MCP server changes (the existing `rag-mcp` tool remains separate)

---

## 5. Related Work

- Existing RAG MCP tool: `~/rag/bin/rag-mcp`
- RAG HTTP server: `~/rag/venv/bin/rag-server.py` (port 18790)
- Existing `assemble_context()`: `~/rag/src/rag/context_assembly.py`
- Context Engine SDK types: `openclaw/dist/plugin-sdk/src/context-engine/`
- lossless-claw as reference: `~/.openclaw/extensions/lossless-claw/`
