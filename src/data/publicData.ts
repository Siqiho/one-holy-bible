import type { BibleVerse, BibleVersion } from "../domain/bible";
import { BIBLE_BOOKS } from "../domain/bibleBooks";
import type { StudyResource } from "../domain/resources";

export interface PublicBookManifestEntry {
  id: string;
  url: string;
  bytes: number;
  sha256: string;
  cuvVerseCount: number;
  kjvVerseCount: number;
  textCardCount: number;
}

export interface PublicDataManifest {
  schemaVersion: 1;
  releaseVersion: string;
  searchIndexUrl: string;
  books: PublicBookManifestEntry[];
}

export interface PublicBookPayload {
  schemaVersion: 1;
  bookId: string;
  cuvVerses: BibleVersion["verses"];
  kjvVerses: BibleVersion["verses"];
  textCards: StudyResource[];
}

export interface PublicScriptureSearchEntry {
  verseId: BibleVerse["id"];
  versionId: BibleVersion["id"];
  versionLabel: BibleVersion["label"];
  book: BibleVerse["book"];
  chapter: BibleVerse["chapter"];
  verse: BibleVerse["verse"];
  text: BibleVerse["text"];
}

const CANONICAL_BOOK_IDS = new Set(BIBLE_BOOKS.map((book) => book.id));
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/;
const UNSAFE_PUBLIC_STRING = /\/Users\/|file:\/\/|127\.0\.0\.1|localhost/i;
const UNSAFE_SOURCE_FIELD = /^sourceApi|^sourceWorkbench(?:Path|Url|Api)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(`Unsafe public data: ${message}`);
}

function assertSafePublicData(value: unknown, path = "root"): void {
  if (typeof value === "string" && UNSAFE_PUBLIC_STRING.test(value)) {
    fail(`local path or URL at ${path}`);
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSafePublicData(entry, `${path}[${index}]`));
    return;
  }

  if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (UNSAFE_SOURCE_FIELD.test(key)) {
        fail(`source API field at ${path}.${key}`);
      }
      assertSafePublicData(entry, `${path}.${key}`);
    }
  }
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${label} must be an object`);
  }
}

function assertCanonicalBookId(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !CANONICAL_BOOK_IDS.has(value)) {
    fail(`${label} must be a canonical Bible book ID`);
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") {
    fail(`${label} must be a string`);
  }
}

function assertNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    fail(`${label} must be a non-negative integer`);
  }
}

function assertVerseIdForBook(value: unknown, bookId: string, label: string): asserts value is BibleVerse["id"] {
  if (typeof value !== "string" || !value.startsWith(`${bookId}.`)) {
    fail(`${label} must belong to ${bookId}`);
  }
}

function assertBibleVerse(value: unknown, bookId: string, label: string): asserts value is BibleVerse {
  assertRecord(value, label);
  assertVerseIdForBook(value.id, bookId, `${label}.id`);
  if (value.book !== bookId) {
    fail(`${label}.book must be ${bookId}`);
  }
  if (!Number.isInteger(value.chapter) || (value.chapter as number) < 1) {
    fail(`${label}.chapter must be a positive integer`);
  }
  if (!Number.isInteger(value.verse) || (value.verse as number) < 1) {
    fail(`${label}.verse must be a positive integer`);
  }
  if (value.id !== `${bookId}.${value.chapter}.${value.verse}`) {
    fail(`${label}.id must match its book, chapter, and verse`);
  }
  assertString(value.text, `${label}.text`);
}

export function validatePublicManifest(value: unknown): PublicDataManifest {
  assertSafePublicData(value);
  assertRecord(value, "manifest");
  if (value.schemaVersion !== 1) {
    fail("manifest.schemaVersion must be 1");
  }
  assertString(value.releaseVersion, "manifest.releaseVersion");
  assertString(value.searchIndexUrl, "manifest.searchIndexUrl");
  if (!Array.isArray(value.books)) {
    fail("manifest.books must be an array");
  }

  value.books.forEach((book, index) => {
    const label = `manifest.books[${index}]`;
    assertRecord(book, label);
    assertCanonicalBookId(book.id, `${label}.id`);
    assertString(book.url, `${label}.url`);
    assertNonNegativeInteger(book.bytes, `${label}.bytes`);
    if (typeof book.sha256 !== "string" || !LOWERCASE_SHA256.test(book.sha256)) {
      fail(`${label}.sha256 must be a 64-character lowercase hexadecimal hash`);
    }
    assertNonNegativeInteger(book.cuvVerseCount, `${label}.cuvVerseCount`);
    assertNonNegativeInteger(book.kjvVerseCount, `${label}.kjvVerseCount`);
    assertNonNegativeInteger(book.textCardCount, `${label}.textCardCount`);
  });

  return value as unknown as PublicDataManifest;
}

export function validatePublicBookPayload(value: unknown): PublicBookPayload {
  assertSafePublicData(value);
  assertRecord(value, "book payload");
  if (value.schemaVersion !== 1) {
    fail("book payload.schemaVersion must be 1");
  }
  assertCanonicalBookId(value.bookId, "book payload.bookId");
  const bookId = value.bookId;

  for (const field of ["cuvVerses", "kjvVerses"] as const) {
    const verses = value[field];
    if (!Array.isArray(verses)) {
      fail(`book payload.${field} must be an array`);
    }
    verses.forEach((verse, index) => assertBibleVerse(verse, bookId, `book payload.${field}[${index}]`));
  }

  if (!Array.isArray(value.textCards)) {
    fail("book payload.textCards must be an array");
  }
  value.textCards.forEach((card, index) => {
    const label = `book payload.textCards[${index}]`;
    assertRecord(card, label);
    if (card.type === "image") {
      throw new Error(`Image resources are not allowed in public book payloads: ${label}`);
    }
    if (card.type !== "commentary" && card.type !== "note") {
      fail(`${label}.type must be commentary or note`);
    }
    assertString(card.id, `${label}.id`);
    assertString(card.title, `${label}.title`);
    assertString(card.body, `${label}.body`);
    if (!Array.isArray(card.verses)) {
      fail(`${label}.verses must be an array`);
    }
    card.verses.forEach((verseId, verseIndex) =>
      assertVerseIdForBook(verseId, bookId, `${label}.verses[${verseIndex}]`),
    );
  });

  return value as unknown as PublicBookPayload;
}
