import { describe, expect, it } from "vitest";

import { loadBibleLibrary } from "./loadBibleLibrary";

describe("loadBibleLibrary complete development library", () => {
  it("loads all 66 books for both Bible versions from the generated development library", async () => {
    const library = await loadBibleLibrary();

    expect(library.cuvBible.verses).toHaveLength(31_102);
    expect(library.kjvBible.verses).toHaveLength(31_102);
    expect(new Set(library.cuvBible.verses.map((verse) => verse.book))).toHaveLength(66);
    expect(new Set(library.kjvBible.verses.map((verse) => verse.book))).toHaveLength(66);
    expect(library.cuvBible.verses.at(-1)?.id).toBe("Rev.22.21");
    expect(library.kjvBible.verses.at(-1)?.id).toBe("Rev.22.21");
  });

  it("reuses the same in-flight library promise", () => {
    expect(loadBibleLibrary()).toBe(loadBibleLibrary());
  });
});
