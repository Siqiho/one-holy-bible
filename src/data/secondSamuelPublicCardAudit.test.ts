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
  "study-bible-2sam-1-19-p003-n011",
  "study-bible-2sam-3-27-p007-n026",
  "study-bible-2sam-4-4-p007-n050",
  "study-bible-2sam-8-1-p014-n060",
  "study-bible-2sam-9-9-p015-n070-2",
  "study-bible-2sam-11-21-p017-n112",
  "study-bible-2sam-12-11-p019-n089",
  "study-bible-2sam-13-22-p020-n147",
  "study-bible-2sam-18-4-p014-n088",
  "study-bible-2sam-19-24-p019-n085",
  "study-bible-2sam-20-3-p030-n159",
];

const forbiddenFragments = [
  "约拿单何竟在山上被杀》平行",
  "（《和修》\"城门中间",
  "SaKhra",
  "坐洛在该处的伊斯兰",
  "米特．意思是雅玛",
  "整安森業中碳",
  "恒死",
  "亚比路比设儿子",
  "大卫的兴起和失败大卫的兴起",
  "得到大卫的押沙龙被杀",
  "可能意他的事",
  "马兵七干",
  "和19:25）。《列王纪》",
  "那些妃",
  "好愍",
  "大上却",
  "受音者",
  "（《和修》\"使者\"去",
  "地位形成一个水池",
  "扫罗的王官",
  "枪的后端\"往后",
  "节「王上11:37",
  "显薯效果",
  "提垒会变重",
  "挡士墙",
  "士崩瓦解",
  "膝邻友好",
  "特的方式临到",
  "译为\"钱\"是合理",
  "所有人都能从宣言",
  "军才能",
  "亚个儿子能接任",
  "君王替卫",
  "谱系基本上是",
  "内米非波设",
  "得清净利15",
  "鸟利亚的",
  "妇11:210士9:53",
  "通好行为",
  "（《和修》\"使者）",
  "被杀死的。\n",
  "不悦〞",
  "强好了女方",
  "宠爱的长子3:2",
  "宴会很要",
  "一头骤子",
  "《利修》",
  "力阴性",
  "一面上一面哭",
  "贵怪大卫",
  "吩附他的",
  "全部以色列并",
  "与洗鲁雅是姐，",
  "太卫的姐姐",
  "亚打王哈嫩",
  "亚打战争",
  "喧晔",
  "团结全画",
  "土堆》是",
  "来自迎特",
  "量后一种",
  "因为《约》中有很多人",
  "优急",
  "升高。之歌），",
  "天赋的描",
  "因次这个时间",
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

describe("2 Samuel public card audit and isolation hold-queue", () => {
  const payload = loadBook("2Sam");

  it("keeps the public 2 Samuel package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("2Sam");
    expect(payload.textCards).toHaveLength(147);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("2Sam");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 145, ocr: 2, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage 2 Samuel cards", () => {
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

    const samIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-2sam-\d/.test(id));
    expect(samIsolation).toHaveLength(495);
    expect(samIsolation.some((id) => publicIds.has(id))).toBe(false);

    const jobIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-job-\d/.test(id));
    expect(jobIsolation).toHaveLength(848);
    expect(jobIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
