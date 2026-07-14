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
    ["missing release version", (manifest: Record<string, unknown>) => { delete manifest.releaseVersion; }],
    ["empty release version", (manifest: Record<string, unknown>) => { manifest.releaseVersion = ""; }],
    ["wrong release version type", (manifest: Record<string, unknown>) => { manifest.releaseVersion = 1; }],
    ["unsafe release version", (manifest: Record<string, unknown>) => { manifest.releaseVersion = "../draft"; }],
    ["relative search index URL", (manifest: Record<string, unknown>) => { manifest.searchIndexUrl = "data/search-index.json"; }],
    ["different rooted search index URL", (manifest: Record<string, unknown>) => { manifest.searchIndexUrl = "/data/other.json"; }],
    ["wrong search index URL type", (manifest: Record<string, unknown>) => { manifest.searchIndexUrl = 1; }],
  ])("rejects a runtime manifest with %s", (_label, mutate) => {
    const manifest: Record<string, unknown> = {
      schemaVersion: 1,
      releaseVersion: "0.1.0",
      searchIndexUrl: "/data/search-index.json",
      books: [{ id: "Gen", url: "/data/books/Gen.json", bytes: 123, sha256: "a".repeat(64), cuvVerseCount: 1, kjvVerseCount: 1, textCardCount: 1 }],
    };
    mutate(manifest);

    expect(() => validatePublicManifest(manifest)).toThrow(/unsafe public data/i);
  });

  it.each([
    ["absolute path", ["", "Users", "simon", "OHB", "file.pdf"].join("/")],
    ["local URL", `http://${[127, 0, 0, 1].join(".")}:${5179}/api/card`],
  ])("rejects %s metadata", (_label, unsafe) => {
    const privatePathField = ["source", "Pdf", "Path"].join("");
    expect(() => validatePublicBookPayload({
      schemaVersion: 1,
      bookId: "Gen",
      cuvVerses: [],
      kjvVerses: [],
      textCards: [{ id: "card-1", type: "commentary", title: "x", body: "y", verses: ["Gen.1.1"], debugMeta: { [privatePathField]: unsafe } }],
    })).toThrow(/unsafe public data/i);
  });

  it("rejects image resources", () => {
    expect(() => validatePublicBookPayload({ schemaVersion: 1, bookId: "Gen", cuvVerses: [], kjvVerses: [], textCards: [{ id: "image-1", type: "image", title: "x", body: "", verses: ["Gen.1.1"], assetPath: "/image.jpg" }] })).toThrow(/image/i);
  });

  it("accepts only the approved text-card provenance fields", () => {
    const payload = validatePublicBookPayload({
      schemaVersion: 1,
      bookId: "Gen",
      cuvVerses: [],
      kjvVerses: [],
      textCards: [{
        id: "card-1",
        type: "note",
        title: "x",
        body: "y",
        summary: "safe summary",
        verses: ["Gen.1.1"],
        primaryAnchor: "Gen.1.1",
        debugMeta: {
          sourceLabel: "Public source",
          page: 1,
          pageRange: [1, 2],
          primaryAnchor: "Gen.1.1",
          coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.2" }],
        },
      }],
    });

    expect(payload.textCards[0].debugMeta?.sourceLabel).toBe("Public source");
  });

  it.each([
    ["asset path", { assetPath: "/image.jpg" }],
    ["image URL", { imageUrl: "https://example.com/image.jpg" }],
    ["review state", { reviewStatus: "needs_review" }],
    ["private ledger", { sourceLedgerPath: "private-ledger.json" }],
    ["evidence snippet", { sourceEvidenceSnippet: "internal evidence" }],
  ])("rejects forbidden card field: %s", (_label, forbidden) => {
    expect(() => validatePublicBookPayload({
      schemaVersion: 1,
      bookId: "Gen",
      cuvVerses: [],
      kjvVerses: [],
      textCards: [{ id: "card-1", type: "note", title: "x", body: "y", verses: ["Gen.1.1"], ...forbidden }],
    })).toThrow(/unsafe public data/i);
  });

  it.each([
    ["manifest review state", { reviewStatus: "needs_review" }],
    ["manifest private ledger", { sourceLedgerPath: "private-ledger.json" }],
  ])("rejects forbidden manifest field: %s", (_label, forbidden) => {
    expect(() => validatePublicManifest({
      schemaVersion: 1,
      releaseVersion: "0.1.0",
      searchIndexUrl: "/data/search-index.json",
      books: [{ id: "Gen", url: "/data/books/Gen.json", bytes: 123, sha256: "a".repeat(64), cuvVerseCount: 0, kjvVerseCount: 0, textCardCount: 0 }],
      ...forbidden,
    })).toThrow(/unsafe public data/i);
  });

  it.each([
    ["extra verse segments", "Gen.1.1.extra"],
    ["non-numeric chapter", "Gen.one.1"],
    ["chapter out of range", "Gen.51.1"],
    ["verse out of range", "Gen.1.32"],
  ])("rejects malformed or unavailable card verse: %s", (_label, verseId) => {
    expect(() => validatePublicBookPayload({
      schemaVersion: 1,
      bookId: "Gen",
      cuvVerses: [],
      kjvVerses: [],
      textCards: [{ id: "card-1", type: "commentary", title: "x", body: "y", verses: [verseId] }],
    })).toThrow(/verse|chapter|coordinate/i);
  });

  it("rejects a Bible verse whose canonical coordinate is unavailable", () => {
    expect(() => validatePublicBookPayload({
      schemaVersion: 1,
      bookId: "Gen",
      cuvVerses: [{ id: "Gen.1.32", book: "Gen", chapter: 1, verse: 32, text: "x" }],
      kjvVerses: [],
      textCards: [],
    })).toThrow(/verse|coordinate/i);
  });
});
