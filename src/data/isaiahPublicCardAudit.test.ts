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
  "study-bible-isa-1-1-p008-n025",
  "study-bible-isa-7-20-p019-n088",
  "study-bible-isa-8-2-p019-n109",
  "study-bible-isa-14-1-p028-n196",
  "study-bible-isa-21-10-p036-n193",
  "study-bible-isa-24-5-p039-n218",
  "study-bible-isa-27-13-p043-n259",
  "study-bible-isa-30-1-p047-n397",
  "study-bible-isa-36-4-p055-n346",
  "study-bible-isa-44-24-p070-n457",
  "study-bible-isa-47-11-p074-n691",
  "study-bible-isa-47-14-p074-n487",
  "study-bible-isa-53-2-p081-n768",
  "study-bible-isa-53-4-p082-n535",
  "study-bible-isa-57-8-p086-n828",
  "study-bible-isa-59-21-p090-n598",
  "study-bible-isa-60-7-p091-n878",
  "study-bible-isa-65-5-p096-n927",
  "study-bible-isa-66-1-p098-n660",
  "study-bible-isa-intro-p001-n001",
  "study-bible-isa-intro-p003-n004",
];

const forbiddenFragments = [
  "导以赛亚时期的犹大王",
  "在位时间（主前）乌西雅（亚撒利雅）",
  "外赁（《雇",
  "脱离辱的国家",
  "和\"是同一个词",
  "阿摩俄巴底",
  "Cn以警要冷感",
  "并没有被称为\"永",
  "宣告自25:8-12",
  "各种罪恶就将接",
  "坚信上帝的应",
  "独自…帝本身",
  "以牙还牙式的仇",
  "这火毫无益",
  "心眼瞎了",
  "受苦的最终根源",
  "赤露已身秘",
  "上帝的百姓会\"），",
  "见罗我必荣耀",
  "太神圣了们所声称",
  "所设立的事物所操",
  "也赛亚书》",
  "《以赛亚书》概览第一个历史场景",
  "旧日约",
  "迎南人",
  "吩附",
  "差遭",
  "差遺",
  "自已",
  "十诚",
  "以赛业",
  "居魯士",
  "居鲁！",
  "可僧恶",
  "意力\"焰",
  "進常指",
  "巴巴巴比伦",
  "事件 经文 年份（主前）",
  "22:21］",
  "人侵",
  "莱耀",
  "官廷",
  "介人",
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

describe("Isaiah public card audit and isolation hold-queue", () => {
  const payload = loadBook("Isa");

  it("keeps the public Isaiah package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Isa");
    expect(payload.textCards).toHaveLength(454);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Isa");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 454, ocr: 0, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Isaiah cards", () => {
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

    const isaIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-isa-\d/.test(id));
    expect(isaIsolation).toHaveLength(947);
    expect(isaIsolation.some((id) => publicIds.has(id))).toBe(false);

    const mattIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-matt-\d/.test(id));
    expect(mattIsolation).toHaveLength(143);
    expect(mattIsolation.some((id) => publicIds.has(id))).toBe(false);

    const lukeIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-luke-\d/.test(id));
    expect(lukeIsolation).toHaveLength(144);
    expect(lukeIsolation.some((id) => publicIds.has(id))).toBe(false);

    const actsIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-acts-\d/.test(id));
    expect(actsIsolation).toHaveLength(543);
    expect(actsIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
