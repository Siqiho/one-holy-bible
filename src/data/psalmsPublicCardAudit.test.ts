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
  "study-bible-ps-1-6-p009-n015",
  "study-bible-ps-5-3-p011-n037",
  "study-bible-ps-11-3-p016-n103",
  "study-bible-ps-12-3-p017-n071",
  "study-bible-ps-15-5-p019-n095-2-2-2-2",
  "study-bible-ps-17-14-p021-n105",
  "study-bible-ps-19-7-p023-n171",
  "study-bible-ps-31-10-p033-n254",
  "study-bible-ps-54-3-p054-n359",
  "study-bible-ps-90-10-p093-n595",
  "study-bible-ps-103-7-p106-n484",
  "study-bible-ps-103-19-p106-n486",
  "study-bible-ps-112-1-p120-n806",
  "study-bible-ps-119-27-p127-n880",
  "study-bible-ps-145-1-p149-n751",
];

const forbiddenFragments = [
  "他必须不仅仅是血",
  "观望四店",
  "解粹为",
  "治理以色列的人（参赛",
  "从上帝的百姓中赶出去，与利",
  "他的行为超，上帝的百姓应该行事",
  "形成鲜明对",
  "獎盔：或作可箱",
  "必要成",
  "少数人则长",
  "这是他们的荣",
  "Mitswot",
  "145:2、21重复出",
  "iT'口",
  "敬皮的楷模",
  "敬皮人",
  "旧日约",
  "大工的宝座",
  "迎特",
  "莱耀",
  "干早",
  "度诚",
  "道徳",
  "插人",
  "被收人正典",
  "太多数",
  "阴羅",
  "仂敌",
  "大工家的王",
  "完金一样",
  "与上常同在",
  "剧歌相同",
  "礼拜人门仪式",
  "参王上5：。",
  "甘路",
  "牙方",
  "上帝右边*",
  "为1\"我主\"",
  "辦白",
  "《I约》",
  "\"道路*（箴",
  "\"剪除*通常",
  "\"坚定不移的爱*",
  "\"忘记*等词",
  "好诈",
  "因力敬拜",
  "萦福",
  "劫活泼",
  "诗中的1\"我\"",
  "称本诗1\"称谢诗\"",
  "代纳人到",
  "\"卸下你的焦虑\"\"，",
  "\"静默\"\"，",
  "\"使我们再次转回\"\"，",
  "\"怜爱他们的主\"\"，",
  "\"恶人\"\"，",
  "\"主\"\"。",
  "\"有心帮助\"\".",
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

describe("Psalms public card audit and isolation hold-queue", () => {
  const payload = loadBook("Ps");

  it("keeps the public Psalms package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Ps");
    expect(payload.textCards).toHaveLength(431);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Ps");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 421, ocr: 10, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Psalms cards", () => {
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

    const psalmsIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-ps-\d/.test(id));
    expect(psalmsIsolation).toHaveLength(1610);
    expect(psalmsIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
