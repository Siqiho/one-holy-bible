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
  "将水远",
  "太老们",
  "性行力",
  "已经酒去",
  "无宰受刑",
  "道责作假见证",
  "门徒员性",
  "生来膳眼",
  "满有良普",
  "整卷《徒行传》",
  "得罪们的主",
  "使用腊文）",
  "这个词（腊原文",
  "主人体，公是",
  "这里的腊原文",
  "因行为称（",
  "（教养…的人》",
  "拣选了我们》和其他",
  "多罗买的儿子\"》",
  "\"现在\"》，表明",
  "以色列记》人",
  "《创世前几章",
  "五句节",
  "圣吴",
  "察乡",
  "排尼基",
  "后餅",
  "干万人",
  "宜称",
  "好儿里",
  "儿个墓室",
  "参后21:27",
  "流人加利利",
  "目已",
  "膜责",
  "壁宛",
  "l0Culi",
  "干代，",
  "审判的目子",
  "宜认的信仰",
  "诗赛43:3",
  "后1:17.19:10.22:8",
  "21：.4",
  "太11：.27",
  "林前11：.9",
  "51：.64",
  "坐船刦",
  "以色列才民",
  "骆驼果要",
  "提后3！1",
  "约14.：27",
  "代上11.：1",
  "弗1.：13",
  "林后1.：1",
  "何4.：1",
  "哀1.：19",
  "该1.：10",
  "参来1.：14",
  "见1.：1",
  "和1.：12",
  "51.：14",
  "（1.：12-18）",
  "22」39",
  "凡有血气的的预言",
  "伺候的的妇人",
  "仗赖的的希伯来文",
  "踹葡萄的的人",
  "理解的的枝子",
  "掳来的的诱惑",
  "最后几位旧知",
  "不再知说话",
  "犹9节：后12",
  "列国中说各种语言的人\"中出来",
  "罪摩和过犯",
  "可僧的",
  "就不再谤了",
  "扶行教会纪律",
  "（《和修》\"他同胞》",
  "（《和修》\"翘角》",
  "（《和修》\"已蒙洁净》",
  "（《和修》\"火的城墙》",
  "崇拜行力",
  "一万他他连得",
  "他他所有的家人",
  "（《和修》至圣所》",
  "（徒行传讲道集》",
  "（《和修》\"有话说\"\"）",
  "（《和修》\"祸哉）",
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
