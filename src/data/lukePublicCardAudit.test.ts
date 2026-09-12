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
  "study-bible-luke-1-48-p011-n040",
  "study-bible-luke-2-11-p016-n055",
  "study-bible-luke-2-21-p016-n071",
  "study-bible-luke-3-8-p018-n083",
  "study-bible-luke-4-23-p022-n136",
  "study-bible-luke-4-34-p023-n144",
  "study-bible-luke-7-47-p031-n196",
  "study-bible-luke-9-14-p036-n321",
  "study-bible-luke-9-44-p036-n238",
  "study-bible-luke-10-28-p041-n307",
  "study-bible-luke-15-7-p052-n529",
  "study-bible-luke-15-8-p052-n385",
  "study-bible-luke-16-9-p053-n398",
  "study-bible-luke-16-13-p054-n404",
  "study-bible-luke-16-24-p055-n558",
  "study-bible-luke-19-1-p060-n465",
  "study-bible-luke-19-46-p042-n325",
  "study-bible-luke-21-36-p042-n423",
  "study-bible-luke-22-44-p042-n319",
  "study-bible-luke-22-45-p069-n550",
  "study-bible-luke-23-2-p071-n566",
  "study-bible-luke-23-15-p072-n575",
  "study-bible-luke-23-24-p072-n787",
  "study-bible-luke-23-46-p073-n808",
  "study-bible-luke-23-47-p074-n586",
  "study-bible-luke-24-6-p074-n822",
  "study-bible-luke-intro-p003-n008",
];

const forbiddenFragments = [
  "使人想到路",
  "就是主上帝自",
  "关于耶稣洞悉人",
  "他带着圣",
  "认为自的人",
  "10天的工",
  "12h［见22节］",
  "进行直",
  "农业灌溉",
  "使他们有力",
  "一论是",
  "和46 修",
  "身心俱",
  "三项控畢",
  "彼拉多和希律都同意耶稣是无",
  "满足了仇恨耶稣的人",
  "约有五干",
  "见约6:10-1",
  "差遭",
  "旧日约",
  "约輸",
  "得攀赦免",
  "天围",
  "一眼泪",
  "菜耀",
  "撒迎利亚",
  "恳珠",
  "客西马尼層",
  "福人，音书",
  "隐罗结",
  "事工类型 耶稣 彼得 保罗",
  "29eYRE",
  "整雀特工",
  "称土马",
  "犯畢",
  "受诱惑犯畢",
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

type SixSourceMix = {
  cmc: number;
  study: number;
  qidaben: number;
  ocr: number;
  hurlbut: number;
  info: number;
  other: number;
};

function emptySixSourceMix(): SixSourceMix {
  return { cmc: 0, study: 0, qidaben: 0, ocr: 0, hurlbut: 0, info: 0, other: 0 };
}

function bumpSixSource(mix: SixSourceMix, id: string): void {
  if (id.startsWith("cmc-")) mix.cmc += 1;
  else if (id.startsWith("study-bible-")) mix.study += 1;
  else if (id.startsWith("qidaben-")) mix.qidaben += 1;
  else if (id.startsWith("image-text-")) mix.ocr += 1;
  else if (id.startsWith("hurlbut-")) mix.hurlbut += 1;
  else if (id.startsWith("message-")) mix.info += 1;
  else mix.other += 1;
}

function verseIdsFor(bookId: string): Set<string> {
  const book = BIBLE_BOOKS.find((item) => item.id === bookId);
  return new Set(
    (book?.verseCounts ?? []).flatMap((verseCount, chapterIndex) => (
      Array.from({ length: verseCount }, (_, verseIndex) => `${bookId}.${chapterIndex + 1}.${verseIndex + 1}`)
    )),
  );
}

describe("Luke public card audit and isolation hold-queue", () => {
  const payload = loadBook("Luke");

  it("keeps the public Luke package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Luke");
    expect(payload.textCards).toHaveLength(531);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Luke");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 531, ocr: 0, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Luke cards", () => {
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

    const lukeIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-luke-\d/.test(id));
    expect(lukeIsolation).toHaveLength(144);
    expect(lukeIsolation.some((id) => publicIds.has(id))).toBe(false);

    const isaiahIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-isa-\d/.test(id));
    expect(isaiahIsolation).toHaveLength(947);
    expect(isaiahIsolation.some((id) => publicIds.has(id))).toBe(false);

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

  it("reconciles the six public source streams without lifting held classes", () => {
    const publicMix = emptySixSourceMix();
    for (const file of readdirSync(booksDir).filter((name) => name.endsWith(".json"))) {
      const book = JSON.parse(readFileSync(resolve(booksDir, file), "utf8")) as PublicBookPayload;
      for (const card of book.textCards) {
        bumpSixSource(publicMix, card.id);
      }
    }
    expect(publicMix).toEqual({ cmc: 858, study: 9092, qidaben: 0, ocr: 146, hurlbut: 0, info: 3, other: 0 });
    expect(publicMix.cmc + publicMix.study + publicMix.ocr + publicMix.info).toBe(10099);

    const isolationMix = emptySixSourceMix();
    for (const row of loadJsonl(isolationPath)) {
      bumpSixSource(isolationMix, String(row.commentary_key ?? ""));
    }
    expect(isolationMix).toEqual({ cmc: 18387, study: 10, qidaben: 0, ocr: 0, hurlbut: 0, info: 0, other: 0 });

    if (!existsSync(johnPackDir)) return;
    const johnMix = emptySixSourceMix();
    for (const row of loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"))) {
      bumpSixSource(johnMix, String(row.commentary_key ?? ""));
    }
    expect(johnMix).toEqual({ cmc: 765, study: 495, qidaben: 267, ocr: 1, hurlbut: 5, info: 0, other: 0 });
    expect(johnMix.cmc + johnMix.study + johnMix.qidaben + johnMix.ocr + johnMix.hurlbut).toBe(1533);
  });
});
