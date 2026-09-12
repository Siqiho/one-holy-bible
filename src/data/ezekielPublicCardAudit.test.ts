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
  "study-bible-ezek-1-12-p009-n033",
  "study-bible-ezek-6-2-p014-n079",
  "study-bible-ezek-17-7-p026-n196",
  "study-bible-ezek-22-9-p033-n256",
  "study-bible-ezek-31-18-p065-n500",
  "study-bible-ezek-32-2-p048-n376",
  "study-bible-ezek-40-17-p062-n336",
  "study-bible-ezek-41-1-p062-n339",
  "study-bible-ezek-intro-p001-n001",
  "study-bible-ezek-intro-p003-n006",
];

const forbiddenFragments = [
  "因商笑合",
  "定意向被应用",
  "仍然是只\"大",
  "在山18:6",
  "等），而是在新圣殿",
  "《和修》\"海》",
  "径兽",
  "圣殿之旅经文",
  "了外部的面积",
  "圣殿的大可能在外邦",
  "《中的公式化语言",
  "興可以烤箱",
  "描述这个异",
  "活物很相",
  "谦卑和尊",
  "从了：10",
  "敌人的攻",
  "10:23］7:3",
  "旧日约",
  "表格结书",
  "见者来说有何含义",
  "差遭",
  "迎巴鲁",
  "模楼两可",
  "可一种储藏",
  "沉人大河",
  "可食还在于",
  "立验藉着",
  "顶言",
  "比嗡",
  "\"因次\"",
  "难置上",
  "永久的山网",
  "主人口",
  "所宜告",
  "參肩223",
  "列雨",
  "昇象",
  "审判亚打",
  "《《和",
  "本书间顺序",
  "日数\"个词",
  "来百姓行事",
  "不再着先知",
  "即时影响还明显",
  "写作风格》",
  "shem.\"名》",
  "许多国家》，",
  "拾着宝座",
  "撒率领的",
  "看守殿宇的祭司\"《",
  "人侵",
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

describe("Ezekiel public card audit and isolation hold-queue", () => {
  const payload = loadBook("Ezek");

  it("keeps the public Ezekiel package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Ezek");
    expect(payload.textCards).toHaveLength(176);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Ezek");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 176, ocr: 0, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Ezekiel cards", () => {
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

    const ezekIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-ezek-\d/.test(id));
    expect(ezekIsolation).toHaveLength(1007);
    expect(ezekIsolation.some((id) => publicIds.has(id))).toBe(false);

    const corIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-1cor-\d/.test(id));
    expect(corIsolation).toHaveLength(241);
    expect(corIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
