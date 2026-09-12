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
  "study-bible-deut-1-6-p006-n012",
  "study-bible-deut-5-11-p015-n088",
  "study-bible-deut-9-7-p020-n133",
  "study-bible-deut-12-15-p024-n179",
  "study-bible-deut-19-13-p031-n282",
  "study-bible-deut-21-1-p032-n318",
  "study-bible-deut-23-17-p035-n265",
  "study-bible-deut-26-12-p037-n352",
  "study-bible-deut-29-18-p042-n309",
  "study-bible-deut-intro-p001-n003",
  "study-bible-deut-intro-p002-n005",
];

const forbiddenFragments = [
  "他与时候",
  "属性和动机归给上帝（就像",
  "坐驗奈",
  "最黃奶除",
  "那里的恶……除掉\"",
  "应许之地被玷",
  "这是严格禁止",
  "捐十分之一的那年，见14:28-29",
  "以算祖众包",
  "右表概括了古代条约的结构",
  "寻求上帝百的福祉",
  "旧日约",
  "迎南",
  "盼咐",
  "盼附",
  "诚命",
  "进人",
  "陷人",
  "重蹈辙",
  "避守",
  "睹示",
  "觖乏",
  "术柜",
  "注祥",
  "援受",
  "迎得",
  "亚打",
  "亚扣",
  "初熟士产",
  "重中",
  "第且是",
  "第了节",
  "路48",
  "21淮",
  "不可好淫",
  "劝诚",
  "以列人",
  "懞.25节",
  "用来罪的",
  "规改邊有隻準間金業器",
  "《《圣概述》",
  "干早地带",
  "《和修》注\"低地是继续",
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

describe("Deuteronomy public card audit and isolation hold-queue", () => {
  const payload = loadBook("Deut");

  it("keeps the public Deuteronomy package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Deut");
    expect(payload.textCards).toHaveLength(239);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Deut");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 233, ocr: 6, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Deuteronomy cards", () => {
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

    const deutIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-deut-\d/.test(id));
    expect(deutIsolation).toHaveLength(684);
    expect(deutIsolation.some((id) => publicIds.has(id))).toBe(false);

    const markIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-mark-\d/.test(id));
    expect(markIsolation).toHaveLength(280);
    expect(markIsolation.some((id) => publicIds.has(id))).toBe(false);

    const isaIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-isa-\d/.test(id));
    expect(isaIsolation).toHaveLength(947);
    expect(isaIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
