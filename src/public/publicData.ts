import {
  isPrivateOrLocalPublicHost,
  isPublicLoopbackHost,
} from "./publicNetworkPolicy";

export type PublicDataMode = "preview" | "publish";

export interface PublicBibleVerse {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface PublicBookManifestEntry {
  id: string;
  url: string;
  bytes: number;
  sha256: string;
  cuvVerseCount: number;
  kjvVerseCount: number;
  textCardCount: number;
  imageCardCount: number;
}

export interface PublicDataManifest {
  schemaVersion: 2;
  releaseVersion: string;
  searchIndexUrl: string;
  books: PublicBookManifestEntry[];
}

export interface PublicCoverageRange {
  start: string;
  end?: string;
}

interface PublicCardBase {
  id: string;
  title: string;
  body: string;
  verses: string[];
  primaryAnchor?: string;
  bookIntro?: string;
  summary?: string;
  sourceLabel?: string;
}

export interface PublicTextCard extends PublicCardBase {
  type: "commentary" | "note";
  searchText?: string;
  page?: number;
  coverageRanges?: PublicCoverageRange[];
}

export interface PublicImageAsset {
  url: string;
  sha256: string;
  bytes: number;
  mimeType: "image/png";
  width: number;
  height: number;
}

export interface PublicImageCard extends PublicCardBase {
  type: "image";
  asset: PublicImageAsset;
}

export interface PublicBookPayload {
  schemaVersion: 2;
  bookId: string;
  cuvVerses: PublicBibleVerse[];
  kjvVerses: PublicBibleVerse[];
  textCards: PublicTextCard[];
  imageCards: PublicImageCard[];
}

export interface PublicScriptureSearchEntry {
  verseId: string;
  versionId: string;
  versionLabel: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface PublicValidationOptions {
  mode?: PublicDataMode;
}

const BOOK_IDS = new Set([
  "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam",
  "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov",
  "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos",
  "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal", "Matt",
  "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil",
  "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet",
  "2Pet", "1John", "2John", "3John", "Jude", "Rev",
]);
const SHA256 = /^[0-9a-f]{64}$/;
const MANIFEST_KEYS = new Set(["schemaVersion", "releaseVersion", "searchIndexUrl", "books"]);
const MANIFEST_BOOK_KEYS = new Set([
  "id", "url", "bytes", "sha256", "cuvVerseCount", "kjvVerseCount", "textCardCount", "imageCardCount",
]);
const BOOK_KEYS = new Set(["schemaVersion", "bookId", "cuvVerses", "kjvVerses", "textCards", "imageCards"]);
const VERSE_KEYS = new Set(["id", "book", "chapter", "verse", "text"]);
const TEXT_CARD_KEYS = new Set([
  "id", "type", "title", "body", "verses", "primaryAnchor", "bookIntro", "summary",
  "searchText", "sourceLabel", "page", "coverageRanges",
]);
const IMAGE_CARD_KEYS = new Set([
  "id", "type", "title", "body", "verses", "primaryAnchor", "bookIntro", "summary", "sourceLabel", "asset",
]);
const ASSET_KEYS = new Set(["url", "sha256", "bytes", "mimeType", "width", "height"]);
const RANGE_KEYS = new Set(["start", "end"]);
const SEARCH_ENTRY_KEYS = new Set(["verseId", "versionId", "versionLabel", "book", "chapter", "verse", "text"]);
const LOCAL_PATH = /(?:\/Users\/|\/Volumes\/|file:\/\/|(?:^|[\s\"'(])[A-Za-z]:[\\/])/i;

function fail(message: string): never {
  throw new Error(`Unsafe public data: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) fail(`${label} must be an object`);
}

function assertOnlyKeys(value: Record<string, unknown>, allowed: Set<string>, label: string) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`forbidden field at ${label}.${key}`);
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") fail(`${label} must be a string`);
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  assertString(value, label);
  if (value.trim() === "") fail(`${label} must not be empty`);
}

function assertInteger(value: unknown, minimum: number, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < minimum) {
    fail(`${label} must be an integer greater than or equal to ${minimum}`);
  }
}

function assertBookId(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !BOOK_IDS.has(value)) fail(`${label} must be a canonical Bible book ID`);
}

function isLoopbackHost(hostname: string) {
  return isPublicLoopbackHost(hostname);
}

function isPrivateHost(hostname: string) {
  return isPrivateOrLocalPublicHost(hostname);
}

function assertAssetUrl(value: unknown, mode: PublicDataMode, label: string): asserts value is string {
  assertString(value, label);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${label} must be an absolute asset URL`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) fail(`${label} must not contain credentials, query, or fragment`);
  if (mode === "publish" && parsed.protocol !== "https:") fail(`${label} must use HTTPS in publish mode`);
  if (mode === "preview") {
    if (parsed.protocol === "http:" && !isLoopbackHost(parsed.hostname)) fail(`${label} HTTP preview URL must use a loopback host`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") fail(`${label} must use HTTP(S)`);
  }
  if (isPrivateHost(parsed.hostname) && !(mode === "preview" && isLoopbackHost(parsed.hostname))) {
    fail(`${label} must not use a private host`);
  }
}

function assertSafeStrings(value: unknown, mode: PublicDataMode, path = "root") {
  if (typeof value === "string") {
    if (LOCAL_PATH.test(value)) fail(`local path at ${path}`);
    const urls = value.match(/https?:\/\/(?:\[[^\]]+\]|[^\s\"'<>]+)/gi) ?? [];
    for (const rawUrl of urls) {
      const candidate = rawUrl.replace(/[),.;!?]+$/, "");
      try {
        const parsed = new URL(candidate);
        const isAllowedAssetLoopback = path.endsWith(".asset.url") && mode === "preview" && isLoopbackHost(parsed.hostname);
        if (isPrivateHost(parsed.hostname) && !isAllowedAssetLoopback) fail(`private URL at ${path}`);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Unsafe public data:")) throw error;
        fail(`malformed URL at ${path}`);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSafeStrings(entry, mode, `${path}[${index}]`));
    return;
  }
  if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) assertSafeStrings(entry, mode, `${path}.${key}`);
  }
}

function assertVerseId(value: unknown, bookId: string, label: string): asserts value is string {
  if (typeof value !== "string" || !new RegExp(`^${bookId}\\.[1-9]\\d*\\.[1-9]\\d*$`).test(value)) {
    fail(`${label} must be a verse ID belonging to ${bookId}`);
  }
}

function assertVerse(value: unknown, bookId: string, label: string) {
  assertRecord(value, label);
  assertOnlyKeys(value, VERSE_KEYS, label);
  assertVerseId(value.id, bookId, `${label}.id`);
  if (value.book !== bookId) fail(`${label}.book must be ${bookId}`);
  assertInteger(value.chapter, 1, `${label}.chapter`);
  assertInteger(value.verse, 1, `${label}.verse`);
  if (value.id !== `${bookId}.${value.chapter}.${value.verse}`) fail(`${label}.id must match its coordinates`);
  assertString(value.text, `${label}.text`);
}

function assertCardBase(card: Record<string, unknown>, bookId: string, label: string) {
  for (const field of ["id", "title", "body"] as const) assertString(card[field], `${label}.${field}`);
  if (!Array.isArray(card.verses)) fail(`${label}.verses must be an array`);
  card.verses.forEach((verseId, index) => assertVerseId(verseId, bookId, `${label}.verses[${index}]`));
  if (card.primaryAnchor !== undefined) assertVerseId(card.primaryAnchor, bookId, `${label}.primaryAnchor`);
  if (card.bookIntro !== undefined && card.bookIntro !== bookId) fail(`${label}.bookIntro must be ${bookId}`);
  for (const field of ["summary", "sourceLabel"] as const) {
    if (card[field] !== undefined) assertString(card[field], `${label}.${field}`);
  }
}

export function validatePublicManifest(value: unknown, options: PublicValidationOptions = {}): PublicDataManifest {
  const mode = options.mode ?? "publish";
  assertSafeStrings(value, mode);
  assertRecord(value, "manifest");
  assertOnlyKeys(value, MANIFEST_KEYS, "manifest");
  if (value.schemaVersion !== 2) fail("manifest.schemaVersion must be 2");
  assertNonEmptyString(value.releaseVersion, "manifest.releaseVersion");
  assertString(value.searchIndexUrl, "manifest.searchIndexUrl");
  if (!/^\/data\/(?!.*(?:^|\/)\.\.?\/)[A-Za-z0-9._/-]+\.json$/.test(value.searchIndexUrl)) {
    fail("manifest.searchIndexUrl must be a rooted public data JSON URL");
  }
  if (!Array.isArray(value.books)) fail("manifest.books must be an array");
  const seen = new Set<string>();
  value.books.forEach((entry, index) => {
    const label = `manifest.books[${index}]`;
    assertRecord(entry, label);
    assertOnlyKeys(entry, MANIFEST_BOOK_KEYS, label);
    assertBookId(entry.id, `${label}.id`);
    if (seen.has(entry.id)) fail(`${label}.id must be unique`);
    seen.add(entry.id);
    assertString(entry.url, `${label}.url`);
    if (entry.url !== `/data/books/${entry.id}.json`) fail(`${label}.url must match its canonical book ID`);
    assertInteger(entry.bytes, 0, `${label}.bytes`);
    if (typeof entry.sha256 !== "string" || !SHA256.test(entry.sha256)) fail(`${label}.sha256 must be a lowercase SHA-256`);
    for (const field of ["cuvVerseCount", "kjvVerseCount", "textCardCount", "imageCardCount"] as const) {
      assertInteger(entry[field], 0, `${label}.${field}`);
    }
  });
  return value as unknown as PublicDataManifest;
}

export function validatePublicBookPayload(value: unknown, options: PublicValidationOptions = {}): PublicBookPayload {
  const mode = options.mode ?? "publish";
  assertRecord(value, "book payload");
  assertOnlyKeys(value, BOOK_KEYS, "book payload");
  if (value.schemaVersion !== 2) fail("book payload.schemaVersion must be 2");
  assertBookId(value.bookId, "book payload.bookId");
  const bookId = value.bookId;
  for (const field of ["cuvVerses", "kjvVerses"] as const) {
    if (!Array.isArray(value[field])) fail(`book payload.${field} must be an array`);
    value[field].forEach((verse, index) => assertVerse(verse, bookId, `book payload.${field}[${index}]`));
  }
  if (!Array.isArray(value.textCards)) fail("book payload.textCards must be an array");
  value.textCards.forEach((card, index) => {
    const label = `book payload.textCards[${index}]`;
    assertRecord(card, label);
    assertOnlyKeys(card, TEXT_CARD_KEYS, label);
    if (card.type !== "commentary" && card.type !== "note") fail(`${label}.type must be commentary or note`);
    assertCardBase(card, bookId, label);
    if (card.searchText !== undefined) assertString(card.searchText, `${label}.searchText`);
    if (card.page !== undefined) assertInteger(card.page, 1, `${label}.page`);
    if (card.coverageRanges !== undefined) {
      if (!Array.isArray(card.coverageRanges)) fail(`${label}.coverageRanges must be an array`);
      card.coverageRanges.forEach((range, rangeIndex) => {
        const rangeLabel = `${label}.coverageRanges[${rangeIndex}]`;
        assertRecord(range, rangeLabel);
        assertOnlyKeys(range, RANGE_KEYS, rangeLabel);
        assertVerseId(range.start, bookId, `${rangeLabel}.start`);
        if (range.end !== undefined) assertVerseId(range.end, bookId, `${rangeLabel}.end`);
      });
    }
  });
  if (!Array.isArray(value.imageCards)) fail("book payload.imageCards must be an array");
  value.imageCards.forEach((card, index) => {
    const label = `book payload.imageCards[${index}]`;
    assertRecord(card, label);
    assertOnlyKeys(card, IMAGE_CARD_KEYS, label);
    if (card.type !== "image") fail(`${label}.type must be image`);
    assertCardBase(card, bookId, label);
    assertRecord(card.asset, `${label}.asset`);
    assertOnlyKeys(card.asset, ASSET_KEYS, `${label}.asset`);
    assertAssetUrl(card.asset.url, mode, `${label}.asset.url`);
    if (typeof card.asset.sha256 !== "string" || !SHA256.test(card.asset.sha256)) fail(`${label}.asset.sha256 must be a lowercase SHA-256`);
    assertInteger(card.asset.bytes, 1, `${label}.asset.bytes`);
    if (card.asset.mimeType !== "image/png") fail(`${label}.asset.mimeType must be image/png`);
    assertInteger(card.asset.width, 1, `${label}.asset.width`);
    assertInteger(card.asset.height, 1, `${label}.asset.height`);
  });
  assertSafeStrings(value, mode);
  return value as unknown as PublicBookPayload;
}

export function validatePublicSearchIndex(value: unknown): PublicScriptureSearchEntry[] {
  assertSafeStrings(value, "publish");
  if (!Array.isArray(value)) fail("search index must be an array");
  value.forEach((entry, index) => {
    const label = `search index[${index}]`;
    assertRecord(entry, label);
    assertOnlyKeys(entry, SEARCH_ENTRY_KEYS, label);
    assertBookId(entry.book, `${label}.book`);
    assertVerseId(entry.verseId, entry.book, `${label}.verseId`);
    assertInteger(entry.chapter, 1, `${label}.chapter`);
    assertInteger(entry.verse, 1, `${label}.verse`);
    if (entry.verseId !== `${entry.book}.${entry.chapter}.${entry.verse}`) fail(`${label}.verseId must match its coordinates`);
    for (const field of ["versionId", "versionLabel", "text"] as const) assertString(entry[field], `${label}.${field}`);
  });
  return value as PublicScriptureSearchEntry[];
}
