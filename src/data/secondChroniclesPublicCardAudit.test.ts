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
  "study-bible-2chr-3-12-p029-n210",
  "study-bible-2chr-25-2-p028-n202",
  "study-bible-2chr-27-2-p030-n224",
  "study-bible-2chr-29-8-p034-n152",
];

const forbiddenFragments = [
  "（但参王下15:13，30，32，34，在这些经文中他也称为乌西雅）",
  "只是没有纯正的心刀",
  "邪僻的事（《和修》\"败坏的事\"，敬拜",
  "使他们恐惧，…7，见耶29:18",
  "为耶和华的名建造殿字",
  "上帝曾经吩附亚伯拉罕",
  "放在圣殿人口的前方",
  "见王上7:48-51135:21］",
  "共同完成的（见代上17:12.",
  "\"溪谷\"指整个所罗门帝国",
  "包括救治干早和虫害",
  "上伯和仑、下伯和仑位干耶路撒冷",
  "签订协议\"（见王下25:28-",
  "（《和修》\"我的小指头\"，见王上12:10-11注。",
  "w见于上11:29-39",
  "随即埃及人人侵",
  "战事铭刻在卡纳克",
  "把你们交在…\"，见代上28:9",
  "没有的材这些材料",
  "挑起结6:4,6了这场战争",
  "（《和修》\"易多先知的评传\"，参12:15-16注",
  "一千个干",
  "汲沦溪或称\"汲沦谷\"'",
  "（《和修》\"亚撒一生有纯正的心\"：参王上15:14",
  "见16:13-14\n",
  "25:1636:16",
  "耶利米所遭受的通",
  "指着大卫孙所应许的话",
  "成就帝保守大卫血统",
  "将最多的武装人员带人圣殿",
  "除了加冕和裔抹之外",
  "条约（3节有些解经家则认为",
  "圣殿可能一直疏于管24:5-6",
  "这位撤迦利亚的其他事迹不详",
  "也不是《撒迎利亚书》的作者",
  "谴责迎南人献儿女为祭",
  "（《和修》\"谦卑自己\"，见7:14。",
  "（《和修》\"筑另一片城墙》",
  "难民涌人而",
  "以法莲门？角门？",
  "1000 2000英尺上池",
  "突出微慢的亚述王",
  "（《和修》\"那些日子\"，见王下20:1注。",
  "他们却是不听是根据",
  "玛拿西建筑城墻",
  "亡国和被携不会",
  "的人\"）次逾越节",
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

describe("2 Chronicles public card audit and isolation hold-queue", () => {
  const payload = loadBook("2Chr");

  it("keeps the public 2 Chronicles package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("2Chr");
    expect(payload.textCards).toHaveLength(117);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("2Chr");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 115, ocr: 2, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage 2 Chronicles cards", () => {
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

    const chrIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-2chr-\d/.test(id));
    expect(chrIsolation).toHaveLength(590);
    expect(chrIsolation.some((id) => publicIds.has(id))).toBe(false);

    const hebIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-heb-\d/.test(id));
    expect(hebIsolation).toHaveLength(225);
    expect(hebIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
