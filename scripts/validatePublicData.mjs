#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SHA256 = /^[a-f0-9]{64}$/;
const GIT_SHA = /^[a-f0-9]{40}$/;
const ASSET_URL = /^https:\/\/raw\.githubusercontent\.com\/Siqiho\/one-holy-bible-assets\/[a-f0-9]{40}\/assets\/([a-f0-9]{64})\.png$/;
const LOCAL_PATH = /(?:\/Users\/|\/Volumes\/|file:\/\/|(?:^|[\s"'(])[A-Za-z]:[\\/]|\\\\[^\\\s]+\\)/i;
const PRIVATE_URL = /https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2}|\[?(?:::1|fc|fd)[^\]]*\]?)(?=[:/\s"'<>),.;!?]|$)/i;
const BOOK_SOURCE_PATH = resolve(process.cwd(), "src/core/domain/bibleBooks.ts");
const BOOK_IDS = [...(await readFile(BOOK_SOURCE_PATH, "utf8")).matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((match) => match[1]);
const BOOK_ID_SET = new Set(BOOK_IDS);
const VERSION_LABELS = new Map([["cuv", "和合本"], ["kjv", "KJV"]]);

const MANIFEST_KEYS = new Set(["schemaVersion", "releaseVersion", "searchIndexUrl", "books"]);
const MANIFEST_BOOK_KEYS = new Set(["id", "url", "bytes", "sha256", "cuvVerseCount", "kjvVerseCount", "textCardCount", "imageCardCount"]);
const BOOK_KEYS = new Set(["schemaVersion", "bookId", "cuvVerses", "kjvVerses", "textCards", "imageCards"]);
const VERSE_KEYS = new Set(["id", "book", "chapter", "verse", "text"]);
const TEXT_CARD_KEYS = new Set(["id", "type", "title", "body", "verses", "primaryAnchor", "bookIntro", "summary", "searchText", "sourceLabel", "page", "coverageRanges"]);
const IMAGE_CARD_KEYS = new Set(["id", "type", "title", "body", "verses", "primaryAnchor", "bookIntro", "summary", "sourceLabel", "asset"]);
const ASSET_KEYS = new Set(["url", "sha256", "bytes", "mimeType", "width", "height"]);
const RANGE_KEYS = new Set(["start", "end"]);
const SEARCH_KEYS = new Set(["verseId", "versionId", "versionLabel", "book", "chapter", "verse", "text"]);
const ASSET_MANIFEST_KEYS = new Set(["schemaVersion", "assets"]);
const RELEASE_KEYS = new Set(["releaseVersion", "schemaVersion", "developmentSourceCommit", "bibleInputSha256", "cardInputSha256", "assetManifestSha256", "bookCount", "cuvVerseCount", "kjvVerseCount", "textCardCount", "imageCardCount", "generatedAt"]);

function fail(message) {
  throw new Error(`Unsafe public data: ${message}`);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
}

function assertOnlyKeys(value, allowed, label) {
  assertRecord(value, label);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`forbidden field at ${label}.${key}`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string") fail(`${label} must be a string`);
}

function assertNonEmptyString(value, label) {
  assertString(value, label);
  if (value.trim() === "") fail(`${label} must not be empty`);
}

function assertInteger(value, minimum, label) {
  if (!Number.isInteger(value) || value < minimum) fail(`${label} must be an integer >= ${minimum}`);
}

function assertSha(value, label) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(`${label} must be a lowercase SHA-256`);
}

function assertSafeValue(value, label = "root") {
  if (typeof value === "string") {
    if (LOCAL_PATH.test(value)) fail(`local path at ${label}`);
    if (PRIVATE_URL.test(value)) fail(`private URL at ${label}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSafeValue(entry, `${label}[${index}]`));
    return;
  }
  if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (/^(?:source(?:Workbench|Api|Asset|Pdf|Manifest|Ledger|Folder)|stored(?:Absolute|Relative)Path)$/i.test(key)) {
        fail(`private field at ${label}.${key}`);
      }
      assertSafeValue(entry, `${label}.${key}`);
    }
  }
}

function assertBookId(value, label) {
  if (typeof value !== "string" || !BOOK_ID_SET.has(value)) fail(`${label} must be a canonical Bible book ID`);
}

function assertVerseId(value, bookId, label) {
  if (typeof value !== "string" || !new RegExp(`^${bookId}\\.[1-9]\\d*\\.[1-9]\\d*$`).test(value)) {
    fail(`${label} must be a verse ID belonging to ${bookId}`);
  }
}

function assertVerse(value, bookId, label) {
  assertOnlyKeys(value, VERSE_KEYS, label);
  assertVerseId(value.id, bookId, `${label}.id`);
  if (value.book !== bookId) fail(`${label}.book must be ${bookId}`);
  assertInteger(value.chapter, 1, `${label}.chapter`);
  assertInteger(value.verse, 1, `${label}.verse`);
  if (value.id !== `${bookId}.${value.chapter}.${value.verse}`) fail(`${label}.id must match its coordinates`);
  assertString(value.text, `${label}.text`);
}

function assertCardBase(card, bookId, label) {
  for (const key of ["id", "title", "body"]) assertString(card[key], `${label}.${key}`);
  if (!Array.isArray(card.verses)) fail(`${label}.verses must be an array`);
  card.verses.forEach((verseId, index) => assertVerseId(verseId, bookId, `${label}.verses[${index}]`));
  if (card.primaryAnchor !== undefined) assertVerseId(card.primaryAnchor, bookId, `${label}.primaryAnchor`);
  if (card.bookIntro !== undefined && card.bookIntro !== bookId) fail(`${label}.bookIntro must be ${bookId}`);
  for (const key of ["summary", "sourceLabel", "searchText"]) {
    if (card[key] !== undefined) assertString(card[key], `${label}.${key}`);
  }
  if (card.page !== undefined) assertInteger(card.page, 1, `${label}.page`);
  if (card.coverageRanges !== undefined) {
    if (!Array.isArray(card.coverageRanges)) fail(`${label}.coverageRanges must be an array`);
    card.coverageRanges.forEach((range, index) => {
      const rangeLabel = `${label}.coverageRanges[${index}]`;
      assertOnlyKeys(range, RANGE_KEYS, rangeLabel);
      assertVerseId(range.start, bookId, `${rangeLabel}.start`);
      if (range.end !== undefined) assertVerseId(range.end, bookId, `${rangeLabel}.end`);
    });
  }
}

function assertAssetUrl(value, label) {
  assertString(value, label);
  const match = value.match(ASSET_URL);
  if (!match || match[1] !== value.split("/").pop().replace(/\.png$/, "")) {
    fail(`${label} must be a fixed public asset URL`);
  }
}

function assertAssetDescriptor(value, label) {
  assertOnlyKeys(value, ASSET_KEYS, label);
  assertAssetUrl(value.url, `${label}.url`);
  assertSha(value.sha256, `${label}.sha256`);
  if (value.url.match(ASSET_URL)[1] !== value.sha256) fail(`${label}.url filename must match sha256`);
  assertInteger(value.bytes, 1, `${label}.bytes`);
  if (value.mimeType !== "image/png") fail(`${label}.mimeType must be image/png`);
  assertInteger(value.width, 1, `${label}.width`);
  assertInteger(value.height, 1, `${label}.height`);
}

function assertCard(value, bookId, label, type) {
  const image = type === "image";
  assertOnlyKeys(value, image ? IMAGE_CARD_KEYS : TEXT_CARD_KEYS, label);
  if (image ? value.type !== "image" : (value.type !== "commentary" && value.type !== "note")) {
    fail(`${label}.type must be ${image ? "image" : "commentary or note"}`);
  }
  assertCardBase(value, bookId, label);
  if (image) assertAssetDescriptor(value.asset, `${label}.asset`);
}

function assertManifest(value) {
  assertOnlyKeys(value, MANIFEST_KEYS, "manifest");
  if (value.schemaVersion !== 2) fail("manifest.schemaVersion must be 2");
  if (value.releaseVersion !== "0.2.0") fail("manifest.releaseVersion must be 0.2.0");
  if (value.searchIndexUrl !== "/data/search-index.json") fail("manifest.searchIndexUrl must be /data/search-index.json");
  if (!Array.isArray(value.books) || value.books.length !== BOOK_IDS.length) fail("manifest must contain exactly 66 books");
  value.books.forEach((entry, index) => {
    const label = `manifest.books[${index}]`;
    assertOnlyKeys(entry, MANIFEST_BOOK_KEYS, label);
    if (entry.id !== BOOK_IDS[index]) fail(`${label}.id is not in canonical order`);
    assertString(entry.url, `${label}.url`);
    if (entry.url !== `/data/books/${entry.id}.json`) fail(`${label}.url is not canonical`);
    assertInteger(entry.bytes, 0, `${label}.bytes`);
    assertSha(entry.sha256, `${label}.sha256`);
    for (const key of ["cuvVerseCount", "kjvVerseCount", "textCardCount", "imageCardCount"]) assertInteger(entry[key], 0, `${label}.${key}`);
  });
}

function assertSearchEntry(value, label) {
  assertOnlyKeys(value, SEARCH_KEYS, label);
  assertBookId(value.book, `${label}.book`);
  assertVerseId(value.verseId, value.book, `${label}.verseId`);
  assertInteger(value.chapter, 1, `${label}.chapter`);
  assertInteger(value.verse, 1, `${label}.verse`);
  if (value.verseId !== `${value.book}.${value.chapter}.${value.verse}`) fail(`${label}.verseId does not match coordinates`);
  if (VERSION_LABELS.get(value.versionId) !== value.versionLabel) fail(`${label}.versionLabel does not match versionId`);
  if (value.versionId !== "cuv" && value.versionId !== "kjv") fail(`${label}.versionId must be cuv or kjv`);
  assertString(value.text, `${label}.text`);
}

function assertAssetManifest(value) {
  assertOnlyKeys(value, ASSET_MANIFEST_KEYS, "asset manifest");
  if (value.schemaVersion !== 1 || !Array.isArray(value.assets)) fail("asset manifest schema is invalid");
  const bySha = new Map();
  value.assets.forEach((asset, index) => {
    const label = `asset manifest.assets[${index}]`;
    assertAssetDescriptor(asset, label);
    if (bySha.has(asset.sha256)) fail(`${label}.sha256 is duplicated`);
    bySha.set(asset.sha256, asset);
  });
  return bySha;
}

function assertReleaseManifest(value, stats, assetManifestBytes) {
  assertOnlyKeys(value, RELEASE_KEYS, "PUBLIC_RELEASE.json");
  if (value.releaseVersion !== "0.2.0" || value.schemaVersion !== 2) fail("PUBLIC_RELEASE.json version/schema is invalid");
  if (typeof value.developmentSourceCommit !== "string" || !GIT_SHA.test(value.developmentSourceCommit)) fail("PUBLIC_RELEASE.json developmentSourceCommit is invalid");
  for (const key of ["bibleInputSha256", "cardInputSha256", "assetManifestSha256"]) assertSha(value[key], `PUBLIC_RELEASE.json.${key}`);
  for (const key of ["bookCount", "cuvVerseCount", "kjvVerseCount", "textCardCount", "imageCardCount"]) {
    assertInteger(value[key], 0, `PUBLIC_RELEASE.json.${key}`);
    if (value[key] !== stats[key]) fail(`PUBLIC_RELEASE.json.${key} does not match checked-in data`);
  }
  if (createHash("sha256").update(assetManifestBytes).digest("hex") !== value.assetManifestSha256) fail("PUBLIC_RELEASE.json.assetManifestSha256 does not match asset manifest");
  if (typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt))) fail("PUBLIC_RELEASE.json.generatedAt is invalid");
}

export async function validatePublicData(outputPath = "public/data") {
  const dataRoot = resolve(outputPath);
  const projectRoot = resolve(dataRoot, "../..");
  if (BOOK_IDS.length !== 66 || BOOK_ID_SET.size !== 66) fail("bibleBooks.ts must define exactly 66 unique books");

  const manifestBytes = await readFile(join(dataRoot, "manifest.json"));
  const manifest = JSON.parse(manifestBytes);
  assertSafeValue(manifest, "manifest");
  assertManifest(manifest);

  const assetManifestBytes = await readFile(join(dataRoot, "asset-manifest.json"));
  const assetManifest = JSON.parse(assetManifestBytes);
  assertSafeValue(assetManifest, "asset-manifest");
  const assetsBySha = assertAssetManifest(assetManifest);

  const bookFiles = (await readdir(join(dataRoot, "books"))).filter((name) => name.endsWith(".json")).sort();
  const expectedBookFiles = [...BOOK_IDS].map((bookId) => `${bookId}.json`).sort();
  if (JSON.stringify(bookFiles) !== JSON.stringify(expectedBookFiles)) fail("books directory does not contain exactly the 66 canonical packages");

  const scripture = new Map();
  let cuvVerseCount = 0;
  let kjvVerseCount = 0;
  let textCardCount = 0;
  let imageCardCount = 0;
  const referencedAssets = new Set();

  for (const [index, entry] of manifest.books.entries()) {
    const bookPath = join(dataRoot, "books", `${entry.id}.json`);
    const bytes = await readFile(bookPath);
    if (bytes.length !== entry.bytes) fail(`manifest byte count mismatch for ${entry.id}`);
    if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256) fail(`manifest sha256 mismatch for ${entry.id}`);
    const book = JSON.parse(bytes);
    const label = `books/${entry.id}.json`;
    assertSafeValue(book, label);
    assertOnlyKeys(book, BOOK_KEYS, label);
    if (book.schemaVersion !== 2 || book.bookId !== entry.id) fail(`${label} identity/schema is invalid`);
    for (const [field, versionId] of [["cuvVerses", "cuv"], ["kjvVerses", "kjv"]]) {
      if (!Array.isArray(book[field])) fail(`${label}.${field} must be an array`);
      book[field].forEach((verse, verseIndex) => {
        const verseLabel = `${label}.${field}[${verseIndex}]`;
        assertVerse(verse, entry.id, verseLabel);
        const key = `${versionId}:${verse.id}`;
        if (scripture.has(key)) fail(`duplicate scripture coordinate ${key}`);
        scripture.set(key, { ...verse, versionId, versionLabel: VERSION_LABELS.get(versionId) });
      });
    }
    if (!Array.isArray(book.textCards) || !Array.isArray(book.imageCards)) fail(`${label} card arrays are invalid`);
    book.textCards.forEach((card, cardIndex) => assertCard(card, entry.id, `${label}.textCards[${cardIndex}]`, "text"));
    book.imageCards.forEach((card, cardIndex) => {
      const cardLabel = `${label}.imageCards[${cardIndex}]`;
      assertCard(card, entry.id, cardLabel, "image");
      const knownAsset = assetsBySha.get(card.asset.sha256);
      if (!knownAsset || JSON.stringify(knownAsset) !== JSON.stringify(card.asset)) fail(`${cardLabel}.asset is missing from asset-manifest.json`);
      referencedAssets.add(card.asset.sha256);
    });
    const counts = {
      cuvVerseCount: book.cuvVerses.length,
      kjvVerseCount: book.kjvVerses.length,
      textCardCount: book.textCards.length,
      imageCardCount: book.imageCards.length,
    };
    for (const [key, value] of Object.entries(counts)) if (entry[key] !== value) fail(`${label}.${key} does not match manifest`);
    cuvVerseCount += counts.cuvVerseCount;
    kjvVerseCount += counts.kjvVerseCount;
    textCardCount += counts.textCardCount;
    imageCardCount += counts.imageCardCount;
    if (index !== BOOK_IDS.indexOf(entry.id)) fail(`${label} is not in canonical order`);
  }

  const searchBytes = await readFile(join(dataRoot, "search-index.json"));
  const searchIndex = JSON.parse(searchBytes);
  assertSafeValue(searchIndex, "search-index.json");
  if (!Array.isArray(searchIndex) || searchIndex.length !== cuvVerseCount + kjvVerseCount) fail("search index count does not match scripture counts");
  const seenSearch = new Set();
  searchIndex.forEach((entry, index) => {
    const label = `search-index.json[${index}]`;
    assertSearchEntry(entry, label);
    const key = `${entry.versionId}:${entry.verseId}`;
    if (seenSearch.has(key) || !scripture.has(key)) fail(`${label} does not map uniquely to scripture`);
    seenSearch.add(key);
    const source = scripture.get(key);
    for (const field of ["book", "chapter", "verse", "text", "versionLabel"]) if (entry[field] !== source[field]) fail(`${label}.${field} does not match scripture`);
  });
  if (seenSearch.size !== scripture.size) fail(`search index is missing ${scripture.size - seenSearch.size} scripture entries`);

  const release = JSON.parse(await readFile(join(projectRoot, "PUBLIC_RELEASE.json"), "utf8"));
  const stats = { bookCount: BOOK_IDS.length, cuvVerseCount, kjvVerseCount, textCardCount, imageCardCount };
  assertReleaseManifest(release, stats, assetManifestBytes);
  if (referencedAssets.size > assetsBySha.size) fail("referenced asset count exceeds manifest asset count");

  return {
    books: BOOK_IDS.length,
    cuvVerseCount,
    kjvVerseCount,
    textCardCount,
    imageCardCount,
    uniqueAssetCount: assetsBySha.size,
    referencedAssetCount: referencedAssets.size,
    searchEntryCount: searchIndex.length,
  };
}

async function main() {
  const stats = await validatePublicData(process.argv[2] ?? "public/data");
  process.stdout.write(`Public v0.2.0 data valid: ${stats.books} books, ${stats.cuvVerseCount} CUV verses, ${stats.kjvVerseCount} KJV verses, ${stats.textCardCount} text cards, ${stats.imageCardCount} image cards, ${stats.uniqueAssetCount} assets, ${stats.searchEntryCount} search entries\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
