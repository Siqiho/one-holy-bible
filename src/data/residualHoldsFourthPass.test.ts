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
  fourthPassExpanded: string[];
  tableAxisPatterns: string[];
}

interface FourthPassFix {
  cardId: string;
  bookId: string;
  field: string;
  label: string;
  count: number;
}

const booksDir = resolve(__dirname, "../../public/data/books");
const testsDir = resolve(__dirname);
const fourthPassDir = resolve(__dirname, "../../docs/verification/2026-09-12-residual-holds-fourth-pass");
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
];

const CORE_FOURTH_PASS_LABELS = [
  "迎百农→迦百农",
  "迎拿→迦拿",
  "边拿→迦拿",
  "迎萨→迦萨",
  "迎特→迦特",
  "弥迎→弥迦",
  "舍已→舍己",
  "固执已见→固执己见",
  "爱人如已→爱人如己",
  "人侵→入侵",
  "误人歧途→误入歧途",
  "霞惊→震惊",
  "table-tail",
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

describe("residual holds fourth-pass after third-pass inventory", () => {
  const books = publicBooks();
  const publicCards = books.flatMap((book) => book.textCards.map((card) => ({ ...card, bookId: book.bookId })));
  const publicIds = new Set(publicCards.map((card) => card.id));
  const studyCards = publicCards.filter((card) => card.id.startsWith("study-bible-"));
  const studyBlob = studyCards.map(cardText).join("\n");
  const ledger = loadJson<IsolationCmcLedger>(resolve(fourthPassDir, "isolation-cmc-ledger.json"));
  const ban = loadJson<OcrMidcutBan>(resolve(fourthPassDir, "ocr-midcut-ban.json"));
  const fixes = loadJson<FourthPassFix[]>(resolve(fourthPassDir, "fourth-pass-fixes.json"));
  const debt = loadJson<{ publicMix: Record<string, number> }>(resolve(fourthPassDir, "remaining-public-card-debt.json"));

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

  it("bans prior-pass leftovers and the expanded fourth-pass class across all study-bible fields", () => {
    const fragments = [...ban.secondPassStillBanned, ...ban.thirdPassStillBanned, ...ban.fourthPassExpanded];
    expect(fragments.length).toBeGreaterThan(90);
    for (const fragment of fragments) {
      expect(studyBlob.includes(fragment), fragment).toBe(false);
    }
    expect(studyCards).toHaveLength(9089);
  });

  it("rejects leftover table-axis dumps in public study-bible text", () => {
    expect(ban.tableAxisPatterns).toHaveLength(TABLE_AXIS_RES.length);
    const hits: Array<{ id: string; pattern: string; match: string }> = [];
    for (const card of studyCards) {
      const text = cardText(card);
      for (const pattern of TABLE_AXIS_RES) {
        const match = text.match(pattern);
        if (match) hits.push({ id: card.id, pattern: pattern.source, match: match[0] });
      }
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

  it("pins the 117-card fourth-pass fix inventory without changing card counts", () => {
    expect(fixes).toHaveLength(276);
    expect(new Set(fixes.map((row) => row.cardId)).size).toBe(117);
    const labels = new Set(fixes.map((row) => row.label));
    for (const label of CORE_FOURTH_PASS_LABELS) {
      expect(labels.has(label), label).toBe(true);
    }
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
    for (const name of auditTests) {
      const text = readFileSync(resolve(testsDir, name), "utf8");
      if (text.includes("${card.summary ?? \"\"}") && text.includes("${card.searchText ?? \"\"}")) {
        fourField += 1;
      }
    }
    expect(fourField).toBe(66);
    expect(existsSync(resolve(fourthPassDir, "full-vitest-blockers.md"))).toBe(true);
    expect(existsSync(v4Path)).toBe(false);
    expect(existsSync(genesisImagesDir)).toBe(false);
    if (existsSync(johnPackDir)) {
      expect(publicIds.has("image-text-43-约翰福音-codex-pdf-p019-img004")).toBe(false);
    }
  });
});
