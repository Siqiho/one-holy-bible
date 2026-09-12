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
  "study-bible-matt-3-2-p009-n031",
  "study-bible-matt-5-2-p013-n068",
  "study-bible-matt-5-9-p013-n067",
  "study-bible-matt-7-15-p015-n106",
  "study-bible-matt-8-26-p021-n168",
  "study-bible-matt-10-40-p026-n239",
  "study-bible-matt-11-13-p027-n235",
  "study-bible-matt-15-5-p036-n259",
  "study-bible-matt-15-14-p036-n339",
  "study-bible-matt-15-39-p037-n263",
  "study-bible-matt-16-18-p038-n276",
  "study-bible-matt-17-15-p040-n287",
  "study-bible-matt-19-20-p044-n415",
  "study-bible-matt-22-16-p051-n369",
  "study-bible-matt-23-23-p015-n113",
  "study-bible-matt-23-24-p054-n381",
  "study-bible-matt-23-35-p054-n514",
  "study-bible-matt-26-5-p061-n570",
  "study-bible-matt-26-41-p063-n594",
  "study-bible-matt-27-2-p065-n616",
  "study-bible-matt-27-38-p067-n642",
  "study-bible-matt-intro-p001-n002",
  "study-bible-matt-intro-p003-n008",
];

const forbiddenFragments = [
  "约輸在这人们",
  "深蝶业的夾方",
  "获秀生工餐",
  "以经文集",
  "没有腊原文apistos",
  "基督赋予他们权",
  "旧日约先知都期待基督",
  "赡养年老",
  "瞎子作瞎子的向赛人",
  "很可的另一种写法",
  "淺農帮李問",
  "医治他的儿",
  "还缺点什",
  "权力和地位",
  "以及林前",
  "忽略了律法最重要",
  "撒迎利亚是最后一个",
  "朝圣者到耶路撒冷庆祝逾越",
  "试探是指忍不住要睡觉",
  "判發期前",
  "第年员",
  "/Estes",
  "因为在70年）。",
  "意帝的儿子",
  "特妹恩典",
  "旧日约",
  "迎南人",
  "盼咐",
  "菜耀",
  "服待",
  "自已",
  "陷人》",
  "供名之作",
  "意次",
  "鸟西亚",
  "一格那丢",
  "lesous",
  "试採",
  "毫疑问",
  "风他们所",
  "巴勤斯坦",
  "登山显菜",
  "耶路撤冷",
  "主前10年主后1年10203040506070",
  "橄榄山讲24-25章",
  "9［约16:20］",
  "《I日约》",
  "迎百农",
  "固执已见",
  "爱人如已",
  "霞惊",
  "39a本书",
  "舍已",
  "节；本书1:20；［12,22节］",
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

describe("Matthew public card audit and isolation hold-queue", () => {
  const payload = loadBook("Matt");

  it("keeps the public Matthew package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Matt");
    expect(payload.textCards).toHaveLength(430);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Matt");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 430, ocr: 0, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Matthew cards", () => {
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
