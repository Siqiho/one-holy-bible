import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { BIBLE_BOOKS } from "../domain/bibleBooks";

interface PublicJohnCard {
  id: string;
  body?: string;
  title?: string;
  primaryAnchor?: string;
  verses?: string[];
  type?: string;
}

interface PublicJohnPayload {
  bookId: string;
  textCards: PublicJohnCard[];
}

const johnBook = BIBLE_BOOKS.find((book) => book.id === "John");
const johnVerseIds = new Set(
  (johnBook?.verseCounts ?? []).flatMap((verseCount, chapterIndex) => (
    Array.from({ length: verseCount }, (_, verseIndex) => `John.${chapterIndex + 1}.${verseIndex + 1}`)
  )),
);

const heldOutOfPublic = [
  "image-text-43-约翰福音-codex-pdf-p019-img004",
  "study-bible-john-21-24-p056-n512",
  "study-bible-john-13-16-p035-n221",
  "study-bible-john-12-44-p034-n214",
  "study-bible-john-10-36-p029-n255",
];

const forbiddenFragments = [
  "昇端",
  "耶稣所的那个门徒",
  "/ogos",
  "agod",
  "Double Blessings",
  "二十—",
  "显信彰显",
  "见真的",
  "人新烈",
  "森瀝播想",
  "一样受造物是如此被造",
  "旧日约",
  "服待",
  "自已",
  "进人",
  "约輸",
  "掌捆",
  "指资",
  "差遭",
  "差遺",
  "《《圣经",
  "迎拿",
  "边拿",
  "慢子",
  "宜告了",
  "彰昆",
  "霞惊",
  "14:20h本书",
  "宜告",
  "待奉",
  "通迫",
  "短吾",
  "就以是侍",
  "落人罗马",
  "约瀚",
  "67年\"）",
];

function loadPublicJohn(): PublicJohnPayload {
  return JSON.parse(readFileSync(resolve(__dirname, "../../public/data/books/John.json"), "utf8")) as PublicJohnPayload;
}

function loadJsonl(path: string): Array<Record<string, unknown>> {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("John gospel public card audit", () => {
  const payload = loadPublicJohn();

  it("keeps the public John package text-only and verse-mapped", () => {
    expect(payload.bookId).toBe("John");
    expect(payload.textCards).toHaveLength(409);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length).toBeGreaterThan(0);
      expect(anchors.every((anchor) => johnVerseIds.has(anchor))).toBe(true);
    }
  });

  it("does not republish confirmed hold or garbage cards", () => {
    const ids = new Set(payload.textCards.map((card) => card.id));
    for (const id of heldOutOfPublic) {
      expect(ids.has(id)).toBe(false);
    }

    const blob = payload.textCards.map((card) => `${card.title ?? ""}\n${card.body ?? ""}\n${card.summary ?? ""}\n${card.searchText ?? ""}`).join("\n");
    for (const fragment of forbiddenFragments) {
      expect(blob.includes(fragment)).toBe(false);
    }
  });

  it("keeps ledger isolation streams out of the public John package when the audit pack is present", () => {
    const packDir = resolve(__dirname, "../../local-audit-pack/john-gospel-20260909");
    const isolationPath = resolve(__dirname, "../../local-audit-pack/no-explain-isolation-20260731/card候选清单.jsonl");
    if (!existsSync(packDir) || !existsSync(isolationPath)) {
      return;
    }

    const publicIds = new Set(payload.textCards.map((card) => card.id));
    const cards = loadJsonl(resolve(packDir, "card候选清单.jsonl"));
    const isolation = loadJsonl(isolationPath);

    const qidaben = cards
      .filter((row) => row.source_stream === "qidaben-commentary-pilot")
      .map((row) => String(row.commentary_key));
    const hurlbut = cards
      .filter((row) => row.source_stream === "hurlbut-bible-story-zh-2013")
      .map((row) => String(row.commentary_key));
    const johnIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-john-\d/.test(id));

    expect(qidaben.some((id) => publicIds.has(id))).toBe(false);
    expect(hurlbut.some((id) => publicIds.has(id))).toBe(false);
    expect(johnIsolation.some((id) => publicIds.has(id))).toBe(false);
    expect(johnIsolation).toHaveLength(156);
  });
});
