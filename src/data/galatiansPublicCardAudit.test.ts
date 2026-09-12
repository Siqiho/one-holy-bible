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
  "study-bible-gal-1-18-p006-n031-2-2-2",
  "study-bible-gal-2-16-p008-n033",
  "study-bible-gal-2-18-p008-n050",
  "study-bible-gal-6-18-p016-n146",
  "study-bible-gal-intro-p002-n005",
  "study-bible-gal-intro-p002-n006",
];

const forbiddenFragments = [
  "第一次9:26-30拿巴在耶到访耶路撒冷",
  "新约时期对基督徒和摩西律法的各种见解",
  "证明自己是违犯律法的人7",
  "并祈求基督和圣灵赐恩给",
  "见《圣经文主后：3035404550556065707580",
  "成为所有基督徒的赎命的全新国度",
  "奉差遛的人",
  "陷人混乱",
  "上帝主他的选民以色列人",
  "（《和修》\"信仰指基督信仰",
  "外邦基督徒避守犹太人的饮食条例",
  "仍旧日是罪人",
  "还被视为罪述了外邦人",
  "律法原不本平信",
  "必须完全遵\"行律，这是人永远无法做到的",
  "上帝规是一位",
  "都被收养进人上帝的家中",
  "使女（或译：女奴） 自主之妇人",
  "将遵行太教礼仪律法的信徒",
  "十字架的道理宜告",
  "爱人如已",
  "正被引导7",
  "加拉太的各知的加拉太人",
  "无可回的地步",
  "包含问安、正劝勉、问候和祝福",
  "就们随从\"别的福音\"",
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

describe("Galatians public card audit and isolation hold-queue", () => {
  const payload = loadBook("Gal");

  it("keeps the public Galatians package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Gal");
    expect(payload.textCards).toHaveLength(101);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Gal");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 101, ocr: 0, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Galatians cards", () => {
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

    const galIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-gal-\d/.test(id));
    expect(galIsolation).toHaveLength(25);
    expect(galIsolation.some((id) => publicIds.has(id))).toBe(false);

    const lamIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-lam-\d/.test(id));
    expect(lamIsolation).toHaveLength(125);
    expect(lamIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
