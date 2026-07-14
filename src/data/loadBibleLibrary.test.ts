import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadPublicBook } from "./publicBibleData";
import type { PublicBookPayload } from "./publicData";
import { loadBibleLibrary, publicBookToBibleVersions } from "./loadBibleLibrary";

vi.mock("./publicBibleData", () => ({
  loadPublicBook: vi.fn(),
}));

const genesisPayload: PublicBookPayload = {
  schemaVersion: 1,
  bookId: "Gen",
  cuvVerses: [{ id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "起初，神创造天地。" }],
  kjvVerses: [{ id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "In the beginning God created." }],
  textCards: [],
};

const mockLoadPublicBook = vi.mocked(loadPublicBook);

describe("loadBibleLibrary public compatibility adapter", () => {
  beforeEach(() => {
    mockLoadPublicBook.mockReset().mockResolvedValue(genesisPayload);
  });

  it("loads Genesis by default through the public per-book loader", async () => {
    const library = await loadBibleLibrary();

    expect(mockLoadPublicBook).toHaveBeenCalledWith("Gen", {});
    expect(library.cuvBible).toEqual({ id: "cuv", label: "和合本", language: "zh", verses: genesisPayload.cuvVerses });
    expect(library.kjvBible).toEqual({ id: "kjv", label: "KJV", language: "en", verses: genesisPayload.kjvVerses });
  });

  it("converts a public book payload without importing a private generated library", () => {
    expect(publicBookToBibleVersions(genesisPayload)).toMatchObject({
      cuvBible: { id: "cuv", verses: genesisPayload.cuvVerses },
      kjvBible: { id: "kjv", verses: genesisPayload.kjvVerses },
    });
  });
});
