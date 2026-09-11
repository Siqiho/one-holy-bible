import { describe, expect, it } from "vitest";
import { BIBLE_BOOKS } from "./bibleBooks";
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

  it("normalizes references for every canonical book", () => {
    for (const book of BIBLE_BOOKS) {
      expect(normalizeVerseRef(`${book.id} 1:1`)).toBe(`${book.id}.1.1`);
      expect(normalizeVerseRef(`${book.englishName} 1:1`)).toBe(`${book.id}.1.1`);
      expect(normalizeVerseRef(`${book.chineseName} 1:1`)).toBe(`${book.id}.1.1`);
      expect(normalizeVerseRef(`${book.chineseShortName} 1:1`)).toBe(`${book.id}.1.1`);
    }
  });

  it("normalizes common English and Chinese aliases beyond Genesis", () => {
    expect(verseIdFromParts("约", 1, 1)).toBe("John.1.1");
    expect(normalizeVerseRef("约翰福音 3:16")).toBe("John.3.16");
    expect(normalizeVerseRef("[[启 22:21]]")).toBe("Rev.22.21");
    expect(normalizeVerseRef("Revelation 22:21")).toBe("Rev.22.21");
    expect(normalizeVerseRef("1 John 1:1")).toBe("1John.1.1");
    expect(normalizeVerseRef("约壹 1:1")).toBe("1John.1.1");
  });
});
