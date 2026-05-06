import { describe, expect, it } from "vitest";

import {
  normalizeVerseRef,
  parseVerseId,
  verseIdFromParts,
} from "./verse";

describe("VerseId helpers", () => {
  it("builds canonical verse ids from normalized parts", () => {
    expect(verseIdFromParts("Gen", 1, 1)).toBe("Gen.1.1");
    expect(verseIdFromParts("创世记", 1, 3)).toBe("Gen.1.3");
  });

  it("parses canonical verse ids into parts", () => {
    expect(parseVerseId("Gen.1.2")).toEqual({
      book: "Gen",
      chapter: 1,
      verse: 2,
    });
  });

  it("normalizes English and Chinese Genesis references", () => {
    expect(normalizeVerseRef("Gen 1:1")).toBe("Gen.1.1");
    expect(normalizeVerseRef("Gen.1.2")).toBe("Gen.1.2");
    expect(normalizeVerseRef("创 1:1")).toBe("Gen.1.1");
    expect(normalizeVerseRef("创世记 1:3")).toBe("Gen.1.3");
  });

  it("rejects unsupported or malformed references", () => {
    expect(() => normalizeVerseRef("Exod 1:1")).toThrow(
      /Unsupported Bible reference/,
    );
    expect(() => parseVerseId("Gen.1")).toThrow(/Invalid verse id/);
  });
});
