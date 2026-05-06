import { describe, expect, it } from "vitest";

import { cuvGenesis1, kjvGenesis1, sampleResources } from "./sampleLibrary";

describe("sample Genesis data", () => {
  it("includes Genesis 1:1-1:3 in CUV and KJV", () => {
    const sampleBibleVerses = [
      ...cuvGenesis1.verses.map((verse) => ({ ...verse, version: "CUV" })),
      ...kjvGenesis1.verses.map((verse) => ({ ...verse, version: "KJV" })),
    ];
    expect(sampleBibleVerses).toHaveLength(6);
    expect(sampleBibleVerses.map((verse) => `${verse.version}:${verse.id}`)).toEqual([
      "CUV:Gen.1.1",
      "CUV:Gen.1.2",
      "CUV:Gen.1.3",
      "KJV:Gen.1.1",
      "KJV:Gen.1.2",
      "KJV:Gen.1.3",
    ]);
    expect(sampleBibleVerses.find((verse) => verse.version === "CUV")?.text).toContain("起初");
    expect(sampleBibleVerses.find((verse) => verse.version === "KJV")?.text).toContain("In the beginning");
  });

  it("includes sample resources linked to Genesis verses", () => {
    expect(sampleResources.length).toBeGreaterThanOrEqual(2);
    expect(sampleResources.flatMap((resource) => resource.verses)).toContain("Gen.1.1");
  });
});
