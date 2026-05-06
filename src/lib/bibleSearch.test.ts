import { describe, expect, it } from "vitest";
import { cuvGenesis1, kjvGenesis1, sampleResources } from "../data/sampleLibrary";
import { searchBibleText } from "./bibleSearch";

describe("searchBibleText", () => {
  it("searches Chinese and KJV Bible text", () => {
    expect(searchBibleText([cuvGenesis1, kjvGenesis1], "created")).toEqual([
      {
        verseId: "Gen.1.1",
        versionId: "kjv",
        versionLabel: "KJV",
        text: "In the beginning God created the heaven and the earth.",
      },
    ]);
  });

  it("does not search resource bodies", () => {
    expect(sampleResources[0].body).toContain("宇宙");
    expect(searchBibleText([cuvGenesis1, kjvGenesis1], "宇宙")).toEqual([]);
  });
});
