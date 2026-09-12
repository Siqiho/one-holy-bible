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
  "study-bible-mic-7-7-p012-n103",
];

const forbiddenFragments = [
  "弥迎与3-4节描述的不忠实的描述的那种守望者",
  "动词的不同形式。我……要等候",
  "上帝的审判利毁灭的范围极广",
  "延及（《和修》\"蔓延到），",
  "1:3帝将要\"降临\"",
  "他发出的\"灾祸*已经临到",
  "给他们提供收人来源",
  "占领迎南地",
  "夺取弱势群体的士地和财产",
  "在希伯来原文中，和华\"是\"他\"",
  "因此上帝吩附百姓离开",
  "鼓吹肆意放纵的\"预言\"却不喜欢",
  "因为亚述的人侵而逃到",
  "3:1-515当前的不又",
  "对耶路撒冷公叉须治的未来展望",
  "并且乘行公义",
  "领袖继续\"恶善好恶\"（2歪曲司法裁决",
  "万民着以色列来到上帝面前",
  "与他们的王水远联合并同行",
  "使1-4节的描述成现实",
  "必有一再次掌权治理",
  "40:11；［本书7:14］",
  "亚舍拉》，是迎一直受到众先知的抨击",
  "我以撒玛利亚的和华和他的亚舍拉祝福你们",
  "（《和修》*你回答我吧！》，",
  "牧放你…的民你产业，",
  "参珥1：\"毗土珥的儿子\"",
  "\"摩利沙人弥迦\"（1：；关于摩利设迦特",
  "他拜偶像（王下16：-4；弥6:16）",
  "（1:2-5,2:3,61-2，9-11）",
  "拒绝活出上帝的心它们已经败坏",
  "《<圣经》概述》和《〈旧意，约》",
  "例如辦论（2:6-11）",
  "主前8世纪一主前",
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

describe("Micah public card audit and isolation hold-queue", () => {
  const payload = loadBook("Mic");

  it("keeps the public Micah package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Mic");
    expect(payload.textCards).toHaveLength(78);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Mic");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 74, ocr: 4, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Micah cards", () => {
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

    const micIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-mic-\d/.test(id));
    expect(micIsolation).toHaveLength(67);
    expect(micIsolation.some((id) => publicIds.has(id))).toBe(false);

    const amosIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-amos-\d/.test(id));
    expect(amosIsolation).toHaveLength(93);
    expect(amosIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
