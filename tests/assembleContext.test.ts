/**
 * assembleContext.test.ts — Unit tests for assembleContextFromHits()
 */

import { describe, it, expect } from "vitest";
import { assembleContextFromHits } from "../src/assembleContext.js";
import type { RagHit } from "../src/types.js";

function makeHit(overrides: Partial<RagHit> = {}): RagHit {
  return {
    source: "/home/openclaw/workspace/MEMORY.md",
    section_title: "Overview",
    child_text: "This is the content.",
    score: 0.9,
    ...overrides,
  };
}

describe("assembleContextFromHits", () => {
  it("returns empty string for empty hits array", () => {
    expect(assembleContextFromHits([], { maxChars: 4000, maxChunks: 8 })).toBe("");
  });

  it("returns empty string for null/undefined hits", () => {
    // @ts-expect-error — testing runtime behavior
    expect(assembleContextFromHits(null, { maxChars: 4000, maxChunks: 8 })).toBe("");
    // @ts-expect-error
    expect(assembleContextFromHits(undefined, { maxChars: 4000, maxChunks: 8 })).toBe("");
  });

  it("renders [source: filename] header with section title", () => {
    const hits = [makeHit({ source: "/home/openclaw/workspace/SOUL.md", section_title: "Identity" })];
    const result = assembleContextFromHits(hits, { maxChars: 4000, maxChunks: 8 });
    expect(result).toContain("[source: SOUL.md :: Identity]");
  });

  it("renders [source: filename] header without section title", () => {
    const hits = [makeHit({ section_title: "" })];
    const result = assembleContextFromHits(hits, { maxChars: 4000, maxChunks: 8 });
    expect(result).toContain("[source: MEMORY.md]");
    expect(result).not.toContain("::");
  });

  it("deduplicates by (source, section_title), keeping highest score", () => {
    const hits = [
      makeHit({ source: "/a/x.md", section_title: "T1", score: 0.5, child_text: "Low score" }),
      makeHit({ source: "/a/x.md", section_title: "T1", score: 0.9, child_text: "High score" }),
      makeHit({ source: "/a/x.md", section_title: "T1", score: 0.7, child_text: "Mid score" }),
    ];
    const result = assembleContextFromHits(hits, { maxChars: 4000, maxChunks: 8 });
    expect(result).toContain("High score");
    expect(result).not.toContain("Low score");
  });

  it("keeps different (source, section_title) pairs separate", () => {
    const hits = [
      makeHit({ source: "/a/a.md", section_title: "X", score: 0.9 }),
      makeHit({ source: "/a/b.md", section_title: "X", score: 0.9 }),
    ];
    const result = assembleContextFromHits(hits, { maxChars: 4000, maxChunks: 8 });
    expect(result).toContain("[source: a.md :: X]");
    expect(result).toContain("[source: b.md :: X]");
  });

  it("sorts by source filename alphabetically", () => {
    const hits = [
      makeHit({ source: "/zebra.md" }),
      makeHit({ source: "/apple.md" }),
      makeHit({ source: "/banana.md" }),
    ];
    const result = assembleContextFromHits(hits, { maxChars: 4000, maxChunks: 8 });
    const appleIdx = result.indexOf("apple.md");
    const bananaIdx = result.indexOf("banana.md");
    const zebraIdx = result.indexOf("zebra.md");
    expect(appleIdx).toBeLessThan(bananaIdx);
    expect(bananaIdx).toBeLessThan(zebraIdx);
  });

  it("limits to maxChunks", () => {
    const hits = Array.from({ length: 5 }, (_, i) =>
      makeHit({ source: `/file${i}.md`, score: 0.9 - i * 0.01 })
    );
    const result = assembleContextFromHits(hits, { maxChars: 4000, maxChunks: 3 });
    expect(result).toContain("file0.md");
    expect(result).toContain("file1.md");
    expect(result).toContain("file2.md");
    expect(result).not.toContain("file3.md");
  });

  it("truncates to maxChars with suffix", () => {
    const longText = "x".repeat(5000);
    const hits = [makeHit({ child_text: longText })];
    const result = assembleContextFromHits(hits, { maxChars: 200, maxChunks: 8 });
    // Note: suffix adds chars, total may slightly exceed maxChars but that's acceptable
    expect(result.length).toBeLessThanOrEqual(250);
    expect(result).toContain("(truncated");
  });

  it("does not truncate if under maxChars", () => {
    const shortText = "Hello world.";
    const hits = [makeHit({ child_text: shortText })];
    const result = assembleContextFromHits(hits, { maxChars: 4000, maxChunks: 8 });
    expect(result).toContain(shortText);
    expect(result).not.toContain("truncated");
  });

  it("handles missing child_text as empty", () => {
    const hits = [{ source: "/test.md", section_title: "", child_text: "", score: 0.9 }];
    const result = assembleContextFromHits(hits, { maxChars: 4000, maxChunks: 8 });
    expect(result).toContain("[source: test.md]");
  });
});
