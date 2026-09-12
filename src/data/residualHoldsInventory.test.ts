import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface PublicCard {
  id: string;
  body?: string;
  title?: string;
  summary?: string;
  searchText?: string;
}

interface PublicBookPayload {
  bookId: string;
  textCards: PublicCard[];
}

interface HeldInventory {
  count: number;
  verdict: string;
  cards: Array<{ id: string; testFile: string }>;
}

interface OcrInventory {
  publicOcr: number;
  keep: Array<{ id: string; bookId: string; verdict: string }>;
  holdAsClass: Array<{ id: string; bookId: string; verdict: string; ledger: string }>;
  heldOutOcr: Array<{ id: string; testFile: string }>;
  johnLeftoverOcr: string[];
}

interface CrossPack {
  mix: {
    studyBible: number;
    ocr: number;
    cmc: number;
    message: number;
    other: number;
    books: number;
    cards: number;
  };
  isolationRows: number;
  isolationCmc: number;
  isolationStudyBible: number;
  isolationPublicIntersection: string[];
  johnOcr: string[];
  johnOcrInPublic: string[];
}

const booksDir = resolve(__dirname, "../../public/data/books");
const testsDir = resolve(__dirname);
const inventoryDir = resolve(__dirname, "../../docs/verification/2026-09-12-residual-holds-second-pass");
const isolationPath = resolve(__dirname, "../../local-audit-pack/no-explain-isolation-20260731/card候选清单.jsonl");
const johnPackDir = resolve(__dirname, "../../local-audit-pack/john-gospel-20260909");
const GENESIS_OCR_KEEP = "image-text-01-创世记-codex-pdf-p102-img057";

const residualStudyBibleFragments = [
  "自已",
  "服待",
  "旧日约",
  "《I日约》",
  "迎南",
  "诚命",
  "吩附",
  "盼咐",
  "耶路撤冷",
  "犯好淫",
  "进人",
  "陷人",
  "主后30 3540455055606570",
  "13：提后2:9］",
  "15］e本书32:28",
  "72m赛40:11,46:3.",
  "他们已经太老，不能再生养孩",
  "这与《圣经》中的记载吻",
];

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function loadJsonl(path: string): Array<Record<string, unknown>> {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function publicBooks(): PublicBookPayload[] {
  return readdirSync(booksDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => loadJson<PublicBookPayload>(resolve(booksDir, name)));
}

function declaredHeldFromTests(): Array<{ id: string; testFile: string }> {
  const held: Array<{ id: string; testFile: string }> = [];
  for (const file of readdirSync(testsDir).filter((name) => name.endsWith("PublicCardAudit.test.ts"))) {
    const text = readFileSync(resolve(testsDir, file), "utf8");
    const heldBlock = text.match(/const held(?:StudyBible|OutOfPublic|Ocr)\s*[:=]\s*\[([\s\S]*?)\];/);
    if (!heldBlock) continue;
    for (const match of heldBlock[1].matchAll(/"([^"]+)"/g)) {
      held.push({ id: match[1], testFile: file });
    }
  }
  return held;
}

describe("residual holds inventory after 66-volume 1:1", () => {
  const books = publicBooks();
  const publicIds = new Set(books.flatMap((book) => book.textCards.map((card) => card.id)));
  const heldInventory = loadJson<HeldInventory>(resolve(inventoryDir, "held-study-bible.json"));
  const ocrInventory = loadJson<OcrInventory>(resolve(inventoryDir, "ocr-hold-as-class.json"));
  const crossPack = loadJson<CrossPack>(resolve(inventoryDir, "cross-pack.json"));

  it("pins public mix counts and keeps isolation ∩ public empty", () => {
    const mix = { studyBible: 0, ocr: 0, cmc: 0, message: 0, other: 0, books: books.length, cards: 0 };
    for (const book of books) {
      mix.cards += book.textCards.length;
      for (const card of book.textCards) {
        if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
        else if (card.id.startsWith("image-text-")) mix.ocr += 1;
        else if (card.id.startsWith("cmc-")) mix.cmc += 1;
        else if (card.id.startsWith("message-")) mix.message += 1;
        else mix.other += 1;
      }
    }
    expect(mix).toEqual({ studyBible: 9089, ocr: 146, cmc: 858, message: 3, other: 0, books: 66, cards: 10096 });
    expect(crossPack.mix).toEqual(mix);
    expect(crossPack.isolationPublicIntersection).toEqual([]);
    expect(crossPack.johnOcrInPublic).toEqual([]);

    if (!existsSync(isolationPath)) return;
    const isolation = loadJsonl(isolationPath);
    const leaked = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => publicIds.has(id));
    expect(leaked).toEqual([]);
    expect(isolation).toHaveLength(crossPack.isolationRows);
    expect(isolation.filter((row) => String(row.commentary_key).startsWith("cmc-"))).toHaveLength(crossPack.isolationCmc);
    expect(isolation.filter((row) => String(row.commentary_key).startsWith("study-bible-"))).toHaveLength(crossPack.isolationStudyBible);
  });

  it("keeps every declared residual study-bible hold out of the public package", () => {
    const declared = declaredHeldFromTests().filter((row) => row.id.startsWith("study-bible-"));
    expect(declared.map((row) => row.id).sort()).toEqual(heldInventory.cards.map((row) => row.id).sort());
    expect(heldInventory.count).toBe(347);
    expect(heldInventory.verdict).toBe("keep-hold");
    for (const row of heldInventory.cards) {
      expect(publicIds.has(row.id), row.id).toBe(false);
    }
  });

  it("documents public OCR as 1 keep + 145 hold-as-class and does not invent ledger rows", () => {
    const publicOcr = books.flatMap((book) => (
      book.textCards
        .filter((card) => card.id.startsWith("image-text-"))
        .map((card) => ({ id: card.id, bookId: book.bookId }))
    ));
    expect(publicOcr).toHaveLength(146);
    expect(ocrInventory.publicOcr).toBe(146);
    expect(ocrInventory.keep.map((row) => ({ id: row.id, bookId: row.bookId, verdict: row.verdict }))).toEqual([
      { id: GENESIS_OCR_KEEP, bookId: "Gen", verdict: "keep" },
    ]);
    expect(publicIds.has(GENESIS_OCR_KEEP)).toBe(true);
    expect(ocrInventory.holdAsClass).toHaveLength(145);
    expect(ocrInventory.holdAsClass.every((row) => row.verdict === "hold-as-class" && row.ledger === "none")).toBe(true);

    const inventoried = new Set([
      ...ocrInventory.keep.map((row) => row.id),
      ...ocrInventory.holdAsClass.map((row) => row.id),
    ]);
    expect([...inventoried].sort()).toEqual(publicOcr.map((row) => row.id).sort());

    for (const row of ocrInventory.heldOutOcr) {
      expect(publicIds.has(row.id), row.id).toBe(false);
    }
    expect(ocrInventory.johnLeftoverOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    if (!existsSync(johnPackDir)) return;
    expect(publicIds.has(ocrInventory.johnLeftoverOcr[0])).toBe(false);
  });

  it("covers all 66 volume public-card audit tests and residual OCR/quote/table-tail fragments", () => {
    const auditTests = readdirSync(testsDir).filter((name) => name.endsWith("PublicCardAudit.test.ts"));
    expect(auditTests).toHaveLength(66);

    const studyBlob = books
      .flatMap((book) => book.textCards.filter((card) => card.id.startsWith("study-bible-")))
      .map((card) => `${card.title ?? ""}\n${card.body ?? ""}\n${card.summary ?? ""}\n${card.searchText ?? ""}`)
      .join("\n");
    for (const fragment of residualStudyBibleFragments) {
      expect(studyBlob.includes(fragment), fragment).toBe(false);
    }
  });
});
