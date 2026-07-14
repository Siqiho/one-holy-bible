#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const bibleBooksSource = await readFile(new URL("../src/domain/bibleBooks.ts", import.meta.url), "utf8");
const BOOK_IDS = [...bibleBooksSource.matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((match) => match[1]);
if (BOOK_IDS.length !== 66 || new Set(BOOK_IDS).size !== 66) throw new Error("BIBLE_BOOKS source must define exactly 66 unique books");
const BOOK_ID_SET = new Set(BOOK_IDS);
const privateField = ["source", "Workbench", "Path"].join("");
const UNSAFE_PUBLIC_DATA = new RegExp(
  String.raw`\/Users\/|\/Volumes\/|file:\/\/|[A-Za-z]:[\\/]|\\\\[^\\]+\\|(?:https?:\/\/)?(?:127(?:\.\d{1,3}){3}|localhost|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})(?=[:/]|$)|sourceApi(?:Base|Url)?|${privateField}|needs_review`,
  "i",
);
const MANIFEST_KEYS = new Set(["schemaVersion", "releaseVersion", "searchIndexUrl", "books"]);
const MANIFEST_BOOK_KEYS = new Set(["id", "url", "bytes", "sha256", "cuvVerseCount", "kjvVerseCount", "textCardCount"]);
const PAYLOAD_KEYS = new Set(["schemaVersion", "bookId", "cuvVerses", "kjvVerses", "textCards"]);
const VERSE_KEYS = new Set(["id", "book", "chapter", "verse", "text"]);
const CARD_KEYS = new Set(["id", "type", "title", "body", "verses", "primaryAnchor", "bookIntro", "summary", "searchText", "source", "debugMeta"]);
const PROVENANCE_KEYS = new Set(["sourceLabel", "page", "pageRange", "primaryAnchor", "coverageRanges"]);
const COVERAGE_KEYS = new Set(["start", "end"]);
const SEARCH_KEYS = new Set(["verseId", "versionId", "versionLabel", "book", "chapter", "verse", "text"]);
const VERSION_LABELS = new Map([["cuv", "和合本"], ["kjv", "KJV"]]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value, label) {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
}

function assertExactKeys(value, allowed, label) {
  assertRecord(value, label);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`Forbidden field at ${label}.${key}`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer`);
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer`);
}

function verseBook(value) {
  if (typeof value !== "string") return undefined;
  const book = value.match(/^([^.]+)\.\d+\.\d+$/)?.[1];
  return BOOK_ID_SET.has(book) ? book : undefined;
}

function assertSafeBytes(bytes, label) {
  const match = bytes.toString("utf8").match(UNSAFE_PUBLIC_DATA);
  if (match) throw new Error(`Unsafe public data in ${label}: ${match[0]}`);
}

function assertVerse(value, bookId, label) {
  assertExactKeys(value, VERSE_KEYS, label);
  assertString(value.id, `${label}.id`);
  if (value.book !== bookId) throw new Error(`${label}.book must be ${bookId}`);
  assertPositiveInteger(value.chapter, `${label}.chapter`);
  assertPositiveInteger(value.verse, `${label}.verse`);
  if (value.id !== `${bookId}.${value.chapter}.${value.verse}`) throw new Error(`${label}.id must match its coordinates`);
  assertString(value.text, `${label}.text`);
}

function assertVerseId(value, bookId, label) {
  if (verseBook(value) !== bookId) throw new Error(`${label} must belong to ${bookId}`);
}

function assertTextCard(card, bookId, label) {
  assertExactKeys(card, CARD_KEYS, label);
  if (card.type !== "commentary" && card.type !== "note") throw new Error(`${label}.type must be commentary or note`);
  for (const key of ["id", "title", "body"]) assertString(card[key], `${label}.${key}`);
  if (!Array.isArray(card.verses)) throw new Error(`${label}.verses must be an array`);
  card.verses.forEach((verseId, index) => assertVerseId(verseId, bookId, `${label}.verses[${index}]`));
  if (card.primaryAnchor !== undefined) assertVerseId(card.primaryAnchor, bookId, `${label}.primaryAnchor`);
  if (card.bookIntro !== undefined && card.bookIntro !== bookId) throw new Error(`${label}.bookIntro must be ${bookId}`);
  for (const key of ["summary", "searchText", "source"]) {
    if (card[key] !== undefined) assertString(card[key], `${label}.${key}`);
  }
  if (card.debugMeta === undefined) return;
  assertExactKeys(card.debugMeta, PROVENANCE_KEYS, `${label}.debugMeta`);
  if (card.debugMeta.sourceLabel !== undefined) assertString(card.debugMeta.sourceLabel, `${label}.debugMeta.sourceLabel`);
  if (card.debugMeta.page !== undefined) assertPositiveInteger(card.debugMeta.page, `${label}.debugMeta.page`);
  if (card.debugMeta.pageRange !== undefined) {
    if (!Array.isArray(card.debugMeta.pageRange)) throw new Error(`${label}.debugMeta.pageRange must be an array`);
    card.debugMeta.pageRange.forEach((page, index) => assertPositiveInteger(page, `${label}.debugMeta.pageRange[${index}]`));
  }
  if (card.debugMeta.primaryAnchor !== undefined) assertVerseId(card.debugMeta.primaryAnchor, bookId, `${label}.debugMeta.primaryAnchor`);
  if (card.debugMeta.coverageRanges !== undefined) {
    if (!Array.isArray(card.debugMeta.coverageRanges)) throw new Error(`${label}.debugMeta.coverageRanges must be an array`);
    card.debugMeta.coverageRanges.forEach((range, index) => {
      const rangeLabel = `${label}.debugMeta.coverageRanges[${index}]`;
      assertExactKeys(range, COVERAGE_KEYS, rangeLabel);
      assertVerseId(range.start, bookId, `${rangeLabel}.start`);
      if (range.end !== undefined) assertVerseId(range.end, bookId, `${rangeLabel}.end`);
    });
  }
}

function scriptureKey(versionId, verseId) {
  return `${versionId}:${verseId}`;
}

export async function validatePublicData(outputPath) {
  const manifestBytes = await readFile(join(outputPath, "manifest.json"));
  assertSafeBytes(manifestBytes, "manifest.json");
  const manifest = JSON.parse(manifestBytes);
  assertExactKeys(manifest, MANIFEST_KEYS, "manifest");
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.books) || manifest.books.length !== 66) {
    throw new Error("Manifest must contain exactly 66 books with schemaVersion 1");
  }
  if (JSON.stringify(manifest.books.map((book) => book.id)) !== JSON.stringify(BOOK_IDS)) {
    throw new Error("Manifest books are not in canonical BIBLE_BOOKS order");
  }
  const filenames = (await readdir(join(outputPath, "books"))).filter((name) => name.endsWith(".json")).sort();
  const expectedFilenames = BOOK_IDS.map((id) => `${id}.json`).sort();
  if (JSON.stringify(filenames) !== JSON.stringify(expectedFilenames)) throw new Error("Books directory does not contain exactly the 66 canonical packages");

  let cuvVerseCount = 0;
  let kjvVerseCount = 0;
  let textCardCount = 0;
  const scripture = new Map();
  for (const [manifestIndex, entry] of manifest.books.entries()) {
    assertExactKeys(entry, MANIFEST_BOOK_KEYS, `manifest.books[${manifestIndex}]`);
    if (!BOOK_ID_SET.has(entry.id)) throw new Error(`Unknown manifest book: ${entry.id}`);
    assertString(entry.url, `manifest.books[${manifestIndex}].url`);
    for (const key of ["bytes", "cuvVerseCount", "kjvVerseCount", "textCardCount"]) assertNonNegativeInteger(entry[key], `manifest.books[${manifestIndex}].${key}`);
    if (typeof entry.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(entry.sha256)) throw new Error(`Invalid SHA-256 for ${entry.id}`);
    const bytes = await readFile(join(outputPath, "books", `${entry.id}.json`));
    assertSafeBytes(bytes, `books/${entry.id}.json`);
    const payload = JSON.parse(bytes);
    assertExactKeys(payload, PAYLOAD_KEYS, `books/${entry.id}.json`);
    if (payload.schemaVersion !== 1 || payload.bookId !== entry.id || !Array.isArray(payload.cuvVerses) || !Array.isArray(payload.kjvVerses) || !Array.isArray(payload.textCards)) {
      throw new Error(`Malformed public book payload: ${entry.id}`);
    }
    for (const [field, versionId] of [["cuvVerses", "cuv"], ["kjvVerses", "kjv"]]) {
      payload[field].forEach((verse, index) => {
        assertVerse(verse, entry.id, `books/${entry.id}.json.${field}[${index}]`);
        const key = scriptureKey(versionId, verse.id);
        if (scripture.has(key)) throw new Error(`Duplicate scripture coordinate: ${key}`);
        scripture.set(key, { ...verse, verseId: verse.id, versionId, versionLabel: VERSION_LABELS.get(versionId) });
      });
    }
    payload.textCards.forEach((card, index) => assertTextCard(card, entry.id, `books/${entry.id}.json.textCards[${index}]`));
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256 || payload.cuvVerses.length !== entry.cuvVerseCount || payload.kjvVerses.length !== entry.kjvVerseCount || payload.textCards.length !== entry.textCardCount) {
      throw new Error(`Manifest counts, bytes, or hash mismatch for ${entry.id}`);
    }
    cuvVerseCount += payload.cuvVerses.length;
    kjvVerseCount += payload.kjvVerses.length;
    textCardCount += payload.textCards.length;
  }
  const searchBytes = await readFile(join(outputPath, "search-index.json"));
  assertSafeBytes(searchBytes, "search-index.json");
  const searchIndex = JSON.parse(searchBytes);
  if (!Array.isArray(searchIndex) || searchIndex.length !== cuvVerseCount + kjvVerseCount) throw new Error("Search index count does not match scripture counts");
  const unmatchedScripture = new Set(scripture.keys());
  searchIndex.forEach((entry, index) => {
    const label = `search-index.json[${index}]`;
    assertExactKeys(entry, SEARCH_KEYS, label);
    assertString(entry.verseId, `${label}.verseId`);
    assertString(entry.versionId, `${label}.versionId`);
    assertString(entry.versionLabel, `${label}.versionLabel`);
    const expected = scripture.get(scriptureKey(entry.versionId, entry.verseId));
    if (!expected || !unmatchedScripture.delete(scriptureKey(entry.versionId, entry.verseId))) throw new Error(`${label} does not map uniquely to generated scripture`);
    for (const key of ["verseId", "versionId", "versionLabel", "book", "chapter", "verse", "text"]) {
      if (entry[key] !== expected[key]) throw new Error(`${label}.${key} does not match generated scripture`);
    }
  });
  if (unmatchedScripture.size) throw new Error(`Search index is missing ${unmatchedScripture.size} scripture entries`);
  return { books: 66, cuvVerseCount, kjvVerseCount, textCardCount, imageCardCount: 0, unsafeMatchCount: 0, searchEntryCount: searchIndex.length };
}

async function main() {
  const outputPath = process.argv[2] ?? "public/data";
  const stats = await validatePublicData(outputPath);
  process.stdout.write(`Public data valid: ${stats.books} books, ${stats.cuvVerseCount} CUV verses, ${stats.kjvVerseCount} KJV verses, ${stats.textCardCount} text cards, ${stats.searchEntryCount} search entries, ${stats.imageCardCount} image cards, ${stats.unsafeMatchCount} unsafe matches\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
