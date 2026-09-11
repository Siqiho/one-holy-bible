import { describe, expect, it } from "vitest";

import { BIBLE_BOOKS } from "./bibleBooks";
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

  it("normalizes aliases across all 66 books", () => {
    const canonicalIds = new Set(BIBLE_BOOKS.map((book) => book.id));

    for (const book of BIBLE_BOOKS) {
      expect(canonicalIds.has(book.id)).toBe(true);
      expect(verseIdFromParts(book.chineseShortName, 1, 1)).toBe(`${book.id}.1.1`);
      expect(normalizeVerseRef(`${book.id}.1.1`)).toBe(`${book.id}.1.1`);
      expect(normalizeVerseRef(`${book.englishName} 1:1`)).toBe(`${book.id}.1.1`);
      expect(normalizeVerseRef(`${book.chineseName} 1:1`)).toBe(`${book.id}.1.1`);
    }

    expect(normalizeVerseRef("Exodus 1:1")).toBe("Exod.1.1");
    expect(normalizeVerseRef("出 1:1")).toBe("Exod.1.1");
    expect(normalizeVerseRef("John 3:16")).toBe("John.3.16");
    expect(normalizeVerseRef("约 3:16")).toBe("John.3.16");
    expect(normalizeVerseRef("Rev 22:21")).toBe("Rev.22.21");
    expect(normalizeVerseRef("启示录 22:21")).toBe("Rev.22.21");
  });

  it("rejects unsupported or malformed references", () => {
    expect(() => normalizeVerseRef("Wisdom 1:1")).toThrow(
      /Unsupported Bible reference/,
    );
    expect(() => parseVerseId("Gen.1")).toThrow(/Invalid verse id/);
  });
});
