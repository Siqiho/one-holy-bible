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
  "study-bible-prov-8-5-p016-n092",
  "study-bible-prov-10-16-p019-n115",
  "study-bible-prov-14-9-p024-n168",
  "study-bible-prov-15-20-p026-n195",
  "study-bible-prov-intro-p003-n005",
];

const forbiddenFragments = [
  "导论：中的人物类型",
  "但然邀请",
  "带来生命》。但是，恶人得到进时",
  "所得致死（《",
  "妄人嘲笑赎愆祭",
  "《《和修",
  "芬畢滋",
  "希伯类商名響業",
  "即慧子\"",
  "藐视明的教诲",
  "耶稣基督译作\"有了\"",
  "新终作者",
  "上帝着第8章",
  "分辦敬虔",
  "道路互",
  "有染是致命",
  "自求菜耀",
  "旧日约",
  "迎南",
  "打肫",
  "愚味",
  "训海",
  "宜告自己",
  "1-章的训",
  "胖2:12",
  "创造的启，",
  "所僧恶",
  "賄赂",
  "严以律已",
  "推祟",
  "贵打孩子",
  "畢犯的同伴",
  "时主期",
  "古王注",
  "生不要回活",
  "挽救回",
  "28:109见诗",
  "强然告人",
  "因内智慧",
  "掌握著",
  "见219注",
  "21：.9",
  "《经智慧篇》",
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

describe("Proverbs public card audit and isolation hold-queue", () => {
  const payload = loadBook("Prov");

  it("keeps the public Proverbs package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Prov");
    expect(payload.textCards).toHaveLength(227);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Prov");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 194, ocr: 33, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Proverbs cards", () => {
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

    const provIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-prov-\d/.test(id));
    expect(provIsolation).toHaveLength(673);
    expect(provIsolation.some((id) => publicIds.has(id))).toBe(false);

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
