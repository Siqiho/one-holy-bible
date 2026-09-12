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
  "study-bible-rom-5-6-p015-n073",
  "study-bible-rom-7-12-p018-n098",
  "study-bible-rom-8-1-p019-n104",
  "study-bible-rom-8-6-p019-n169",
  "study-bible-rom-8-10-p019-n103",
  "study-bible-rom-8-23-p020-n174",
  "study-bible-rom-10-4-p023-n215",
  "study-bible-rom-11-26-p026-n152",
  "study-bible-rom-11-32-p026-n246",
  "study-bible-rom-12-1-p026-n255",
  "study-bible-rom-12-14-p027-n260",
  "study-bible-rom-13-1-p028-n174",
  "study-bible-rom-14-5-p029-n180",
  "study-bible-rom-15-26-p031-n192",
  "study-bible-rom-16-2-p032-n318",
  "study-bible-rom-intro-p002-n005",
];

const forbiddenFragments = [
  "鋏乏道德力量",
  "上帝的诚命",
  "4-11节有十次",
  "漠视上帝的旨",
  "罗8章中的\"三位一体\"教义本表",
  "《和修》\"呻救赎",
  "义就属于所有信靠",
  "主快要再来的时候",
  "一节突然改些人",
  "客尚蘿的新生",
  "说方言翻方言施舍信心怜悯",
  "但2:44；启",
  "来10:24-25；参徒",
  "哥林多等城邑的捐",
  "给人提供帮",
  "主后303540455055",
  "旧日约",
  "迎南",
  "自已",
  "《《圣经",
  "耶稣着圣灵",
  "浸人水中",
  "酒水礼",
  "藉者圣灵",
  "归人基督",
  "畢恶洪流",
  "基誉徒",
  "创始的普工",
  "为例，明上帝",
  "耳路撒冷",
  "《圣经启示的世界观",
  "《罗马书》。的标题",
  "福音与！律法",
  "名叫\"C（拉丁文",
  "《《圣经〉概述》",
  "酒水礼",
  "］V见徒",
  "人狱",
  "\"使人因信而顺服*",
  "\"来自上帝的义\"\"，",
  "\"众人都犯了亚当的罪\"\"，",
  "将水远",
  "太老们",
  "性行力",
  "已经酒去",
  "罪摩和过犯",
  "可僧的",
  "就不再谤了",
  "扶行教会纪律",
  "（《和修》\"他同胞》",
  "（《和修》\"翘角》",
  "（《和修》\"已蒙洁净》",
  "（《和修》\"火的城墙》",
  "（《和修》\"不在于）",
  "（《和修》\"意愿）",
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

describe("Romans public card audit and isolation hold-queue", () => {
  const payload = loadBook("Rom");

  it("keeps the public Romans package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Rom");
    expect(payload.textCards).toHaveLength(215);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Rom");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 214, ocr: 1, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Romans cards", () => {
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

    const romIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-rom-\d/.test(id));
    expect(romIsolation).toHaveLength(113);
    expect(romIsolation.some((id) => publicIds.has(id))).toBe(false);

    const deutIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-deut-\d/.test(id));
    expect(deutIsolation).toHaveLength(684);
    expect(deutIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
