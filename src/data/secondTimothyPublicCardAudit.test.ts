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
  "study-bible-2tim-1-12-p004-n016",
  "study-bible-2tim-4-16-p009-n050",
];

const forbiddenFragments = [
  "保全他所交话我的",
  "tenparathekenmou",
  "上帝会保守保《和修》注",
  "另见靡5:18-20注",
  "在凯撒面前的初他这样做",
  "机械地把生活分灵\"和\"属世\"",
  "甚至被看力，\"属灵\"的某些事情",
  "导致他法完成使命",
  "当面责备彼得（加2:01）",
  "没有益处，和《提摩太前书》一样，这里所关教导",
  "尤指青年人特有的一欲望",
  "追求正的事情（参提前6:11-12注）",
  "对于不断圣和持守真道都是至关重要的",
  "有些解经家认，这些人既然不明白真道",
  "始祖犯罪（创了章）",
  "保的预言：在\"末后的日子\"",
  "鼓吹虚伪的克已，",
  "受苦是保罗待奉中的軍要内容",
  "只会使人陷人无意义的争论",
  "9［启22:20］",
  "能使人有得救的智感（3:15）",
  "里面的\"全部*内容",
  "这节经文通常应用士所有信徒",
  "特指顶备提摩太，便他当保罗不在时",
  "应用在特的情况中",
  "嘱附并提醒提摩太",
  "责备人，營戒人，劝勉人",
  "对保罗来说道人传讲的信息内容",
  "\"传福音者\"里和《圣经》其他书卷中",
  "太5:12,46,6:1-6,16-18,10:41-42：奖赏的行为",
  "（林12:8.9）",
  "（9节\"紧地\"赶到罗马",
  "《提摩太前、书》",
  "有许多否《提多书》是保罗著作的学者",
  "却肯定保罗是《摩太后书》的作者",
  "保罗知道自己即将离（4:6-8）",
  "这也世在情理之中",
  "《《圣经）概述》",
  "生活和侍.奉中始终听从",
  "圣主后303540455055606570经文集",
  "必须坚决抵制。1:8,12,2:3.9,3:01-12",
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

describe("2 Timothy public card audit and isolation hold-queue", () => {
  const payload = loadBook("2Tim");

  it("keeps the public 2 Timothy package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("2Tim");
    expect(payload.textCards).toHaveLength(60);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("2Tim");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 60, ocr: 0, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage 2 Timothy cards", () => {
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

    const timIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-2tim-\d/.test(id));
    expect(timIsolation).toHaveLength(21);
    expect(timIsolation.some((id) => publicIds.has(id))).toBe(false);

    const petIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-1pet-\d/.test(id));
    expect(petIsolation).toHaveLength(71);
    expect(petIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
