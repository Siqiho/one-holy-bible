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
  "study-bible-1sam-2-3-p009-n035",
  "study-bible-1sam-6-19-p016-n071",
  "study-bible-1sam-7-10-p017-n117",
  "study-bible-1sam-8-11-p018-n123",
  "study-bible-1sam-10-25-p021-n160",
  "study-bible-1sam-13-7-p024-n189",
  "study-bible-1sam-14-10-p025-n200",
  "study-bible-1sam-15-4-p027-n216",
  "study-bible-1sam-24-2-p040-n345",
  "study-bible-1sam-24-4-p040-n348",
  "study-bible-1sam-30-19-p047-n397",
  "study-bible-1sam-30-22-p047-n399",
  "study-bible-1sam-intro-p002-n005",
  "study-bible-1sam-intro-p003-n009",
];

const forbiddenFragments = [
  "知识》甚至",
  "可能意\"七十",
  "或果是这样",
  "埃及军队见出",
  "作战工具（土",
  "扫罗营救基列雅比人",
  "迎得地，也就是基",
  "拿兵密抹",
  "一分示",
  "大卫服罗",
  "可见扫罗的疯",
  "衣角，证明大卫",
  "他们也是大卫有责任",
  "不正经以利",
  "匪徒顽",
  "尊\"的形像",
  "君上帝的旨意",
  "智识的上2",
  "《诗篇》中提到的《撒母耳记》的事件",
  "旧日约",
  "迎特",
  "迎南",
  "迎萨",
  "盼附",
  "吩附",
  "人进人应许",
  "进人以法莲",
  "自已",
  "差遭",
  "赋子",
  "不再人侵",
  "金寿疮",
  "金持疮",
  "金特疮",
  "鸟加列",
  "琴火",
  "铙钱",
  "哪种情都",
  "奇你作",
  "本节述的庙",
  "洗魯雅",
  "介人。",
  "内要装备",
  "小手鼓似",
  "他的外也",
  "《《旧约",
  "王下1：.",
  "大可卫",
  "洗革区",
  "的最编辑",
  "甚至能是大卫",
  "或\"界的王\"",
  "活口，1包括",
  "0本书14:2",
  "以为帝没有",
  "凭已意",
  "后悔*",
  "罐子\"可以",
  "《<圣经",
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

describe("1 Samuel public card audit and isolation hold-queue", () => {
  const payload = loadBook("1Sam");

  it("keeps the public 1 Samuel package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("1Sam");
    expect(payload.textCards).toHaveLength(261);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("1Sam");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 259, ocr: 2, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage 1 Samuel cards", () => {
    const ids = new Set(payload.textCards.map((card) => card.id));
    for (const id of heldStudyBible) {
      expect(ids.has(id), id).toBe(false);
    }

    const blob = payload.textCards.map((card) => `${card.title ?? ""}\n${card.body ?? ""}`).join("\n");
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
      .filter((id) => /^cmc-1sam-\d/.test(id));
    expect(samIsolation).toHaveLength(578);
    expect(samIsolation.some((id) => publicIds.has(id))).toBe(false);

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
