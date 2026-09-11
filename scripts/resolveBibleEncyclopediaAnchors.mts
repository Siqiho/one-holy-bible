#!/usr/bin/env node
import { parseArgs } from "node:util";
import { registerHooks } from "node:module";
import { dirname, extname } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

type EntryRecord = Record<string, unknown>;
type VerseId = `${string}.${number}.${number}`;
type ScriptureRefConfidence = "high" | "medium" | "low";
type ScriptureRefPattern =
  | "comprehensive-absolute"
  | "comprehensive-relative-chapter"
  | "comprehensive-relative-verse"
  | "comprehensive-relative-verse-list"
  | "comprehensive-chain"
  | "study-absolute"
  | "study-relative"
  | "study-chain"
  | "wiki"
  | "normalized";

interface DetectedScriptureRef {
  raw: string;
  start: number;
  end: number;
  verseIds: VerseId[];
  confidence: ScriptureRefConfidence;
  pattern: ScriptureRefPattern;
}

function registerTypeScriptExtensionResolution(): void {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if ((specifier.startsWith(".") || specifier.startsWith("/")) && !extname(specifier)) {
          return nextResolve(`${specifier}.ts`, context);
        }
        throw error;
      }
    },
  });
}

registerTypeScriptExtensionResolution();

const { detectScriptureRefs, isValidVerse } = await import("../src/domain/scriptureRef.ts") as {
  detectScriptureRefs: (text: string) => DetectedScriptureRef[];
  isValidVerse: (bookId: string, chapter: number, verse: number) => boolean;
};
const { parseVerseId, verseIdFromParts } = await import("../src/domain/verse.ts") as {
  parseVerseId: (id: string) => { book: string; chapter: number; verse: number };
  verseIdFromParts: (book: string, chapter: number, verse: number) => VerseId;
};
const { BIBLE_BOOKS } = await import("../src/domain/bibleBooks.ts") as {
  BIBLE_BOOKS: Array<{
    id: string;
    chineseName: string;
    chineseShortName: string;
    aliases: string[];
  }>;
};

export interface BibleEncyclopediaAnchorInput {
  entries: EntryRecord[];
  [key: string]: unknown;
}

export interface AcceptedAnchorRef {
  field: "title" | "body";
  raw: string;
  start: number;
  end: number;
  confidence: ScriptureRefConfidence;
  pattern: ScriptureRefPattern;
  verseIds: VerseId[];
}

export interface RejectedAnchorRef extends AcceptedAnchorRef {
  reason: "not_high_confidence" | "not_absolute_or_carried_chain" | "invalid_verse_id";
}

export interface AnchoredBibleEncyclopediaEntry extends EntryRecord {
  verses: VerseId[];
  primaryAnchor: VerseId;
  anchorRefs: AcceptedAnchorRef[];
}

export interface BibleEncyclopediaAnchorQaEntry {
  entry: EntryRecord;
  reason: "missing_body_and_title" | "no_scripture_refs_detected" | "no_trustworthy_anchor";
  detectedRefs: AcceptedAnchorRef[];
  rejectedRefs: RejectedAnchorRef[];
}

export interface BibleEncyclopediaAnchorResult {
  metadata: {
    entryCount: number;
    anchoredCount: number;
    noAnchorCount: number;
    rejectedRefCount: number;
  };
  entries: AnchoredBibleEncyclopediaEntry[];
}

export interface BibleEncyclopediaAnchorQaReport {
  metadata: BibleEncyclopediaAnchorResult["metadata"];
  noAnchorEntries: BibleEncyclopediaAnchorQaEntry[];
  rejectedRefs: Array<RejectedAnchorRef & { entryIndex: number }>;
}

const ABSOLUTE_PATTERNS = new Set<ScriptureRefPattern>([
  "comprehensive-absolute",
  "study-absolute",
  "wiki",
]);

const CARRIED_CHAIN_PATTERNS = new Set<ScriptureRefPattern>([
  "comprehensive-chain",
  "comprehensive-relative-chapter",
  "comprehensive-relative-verse",
  "comprehensive-relative-verse-list",
  "study-chain",
  "study-relative",
]);

const OCR_BOOK_NAME_CORRECTIONS = new Map<string, string>([
  ["土师记", "士师记"],
  ["约翰相音", "约翰福音"],
  ["约翰褶音", "约翰福音"],
  ["约輸福音", "约翰福音"],
  ["约输福音", "约翰福音"],
  ["部利米哀歌", "耶利米哀歌"],
  ["马太音", "马太福音"],
  ["马太褐音", "马太福音"],
  ["约翰褐音", "约翰福音"],
  ["约瀚一书", "约翰一书"],
  ["中命记", "申命记"],
  ["罗马人书", "罗马书"],
  ["箴官", "箴言"],
  ["丝伯记", "约伯记"],
]);

const DICTIONARY_FULL_CITATION_PATTERN =
  /《([^》]{1,30})》\s*第?\s*([一二三四五六七八九十廿卅百千零〇○两兩壹贰叁0-9]+)\s*章\s*([0-9]+(?:\s*(?:[、,，]|至|到|[-–—~～])\s*[0-9]+)*)(?:\s*节)?/gu;
const CHAPTER_NUMBER_TOKEN = "[一二三四五六七八九十廿卅百千零〇○两兩壹贰叁0-9]+";
const DICTIONARY_CHAPTER_ONLY_PATTERN = new RegExp(
  `《([^》]{1,30})》\\s*第?\\s*(${CHAPTER_NUMBER_TOKEN})(?:\\s*(?:至|到|[-–—~～])\\s*(${CHAPTER_NUMBER_TOKEN}))?\\s*章(?!\\s*[0-9])`,
  "gu",
);
const MAX_CHAPTER_RANGE = 5;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function knownChineseBookTokens(): Array<{ raw: string; canonical: string }> {
  const tokens = new Map<string, string>();
  for (const book of BIBLE_BOOKS) {
    tokens.set(book.chineseName, book.chineseName);
    tokens.set(book.chineseShortName, book.chineseShortName);
    for (const alias of book.aliases) {
      if (/[\u4e00-\u9fff]/u.test(alias)) tokens.set(alias, alias);
    }
  }
  for (const [raw, canonical] of OCR_BOOK_NAME_CORRECTIONS) tokens.set(raw, canonical);
  return [...tokens].map(([raw, canonical]) => ({ raw, canonical })).sort((left, right) => right.raw.length - left.raw.length);
}

const KNOWN_CHINESE_BOOK_TOKENS = knownChineseBookTokens();

function normalizeKnownBookWhitespace(text: string): string {
  let normalized = text;
  for (const { raw, canonical } of KNOWN_CHINESE_BOOK_TOKENS) {
    const spacedToken = [...raw].map(escapeRegExp).join("\\s*");
    normalized = normalized.replace(
      new RegExp(`(?<![\\u4e00-\\u9fffA-Za-z0-9])${spacedToken}\\s*[:：]?\\s*(?=[0-9]+\\s*[:：])`, "gu"),
      canonical,
    );
  }
  return normalized;
}

export function normalizeBibleEncyclopediaCitationText(text: string): string {
  return normalizeKnownBookWhitespace(text).replace(
    DICTIONARY_FULL_CITATION_PATTERN,
    (_full, rawBook: string, chapter: string, rawVerses: string) => {
      const compactBook = rawBook.replace(/\s+/g, "");
      const book = OCR_BOOK_NAME_CORRECTIONS.get(compactBook) ?? compactBook;
      const verses = rawVerses
        .replace(/\s+/g, "")
        .replace(/[至到]/g, "-");
      return `（${book}${chapter}:${verses}）`;
    },
  );
}

function parseChapterNumber(value: string): number | null {
  if (/^\d+$/.test(value)) return Number(value);
  const normalized = value
    .replace(/[兩两]/g, "二")
    .replace(/壹/g, "一")
    .replace(/贰/g, "二")
    .replace(/叁/g, "三")
    .replace(/廿/g, "二十")
    .replace(/卅/g, "三十");
  const digits = new Map([
    ["零", 0], ["〇", 0], ["○", 0], ["一", 1], ["二", 2], ["三", 3], ["四", 4],
    ["五", 5], ["六", 6], ["七", 7], ["八", 8], ["九", 9],
  ]);
  const units = new Map([["十", 10], ["百", 100], ["千", 1000]]);
  let total = 0;
  let current = 0;
  for (const character of normalized) {
    const digit = digits.get(character);
    if (digit !== undefined) {
      current = digit;
      continue;
    }
    const unit = units.get(character);
    if (unit === undefined) return null;
    total += (current || 1) * unit;
    current = 0;
  }
  const result = total + current;
  return result > 0 ? result : null;
}

function resolveDictionaryBook(rawBook: string) {
  const compact = rawBook.replace(/\s+/g, "");
  const corrected = OCR_BOOK_NAME_CORRECTIONS.get(compact) ?? compact;
  const lower = corrected.toLocaleLowerCase();
  return BIBLE_BOOKS.find((book) =>
    book.chineseName === corrected
    || book.chineseShortName === corrected
    || book.aliases.some((alias) => alias.toLocaleLowerCase() === lower),
  );
}

function detectDictionaryChapterRefs(
  field: "title" | "body",
  text: string,
): AcceptedAnchorRef[] {
  const refs: AcceptedAnchorRef[] = [];
  for (const match of text.matchAll(DICTIONARY_CHAPTER_ONLY_PATTERN)) {
    const book = resolveDictionaryBook(match[1] ?? "");
    const chapterStart = parseChapterNumber(match[2] ?? "");
    const chapterEnd = parseChapterNumber(match[3] ?? match[2] ?? "");
    if (!book || !chapterStart || !chapterEnd || chapterEnd < chapterStart) continue;
    if (chapterEnd - chapterStart + 1 > MAX_CHAPTER_RANGE) continue;

    const verseIds: VerseId[] = [];
    for (let chapter = chapterStart; chapter <= chapterEnd; chapter += 1) {
      if (!isValidVerse(book.id, chapter, 1)) {
        verseIds.length = 0;
        break;
      }
      for (let verse = 1; isValidVerse(book.id, chapter, verse); verse += 1) {
        verseIds.push(verseIdFromParts(book.id, chapter, verse));
      }
    }
    if (verseIds.length === 0) continue;
    refs.push({
      field,
      raw: match[0],
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      confidence: "high",
      pattern: "normalized",
      verseIds,
    });
  }
  return refs;
}

function normalizeInput(raw: unknown): BibleEncyclopediaAnchorInput {
  if (Array.isArray(raw)) return { entries: raw.filter(isEntryRecord) };
  if (isEntryRecord(raw) && Array.isArray(raw.entries)) {
    return { ...raw, entries: raw.entries.filter(isEntryRecord) };
  }
  throw new Error("Anchor input must be an array or an object with an entries array.");
}

function isEntryRecord(value: unknown): value is EntryRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function entryText(entry: EntryRecord): Array<{ field: "title" | "body"; text: string }> {
  return (["title", "body"] as const)
    .map((field) => ({ field, text: typeof entry[field] === "string" ? entry[field] : "" }))
    .filter((item) => item.text.trim().length > 0);
}

function validateVerseId(verseId: string): VerseId | null {
  try {
    const parsed = parseVerseId(verseId);
    if (!isValidVerse(parsed.book, parsed.chapter, parsed.verse)) return null;
    const canonical = verseIdFromParts(parsed.book, parsed.chapter, parsed.verse);
    return canonical === verseId ? canonical : null;
  } catch {
    return null;
  }
}

function normalizeDetectedRef(
  field: "title" | "body",
  ref: DetectedScriptureRef,
): AcceptedAnchorRef | RejectedAnchorRef {
  const verseIds = uniqueVerseIds(ref.verseIds.map(validateVerseId).filter((id): id is VerseId => id !== null));
  const base = {
    field,
    raw: ref.raw,
    start: ref.start,
    end: ref.end,
    confidence: ref.confidence,
    pattern: ref.pattern,
    verseIds,
  };

  if (verseIds.length !== ref.verseIds.length) {
    return { ...base, reason: "invalid_verse_id" };
  }
  if (ref.confidence !== "high") {
    return { ...base, reason: "not_high_confidence" };
  }
  if (!ABSOLUTE_PATTERNS.has(ref.pattern) && !CARRIED_CHAIN_PATTERNS.has(ref.pattern)) {
    return { ...base, reason: "not_absolute_or_carried_chain" };
  }
  return base;
}

function isRejectedRef(ref: AcceptedAnchorRef | RejectedAnchorRef): ref is RejectedAnchorRef {
  return "reason" in ref;
}

function uniqueVerseIds(verseIds: VerseId[]): VerseId[] {
  const seen = new Set<string>();
  const result: VerseId[] = [];
  for (const id of verseIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function resolveBibleEncyclopediaAnchors(rawInput: unknown): {
  anchored: BibleEncyclopediaAnchorResult;
  qa: BibleEncyclopediaAnchorQaReport;
} {
  const input = normalizeInput(rawInput);
  const anchoredEntries: AnchoredBibleEncyclopediaEntry[] = [];
  const noAnchorEntries: BibleEncyclopediaAnchorQaEntry[] = [];
  const rejectedRefsWithEntry: Array<RejectedAnchorRef & { entryIndex: number }> = [];

  input.entries.forEach((entry, entryIndex) => {
    const textFields = entryText(entry);
    const detected = textFields.flatMap(({ field, text }) => [
      ...detectScriptureRefs(normalizeBibleEncyclopediaCitationText(text))
        .map((ref) => normalizeDetectedRef(field, ref)),
      ...detectDictionaryChapterRefs(field, text),
    ]);
    const rejectedRefs = detected.filter(isRejectedRef);
    const acceptedRefs = detected.filter((ref): ref is AcceptedAnchorRef => !isRejectedRef(ref));
    const verses = uniqueVerseIds(acceptedRefs.flatMap((ref) => ref.verseIds));

    rejectedRefsWithEntry.push(...rejectedRefs.map((ref) => ({ ...ref, entryIndex })));

    if (verses.length > 0) {
      anchoredEntries.push({
        ...entry,
        verses,
        primaryAnchor: verses[0]!,
        anchorRefs: acceptedRefs,
      });
      return;
    }

    noAnchorEntries.push({
      entry,
      reason: textFields.length === 0
        ? "missing_body_and_title"
        : detected.length === 0
          ? "no_scripture_refs_detected"
          : "no_trustworthy_anchor",
      detectedRefs: acceptedRefs,
      rejectedRefs,
    });
  });

  const metadata = {
    entryCount: input.entries.length,
    anchoredCount: anchoredEntries.length,
    noAnchorCount: noAnchorEntries.length,
    rejectedRefCount: rejectedRefsWithEntry.length,
  };

  return {
    anchored: { metadata, entries: anchoredEntries },
    qa: { metadata, noAnchorEntries, rejectedRefs: rejectedRefsWithEntry },
  };
}

async function writeJson(path: string, payload: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function cliOptions(argv: string[]): { input: string; output: string; qa: string } {
  const { values } = parseArgs({
    args: argv,
    options: {
      input: { type: "string", short: "i" },
      output: { type: "string", short: "o" },
      qa: { type: "string" },
    },
  });

  const input = values.input;
  const output = values.output;
  const qa = values.qa;
  if (!input || !output || !qa) {
    throw new Error(
      "Usage: node scripts/resolveBibleEncyclopediaAnchors.mts --input <entries-candidate.json> --output <entries-anchored.json> --qa <anchors-qa.json>",
    );
  }
  return { input, output, qa };
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = cliOptions(argv);
  const raw = JSON.parse(await readFile(options.input, "utf8")) as unknown;
  const result = resolveBibleEncyclopediaAnchors(raw);
  await writeJson(options.output, result.anchored);
  await writeJson(options.qa, result.qa);
  process.stdout.write(
    `Resolved encyclopedia anchors: ${result.anchored.metadata.anchoredCount}/${result.anchored.metadata.entryCount} anchored, ${result.anchored.metadata.noAnchorCount} QA entries, ${result.anchored.metadata.rejectedRefCount} rejected refs\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
