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

const heldStudyBible = [
  "study-bible-exod-3-14-p010-n039",
  "study-bible-exod-5-2-p013-n061",
  "study-bible-exod-7-13-p016-n085",
  "study-bible-exod-7-14-p012-n052",
  "study-bible-exod-9-7-p012-n049",
  "study-bible-exod-14-5-p012-n056",
  "study-bible-exod-15-13-p028-n155",
  "study-bible-exod-20-3-p034-n259",
  "study-bible-exod-20-7-p034-n258",
  "study-bible-exod-21-1-p035-n268",
  "study-bible-exod-intro-p002-n006",
];

const forbiddenFragments = [
  "音译巍",
  "我是语1am",
  "英语|willbe",
  "并不识\"上帝",
  "（《和》\"固执\"）7:22",
  "硬着心\"）9:12",
  "改变了心意\"）14:8",
  "所救赎的\"，这个",
  "特定红",
  "以经祀",
  "敬拜占帝",
  "敬拜可硬着心",
  "证实《的记载",
  "以色圣经",
  "旧日约",
  "迎南",
  "试採",
  "准备好进人",
  "亚伦进人",
  "自已",
  "吩附",
  "蟾养",
  "长券",
  "环书",
  "刧没有",
  "人一起贪念",
  "《《圣经",
  "但是上那些",
  "是上帝的作",
  "摩西生平的三个阶段",
  "法老的心变刚硬宣告",
  "占为已有",
  "莱耀",
  "上：帝",
  "利已",
  "混人异教",
];

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

describe("Exodus public card audit and isolation hold-queue", () => {
  const payload = loadBook("Exod");

  it("keeps the public Exodus package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Exod");
    expect(payload.textCards).toHaveLength(204);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Exod");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 198, ocr: 6, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Exodus cards", () => {
    const ids = new Set(payload.textCards.map((card) => card.id));
    for (const id of heldStudyBible) {
      expect(ids.has(id), id).toBe(false);
    }

    const blob = payload.textCards.map((card) => `${card.title ?? ""}\n${card.body ?? ""}\n${card.summary ?? ""}\n${card.searchText ?? ""}`).join("\n");
    for (const fragment of forbiddenFragments) {
      expect(blob.includes(fragment), fragment).toBe(false);
    }
  });

  it("keeps isolation CMC and John leftover streams out of the public package when audit packs are present", () => {
    if (!existsSync(isolationPath)) return;

    const publicIds = new Set<string>();
    for (const file of readdirSync(booksDir).filter((name) => name.endsWith(".json"))) {
      const book = JSON.parse(readFileSync(resolve(booksDir, file), "utf8")) as PublicBookPayload;
      for (const card of book.textCards) publicIds.add(card.id);
    }

    const isolation = loadJsonl(isolationPath);
    const leaked = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => publicIds.has(id));
    expect(leaked).toEqual([]);

    const exodIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-exod-\d/.test(id));
    expect(exodIsolation).toHaveLength(716);
    expect(exodIsolation.some((id) => publicIds.has(id))).toBe(false);

    const samIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-1sam-\d/.test(id));
    expect(samIsolation).toHaveLength(578);
    expect(samIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
