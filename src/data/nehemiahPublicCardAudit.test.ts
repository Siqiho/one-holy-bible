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
  "study-bible-neh-6-1-p012-n076",
  "study-bible-neh-intro-p001-n005",
];

const forbiddenFragments = [
  "就在无计可施之下使用阴谋诡",
  "无需害怕弱（13章）",
  "防备道德上的软",
  "陷人目前的悲惨",
  "开始他的析祷",
  "是以列人的罪导致",
  "避署山庄",
  "（《和修》\"作臣仆的\"一词",
  "也加人了反对的行列",
  "\"权指应得的权利",
  "侍奉上帝的观",
  "经常在那里召开会",
  "\"一半\"\"那一半》",
  "（《和修》\"接续他修造的》，",
  "（《和修》\"殿役），见",
  "直姓的委身",
  "尼希米时期的耶路撒冷约主前445年尽管",
  "因饥俄而绝望",
  "全力投人修建工程",
  "这真是莫大的讽",
  "但尼希冰放弃",
  "危及他的生命安",
  "施加更大w拉8:16的压力",
  "阴谋诡讨阻挠",
  "干脆在圣殿",
  "袋義米的䧝酸",
  "忽视了宜读和教导",
  "律法的宣送可能",
  "云柱和火桂",
  "包罗所23:37：徒7:520",
  "甘心承受的怕惩罚",
  "一會客勒三分之",
  "经文没有说明百姓如何",
  "希伯相同，但不是指那卷书",
  "来原文用词与《历代志》",
  "恳求上帝察尼希米",
  "祈求上帝察尼希米",
  "并且相信一括完成",
  "见经文集》中的",
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

describe("Nehemiah public card audit and isolation hold-queue", () => {
  const payload = loadBook("Neh");

  it("keeps the public Nehemiah package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Neh");
    expect(payload.textCards).toHaveLength(142);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Neh");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 142, ocr: 0, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Nehemiah cards", () => {
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

    const nehIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-neh-\d/.test(id));
    expect(nehIsolation).toHaveLength(317);
    expect(nehIsolation.some((id) => publicIds.has(id))).toBe(false);

    const revIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-rev-\d/.test(id));
    expect(revIsolation).toHaveLength(232);
    expect(revIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
