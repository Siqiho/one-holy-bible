import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { BIBLE_BOOKS } from "../domain/bibleBooks";

interface PublicCard {
  id: string;
  body?: string;
  title?: string;
  primaryAnchor?: string;
  verses?: string[];
  type?: string;
}

interface PublicBookPayload {
  bookId: string;
  textCards: PublicCard[];
}

const booksDir = resolve(__dirname, "../../public/data/books");
const isolationPath = resolve(__dirname, "../../local-audit-pack/no-explain-isolation-20260731/card候选清单.jsonl");
const johnPackDir = resolve(__dirname, "../../local-audit-pack/john-gospel-20260909");

const heldOcr = [
  "image-text-05-申命记-codex-pdf-p028-img012",
  "image-text-07-士师记-codex-pdf-p003-img001",
  "image-text-20-箴言-codex-pdf-p155-img063",
];

const forbiddenFragments = [
  "E/Elyon",
  "E/Shadday",
  "E/Ro1",
  "这些名字强调上帝的不",
  "更尊贵《来5:5-10",
  "二十—",
  "尽都毁灭口",
  "Double Blessings",
];

const expectedCounts: Record<string, number> = {
  Gen: 1134,
  Deut: 239,
  "1Chr": 70,
  Lam: 103,
  Gal: 101,
  "2Cor": 101,
  Zech: 101,
  Hos: 103,
  Dan: 92,
  Judg: 117,
  Prov: 227,
  Acts: 462,
  Matt: 430,
  Phil: 56,
  Col: 77,
  "1Thess": 61,
  "1Tim": 82,
  Jas: 78,
  "1John": 84,
};

function loadBook(bookId: string): PublicBookPayload {
  return JSON.parse(readFileSync(resolve(booksDir, `${bookId}.json`), "utf8")) as PublicBookPayload;
}

function loadJsonl(path: string): Array<Record<string, unknown>> {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function verseIdsFor(bookId: string): Set<string> {
  const book = BIBLE_BOOKS.find((item) => item.id === bookId);
  return new Set(
    (book?.verseCounts ?? []).flatMap((verseCount, chapterIndex) => (
      Array.from({ length: verseCount }, (_, verseIndex) => `${bookId}.${chapterIndex + 1}.${verseIndex + 1}`)
    )),
  );
}

describe("Genesis public card audit and isolation hold-queue", () => {
  const gen = loadBook("Gen");

  it("keeps the public Genesis package text-only, verse-mapped, and isolation-filtered", () => {
    expect(gen.bookId).toBe("Gen");
    expect(gen.textCards).toHaveLength(1134);
    expect(gen.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { cmc: 0, studyBible: 0, ocr: 0, message: 0, other: 0 };
    const genVerseIds = verseIdsFor("Gen");
    for (const card of gen.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => genVerseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("message-")) mix.message += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ cmc: 858, studyBible: 272, ocr: 1, message: 3, other: 0 });
    expect(gen.textCards.some((card) => card.id === "cmc-gen-1-1")).toBe(true);
    expect(gen.textCards.some((card) => card.id === "cmc-gen-1-3")).toBe(false);
    expect(gen.textCards.some((card) => card.id === "image-text-01-创世记-codex-pdf-p102-img057")).toBe(true);
  });

  it("does not republish isolation no-explain cards or confirmed OCR damage", () => {
    const publicIds = new Set<string>();
    const blobParts: string[] = [];
    for (const file of readdirSync(booksDir).filter((name) => name.endsWith(".json"))) {
      const payload = JSON.parse(readFileSync(resolve(booksDir, file), "utf8")) as PublicBookPayload;
      if (expectedCounts[payload.bookId] !== undefined) {
        expect(payload.textCards.length, payload.bookId).toBe(expectedCounts[payload.bookId]);
      }
      for (const card of payload.textCards) {
        publicIds.add(card.id);
        blobParts.push(`${card.title ?? ""}\n${card.body ?? ""}`);
      }
    }

    for (const id of heldOcr) {
      expect(publicIds.has(id), id).toBe(false);
    }

    const blob = blobParts.join("\n");
    for (const fragment of forbiddenFragments) {
      expect(blob.includes(fragment), fragment).toBe(false);
    }

    if (!existsSync(isolationPath)) return;
    const isolation = loadJsonl(isolationPath);
    const leaked = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => publicIds.has(id));
    expect(leaked).toEqual([]);
  });

  it("keeps John leftover hold streams out of the public package when the audit pack is present", () => {
    if (!existsSync(johnPackDir) || !existsSync(isolationPath)) return;

    const publicIds = new Set<string>();
    for (const file of readdirSync(booksDir).filter((name) => name.endsWith(".json"))) {
      const payload = JSON.parse(readFileSync(resolve(booksDir, file), "utf8")) as PublicBookPayload;
      for (const card of payload.textCards) publicIds.add(card.id);
    }

    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const qidaben = johnCards
      .filter((row) => row.source_stream === "qidaben-commentary-pilot")
      .map((row) => String(row.commentary_key));
    const hurlbut = johnCards
      .filter((row) => row.source_stream === "hurlbut-bible-story-zh-2013")
      .map((row) => String(row.commentary_key));
    const johnIsolation = loadJsonl(isolationPath)
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-john-\d/.test(id));

    expect(qidaben).toHaveLength(267);
    expect(qidaben.some((id) => publicIds.has(id))).toBe(false);
    expect(hurlbut.some((id) => publicIds.has(id))).toBe(false);
    expect(johnIsolation).toHaveLength(156);
    expect(johnIsolation.some((id) => publicIds.has(id))).toBe(false);
  });
});
