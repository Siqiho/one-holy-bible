import { describe, expect, it } from "vitest";
import type { BibleVersion } from "../domain/bible";
import { createBibleSearchIndex, searchBibleText } from "./bibleSearch";
import type { PublicScriptureSearchEntry } from "../data/publicData";

const cuvBible: BibleVersion = {
  id: "cuv",
  label: "和合本",
  language: "zh",
  verses: [
    { id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "起初，神创造天地。" },
    { id: "John.3.16", book: "John", chapter: 3, verse: 16, text: "神爱世人，甚至将他的独生子赐给他们。" },
    { id: "Rev.22.21", book: "Rev", chapter: 22, verse: 21, text: "愿主耶稣的恩惠常与众圣徒同在。" },
  ],
};

const kjvBible: BibleVersion = {
  id: "kjv",
  label: "KJV",
  language: "en",
  verses: [
    { id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "In the beginning God created the heaven and the earth." },
    { id: "Gen.1.2", book: "Gen", chapter: 1, verse: 2, text: "And the Spirit of God moved upon the face of the waters." },
    { id: "Gen.1.3", book: "Gen", chapter: 1, verse: 3, text: "And God said, Let there be light: and there was light." },
    { id: "John.3.16", book: "John", chapter: 3, verse: 16, text: "For God so loved the world, that he gave his only begotten Son." },
    { id: "Rev.22.21", book: "Rev", chapter: 22, verse: 21, text: "The grace of our Lord Jesus Christ be with you all. Amen." },
  ],
};

describe("searchBibleText", () => {
  it("keeps existing result shape compatible", () => {
    expect(searchBibleText([cuvBible, kjvBible], "created")[0]).toEqual({
      verseId: "Gen.1.1",
      versionId: "kjv",
      versionLabel: "KJV",
      text: "In the beginning God created the heaven and the earth.",
    });
  });

  it("searches Chinese and KJV Bible text", () => {
    expect(searchBibleText([cuvBible, kjvBible], "created")).toContainEqual({
      verseId: "Gen.1.1",
      versionId: "kjv",
      versionLabel: "KJV",
      text: "In the beginning God created the heaven and the earth.",
    });
  });

  it("does not search resource bodies", () => {
    expect(searchBibleText([cuvBible, kjvBible], "词语关系图")).toEqual([]);
  });

  it("searches non-Genesis verses in the full Bible library", () => {
    expect(searchBibleText([cuvBible, kjvBible], "For God so loved the world")).toContainEqual({
      verseId: "John.3.16",
      versionId: "kjv",
      versionLabel: "KJV",
      text: expect.stringContaining("For God so loved the world"),
    });

    expect(searchBibleText([cuvBible, kjvBible], "神爱世人")).toContainEqual({
      verseId: "John.3.16",
      versionId: "cuv",
      versionLabel: "和合本",
      text: expect.stringContaining("神爱世人"),
    });

    expect(searchBibleText([cuvBible, kjvBible], "愿主耶稣的恩惠")).toContainEqual({
      verseId: "Rev.22.21",
      versionId: "cuv",
      versionLabel: "和合本",
      text: expect.stringContaining("愿主耶稣的恩惠"),
    });
  });
});

describe("createBibleSearchIndex", () => {
  it("reuses an index per versions array and does not reread verse text per query", () => {
    let textReads = 0;
    const versions = [
      {
        id: "test",
        label: "Test",
        language: "en",
        verses: [
          {
            id: "Gen.1.1" as const,
            book: "Gen",
            chapter: 1,
            verse: 1,
            get text() {
              textReads += 1;
              return "Alpha beta alpha";
            },
          },
        ],
      },
    ];

    const index = createBibleSearchIndex(versions);
    const readsAfterIndexing = textReads;

    expect(createBibleSearchIndex(versions)).toBe(index);
    expect(index.search("alpha").totalCount).toBe(1);
    expect(index.search("beta").totalCount).toBe(1);
    expect(textReads).toBe(readsAfterIndexing);
  });

  it("searches CUV and KJV Bible text with metadata and counts", () => {
    const index = createBibleSearchIndex([cuvBible, kjvBible]);

    const english = index.search("created");
    expect(english.totalCount).toBeGreaterThan(0);
    expect(english.results[0]).toMatchObject({
      verseId: "Gen.1.1",
      versionId: "kjv",
      versionLabel: "KJV",
      book: "Gen",
      chapter: 1,
      verse: 1,
      text: "In the beginning God created the heaven and the earth.",
      matchRanges: [{ start: 21, end: 28 }],
    });

    const chinese = index.search("神爱世人");
    expect(chinese.totalCount).toBeGreaterThan(0);
    expect(chinese.results).toContainEqual(
      expect.objectContaining({
        verseId: "John.3.16",
        versionId: "cuv",
        versionLabel: "和合本",
        book: "John",
        chapter: 3,
        verse: 16,
        text: expect.stringContaining("神爱世人"),
        matchRanges: expect.arrayContaining([expect.objectContaining({ start: expect.any(Number), end: expect.any(Number) })]),
      }),
    );
  });

  it("does not search resource bodies", () => {
    const index = createBibleSearchIndex([cuvBible, kjvBible]);
    expect(index.search("词语关系图")).toEqual({ totalCount: 0, results: [] });
  });

  it("filters by version", () => {
    const index = createBibleSearchIndex([cuvBible, kjvBible]);

    expect(index.search("God", { version: "kjv" }).results.every((result) => result.versionId === "kjv")).toBe(true);
    expect(index.search("God", { version: "cuv" })).toEqual({ totalCount: 0, results: [] });
  });

  it("filters by old testament, new testament, and exact book", () => {
    const index = createBibleSearchIndex([cuvBible, kjvBible]);

    expect(index.search("God", { scope: "old" }).results.every((result) => result.book !== "John")).toBe(true);
    expect(index.search("For God so loved the world", { scope: "old" })).toEqual({ totalCount: 0, results: [] });
    expect(index.search("For God so loved the world", { scope: "new" }).results).toContainEqual(
      expect.objectContaining({ verseId: "John.3.16", book: "John" }),
    );
    expect(index.search("created", { scope: "John" })).toEqual({ totalCount: 0, results: [] });
    expect(index.search("For God so loved the world", { scope: "John" }).results).toContainEqual(
      expect.objectContaining({ verseId: "John.3.16", book: "John" }),
    );
  });

  it("returns all match ranges for a repeated Chinese query", () => {
    const repeatedCuv = {
      ...cuvBible,
      verses: [
        {
          id: "Gen.1.1" as const,
          book: "Gen",
          chapter: 1,
          verse: 1,
          text: "神说神爱神",
        },
      ],
    };
    const index = createBibleSearchIndex([repeatedCuv]);

    expect(index.search("神").results[0]).toMatchObject({
      matchRanges: [
        { start: 0, end: 1 },
        { start: 2, end: 3 },
        { start: 4, end: 5 },
      ],
    });
  });

  it("limits returned results while preserving total count", () => {
    const index = createBibleSearchIndex([cuvBible, kjvBible]);

    const unbounded = index.search("God");
    const limited = index.search("God", { maxResults: 3 });

    expect(unbounded.totalCount).toBeGreaterThan(3);
    expect(limited.results).toHaveLength(3);
    expect(limited.totalCount).toBe(unbounded.totalCount);
  });
});

describe("createPublicScriptureSearchIndex", () => {
  it("searches a lightweight whole-Bible index without loading book payloads", async () => {
    const { createPublicScriptureSearchIndex } = await import("./bibleSearch");
    const entries: PublicScriptureSearchEntry[] = [
      { verseId: "Gen.1.1", versionId: "kjv", versionLabel: "KJV", book: "Gen", chapter: 1, verse: 1, text: "In the beginning" },
      { verseId: "John.3.16", versionId: "kjv", versionLabel: "KJV", book: "John", chapter: 3, verse: 16, text: "For God so loved the world" },
    ];

    expect(createPublicScriptureSearchIndex(entries).search("loved", { scope: "new" })).toEqual({
      totalCount: 1,
      results: [expect.objectContaining({ verseId: "John.3.16", book: "John", matchRanges: [{ start: 11, end: 16 }] })],
    });
  });
});
