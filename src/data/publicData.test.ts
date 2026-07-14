import { describe, expect, it } from "vitest";
import { validatePublicBookPayload, validatePublicManifest } from "./publicData";

describe("public data contracts", () => {
  it("accepts a safe manifest and one text-only book payload", () => {
    expect(validatePublicManifest({
      schemaVersion: 1,
      releaseVersion: "0.1.0",
      searchIndexUrl: "/data/search-index.json",
      books: [{ id: "Gen", url: "/data/books/Gen.json", bytes: 123, sha256: "a".repeat(64), cuvVerseCount: 1, kjvVerseCount: 1, textCardCount: 1 }],
    }).books[0].id).toBe("Gen");
    expect(validatePublicBookPayload({
      schemaVersion: 1,
      bookId: "Gen",
      cuvVerses: [{ id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "起初" }],
      kjvVerses: [{ id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "In the beginning" }],
      textCards: [{ id: "card-1", type: "commentary", title: "创世记一章", body: "解释", verses: ["Gen.1.1"] }],
    }).textCards).toHaveLength(1);
  });

  it.each([
    ["absolute path", "/Users/simon/OHB/file.pdf"],
    ["local URL", "http://127.0.0.1:5179/api/card"],
  ])("rejects %s metadata", (_label, unsafe) => {
    expect(() => validatePublicBookPayload({
      schemaVersion: 1,
      bookId: "Gen",
      cuvVerses: [],
      kjvVerses: [],
      textCards: [{ id: "card-1", type: "commentary", title: "x", body: "y", verses: ["Gen.1.1"], debugMeta: { sourcePdfPath: unsafe } }],
    })).toThrow(/unsafe public data/i);
  });

  it("rejects image resources", () => {
    expect(() => validatePublicBookPayload({ schemaVersion: 1, bookId: "Gen", cuvVerses: [], kjvVerses: [], textCards: [{ id: "image-1", type: "image", title: "x", body: "", verses: ["Gen.1.1"], assetPath: "/image.jpg" }] })).toThrow(/image/i);
  });
});
