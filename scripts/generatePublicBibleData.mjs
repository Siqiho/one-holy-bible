#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";

const bibleBooksSource = await readFile(new URL("../src/domain/bibleBooks.ts", import.meta.url), "utf8");
const BOOK_IDS = [...bibleBooksSource.matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((match) => match[1]);
if (BOOK_IDS.length !== 66 || new Set(BOOK_IDS).size !== 66) throw new Error("BIBLE_BOOKS source must define exactly 66 unique books");
const BOOK_ID_SET = new Set(BOOK_IDS);
const privateWorkbenchField = ["source", "Workbench", "Path"].join("");
const UNSAFE_PUBLIC_DATA = new RegExp(
  String.raw`\/Users\/|\/Volumes\/|file:\/\/|[A-Za-z]:[\\/]|\\\\[^\\]+\\|(?:https?:\/\/)?(?:127(?:\.\d{1,3}){3}|localhost|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})(?=[:/]|$)|sourceApi(?:Base|Url)?|${privateWorkbenchField}|needs_review`,
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
const EXPECTED_SEARCH_INDEX_URL = "/data/search-index.json";
const SAFE_RELEASE_VERSION = /^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$/;

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(stableValue(value), null, 2)}\n`);
}

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

function assertReleaseVersion(value, label) {
  assertString(value, label);
  if (!SAFE_RELEASE_VERSION.test(value)) throw new Error(`${label} must be a non-empty safe release identifier`);
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer`);
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer`);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!flag.startsWith("--")) throw new Error(`Unexpected argument: ${flag}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    args[flag.slice(2)] = value;
    index += 1;
  }
  return args;
}

function isSameOrDescendant(candidate, ancestor) {
  const relation = relative(ancestor, candidate);
  return relation === "" || (relation !== ".." && !relation.startsWith(`..${sep}`) && !isAbsolute(relation));
}

async function lstatIfPresent(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

async function assertNoSymlinks(path, label) {
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(path, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`${label} must not contain symbolic links`);
    if (entry.isDirectory()) await assertNoSymlinks(entryPath, label);
  }
}

async function assertDedicatedExistingOutput(outputPath) {
  const requiredEntries = [
    ["manifest.json", "file"],
    ["search-index.json", "file"],
    ["books", "directory"],
  ];
  for (const [name, kind] of requiredEntries) {
    const entry = await lstatIfPresent(join(outputPath, name));
    const matchesKind = kind === "file" ? entry?.isFile() : entry?.isDirectory();
    if (!matchesKind || entry.isSymbolicLink()) {
      throw new Error("Existing output is not a dedicated public-data directory");
    }
  }
  await assertNoSymlinks(outputPath, "Existing output");
}

async function safeGenerationTarget({ biblePath, resourcesPath, outputPath }) {
  if (typeof outputPath !== "string" || outputPath.trim() === "") throw new Error("--output is required");
  const lexicalOutput = resolve(outputPath);
  const outputName = basename(lexicalOutput);
  if (!outputName || outputName === "." || outputName === "..") throw new Error("Unsafe output directory");

  const outputEntry = await lstatIfPresent(lexicalOutput);
  if (outputEntry?.isSymbolicLink()) throw new Error("Output directory must not be a symbolic link");
  if (outputEntry && !outputEntry.isDirectory()) throw new Error("Output path must be a directory");

  const parentPath = await realpath(dirname(lexicalOutput));
  const resolvedOutput = join(parentPath, outputName);
  if (outputEntry && await realpath(lexicalOutput) !== resolvedOutput) throw new Error("Output path resolution is unsafe");

  const [repositoryRoot, workingDirectory, userHome, resolvedBible, resolvedResources] = await Promise.all([
    realpath(new URL("..", import.meta.url)),
    realpath(process.cwd()),
    realpath(homedir()),
    realpath(resolve(biblePath)),
    realpath(resolve(resourcesPath)),
  ]);
  const filesystemRoot = parse(resolvedOutput).root;
  const protectedPaths = [repositoryRoot, workingDirectory, userHome, resolvedBible, resolvedResources];
  if (resolvedOutput === filesystemRoot || protectedPaths.some((protectedPath) => isSameOrDescendant(protectedPath, resolvedOutput))) {
    throw new Error("Output must not be a protected path or an ancestor of the repository, working directory, home, or inputs");
  }
  if ([resolvedBible, resolvedResources].some((inputPath) => isSameOrDescendant(resolvedOutput, inputPath))) {
    throw new Error("Output must not overlap a source input");
  }

  if (outputEntry) await assertDedicatedExistingOutput(resolvedOutput);
  return { outputPath: resolvedOutput, outputExists: Boolean(outputEntry), outputName, parentPath };
}

function assertBoundedSibling(path, parentPath, outputName, kind) {
  const prefix = `.${outputName}.${kind}-`;
  if (dirname(path) !== parentPath || !basename(path).startsWith(prefix)) {
    throw new Error(`Refusing unbounded ${kind} path`);
  }
}

async function replaceGeneratedOutput({ temporaryPath, target }) {
  assertBoundedSibling(temporaryPath, target.parentPath, target.outputName, "generate");
  if (!target.outputExists) {
    await rename(temporaryPath, target.outputPath);
    return;
  }

  const previousPath = join(target.parentPath, `.${target.outputName}.previous-${randomUUID()}`);
  assertBoundedSibling(previousPath, target.parentPath, target.outputName, "previous");
  await rename(target.outputPath, previousPath);
  try {
    await rename(temporaryPath, target.outputPath);
  } catch (error) {
    await rename(previousPath, target.outputPath);
    throw error;
  }
  await rm(previousPath, { recursive: true, force: false });
}

function verseBook(value) {
  if (typeof value !== "string") return undefined;
  const book = value.match(/^([^.]+)\.\d+\.\d+$/)?.[1];
  return BOOK_ID_SET.has(book) ? book : undefined;
}

function resourceBook(resource) {
  if (BOOK_ID_SET.has(resource.bookIntro)) return resource.bookIntro;
  return verseBook(resource.primaryAnchor) || verseBook(resource.debugMeta?.primaryAnchor) || verseBook(resource.verses?.[0]);
}

function safeOptionalString(target, source, key) {
  if (typeof source[key] === "string") target[key] = source[key];
}

function publicVerse(verse) {
  return { id: verse.id, book: verse.book, chapter: verse.chapter, verse: verse.verse, text: verse.text };
}

function sanitizeResource(resource, bookId) {
  const card = {
    id: resource.id,
    type: resource.type,
    title: resource.title,
    body: resource.body,
    verses: Array.isArray(resource.verses) ? resource.verses.filter((verse) => verseBook(verse) === bookId) : [],
  };
  const primaryAnchor = verseBook(resource.primaryAnchor) === bookId ? resource.primaryAnchor : undefined;
  if (primaryAnchor) card.primaryAnchor = primaryAnchor;
  if (resource.bookIntro === bookId) card.bookIntro = bookId;
  for (const key of ["summary", "searchText", "source"]) safeOptionalString(card, resource, key);

  const rawMeta = resource.debugMeta;
  if (rawMeta && typeof rawMeta === "object") {
    const debugMeta = {};
    safeOptionalString(debugMeta, rawMeta, "sourceLabel");
    if (Number.isInteger(rawMeta.page) && rawMeta.page > 0) debugMeta.page = rawMeta.page;
    if (Array.isArray(rawMeta.pageRange)) {
      const pageRange = rawMeta.pageRange.filter((page) => Number.isInteger(page) && page > 0);
      if (pageRange.length) debugMeta.pageRange = pageRange;
    }
    if (verseBook(rawMeta.primaryAnchor) === bookId) debugMeta.primaryAnchor = rawMeta.primaryAnchor;
    if (Array.isArray(rawMeta.coverageRanges)) {
      const coverageRanges = rawMeta.coverageRanges.flatMap((range) => {
        if (!range || verseBook(range.start) !== bookId || (range.end !== undefined && verseBook(range.end) !== bookId)) return [];
        return [{ start: range.start, ...(range.end === undefined ? {} : { end: range.end }) }];
      });
      if (coverageRanges.length) debugMeta.coverageRanges = coverageRanges;
    }
    if (Object.keys(debugMeta).length) card.debugMeta = debugMeta;
  }
  return card;
}

function scriptureSearchEntries(bible) {
  return [bible.cuvBible, bible.kjvBible].flatMap((version) => {
    if (!version || !Array.isArray(version.verses)) throw new Error("Bible input must contain cuvBible and kjvBible verse arrays");
    return version.verses.map((verse) => ({
      verseId: verse.id,
      versionId: version.id,
      versionLabel: version.label,
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
    }));
  });
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

async function validateOutput(outputPath) {
  const manifestBytes = await readFile(join(outputPath, "manifest.json"));
  assertSafeBytes(manifestBytes, "manifest.json");
  const manifest = JSON.parse(manifestBytes);
  assertExactKeys(manifest, MANIFEST_KEYS, "manifest");
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.books) || manifest.books.length !== 66) {
    throw new Error("Manifest must contain exactly 66 books with schemaVersion 1");
  }
  assertReleaseVersion(manifest.releaseVersion, "manifest.releaseVersion");
  if (manifest.searchIndexUrl !== EXPECTED_SEARCH_INDEX_URL) {
    throw new Error(`manifest.searchIndexUrl must be ${EXPECTED_SEARCH_INDEX_URL}`);
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

async function generate({ biblePath, resourcesPath, outputPath, releaseVersion }) {
  assertReleaseVersion(releaseVersion, "--release-version");
  const target = await safeGenerationTarget({ biblePath, resourcesPath, outputPath });
  const bible = JSON.parse(await readFile(biblePath, "utf8"));
  const resourceInput = JSON.parse(await readFile(resourcesPath, "utf8"));
  if (!Array.isArray(resourceInput.resources)) throw new Error("Resources input must contain a resources array");
  const resourcesByBook = new Map(BOOK_IDS.map((id) => [id, []]));
  for (const resource of resourceInput.resources) {
    if (resource.type !== "commentary" && resource.type !== "note") continue;
    const bookId = resourceBook(resource);
    if (!bookId) throw new Error(`Cannot determine canonical book for text resource: ${resource.id ?? "unknown"}`);
    resourcesByBook.get(bookId).push(sanitizeResource(resource, bookId));
  }

  const temporaryPath = join(target.parentPath, `.${target.outputName}.generate-${randomUUID()}`);
  assertBoundedSibling(temporaryPath, target.parentPath, target.outputName, "generate");
  await mkdir(temporaryPath, { mode: 0o700 });
  await mkdir(join(temporaryPath, "books"), { mode: 0o700 });
  try {
    const manifestBooks = [];
    for (const bookId of BOOK_IDS) {
      const payload = {
        schemaVersion: 1,
        bookId,
        cuvVerses: bible.cuvBible.verses.filter((verse) => verse.book === bookId).map(publicVerse),
        kjvVerses: bible.kjvBible.verses.filter((verse) => verse.book === bookId).map(publicVerse),
        textCards: resourcesByBook.get(bookId),
      };
      const bytes = jsonBytes(payload);
      assertSafeBytes(bytes, `books/${bookId}.json`);
      await writeFile(join(temporaryPath, "books", `${bookId}.json`), bytes);
      manifestBooks.push({
        id: bookId,
        url: `/data/books/${bookId}.json`,
        bytes: bytes.length,
        sha256: sha256(bytes),
        cuvVerseCount: payload.cuvVerses.length,
        kjvVerseCount: payload.kjvVerses.length,
        textCardCount: payload.textCards.length,
      });
    }
    const searchBytes = jsonBytes(scriptureSearchEntries(bible));
    assertSafeBytes(searchBytes, "search-index.json");
    await writeFile(join(temporaryPath, "search-index.json"), searchBytes);
    await writeFile(join(temporaryPath, "manifest.json"), jsonBytes({ schemaVersion: 1, releaseVersion, searchIndexUrl: EXPECTED_SEARCH_INDEX_URL, books: manifestBooks }));
    const result = await validateOutput(temporaryPath);
    await replaceGeneratedOutput({ temporaryPath, target });
    return result;
  } catch (error) {
    await rm(temporaryPath, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stats = args["validate-only"]
    ? await validateOutput(args["validate-only"])
    : await generate({ biblePath: args.bible, resourcesPath: args.resources, outputPath: args.output, releaseVersion: args["release-version"] });
  process.stdout.write(`Public data valid: ${stats.books} books, ${stats.cuvVerseCount} CUV verses, ${stats.kjvVerseCount} KJV verses, ${stats.textCardCount} text cards, ${stats.searchEntryCount} search entries, ${stats.imageCardCount} image cards, ${stats.unsafeMatchCount} unsafe matches\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
