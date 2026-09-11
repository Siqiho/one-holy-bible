import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import doreChapterArtwork from "./generated/doreChapterArtwork.json";
import { getBibleBook } from "../domain/bibleBooks";
import type { DoreChapterArtworkPayload } from "./doreChapterArtwork";

const payload = doreChapterArtwork as DoreChapterArtworkPayload;
const publicDir = path.resolve(__dirname, "..", "..", "public");

describe("doreChapterArtwork generated data", () => {
  it("maps every entry to a valid canonical book and chapter", () => {
    expect(payload.entries.length).toBeGreaterThan(150);
    for (const entry of payload.entries) {
      const book = getBibleBook(entry.book);
      expect(book, `unknown book ${entry.book} (plate ${entry.page})`).toBeDefined();
      expect(entry.chapter, `plate ${entry.page}`).toBeGreaterThanOrEqual(1);
      expect(entry.chapter, `${entry.book} plate ${entry.page}`).toBeLessThanOrEqual(book!.chapterCount);
    }
  });

  it("keeps at most one plate per chapter", () => {
    const keys = payload.entries.map((entry) => `${entry.book}.${entry.chapter}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("points every entry at an existing downscaled image", () => {
    for (const entry of payload.entries) {
      expect(entry.assetPath).toMatch(/^\/resources\/dore\/\d{3}_[1-3]?[A-Za-z]+\.\d+\.jpg$/);
      expect(existsSync(path.join(publicDir, entry.assetPath.slice(1))), entry.assetPath).toBe(true);
    }
  });
});
