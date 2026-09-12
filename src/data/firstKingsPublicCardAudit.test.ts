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
  "study-bible-1kgs-3-16-p012-n041",
  "study-bible-1kgs-10-1-p026-n127",
  "study-bible-1kgs-12-18-p031-n150",
  "study-bible-1kgs-14-15-p036-n122",
  "study-bible-1kgs-18-20-p042-n216",
  "study-bible-1kgs-18-21-p042-n154",
  "study-bible-1kgs-20-11-p045-n173",
  "study-bible-1kgs-21-3-p047-n256",
  "study-bible-1kgs-22-20-p010-n033",
  "study-bible-1kgs-intro-p002-n005",
];

const forbiddenFragments = [
  "进《列王纪上》对所罗门的毁誉",
  "从阿拉所罗门的国际贸易",
  "当作迎南人对待",
  "（《和修》\"亚舍拉）",
  "使以色人在全体",
  "这个知在祭坛",
  "（《和束上腰带",
  "属于法律有\"该土地",
  "所称〝忠心的祭司",
  "亚伯拉军、以撒",
  "k见撤上22",
  "事情之9）.一",
  "陷人其中",
  "但种行为",
  "现在15:33）",
  "12个\"官，",
  "四干\"而四千",
  "使百\"回埃及",
  "讲论草术",
  "这样，上的\"智慧",
  "（\"家\"的时间",
  "），然看起来",
  "有人认这个日期",
  "10时的话",
  "节期时）、",
  "并无别可能还预示",
  "居所\"足\"够上帝",
  "析求，使圣殿",
  "\"枷锁》，",
  "这座城国及其",
  "《圣有意利用",
  "看对的事",
  "像大.（如",
  "看主制度",
  "《1E约》",
  "差遺将凶事",
  "痊您",
  "也有被收集在《圣经》里",
  "涉及法商业、",
  "中12:3规定",
  "稻此使土地",
  "可惜的偶像",
  "只有儿公里",
  "暗利冒起作王",
  "起暂诅咒",
  "当时迎南多神",
  "带人以色列",
  "在迎南人的宗教中",
  "17:22［来11:35］",
  "这样吩附",
  "业以利亚逃往西奈",
  "也可能射是累了",
  "上帝盼咐他",
  "迎密山事件",
  "迎密山顶",
  "他然不是仅存",
  "子民的特身份",
  "宜称，西底家",
  "射人亚哈",
  "象牙官",
  "王下了章",
  "《申（例如：命记》",
  "军队撒离",
  "何竞独坐",
  "关于恩历史",
  "《《圣经概述》",
  "许插曲",
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

describe("1 Kings public card audit and isolation hold-queue", () => {
  const payload = loadBook("1Kgs");

  it("keeps the public 1 Kings package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("1Kgs");
    expect(payload.textCards).toHaveLength(145);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("1Kgs");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 143, ocr: 2, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage 1 Kings cards", () => {
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

    const kgsIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-1kgs-\d/.test(id));
    expect(kgsIsolation).toHaveLength(601);
    expect(kgsIsolation.some((id) => publicIds.has(id))).toBe(false);

    const samIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-2sam-\d/.test(id));
    expect(samIsolation).toHaveLength(495);
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
