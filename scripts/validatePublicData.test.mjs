import { describe, expect, it } from "vitest";

import { validatePublicData } from "./validatePublicData.mjs";

describe("checked-in v0.2.0 public data", () => {
  it("contains the 66-book scripture, text-card, and image-card snapshot", async () => {
    await expect(validatePublicData("public/data")).resolves.toMatchObject({
      books: 66,
      cuvVerseCount: 31102,
      kjvVerseCount: 31102,
      textCardCount: 10963,
      imageCardCount: 2705,
      uniqueAssetCount: 2515,
    });
  });
});
