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
  "study-bible-2kgs-2-2-p003-n007",
  "study-bible-2kgs-7-20-p012-n062",
  "study-bible-2kgs-8-19-p013-n069",
  "study-bible-2kgs-10-20-p017-n118",
  "study-bible-2kgs-10-25-p017-n120",
];

const forbiddenFragments = [
  "你可以留在这经文始终没有明确解释",
  "被争相购买商品的人群践踏至死，应验了以利沙的预",
  "耶和华却因他仆人大卫的缘故，仍不肯灭绝",
  "这是真正的迎南宗教",
  "一般邑\"，根据上下文",
  "第了章将详述这场叛乱",
  "渡过约且河，进人迎南地",
  "书了章，约书亚渡过",
  "以利沙出面介人",
  "挺过他自已发动的政变",
  "因力约西亚已经",
  "遵行上帝诚命方面",
  "已经深人以色列的腹地",
  "乃幔得医治是他的功劳",
  "建立起一个清心察欲",
  "从大马士草通到以拉他",
  "在主前9世纪-主前6世纪非常繁菜",
  "进一步收回以色列领士",
  "参中9:14-19",
  "因为橄上建有偶像祭坛",
  "嘲笑他的骄\n",
  "很可能同时包含了上帝超目",
  "（《和修》\"你求的是一件难事\"，以利沙是由上帝任命",
  "（《和修》\"没有奴役的，没有自由的》，",
  "（《和修》\"因为玛拿西种种的恶事激怒了他，上帝必须",
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

describe("2 Kings public card audit and isolation hold-queue", () => {
  const payload = loadBook("2Kgs");

  it("keeps the public 2 Kings package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("2Kgs");
    expect(payload.textCards).toHaveLength(135);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("2Kgs");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 134, ocr: 1, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage 2 Kings cards", () => {
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

    const kgsIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-2kgs-\d/.test(id));
    expect(kgsIsolation).toHaveLength(520);
    expect(kgsIsolation.some((id) => publicIds.has(id))).toBe(false);

    const joshIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-josh-\d/.test(id));
    expect(joshIsolation).toHaveLength(220);
    expect(joshIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
