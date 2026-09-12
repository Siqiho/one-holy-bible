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
  summary?: string;
  searchText?: string;
}

interface PublicBookPayload {
  bookId: string;
  textCards: PublicCard[];
}

const booksDir = resolve(__dirname, "../../public/data/books");
const isolationPath = resolve(__dirname, "../../local-audit-pack/no-explain-isolation-20260731/card候选清单.jsonl");
const johnPackDir = resolve(__dirname, "../../local-audit-pack/john-gospel-20260909");

const heldStudyBible: string[] = [];

const ocrHoldAsClass = [
  "image-text-03-利未记-codex-pdf-p005-img004",
  "image-text-03-利未记-codex-pdf-p026-img012",
  "image-text-03-利未记-codex-pdf-p031-img015",
  "image-text-03-利未记-codex-pdf-p100-img044",
  "image-text-03-利未记-codex-pdf-p130-img063",
  "image-text-03-利未记-codex-pdf-p158-img073",
];

const forbiddenFragments = [
  "受商的祭司",
  "1：.2提到百姓",
  "第二次用齊油",
  "解释《利未意的事",
  "（《和修》\"吃任何的血，可能指",
  "参创9:4：中12:23",
  "\"调上帝亲自赐下",
  "藉着避行上帝的典章",
  "但所有罪都会使人",
  "也属于迎南人",
  "与诚地理论）",
  "这个吩附带有一个警告",
  "指摘………邻含",
  "命令和營告逐步升级",
  "要爱人如已，爱人如已是",
  "可见这节《利未记》的全部内容。",
  "超过30次许多时候",
  "是成书于的年代或其前后",
  "wayvigra'",
  "意力\"有关利未人的事情\"",
  "被视礼仪上圣洁的人",
  "（参19:01-18，35-36等）",
  "超越了《旧日约》以色列",
  "（出常吩咐他们要40:34",
  "人不可能单凭己力就能做到完全的5.",
  "《（圣和《〈旧约〉中的救恩历史",
  "以\"耶和华晓开始记述",
  "则针对公然违犯律法。。",
  "爱人如已",
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

describe("Leviticus public card audit and isolation hold-queue", () => {
  const payload = loadBook("Lev");

  it("keeps the public Leviticus package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Lev");
    expect(payload.textCards).toHaveLength(36);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Lev");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 30, ocr: 6, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Leviticus cards", () => {
    const ids = new Set(payload.textCards.map((card) => card.id));
    for (const id of heldStudyBible) {
      expect(ids.has(id), id).toBe(false);
    }
    for (const id of ocrHoldAsClass) {
      expect(ids.has(id), id).toBe(true);
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

    const levIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-lev-\d/.test(id));
    expect(levIsolation).toHaveLength(622);
    expect(levIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
