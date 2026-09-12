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

const heldStudyBible: string[] = [];

const forbiddenFragments = [
  "撒迎利亚提到了",
  "是迎得支派居住的地方",
  "位于迎得的北疆",
  "人侵的敌军就可进人城里",
  "将要被遺回最早的居住地",
  "见饿12-14节",
  "全体百姓大概不是指全国百姓",
  "只有极少数的\"余民\"得以见5:3",
  "表达上帝无限的大上帝是一位",
  "创造天地的一耶和华万军之上帝",
  "想到她正在卖身妓，",
  "对政府而言〝行公平*",
  "建有城墻的城色都有带顶的门楼",
  "后来这日子被描述列国将要受审判",
  "整个所谓的\"肥沃月弯\"",
  "看不到他们需要悔",
  "就必须避循自然的法则",
  "（《和修》\"罗底巴和角",
  "缴纳给王的衣作物",
  "又发生的菜（《和修》\"春天作物》，",
  "如果这些作物收，来年就没有什么粮食可吃了",
  "改变心意）和阿摩司一样",
  "所有几女都将死亡",
  "《和修》作\"践踏），",
  "另见9:5。1:59:8×［4节］",
  "见8:8及韭料",
  "耶和华的目子",
  "对这个主题的最后宣",
  "这里\"得各个称为我名下的国，",
  "\"所有…的国\"《即外邦人）",
  "并聚挽起来压榨做酒",
  "这蝠充满诗意的美丽画面",
  "指明这哥亚牧人",
  "阿摩司的个人是\"提信息",
  "自己原本而是\"牧人",
  "富裕和繁菜",
  "新\"黄时代\"开始",
  "北国以色列前，便在主前722年灭亡了",
  "第一组出现在12-2:16",
  "但他们竞然违犯了",
  "你们……珊母牛的啊",
  "在\"地上万族中\"\"，上帝只",
  "\"职和华的日子\"",
  "奇妙拯救的日而是他们",
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

describe("Amos public card audit and isolation hold-queue", () => {
  const payload = loadBook("Amos");

  it("keeps the public Amos package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Amos");
    expect(payload.textCards).toHaveLength(76);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Amos");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 75, ocr: 1, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Amos cards", () => {
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

    const amosIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-amos-\d/.test(id));
    expect(amosIsolation).toHaveLength(93);
    expect(amosIsolation.some((id) => publicIds.has(id))).toBe(false);

    const songIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-song-\d/.test(id));
    expect(songIsolation).toHaveLength(66);
    expect(songIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
