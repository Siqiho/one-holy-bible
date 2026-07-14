import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadBibleLibrary, publicBookToBibleVersions } from "./loadBibleLibrary";
import {
  PublicBookLoadError,
  loadPublicBook,
  loadPublicManifest,
  loadPublicSearchIndex,
  resetPublicDataCache,
} from "./publicBibleData";

const validManifest = {
  schemaVersion: 1,
  releaseVersion: "0.1.0",
  searchIndexUrl: "/data/search-index.json",
  books: [
    {
      id: "Gen",
      url: "/data/books/Gen.json",
      bytes: 123,
      sha256: "a".repeat(64),
      cuvVerseCount: 1,
      kjvVerseCount: 1,
      textCardCount: 1,
    },
  ],
} as const;

const validGenesis = {
  schemaVersion: 1,
  bookId: "Gen",
  cuvVerses: [{ id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "起初" }],
  kjvVerses: [{ id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "In the beginning" }],
  textCards: [{ id: "card-1", type: "commentary", title: "Genesis", body: "private card body", verses: ["Gen.1.1"] }],
} as const;

const validSearchIndex = [
  {
    verseId: "Gen.1.1",
    versionId: "cuv",
    versionLabel: "和合本",
    book: "Gen",
    chapter: 1,
    verse: 1,
    text: "起初",
  },
] as const;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("public Bible data loading", () => {
  beforeEach(() => {
    resetPublicDataCache();
    vi.restoreAllMocks();
  });

  it("deduplicates concurrent book loads and retries after a failure", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(validManifest))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(jsonResponse(validGenesis));

    await loadPublicManifest({ fetcher });
    await expect(loadPublicBook("Gen", { fetcher })).rejects.toThrow("offline");

    const [first, second] = await Promise.all([
      loadPublicBook("Gen", { fetcher }),
      loadPublicBook("Gen", { fetcher }),
    ]);

    expect(first).toBe(second);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenNthCalledWith(1, "/data/manifest.json");
    expect(fetcher).toHaveBeenNthCalledWith(2, "/data/books/Gen.json");
  });

  it("deduplicates manifest loads and reset clears every cache", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(validManifest))
      .mockResolvedValueOnce(jsonResponse(validGenesis))
      .mockResolvedValueOnce(jsonResponse(validManifest))
      .mockResolvedValueOnce(jsonResponse(validGenesis));

    const [first, second] = await Promise.all([
      loadPublicManifest({ fetcher }),
      loadPublicManifest({ fetcher }),
    ]);
    expect(first).toBe(second);
    await loadPublicBook("Gen", { fetcher });

    resetPublicDataCache();

    await loadPublicManifest({ fetcher });
    await loadPublicBook("Gen", { fetcher });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("rejects an unknown book without fetching its payload", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(jsonResponse(validManifest));

    await expect(loadPublicBook("Exod", { fetcher })).rejects.toMatchObject({
      name: "PublicBookLoadError",
      bookId: "Exod",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reports non-OK book responses and permits a later retry", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(validManifest))
      .mockResolvedValueOnce(jsonResponse({ message: "missing" }, 404))
      .mockResolvedValueOnce(jsonResponse(validGenesis));

    await expect(loadPublicBook("Gen", { fetcher })).rejects.toBeInstanceOf(PublicBookLoadError);
    await expect(loadPublicBook("Gen", { fetcher })).resolves.toEqual(validGenesis);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("rejects malformed manifest and book schemas", async () => {
    const badManifestFetcher = vi.fn().mockResolvedValue(jsonResponse({ ...validManifest, schemaVersion: 2 }));
    await expect(loadPublicManifest({ fetcher: badManifestFetcher })).rejects.toThrow(/schemaVersion/);

    resetPublicDataCache();
    const badBookFetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(validManifest))
      .mockResolvedValueOnce(jsonResponse({ ...validGenesis, bookId: "Exod" }));
    await expect(loadPublicBook("Gen", { fetcher: badBookFetcher })).rejects.toThrow(/book payload/i);
  });

  it("loads and caches the search index from the manifest URL", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(validManifest))
      .mockResolvedValueOnce(jsonResponse(validSearchIndex));

    const [first, second] = await Promise.all([
      loadPublicSearchIndex({ fetcher }),
      loadPublicSearchIndex({ fetcher }),
    ]);

    expect(first).toBe(second);
    expect(first).toEqual(validSearchIndex);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith("/data/search-index.json");
  });

  it("rejects malformed search entries and retries after search failure", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(validManifest))
      .mockRejectedValueOnce(new Error("search offline"))
      .mockResolvedValueOnce(jsonResponse([{ ...validSearchIndex[0], chapter: 0 }]))
      .mockResolvedValueOnce(jsonResponse(validSearchIndex));

    await expect(loadPublicSearchIndex({ fetcher })).rejects.toThrow("search offline");
    await expect(loadPublicSearchIndex({ fetcher })).rejects.toThrow(/chapter/);
    await expect(loadPublicSearchIndex({ fetcher })).resolves.toEqual(validSearchIndex);
  });

  it("emits metadata-only structured success logs", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(validManifest))
      .mockResolvedValueOnce(jsonResponse(validGenesis));

    await loadPublicBook("Gen", { fetcher });

    const event = info.mock.calls.find(([message]) => message === "[public-data] book load succeeded");
    expect(event?.[1]).toMatchObject({
      bookId: "Gen",
      textCardCount: 1,
      cuvVerseCount: 1,
      kjvVerseCount: 1,
    });
    const serializedLogs = JSON.stringify(info.mock.calls);
    expect(serializedLogs).not.toContain("private card body");
    expect(serializedLogs).not.toContain("In the beginning");
    expect(serializedLogs).not.toContain("/Users/");
    expect(serializedLogs).not.toContain("/data/books/Gen.json");
  });
});

describe("loadBibleLibrary compatibility adapter", () => {
  beforeEach(() => {
    resetPublicDataCache();
  });

  it("converts an active public book payload into CUV and KJV versions", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse(validManifest))
      .mockResolvedValueOnce(jsonResponse(validGenesis));

    const result = await loadBibleLibrary("Gen", { fetcher });

    expect(result).toEqual(publicBookToBibleVersions(validGenesis));
    expect(result.cuvBible).toMatchObject({ id: "cuv", label: "和合本", language: "zh" });
    expect(result.kjvBible).toMatchObject({ id: "kjv", label: "KJV", language: "en" });
  });
});
