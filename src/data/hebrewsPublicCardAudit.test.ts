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
  "study-bible-heb-7-28-p014-n089",
  "study-bible-heb-9-14-p016-n145-2-2-2",
  "study-bible-heb-11-32-p021-n200",
  "study-bible-heb-intro-p002-n005",
];

const forbiddenFragments = [
  "成全（《和修》\"成为完全），见5:9，5:",
  "这里也有与\"死行\"对",
  "撒上：代上6.9.11,26撒母耳章",
  "宇3.耶稣担任永远的大祭司",
  "视他们决读者的属灵先祖",
  "最后的后示是藉着",
  "至大者指上帝，在81也相同",
  "弥赛亚是受者（诗2:2）",
  "这个富有但我们不应将经存在的儿子",
  "太4:10：/19:10.22:9",
  "耶把这节经文用在自己身上",
  "弥都有神性",
  "摩西律法是 ，带有该受的报应",
  "（《和修》\"暂时比天使微小）",
  "远超过天便",
  "上帝的.9:23）",
  "奉上帝\"差遭\"的那一位",
  "申1:34书4:2］",
  "（《和修》*不顺从，",
  "是因火他有降世为人的经历",
  "从而\"学提升了他作为人的道德能力",
  "（《和修》\"不可能》使一些人",
  "原文直译：属于救",
  "起哲都是常用的法律手段",
  "永远的大祭間职仔相比",
  "身为火祭司，耶稣必须献祭",
  "会幕里待奉",
  "烟雾会飘［本书10:3：出30:10］",
  "大祭司会进人第二层帐幕",
  "进入暢子后面的至圣所",
  "大祭司进人天上的圣所",
  "敌作你的脚発（1节）",
  "（《和修》\"靠着耶稣的血》，",
  "让人可以进人。",
  "已经酒去（《和修》",
  "（《修》\"对未见之事有确据\"",
  "也不丢弃\"自百姓（13:5）",
  "参孙甜聖考雙型社告",
  "維起災灣媳生烈的算念",
  "墨都類塞公北綫的Q諮",
  "因此读者不应灰",
  "《旧日约》有关天上新锡安",
  "所酒的血，见9:11-14",
  "并不是真正的基",
  "本书是供名之作",
  "主后30 3540455055606570文集",
  "在希腊原文中，，美\"、\"更大\"",
  "《经文集",
  "旧约经文，：以及",
  "被称为1\"儿子\"",
  "\"一次*显明",
  "\"与上帝同行*",
  "）。*耶稣\"",
  "\"违背那从天上警戒我们的\"\"，",
  "\"更尊贵\"\"、",
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

describe("Hebrews public card audit and isolation hold-queue", () => {
  const payload = loadBook("Heb");

  it("keeps the public Hebrews package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Heb");
    expect(payload.textCards).toHaveLength(132);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Heb");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 132, ocr: 0, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Hebrews cards", () => {
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

    const hebIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-heb-\d/.test(id));
    expect(hebIsolation).toHaveLength(225);
    expect(hebIsolation.some((id) => publicIds.has(id))).toBe(false);

    const kgsIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-2kgs-\d/.test(id));
    expect(kgsIsolation).toHaveLength(520);
    expect(kgsIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
