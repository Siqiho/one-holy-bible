import { createHash } from "node:crypto";
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

interface IsolationCmcLedger {
  isolationRows: number;
  isolationCmc: number;
  isolationCmcSha256: string;
  isolationStudyBible: string[];
  isolationCmcByBook: Record<string, number>;
  isolationPublicIntersection: string[];
  publicCmc: number;
  publicCmcSha256: string;
  publicCmcAllGenesis: boolean;
  genesisIsolationCmc: number;
  sentinelIsolationCmc: string[];
}

interface OcrMidcutBan {
  secondPassStillBanned: string[];
  thirdPassStillBanned: string[];
  fourthPassStillBanned: string[];
  fifthPassStillBanned: string[];
  sixthPassExpanded: string[];
  seventhPassExpanded: string[];
  eighthPassExpanded: string[];
  ninthPassExpanded: string[];
  ninthPassCorePinned: string[];
  tenthPassExpanded: string[];
  tenthPassCorePinned: string[];
  eleventhPassExpanded: string[];
  eleventhPassCorePinned: string[];
  twelfthPassExpanded: string[];
  twelfthPassCorePinned: string[];
  tableAxisPatterns: string[];
}

interface TwelfthPassFix {
  cardId: string;
  bookId: string;
  field: string;
  label: string;
  count: number;
}

const booksDir = resolve(__dirname, "../../public/data/books");
const testsDir = resolve(__dirname);
const twelfthPassDir = resolve(__dirname, "../../docs/verification/2026-09-12-residual-holds-twelfth-pass");
const isolationPath = resolve(__dirname, "../../local-audit-pack/no-explain-isolation-20260731/card候选清单.jsonl");
const johnPackDir = resolve(__dirname, "../../local-audit-pack/john-gospel-20260909");
const v4Path = resolve(__dirname, "./generated/workbenchSyncedResources-v4.json");
const genesisImagesDir = resolve(__dirname, "../assets/resources/genesis/images");

const TABLE_AXIS_RES = [
  /］[A-Za-z]本书/,
  /主后\d{2,}\s+\d{8,}/,
  /主前\d+年主后\d+年\d{8,}/,
  /圣经文集\d{8,}/,
  /主后30 3540/,
  /\d+[A-Za-z]本书/,
  /圣经文集主后1年\d+/,
  /10002000英尺/,
  /400600/,
  /英果\d+/,
  /主前\d+(?:年|世纪)?一主[前后]/,
  /前\d+一主前/,
  /，，/,
];

const CORE_TWELFTH_PASS_LABELS = [
  "五句节→五旬节",
  "圣吴→圣灵",
  "察乡→家乡",
  "刦→却",
  "才民→子民",
  "果要→若要",
  "bang-colon",
  "dot-colon-ref",
  "corner-as-dot",
  "的的→的",
  "旧知→先知",
  "知说话→开口说话",
  "后12→启12",
  "hexiu-missing-paren",
  "cjk-quote",
];

const ELEVENTH_PASS_PIN_FRAGMENTS = [
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
  "（教养…的人》",
  "《创世前几章",
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

function cardText(card: PublicCard): string {
  return `${card.title ?? ""}\n${card.body ?? ""}\n${card.summary ?? ""}\n${card.searchText ?? ""}`;
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

describe("residual holds twelfth-pass after eleventh-pass inventory", () => {
  const books = publicBooks();
  const publicCards = books.flatMap((book) => book.textCards.map((card) => ({ ...card, bookId: book.bookId })));
  const publicIds = new Set(publicCards.map((card) => card.id));
  const studyCards = publicCards.filter((card) => card.id.startsWith("study-bible-"));
  const studyBlob = studyCards.map(cardText).join("\n");
  const ledger = loadJson<IsolationCmcLedger>(resolve(twelfthPassDir, "isolation-cmc-ledger.json"));
  const ban = loadJson<OcrMidcutBan>(resolve(twelfthPassDir, "ocr-midcut-ban.json"));
  const fixes = loadJson<TwelfthPassFix[]>(resolve(twelfthPassDir, "twelfth-pass-fixes.json"));
  const debt = loadJson<{ publicMix: Record<string, number> }>(resolve(twelfthPassDir, "remaining-public-card-debt.json"));

  it("keeps the public mix pinned and isolation ∩ public empty", () => {
    const mix = { studyBible: 0, ocr: 0, cmc: 0, message: 0, other: 0, books: books.length, cards: 0 };
    for (const card of publicCards) {
      mix.cards += 1;
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else if (card.id.startsWith("message-")) mix.message += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 9089, ocr: 146, cmc: 858, message: 3, other: 0, books: 66, cards: 10096 });
    expect(debt.publicMix).toEqual({
      studyBible: 9089,
      ocr: 146,
      cmc: 858,
      message: 3,
      books: 66,
      cards: 10096,
    });
    expect(ledger.isolationPublicIntersection).toEqual([]);
  });

  it("re-pins eleventh-pass cores and bans the expanded twelfth-pass leftovers across four fields", () => {
    for (const fragment of ELEVENTH_PASS_PIN_FRAGMENTS) {
      expect(ban.eleventhPassCorePinned.includes(fragment) || ban.eleventhPassExpanded.includes(fragment), fragment).toBe(true);
      expect(studyBlob.includes(fragment), fragment).toBe(false);
    }
    for (const fragment of ban.twelfthPassCorePinned) {
      expect(ban.twelfthPassExpanded.includes(fragment), fragment).toBe(true);
      expect(studyBlob.includes(fragment), fragment).toBe(false);
    }
    const fragments = [
      ...ban.secondPassStillBanned,
      ...ban.thirdPassStillBanned,
      ...ban.fourthPassStillBanned,
      ...ban.fifthPassStillBanned,
      ...ban.sixthPassExpanded,
      ...ban.seventhPassExpanded,
      ...ban.eighthPassExpanded,
      ...ban.ninthPassExpanded,
      ...ban.tenthPassExpanded,
      ...ban.eleventhPassExpanded,
      ...ban.twelfthPassExpanded,
    ];
    expect(fragments.length).toBeGreaterThan(300);
    for (const fragment of fragments) {
      expect(studyBlob.includes(fragment), fragment).toBe(false);
    }
    expect(studyCards).toHaveLength(9089);
    expect(studyBlob.includes("“") || studyBlob.includes("”")).toBe(false);
  });

  it("rejects leftover table-axis dumps, date-dash 一, and gloss closers in public study-bible text", () => {
    expect(ban.tableAxisPatterns).toHaveLength(TABLE_AXIS_RES.length);
    const hits: Array<{ id: string; pattern: string; match: string }> = [];
    for (const card of studyCards) {
      const text = cardText(card);
      for (const pattern of TABLE_AXIS_RES) {
        const match = text.match(pattern);
        if (match) hits.push({ id: card.id, pattern: pattern.source, match: match[0] });
      }
      const gloss = text.match(/["”]'[，。；：.]/);
      if (gloss) hits.push({ id: card.id, pattern: "gloss-closer", match: gloss[0] });
    }
    expect(hits).toEqual([]);
  });

  it("pins isolation CMC as ledger-only and never present in public packages", () => {
    const publicCmc = publicCards.filter((card) => card.id.startsWith("cmc-")).map((card) => card.id).sort();
    expect(publicCmc).toHaveLength(858);
    expect(publicCmc.every((id) => id.startsWith("cmc-gen-"))).toBe(true);
    expect(sha256Text(publicCmc.join("\n"))).toBe(ledger.publicCmcSha256);
    expect(ledger.publicCmc).toBe(858);
    expect(ledger.publicCmcAllGenesis).toBe(true);
    expect(ledger.isolationCmcSha256).toBe("fa086c106e0fe8f96facdc00e0946233b524a28e25d02c8a13ff8cb74643c257");
    expect(ledger.publicCmcSha256).toBe("57faabdbe9c8ced51267e6b1142581e1e5475c08e6392f8d2451f93bb87377f6");

    for (const id of ledger.isolationStudyBible) {
      expect(publicIds.has(id), id).toBe(false);
    }
    expect(ledger.isolationStudyBible).toHaveLength(10);

    if (!existsSync(isolationPath)) return;

    const isolation = loadJsonl(isolationPath);
    const isolationIds = isolation.map((row) => String(row.commentary_key ?? ""));
    const isolationCmc = isolationIds.filter((id) => id.startsWith("cmc-")).sort();
    const isolationStudy = isolationIds.filter((id) => id.startsWith("study-bible-")).sort();
    const leaked = isolationIds.filter((id) => publicIds.has(id));

    expect(isolation).toHaveLength(ledger.isolationRows);
    expect(isolationCmc).toHaveLength(ledger.isolationCmc);
    expect(ledger.isolationCmc).toBe(18387);
    expect(sha256Text(isolationCmc.join("\n"))).toBe(ledger.isolationCmcSha256);
    expect(isolationStudy.sort()).toEqual([...ledger.isolationStudyBible].sort());
    expect(leaked).toEqual([]);

    const byBook: Record<string, number> = {};
    for (const id of isolationCmc) {
      const book = id.split("-")[1];
      byBook[book] = (byBook[book] ?? 0) + 1;
    }
    expect(byBook).toEqual(ledger.isolationCmcByBook);
    expect(Object.keys(byBook)).toHaveLength(65);
    expect(byBook.gen).toBe(508);
    expect(ledger.genesisIsolationCmc).toBe(508);

    for (const id of ledger.sentinelIsolationCmc) {
      expect(isolationCmc.includes(id), id).toBe(true);
      expect(publicIds.has(id), id).toBe(false);
    }
    expect(publicIds.has("cmc-gen-1-3")).toBe(false);
  });

  it("pins the twelfth-pass fix inventory without changing card counts", () => {
    expect(fixes.length).toBeGreaterThan(180);
    expect(new Set(fixes.map((row) => row.cardId)).size).toBe(78);
    const labels = new Set(fixes.map((row) => row.label));
    for (const label of CORE_TWELFTH_PASS_LABELS) {
      expect(labels.has(label), label).toBe(true);
    }
    const ocrCards = new Set(fixes.filter((row) => row.label !== "cjk-quote").map((row) => row.cardId));
    const cjkCards = new Set(fixes.filter((row) => row.label === "cjk-quote").map((row) => row.cardId));
    expect(ocrCards.size).toBe(39);
    expect(cjkCards.size).toBe(39);
    for (const row of fixes) {
      expect(publicIds.has(row.cardId), row.cardId).toBe(true);
      expect(row.cardId.startsWith("study-bible-")).toBe(true);
      expect(["title", "body", "summary", "searchText"]).toContain(row.field);
    }
  });

  it("keeps 66 volume audits on four fields and does not invent workbench v4 or Genesis image fixtures", () => {
    const auditTests = readdirSync(testsDir).filter((name) => name.endsWith("PublicCardAudit.test.ts"));
    expect(auditTests).toHaveLength(66);
    let fourField = 0;
    let twelfthPinned = 0;
    for (const name of auditTests) {
      const text = readFileSync(resolve(testsDir, name), "utf8");
      if (text.includes("${card.summary ?? \"\"}") && text.includes("${card.searchText ?? \"\"}")) {
        fourField += 1;
      }
      if (text.includes("五句节") && text.includes("圣吴") && text.includes("察乡")) {
        twelfthPinned += 1;
      }
    }
    expect(fourField).toBe(66);
    expect(twelfthPinned).toBe(66);
    expect(existsSync(resolve(twelfthPassDir, "full-vitest-blockers.md"))).toBe(true);
    expect(existsSync(v4Path)).toBe(false);
    expect(existsSync(genesisImagesDir)).toBe(false);
    if (existsSync(johnPackDir)) {
      expect(publicIds.has("image-text-43-约翰福音-codex-pdf-p019-img004")).toBe(false);
    }
  });
});
