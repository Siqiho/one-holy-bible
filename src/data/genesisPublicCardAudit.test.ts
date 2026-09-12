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

const heldOcr = [
  "image-text-05-申命记-codex-pdf-p028-img012",
  "image-text-07-士师记-codex-pdf-p003-img001",
  "image-text-20-箴言-codex-pdf-p155-img063",
];

const forbiddenFragments = [
  "E/Elyon",
  "E/Shadday",
  "E/Ro1",
  "这些名字强调上帝的不",
  "更尊贵《来5:5-10",
  "二十—",
  "尽都毁灭口",
  "Double Blessings",
  "迎勒底",
  "人侵",
  "鸟加列",
  "将收人的",
  "［本书12:17］",
  "示剑的士地",
  "一般认力",
  "这里意人必须",
  "这种塔通常用晒干的泥草砖",
  "好诈",
  "因力全人类",
  "《创世记》》。",
  "在王官地位",
  "完全纳人王宫",
  "有出人；",
  "《创，世记》",
  "\"约\"\"，",
  "\"配合他\"\"，",
  "\"上帝是帮助\"\"，",
  "\"玩耍\"\"，",
  "\"母羊\"\"，",
  "\"起初\"\"，",
  "性行力《和》",
  "作\"亲近》",
  "\"交合》。",
  "以实玛利《见20-21节）",
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

const expectedCounts: Record<string, number> = {
  Gen: 1134,
  Deut: 239,
  "1Chr": 70,
  Lam: 103,
  Gal: 101,
  "2Cor": 101,
  Zech: 101,
  Hos: 103,
  Dan: 92,
  Judg: 117,
  Prov: 227,
  Acts: 462,
  Matt: 430,
  Phil: 52,
  Joel: 57,
  Eccl: 54,
  Zeph: 56,
  Col: 72,
  Song: 90,
  Amos: 76,
  Mic: 78,
  "1Thess": 60,
  "1Tim": 82,
  Jas: 78,
  "1John": 84,
  Ezra: 86,
  Num: 88,
};

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

describe("Genesis public card audit and isolation hold-queue", () => {
  const gen = loadBook("Gen");

  it("keeps the public Genesis package text-only, verse-mapped, and isolation-filtered", () => {
    expect(gen.bookId).toBe("Gen");
    expect(gen.textCards).toHaveLength(1134);
    expect(gen.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { cmc: 0, studyBible: 0, ocr: 0, message: 0, other: 0 };
    const genVerseIds = verseIdsFor("Gen");
    for (const card of gen.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => genVerseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("message-")) mix.message += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ cmc: 858, studyBible: 272, ocr: 1, message: 3, other: 0 });
    expect(gen.textCards.some((card) => card.id === "cmc-gen-1-1")).toBe(true);
    expect(gen.textCards.some((card) => card.id === "cmc-gen-1-3")).toBe(false);
    expect(gen.textCards.some((card) => card.id === "image-text-01-创世记-codex-pdf-p102-img057")).toBe(true);
  });

  it("does not republish isolation no-explain cards or confirmed OCR damage", () => {
    const publicIds = new Set<string>();
    const blobParts: string[] = [];
    for (const file of readdirSync(booksDir).filter((name) => name.endsWith(".json"))) {
      const payload = JSON.parse(readFileSync(resolve(booksDir, file), "utf8")) as PublicBookPayload;
      if (expectedCounts[payload.bookId] !== undefined) {
        expect(payload.textCards.length, payload.bookId).toBe(expectedCounts[payload.bookId]);
      }
      for (const card of payload.textCards) {
        publicIds.add(card.id);
        blobParts.push(`${card.title ?? ""}\n${card.body ?? ""}\n${card.summary ?? ""}\n${card.searchText ?? ""}`);
      }
    }

    for (const id of heldOcr) {
      expect(publicIds.has(id), id).toBe(false);
    }

    const blob = blobParts.join("\n");
    for (const fragment of forbiddenFragments) {
      expect(blob.includes(fragment), fragment).toBe(false);
    }

    if (!existsSync(isolationPath)) return;
    const isolation = loadJsonl(isolationPath);
    const leaked = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => publicIds.has(id));
    expect(leaked).toEqual([]);
  });

  it("keeps John leftover hold streams out of the public package when the audit pack is present", () => {
    if (!existsSync(johnPackDir) || !existsSync(isolationPath)) return;

    const publicIds = new Set<string>();
    for (const file of readdirSync(booksDir).filter((name) => name.endsWith(".json"))) {
      const payload = JSON.parse(readFileSync(resolve(booksDir, file), "utf8")) as PublicBookPayload;
      for (const card of payload.textCards) publicIds.add(card.id);
    }

    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const qidaben = johnCards
      .filter((row) => row.source_stream === "qidaben-commentary-pilot")
      .map((row) => String(row.commentary_key));
    const hurlbut = johnCards
      .filter((row) => row.source_stream === "hurlbut-bible-story-zh-2013")
      .map((row) => String(row.commentary_key));
    const johnIsolation = loadJsonl(isolationPath)
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-john-\d/.test(id));

    expect(qidaben).toHaveLength(267);
    expect(qidaben.some((id) => publicIds.has(id))).toBe(false);
    expect(hurlbut.some((id) => publicIds.has(id))).toBe(false);
    expect(johnIsolation).toHaveLength(156);
    expect(johnIsolation.some((id) => publicIds.has(id))).toBe(false);
  });
});
