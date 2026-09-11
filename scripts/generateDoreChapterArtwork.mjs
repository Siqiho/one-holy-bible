#!/usr/bin/env node
/**
 * Generate chapter-level Doré Bible artwork for the reader view.
 *
 * Reads the downloaded Doré illustration set (241 plates + manifest.tsv),
 * maps each canonical plate to the chapter it depicts, picks one plate per
 * chapter (lowest page order wins), downscales it with macOS `sips`, and
 * writes:
 *   - public/resources/dore/<page>_<Book>.<chapter>.jpg
 *   - src/data/generated/doreChapterArtwork.json
 *
 * Usage:
 *   node scripts/generateDoreChapterArtwork.mjs \
 *     --source "/Users/simon/OHB/多雷圣经插图_高清版_241幅_2026-07-17"
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const defaultSource = "/Users/simon/OHB/多雷圣经插图_高清版_241幅_2026-07-17";
const sourceArgIndex = process.argv.indexOf("--source");
const sourceDir = sourceArgIndex > -1 ? process.argv[sourceArgIndex + 1] : defaultSource;
const outputImageDir = path.join(projectRoot, "public", "resources", "dore");
const outputJsonPath = path.join(projectRoot, "src", "data", "generated", "doreChapterArtwork.json");
const maxPixelSize = 1200;

/**
 * Old Testament plates carry no scripture reference in the manifest, so the
 * chapter comes from the canonical subject of each Doré plate (keyed by the
 * manifest page order). Apocrypha plates (Tobit, Judith, Additions to Daniel,
 * Maccabees, Baruch) are intentionally absent: those books are outside the
 * 66-book canon this app ships.
 */
const oldTestamentChapterByPage = {
  1: ["Gen", 1], 2: ["Gen", 2], 3: ["Gen", 3], 4: ["Gen", 4], 5: ["Gen", 4],
  6: ["Gen", 7], 7: ["Gen", 7], 8: ["Gen", 8], 9: ["Gen", 9], 10: ["Gen", 11],
  11: ["Gen", 12], 12: ["Gen", 18], 13: ["Gen", 19], 14: ["Gen", 21], 15: ["Gen", 21],
  16: ["Gen", 22], 17: ["Gen", 23], 18: ["Gen", 24], 19: ["Gen", 24], 20: ["Gen", 27],
  21: ["Gen", 28], 22: ["Gen", 29], 23: ["Gen", 32], 24: ["Gen", 32], 25: ["Gen", 33],
  26: ["Gen", 37], 27: ["Gen", 41], 28: ["Gen", 45], 29: ["Gen", 46],
  30: ["Exod", 2], 31: ["Exod", 2], 32: ["Exod", 7], 33: ["Exod", 9], 34: ["Exod", 10],
  35: ["Exod", 12], 36: ["Exod", 12], 37: ["Exod", 14], 38: ["Exod", 19], 39: ["Exod", 34],
  40: ["Num", 16], 41: ["Exod", 17], 42: ["Exod", 32], 43: ["Num", 13], 44: ["Num", 21],
  45: ["Num", 22],
  46: ["Josh", 3], 47: ["Josh", 5], 48: ["Josh", 6], 49: ["Josh", 6], 50: ["Josh", 7],
  51: ["Josh", 8], 52: ["Josh", 10], 53: ["Josh", 10],
  54: ["Judg", 4], 55: ["Judg", 5], 56: ["Judg", 7], 57: ["Judg", 7], 58: ["Judg", 9],
  59: ["Judg", 9], 60: ["Judg", 11], 61: ["Judg", 11], 62: ["Judg", 14], 63: ["Judg", 15],
  64: ["Judg", 16], 65: ["Judg", 16], 66: ["Judg", 16], 67: ["Judg", 19], 68: ["Judg", 19],
  69: ["Judg", 21],
  70: ["Ruth", 1], 71: ["Ruth", 2],
  72: ["1Sam", 6], 73: ["1Sam", 9], 74: ["1Sam", 15], 75: ["1Sam", 17], 76: ["1Sam", 18],
  77: ["1Sam", 19], 78: ["1Sam", 20], 79: ["1Sam", 24], 80: ["1Sam", 28], 81: ["1Sam", 31],
  82: ["1Sam", 31],
  83: ["2Sam", 2], 84: ["2Sam", 12], 85: ["2Sam", 18], 86: ["2Sam", 18], 87: ["2Sam", 21],
  88: ["2Sam", 21],
  89: ["1Kgs", 3], 90: ["1Kgs", 5], 91: ["1Kgs", 10], 92: ["1Kgs", 11], 93: ["1Kgs", 13],
  94: ["1Kgs", 17], 95: ["1Kgs", 18], 96: ["1Kgs", 19], 97: ["1Kgs", 20], 98: ["1Kgs", 22],
  99: ["2Kgs", 1], 100: ["2Kgs", 2], 101: ["2Kgs", 2], 102: ["2Kgs", 6], 103: ["2Kgs", 9],
  104: ["2Kgs", 9], 105: ["2Kgs", 11], 106: ["2Kgs", 17], 107: ["2Kgs", 19], 108: ["2Kgs", 25],
  109: ["1Chr", 21], 110: ["2Chr", 20],
  111: ["Ezra", 1], 112: ["Ezra", 3], 113: ["Ezra", 7], 114: ["Ezra", 9], 115: ["Neh", 2],
  116: ["Neh", 8],
  117: ["Esth", 1], 118: ["Esth", 5], 119: ["Esth", 6], 120: ["Esth", 7],
  121: ["Job", 1], 122: ["Job", 2],
  123: ["Isa", 1], 124: ["Isa", 13], 125: ["Isa", 27], 126: ["Jer", 36], 127: ["Jer", 1],
  128: ["Lam", 1], 130: ["Ezek", 1], 131: ["Ezek", 37], 132: ["Dan", 1], 133: ["Dan", 3],
  134: ["Dan", 5], 135: ["Dan", 6], 136: ["Dan", 7], 137: ["Amos", 1], 138: ["Jonah", 2],
  139: ["Jonah", 3], 140: ["Mic", 6], 141: ["Zech", 6],
};

const newTestamentBookIds = {
  "Matthew": "Matt",
  "Mark": "Mark",
  "Luke": "Luke",
  "John": "John",
  "Acts": "Acts",
  "1 Thessalonians": "1Thess",
  "Revelation": "Rev",
};

function parseManifest(tsvPath) {
  const [headerLine, ...lines] = readFileSync(tsvPath, "utf8").trim().split("\n");
  const headers = headerLine.split("\t");
  return lines.map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function chapterForRow(row) {
  const page = Number(row.page_order);
  const mapped = oldTestamentChapterByPage[page];
  if (mapped) return { book: mapped[0], chapter: mapped[1] };

  const reference = row.scripture_reference.trim();
  if (!reference) return null;
  const match = reference.match(/^(.+?)\s+(\d+):/);
  if (!match) return null;
  const book = newTestamentBookIds[match[1].trim()];
  if (!book) {
    throw new Error(`Unknown NT book in reference "${reference}" (page ${page})`);
  }
  return { book, chapter: Number(match[2]) };
}

const manifestPath = path.join(sourceDir, "manifest.tsv");
if (!existsSync(manifestPath)) {
  console.error(`manifest.tsv not found under ${sourceDir}`);
  process.exit(1);
}

const rows = parseManifest(manifestPath);
const byChapter = new Map();
let mappedPlates = 0;
let skippedPlates = 0;

for (const row of rows) {
  const target = chapterForRow(row);
  if (!target) {
    skippedPlates += 1;
    continue;
  }
  mappedPlates += 1;
  const key = `${target.book}.${target.chapter}`;
  const page = Number(row.page_order);
  const existing = byChapter.get(key);
  if (!existing || page < existing.page) {
    byChapter.set(key, {
      page,
      book: target.book,
      chapter: target.chapter,
      title: row.story_title,
      scriptureReference: row.scripture_reference || null,
      sourceFilename: row.local_filename,
    });
  }
}

rmSync(outputImageDir, { force: true, recursive: true });
mkdirSync(outputImageDir, { recursive: true });

const entries = [...byChapter.values()].sort((a, b) => a.page - b.page);
for (const entry of entries) {
  const sourcePath = path.join(sourceDir, entry.sourceFilename);
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing source plate: ${sourcePath}`);
  }
  const outputName = `${String(entry.page).padStart(3, "0")}_${entry.book}.${entry.chapter}.jpg`;
  execFileSync("sips", [
    "--resampleHeightWidthMax", String(maxPixelSize),
    "--setProperty", "format", "jpeg",
    "--setProperty", "formatOptions", "82",
    sourcePath,
    "--out", path.join(outputImageDir, outputName),
  ], { stdio: "pipe" });
  entry.assetPath = `/resources/dore/${outputName}`;
}

const payload = {
  generatedAt: new Date().toISOString(),
  source: "Doré's Bible Illustrations (Wikimedia Commons), 241 plates, downloaded 2026-07-17",
  maxPixelSize,
  entries: entries.map(({ page, book, chapter, title, scriptureReference, assetPath }) => ({
    page, book, chapter, title, scriptureReference, assetPath,
  })),
};
writeFileSync(outputJsonPath, `${JSON.stringify(payload, null, 1)}\n`);

console.log(`plates mapped: ${mappedPlates}, skipped (apocrypha/no ref): ${skippedPlates}`);
console.log(`chapters with artwork: ${entries.length}`);
console.log(`images written to ${outputImageDir}`);
console.log(`manifest written to ${outputJsonPath}`);
