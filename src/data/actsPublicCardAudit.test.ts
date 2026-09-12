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
  "study-bible-acts-intro-p002-n004",
  "study-bible-acts-intro-p004-n007",
  "study-bible-acts-intro-p005-n010",
  "study-bible-acts-1-14-p009-n025",
  "study-bible-acts-2-23-p037-n310",
  "study-bible-acts-4-10-p015-n080",
  "study-bible-acts-5-10-p017-n073",
  "study-bible-acts-5-31-p037-n320",
  "study-bible-acts-6-11-p019-n135",
  "study-bible-acts-7-37-p021-n150",
  "study-bible-acts-7-56-p022-n160",
  "study-bible-acts-9-35-p028-n220",
  "study-bible-acts-10-48-p030-n247",
  "study-bible-acts-15-6-p040-n230",
  "study-bible-acts-15-39-p041-n362",
  "study-bible-acts-16-23-p044-n386",
  "study-bible-acts-19-19-p051-n307",
  "study-bible-acts-20-7-p053-n492",
  "study-bible-acts-20-16-p053-n321",
  "study-bible-acts-21-28-p056-n525",
  "study-bible-acts-28-19-p067-n640",
];

const forbiddenFragments = [
  "主后30352045",
  "帝的定旨先人",
  "雙霖多有費任",
  "无法与圣",
  "上帝的道在《使徒行传》中的传播进程",
  "见申18:15；徒",
  "见但7:13：太",
  "沙仑沿海平",
  "事实上，太",
  "赞成会议的决",
  "重要的侍",
  "后来的教会传",
  "800万元人",
  "礼拜天的崇",
  "冒死带外邦人闯",
  "空攻墓",
  "买出人来说",
  "早在来特141",
  "盼咐",
  "壁饼",
  "旧日约",
  "服待",
  "13：提后2:9］",
  "迎南",
  "迎玛列",
  "别迎摩",
  "15］S本书",
  "差遭",
  "差遺",
  "蓄告",
  "帖撒罗尼迎",
  "胖立比",
  "圣路经",
  "加但最早",
  "无人能这些",
  "介人",
  "藉者",
  "顾序",
  "插人",
  "数以干计",
  "慈普",
  "《<圣经",
  "放人水中",
  "29节27:188拿1:5：［38节］",
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

describe("Acts public card audit and isolation hold-queue", () => {
  const payload = loadBook("Acts");

  it("keeps the public Acts package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Acts");
    expect(payload.textCards).toHaveLength(462);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Acts");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 462, ocr: 0, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Acts cards", () => {
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

    const actsIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-acts-\d/.test(id));
    expect(actsIsolation).toHaveLength(543);
    expect(actsIsolation.some((id) => publicIds.has(id))).toBe(false);

    const lukeIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-luke-\d/.test(id));
    expect(lukeIsolation).toHaveLength(144);
    expect(lukeIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
