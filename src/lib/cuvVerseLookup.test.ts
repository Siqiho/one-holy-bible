import { describe, expect, it } from "vitest";
import { createVerseTextLookup, lookupVerseText } from "./cuvVerseLookup";

describe("createVerseTextLookup", () => {
  it("indexes verse text by id for hover previews", () => {
    const lookup = createVerseTextLookup([
      { id: "Gen.1.1", text: "起初 神创造天地。" },
      { id: "John.1.1", text: "太初有道，道与神同在，道就是神。" },
      { id: "Deut.32.15", text: "但耶书仑渐渐肥胖，粗壮，光润，踢跳，奔跑，便离弃造他的神，轻看救他的磐石。" },
    ]);

    expect(lookupVerseText(lookup, "Gen.1.1")).toBe("起初 神创造天地。");
    expect(lookupVerseText(lookup, "John.1.1")).toContain("太初有道");
    expect(lookupVerseText(lookup, "Deut.32.15")).toContain("耶书仑");
    expect(lookupVerseText(lookup, "Eph.6.12")).toBeUndefined();
    expect(lookupVerseText(null, "Gen.1.1")).toBeUndefined();
  });
});
