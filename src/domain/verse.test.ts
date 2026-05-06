import { describe, expect, it } from "vitest";
import { normalizeVerseRef, parseVerseId, verseIdFromParts } from "./verse";

describe("verse ids", () => {
  it("builds stable ids from book, chapter, and verse", () => {
    expect(verseIdFromParts("Gen", 1, 1)).toBe("Gen.1.1");
  });

  it("parses stable ids", () => {
    expect(parseVerseId("Gen.1.3")).toEqual({ book: "Gen", chapter: 1, verse: 3 });
  });

  it("normalizes Chinese Genesis references", () => {
    expect(normalizeVerseRef("创 1:1")).toBe("Gen.1.1");
    expect(normalizeVerseRef("[[创世记 1:2]]")).toBe("Gen.1.2");
  });
});
