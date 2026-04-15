/**
 * assembleContext — TypeScript port of ~/rag/src/rag/context_assembly.py assemble_context()
 *
 * Transforms raw RAG hits into an LLM-ready context string.
 *
 * Algorithm:
 *  1. Parse hits into Chunk objects
 *  2. Deduplicate by (source, section_title) — keep highest score
 *  3. Sort by source filename (groups same-file chunks together)
 *  4. Within same file, preserve original retrieval order
 *  5. Limit to maxChunks
 *  6. Build "[source: filename :: section]\ncontent\n" headers
 *  7. Truncate to maxChars
 */
/**
 * Convert raw RAG hits to an LLM-ready context string.
 * Returns empty string if hits is empty.
 */
export function assembleContextFromHits(hits, options) {
    if (!hits || hits.length === 0) {
        return "";
    }
    // Step 1: Parse hits into Chunks
    const chunks = hits.map((hit, i) => ({
        source: hit.source ?? "",
        section_title: hit.section_title ?? "",
        content: hit.child_text ?? "",
        score: hit.score ?? 0.0,
        order_hint: i,
    }));
    // Step 2: Deduplicate by (source, section_title) — keep highest score
    const seen = new Map();
    for (const c of chunks) {
        const key = chunkKey(c);
        const existing = seen.get(key);
        if (!existing || c.score > existing.score) {
            seen.set(key, c);
        }
    }
    const deduplicated = Array.from(seen.values());
    // Step 3: Sort by source filename (alphabetically — rough document order),
    //         then by original retrieval order within same file
    deduplicated.sort((a, b) => {
        const nameA = sourceName(a.source);
        const nameB = sourceName(b.source);
        if (nameA < nameB)
            return -1;
        if (nameA > nameB)
            return 1;
        return a.order_hint - b.order_hint;
    });
    // Step 4: Limit total chunks
    const limited = deduplicated.slice(0, options.maxChunks);
    // Step 5: Build context string
    const lines = [];
    for (const c of limited) {
        const filename = sourceName(c.source);
        let header = `[source: ${filename}`;
        if (c.section_title) {
            header += ` :: ${c.section_title}`;
        }
        header += "]";
        lines.push(header);
        const content = c.content.trim();
        if (content) {
            lines.push(content);
        }
        lines.push(""); // blank line between chunks
    }
    let context = lines.join("\n").trim();
    // Step 6: Truncate
    if (context.length > options.maxChars) {
        context =
            context.slice(0, options.maxChars) +
                `\n\n[...] (truncated, ${limited.length} chunks)`;
    }
    return context;
}
// ── Helpers ────────────────────────────────────────────────────────────────────
function chunkKey(c) {
    return `${c.source}\x00${c.section_title}`;
}
function sourceName(sourcePath) {
    // Extract filename from absolute path
    const lastSlash = sourcePath.lastIndexOf("/");
    return lastSlash >= 0 ? sourcePath.slice(lastSlash + 1) : sourcePath;
}
//# sourceMappingURL=assembleContext.js.map