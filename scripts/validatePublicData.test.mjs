import { describe, expect, it } from "vitest";

import { validatePublicData } from "./validatePublicData.mjs";

describe("checked-in v0.3.0 public data", () => {
  it("contains the 66-book scripture, text-card, and image-card snapshot", async () => {
    await expect(validatePublicData("public/data")).resolves.toMatchObject({
      releaseVersion: "0.3.0",
      doreArtworkCount: 178,
      books: 66,
      cuvVerseCount: 31102,
      kjvVerseCount: 31102,
      textCardCount: 16092,
      imageCardCount: 2927,
      uniqueAssetCount: 2735,
    });
  });
});
