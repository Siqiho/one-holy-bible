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
  summary?: string;
  searchText?: string;
}

interface PublicBookPayload {
  bookId: string;
  textCards: PublicCard[];
}

const booksDir = resolve(__dirname, "../../public/data/books");
const isolationPath = resolve(__dirname, "../../local-audit-pack/no-explain-isolation-20260731/card候选清单.jsonl");
const johnPackDir = resolve(__dirname, "../../local-audit-pack/john-gospel-20260909");

const heldStudyBible = [
  "study-bible-eccl-1-15-p006-n017",
  "study-bible-eccl-3-8-p007-n036",
  "study-bible-eccl-4-12-p008-n036",
  "study-bible-eccl-7-7-p010-n056",
];

const forbiddenFragments = [
  "因为上帝没有把全部答案都",
  "某些情况下22",
  "甚至大于非常宝贵",
  "敲诈（见利",
  "宇面意力",
  "\"烟等\"",
  "喻愆",
  "无休小的",
  "寻求明智慧",
  "抓住愚昧》",
  "进人人的",
  "美好的裔油",
  "鼓欧降低",
  "多个须域",
  "必能得奢",
  "供名作品",
  "例伯来文后来",
  "怀看感恩",
  "良善的思赐",
  "hebe/",
  "传道者文旧约寻求",
  "也所有赐福",
  "译自英文astes",
  "Ecclesi-然而",
  "似\"集乎",
  "自称\"了大智慧",
  "那\"一位者\"",
  "关键主题〞",
  "特别是华\"的",
  "敬畏耶和从",
  "领受从上帝而来的6.",
  "\"义人不单",
  "写在他的脸一样",
  "\"强过\"\"美\"",
  "\"参透\"发现\"",
  "\"虚空\"'.",
  "克去邪恶（《和修》",
  "能使除去痛苦）",
  "《〈旧约》中的救恩历史",
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

describe("Ecclesiastes public card audit and isolation hold-queue", () => {
  const payload = loadBook("Eccl");

  it("keeps the public Ecclesiastes package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Eccl");
    expect(payload.textCards).toHaveLength(54);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Eccl");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 51, ocr: 3, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Ecclesiastes cards", () => {
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

    const ecclIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-eccl-\d/.test(id));
    expect(ecclIsolation).toHaveLength(162);
    expect(ecclIsolation.some((id) => publicIds.has(id))).toBe(false);

    const joelIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-joel-\d/.test(id));
    expect(joelIsolation).toHaveLength(51);
    expect(joelIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
