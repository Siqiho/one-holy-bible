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
  "study-bible-jer-1-1-p007-n013",
  "study-bible-jer-1-18-p008-n025",
  "study-bible-jer-3-8-p012-n070",
  "study-bible-jer-3-16-p013-n069",
  "study-bible-jer-17-7-p035-n243",
  "study-bible-jer-17-26-p059-n608",
  "study-bible-jer-23-10-p043-n299",
  "study-bible-jer-25-1-p045-n434",
  "study-bible-jer-25-19-p046-n447",
  "study-bible-jer-33-2-p059-n619",
  "study-bible-jer-36-4-p062-n649",
  "study-bible-jer-45-5-p074-n779",
  "study-bible-jer-49-1-p080-n576",
  "study-bible-jer-51-44-p088-n938",
];

const forbiddenFragments = [
  "见彼",
  "《和大的君王",
  "×本书31:9732",
  "慈爱造约柜",
  "好的益",
  "S见本书17:26",
  "英果400",
  "埃及的属",
  "侍户的儿子",
  "比拉克亚户",
  "保全你的性种",
  "米勒公叉",
  "服待",
  "吩附",
  "并排奔",
  "年份年份",
  "人侵",
  "约丰前",
  "待奉",
  "干早",
  "差遭",
  "差遗",
  "迎南",
  "认力是",
  "亚扣",
  "收筋复",
  "盼希望",
  "离开埃带领",
  "悔根据",
  "其他经上帝",
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

describe("Jeremiah public card audit and isolation hold-queue", () => {
  const payload = loadBook("Jer");

  it("keeps the public Jeremiah package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Jer");
    expect(payload.textCards).toHaveLength(658);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Jer");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 658, ocr: 0, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Jeremiah cards", () => {
    const ids = new Set(payload.textCards.map((card) => card.id));
    for (const id of heldStudyBible) {
      expect(ids.has(id), id).toBe(false);
    }

    const blob = payload.textCards.map((card) => `${card.title ?? ""}\n${card.body ?? ""}`).join("\n");
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

    const jeremiahIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-jer-\d/.test(id));
    expect(jeremiahIsolation).toHaveLength(1006);
    expect(jeremiahIsolation.some((id) => publicIds.has(id))).toBe(false);

    const lukeIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-luke-\d/.test(id));
    expect(lukeIsolation).toHaveLength(144);
    expect(lukeIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
