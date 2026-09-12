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
