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
