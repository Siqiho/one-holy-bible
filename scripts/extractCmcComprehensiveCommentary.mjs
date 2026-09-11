#!/usr/bin/env node
/**
 * Extract 《圣经综合解读》 verse commentary cards from CMC PDFs via pdftotext.
 * Output: src/data/generated/comprehensiveCommentaryResources.json
 *
 * Stages (OT 15-book batches):
 *   --stage 1  books 02-15 (出埃及记..以斯拉记)  [default if no stage/books]
 *   --stage 2  books 16-30 (尼希米记..阿摩司书)
 *   --stage 3  books 31-45 (俄巴底亚书..罗马书) = OT finish 9 + NT first 6
 *   --stage 4  books 46-60 (林前..彼前)
 *   --stage 5  books 61-66 (彼后..启示录)
 * Genesis is only included with --include-genesis (already in workbench).
 * Use --merge to keep previously extracted cards when writing the JSON.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const pdfRoot = "/Users/simon/OHB/文档/圣经_副本";
const outPath = join(repoRoot, "src/data/generated/comprehensiveCommentaryResources.json");

const CN_DIGIT = {
  "零": 0, "〇": 0, "○": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5,
  "六": 6, "七": 7, "八": 8, "九": 9, "十": 10, "廿": 20, "卅": 30,
};

const BOOK_TOKEN_TO_ID = {
  创: "Gen", 出: "Exod", 利: "Lev", 民: "Num", 申: "Deut",
  书: "Josh", 士: "Judg", 得: "Ruth",
  撒上: "1Sam", 撒下: "2Sam", 王上: "1Kgs", 王下: "2Kgs",
  代上: "1Chr", 代下: "2Chr", 拉: "Ezra", 尼: "Neh", 斯: "Esth",
  伯: "Job", 诗: "Ps", 箴: "Prov", 传: "Eccl", 歌: "Song",
  赛: "Isa", 耶: "Jer", 哀: "Lam", 结: "Ezek", 但: "Dan",
  何: "Hos", 珥: "Joel", 摩: "Amos", 俄: "Obad", 拿: "Jonah",
  弥: "Mic", 鸿: "Nah", 哈: "Hab", 番: "Zeph", 该: "Hag",
  亚: "Zech", 玛: "Mal",
  太: "Matt", 可: "Mark", 路: "Luke", 约: "John", 徒: "Acts",
  罗: "Rom", 林前: "1Cor", 林后: "2Cor", 加: "Gal", 弗: "Eph",
  腓: "Phil", 西: "Col", 帖前: "1Thess", 帖后: "2Thess",
  提前: "1Tim", 提后: "2Tim", 多: "Titus", 门: "Phlm",
  来: "Heb", 雅: "Jas", 彼前: "1Pet", 彼后: "2Pet",
  约壹: "1John", 约贰: "2John", 约叁: "3John", 约一: "1John", 约二: "2John", 约三: "3John",
  犹: "Jude", 启: "Rev",
};

const BOOK_ID_META = {
  Gen: { no: "01", name: "创世记", short: "创" },
  Exod: { no: "02", name: "出埃及记", short: "出" },
  Lev: { no: "03", name: "利未记", short: "利" },
  Num: { no: "04", name: "民数记", short: "民" },
  Deut: { no: "05", name: "申命记", short: "申" },
  Josh: { no: "06", name: "约书亚记", short: "书" },
  Judg: { no: "07", name: "士师记", short: "士" },
  Ruth: { no: "08", name: "路得记", short: "得" },
  "1Sam": { no: "09", name: "撒母耳记上", short: "撒上" },
  "2Sam": { no: "10", name: "撒母耳记下", short: "撒下" },
  "1Kgs": { no: "11", name: "列王纪上", short: "王上" },
  "2Kgs": { no: "12", name: "列王纪下", short: "王下" },
  "1Chr": { no: "13", name: "历代志上", short: "代上" },
  "2Chr": { no: "14", name: "历代志下", short: "代下" },
  Ezra: { no: "15", name: "以斯拉记", short: "拉" },
  Neh: { no: "16", name: "尼希米记", short: "尼" },
  Esth: { no: "17", name: "以斯帖记", short: "斯" },
  Job: { no: "18", name: "约伯记", short: "伯" },
  Ps: { no: "19", name: "诗篇", short: "诗" },
  Prov: { no: "20", name: "箴言", short: "箴" },
  Eccl: { no: "21", name: "传道书", short: "传" },
  Song: { no: "22", name: "雅歌", short: "歌" },
  Isa: { no: "23", name: "以赛亚书", short: "赛" },
  Jer: { no: "24", name: "耶利米书", short: "耶" },
  Lam: { no: "25", name: "耶利米哀歌", short: "哀" },
  Ezek: { no: "26", name: "以西结书", short: "结" },
  Dan: { no: "27", name: "但以理书", short: "但" },
  Hos: { no: "28", name: "何西阿书", short: "何" },
  Joel: { no: "29", name: "约珥书", short: "珥" },
  Amos: { no: "30", name: "阿摩司书", short: "摩" },
  Obad: { no: "31", name: "俄巴底亚书", short: "俄" },
  Jonah: { no: "32", name: "约拿书", short: "拿" },
  Mic: { no: "33", name: "弥迦书", short: "弥" },
  Nah: { no: "34", name: "那鸿书", short: "鸿" },
  Hab: { no: "35", name: "哈巴谷书", short: "哈" },
  Zeph: { no: "36", name: "西番雅书", short: "番" },
  Hag: { no: "37", name: "哈该书", short: "该" },
  Zech: { no: "38", name: "撒迦利亚书", short: "亚" },
  Mal: { no: "39", name: "玛拉基书", short: "玛" },
  Matt: { no: "40", name: "马太福音", short: "太" },
  Mark: { no: "41", name: "马可福音", short: "可" },
  Luke: { no: "42", name: "路加福音", short: "路" },
  John: { no: "43", name: "约翰福音", short: "约" },
  Acts: { no: "44", name: "使徒行传", short: "徒" },
  Rom: { no: "45", name: "罗马书", short: "罗" },
  "1Cor": { no: "46", name: "哥林多前书", short: "林前" },
  "2Cor": { no: "47", name: "哥林多后书", short: "林后" },
  Gal: { no: "48", name: "加拉太书", short: "加" },
  Eph: { no: "49", name: "以弗所书", short: "弗" },
  Phil: { no: "50", name: "腓立比书", short: "腓" },
  Col: { no: "51", name: "歌罗西书", short: "西" },
  "1Thess": { no: "52", name: "帖撒罗尼迦前书", short: "帖前" },
  "2Thess": { no: "53", name: "帖撒罗尼迦后书", short: "帖后" },
  "1Tim": { no: "54", name: "提摩太前书", short: "提前" },
  "2Tim": { no: "55", name: "提摩太后书", short: "提后" },
  Titus: { no: "56", name: "提多书", short: "多" },
  Phlm: { no: "57", name: "腓利门书", short: "门" },
  Heb: { no: "58", name: "希伯来书", short: "来" },
  Jas: { no: "59", name: "雅各书", short: "雅" },
  "1Pet": { no: "60", name: "彼得前书", short: "彼前" },
  "2Pet": { no: "61", name: "彼得后书", short: "彼后" },
  "1John": { no: "62", name: "约翰一书", short: "约壹" },
  "2John": { no: "63", name: "约翰二书", short: "约贰" },
  "3John": { no: "64", name: "约翰三书", short: "约叁" },
  Jude: { no: "65", name: "犹大书", short: "犹" },
  Rev: { no: "66", name: "启示录", short: "启" },
};

// Verse counts for validation (subset used for books 1-15).
const VERSE_COUNTS = {
  Gen: [31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26],
  Exod: [22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38],
  Lev: [17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34],
  Num: [54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13],
  Deut: [46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12],
  Josh: [18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33],
  Judg: [36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25],
  Ruth: [22,23,18,22],
  "1Sam": [28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13],
  "2Sam": [27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25],
  "1Kgs": [53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53],
  "2Kgs": [18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30],
  "1Chr": [54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30],
  "2Chr": [17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23],
  Ezra: [11,70,13,24,17,22,28,36,15,44],
  Neh: [11,20,32,23,19,19,73,18,38,39,36,47,31],
  Esth: [22,23,15,17,14,14,10,17,32,3],
  Job: [22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17],
  Ps: [6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6],
  Prov: [33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31],
  Eccl: [18,26,22,16,20,12,29,17,18,20,10,14],
  Song: [17,17,11,16,16,13,13,14],
  Isa: [31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24],
  Jer: [19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34],
  Lam: [22,22,66,22,22],
  Ezek: [28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35],
  Dan: [21,49,30,37,31,28,28,27,27,21,45,13],
  Hos: [11,23,5,19,15,11,16,14,17,15,12,14,16,9],
  Joel: [20,32,21],
  Amos: [15,16,15,13,27,14,17,14,15],
  Obad: [21],
  Jonah: [17,10,10,11],
  Mic: [16,13,12,13,15,16,20],
  Nah: [15,13,19],
  Hab: [17,20,19],
  Zeph: [18,15,20],
  Hag: [15,23],
  Zech: [21,13,10,14,11,15,14,23,17,12,17,14,9,21],
  Mal: [14,17,18,6],
  Matt: [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20],
  Mark: [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20],
  Luke: [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53],
  John: [51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25],
  Acts: [26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31],
  Rom: [32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27],
  "1Cor": [31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24],
  "2Cor": [24,17,18,18,21,18,16,24,15,18,33,21,14],
  Gal: [24,21,29,31,26,18],
  Eph: [23,22,21,32,33,24],
  Phil: [30,30,21,23],
  Col: [29,23,25,18],
  "1Thess": [10,20,13,18,28],
  "2Thess": [12,17,18],
  "1Tim": [20,15,16,16,25,21],
  "2Tim": [18,26,17,22],
  Titus: [16,15,15],
  Phlm: [25],
  Heb: [14,18,19,16,14,20,28,13,28,39,40,29,25],
  Jas: [27,26,18,17,20],
  "1Pet": [25,25,22,19,14],
  "2Pet": [21,22,18],
  "1John": [10,29,24,21,21],
  "2John": [13],
  "3John": [14],
  Jude: [25],
  Rev: [20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21],
};

const PDF_SPECS = [
  { pdf: "CMC-01.pdf", books: ["Gen"] },
  { pdf: "CMC-02-03.pdf", books: ["Exod", "Lev"] },
  { pdf: "CMC-04-05.pdf", books: ["Num", "Deut"] },
  { pdf: "CMC-06-08.pdf", books: ["Josh", "Judg", "Ruth"] },
  { pdf: "CMC-09-10.pdf", books: ["1Sam", "2Sam"] },
  { pdf: "CMC-11-12.pdf", books: ["1Kgs", "2Kgs"] },
  { pdf: "CMC-13-14.pdf", books: ["1Chr", "2Chr"] },
  { pdf: "CMC-15-18.pdf", books: ["Ezra", "Neh", "Esth", "Job"] },
  { pdf: "CMC-19.pdf", books: ["Ps"] },
  { pdf: "CMC-20-22.pdf", books: ["Prov", "Eccl", "Song"] },
  { pdf: "CMC-23.pdf", books: ["Isa"] },
  { pdf: "CMC-24-25.pdf", books: ["Jer", "Lam"] },
  { pdf: "CMC-26-27.pdf", books: ["Ezek", "Dan"] },
  { pdf: "CMC-28-39.pdf", books: ["Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal"] },
  { pdf: "CMC-40-41.pdf", books: ["Matt", "Mark"] },
  // Prefer combined Luke+John volume over CMC-Luke.pdf (cleaner markers).
  { pdf: "CMC-42-43.pdf", books: ["Luke", "John"] },
  // Prefer combined Acts+Romans volume over CMC-Acts.pdf.
  { pdf: "CMC-44-45.pdf", books: ["Acts", "Rom"] },
  { pdf: "CMC-46-57.pdf", books: ["1Cor","2Cor","Gal","Eph","Phil","Col","1Thess","2Thess","1Tim","2Tim","Titus","Phlm"] },
  { pdf: "CMC-Hebrew-Jude.pdf", books: ["Heb","Jas","1Pet","2Pet","1John","2John","3John","Jude"] },
  { pdf: "CMC-Revelation.pdf", books: ["Rev"] },
];

const STAGE_BOOKS = {
  // 15-book OT/NT batches (Genesis is separate workbench source).
  1: ["Exod","Lev","Num","Deut","Josh","Judg","Ruth","1Sam","2Sam","1Kgs","2Kgs","1Chr","2Chr","Ezra"],
  2: ["Neh","Esth","Job","Ps","Prov","Eccl","Song","Isa","Jer","Lam","Ezek","Dan","Hos","Joel","Amos"],
  // Stage 3: finish OT minor prophets + first 6 NT books = 15.
  3: ["Obad","Jonah","Mic","Nah","Hab","Zeph","Hag","Zech","Mal","Matt","Mark","Luke","John","Acts","Rom"],
  // Stage 4: next 15 NT books.
  4: ["1Cor","2Cor","Gal","Eph","Phil","Col","1Thess","2Thess","1Tim","2Tim","Titus","Phlm","Heb","Jas","1Pet"],
  // Stage 5: final NT books.
  5: ["2Pet","1John","2John","3John","Jude","Rev"],
};

const args = new Set(process.argv.slice(2));
const includeGenesis = args.has("--include-genesis");
const mergeExisting = args.has("--merge") || args.has("--stage");
const stageIdx = process.argv.indexOf("--stage");
const stage = stageIdx >= 0 ? Number(process.argv[stageIdx + 1]) : null;
const booksFilter = (() => {
  const idx = process.argv.indexOf("--books");
  if (idx >= 0 && process.argv[idx + 1]) {
    return new Set(process.argv[idx + 1].split(",").map((s) => s.trim()).filter(Boolean));
  }
  if (stage && STAGE_BOOKS[stage]) {
    const books = [...STAGE_BOOKS[stage]];
    if (includeGenesis) books.unshift("Gen");
    return new Set(books);
  }
  // default stage 1
  const books = [...STAGE_BOOKS[1]];
  if (includeGenesis) books.unshift("Gen");
  return new Set(books);
})();

function parseChineseNumeral(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  let total = 0;
  let current = 0;
  let saw = false;
  for (const ch of raw) {
    if (ch === "十") {
      // 十 / 十一 / 一百十一 — if no ones digit is pending, 十 means one ten.
      if (current === 0) current = 1;
      total += current * 10;
      current = 0;
      saw = true;
      continue;
    }
    if (ch === "廿" || ch === "卅") {
      total += CN_DIGIT[ch];
      current = 0;
      saw = true;
      continue;
    }
    if (ch === "百") {
      if (!saw) current = 1;
      total += current * 100;
      current = 0;
      saw = true;
      continue;
    }
    const d = CN_DIGIT[ch];
    if (d === undefined) return null;
    if (d === 0 && total > 0 && current === 0) {
      saw = true;
      continue;
    }
    current = current * 10 + d;
    saw = true;
  }
  total += current;
  return saw && total > 0 ? total : null;
}

function resolveBookToken(token) {
  return BOOK_TOKEN_TO_ID[token] ?? null;
}

function isValidVerse(bookId, chapter, verse) {
  const counts = VERSE_COUNTS[bookId];
  if (!counts) return false;
  if (chapter < 1 || chapter > counts.length) return false;
  const n = counts[chapter - 1];
  return verse >= 1 && verse <= n;
}

function parseMarker(rawMarker, carry = null) {
  // e.g. 出一 1 | 出三十八 14~15 | 撒上一 1 | 书 10:22-27 | 申 22:23 | 代 上 五 11
  // Bare continuation markers like 【5】 inherit previous book+chapter via carry.
  let cleaned = rawMarker.replace(/\s+/g, " ").trim();
  // Broken OCR markers that swallowed following body: keep only leading citation.
  const cut = cleaned.search(/[「『]/);
  if (cut > 0) cleaned = cleaned.slice(0, cut).trim();
  if (/^[上下左右]图/.test(cleaned) || /^参[前后左右]?图/.test(cleaned) || /^图参/.test(cleaned) || cleaned.startsWith("注") || /读经有感|默然自问|良人|佳偶/.test(cleaned)) return null;

  // Normalize spaced compound book names: 代 上 / 撒 下 / 王 上 / 林 前 / 彼 后 ...
  cleaned = cleaned
    .replace(/^代\s*([上下])/u, "代$1")
    .replace(/^撒\s*([上下])/u, "撒$1")
    .replace(/^王\s*([上下])/u, "王$1")
    .replace(/^林\s*([前后])/u, "林$1")
    .replace(/^帖\s*([前后])/u, "帖$1")
    .replace(/^提\s*([前后])/u, "提$1")
    .replace(/^彼\s*([前后])/u, "彼$1")
    .replace(/^约\s*([壹一二三贰叁])/u, "约$1");

  // Bare verse continuation: 【5】 / 【10】 / 【18】 after a full marker in same chapter.
  const bareVerse = cleaned.match(/^(\d+)(?:\s*[~～\-—–]\s*(\d+))?$/);
  if (bareVerse && carry?.bookId && carry?.chapter) {
    const verseFrom = Number(bareVerse[1]);
    const verseTo = bareVerse[2] ? Number(bareVerse[2]) : verseFrom;
    if (
      Number.isInteger(verseFrom) &&
      Number.isInteger(verseTo) &&
      verseTo >= verseFrom &&
      isValidVerse(carry.bookId, carry.chapter, verseFrom) &&
      isValidVerse(carry.bookId, carry.chapter, verseTo)
    ) {
      const verses = [];
      const last = Math.min(verseTo, verseFrom + 30);
      for (let v = verseFrom; v <= last; v += 1) verses.push(`${carry.bookId}.${carry.chapter}.${v}`);
      return {
        bookId: carry.bookId,
        chapter: carry.chapter,
        verseFrom,
        verseTo,
        verses,
        bookToken: carry.bookToken,
        carried: true,
      };
    }
  }

  // Longest book token match
  const tokens = Object.keys(BOOK_TOKEN_TO_ID).sort((a, b) => b.length - a.length);
  let bookToken = null;
  let rest = cleaned;
  for (const token of tokens) {
    if (cleaned.startsWith(token)) {
      bookToken = token;
      rest = cleaned.slice(token.length).trim();
      break;
    }
  }
  if (!bookToken) return null;
  const bookId = resolveBookToken(bookToken);
  if (!bookId) return null;

  // D first for single-chapter books: 俄 4 | 犹 7 | 门 1 | 俄 10 | 俄 1~4
  // Must run before pattern A, otherwise rest="10" is misread as chapter 1 verse 0.
  let chapter;
  let verseFrom;
  let verseTo;
  let m = null;
  const singleChapterBook = (VERSE_COUNTS[bookId]?.length === 1);
  if (singleChapterBook) {
    const single = rest.match(/^(\d+)(?:\s*[~～\-—–]\s*(\d+))?$/);
    if (single) {
      chapter = 1;
      verseFrom = Number(single[1]);
      verseTo = single[2] ? Number(single[2]) : verseFrom;
    }
  }
  // Compact no-space form already covered by book token split; rest may be "25" for 门25.


  if (chapter === undefined) {
    // A) Chinese/arabic chapter + verse(s): 一 1 | 三十八 14~15 | 一百十一 9
    // Require a separator when chapter token is purely arabic, to avoid 10 -> 1 + 0.
    m = rest.match(/^([一二三四五六七八九十廿卅百零〇○]+)(?:\s*)(\d+)(?:\s*[~～\-—–]\s*(\d+))?$/);
    if (!m) {
      m = rest.match(/^(\d+)\s+(\d+)(?:\s*[~～\-—–]\s*(\d+))?$/);
    }
    // B) Arabic chapter:verse[-verse]: 10:22-27 | 22:23
    if (!m) {
      m = rest.match(/^(\d+)\s*:\s*(\d+)(?:\s*[~～\-—–]\s*(\d+))?$/);
      if (m) m = [m[0], m[1], m[2], m[3]];
    }
    if (!m) return null;
    chapter = parseChineseNumeral(m[1]);
    verseFrom = Number(m[2]);
    verseTo = m[3] ? Number(m[3]) : verseFrom;
  }

  if (chapter === null || !Number.isInteger(verseFrom) || !Number.isInteger(verseTo) || verseTo < verseFrom) {
    return null;
  }
  // Cap expansive ranges for card identity; still require endpoints valid.
  if (!isValidVerse(bookId, chapter, verseFrom) || !isValidVerse(bookId, chapter, verseTo)) {
    return null;
  }
  const verses = [];
  const last = Math.min(verseTo, verseFrom + 30);
  for (let v = verseFrom; v <= last; v += 1) verses.push(`${bookId}.${chapter}.${v}`);
  return { bookId, chapter, verseFrom, verseTo, verses, bookToken };
}

function pdftotext(pdfPath) {
  const result = spawnSync("pdftotext", ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 200,
  });
  if (result.status !== 0) {
    throw new Error(`pdftotext failed for ${pdfPath}: ${result.stderr || result.status}`);
  }
  return result.stdout || "";
}

function cleanBody(raw) {
  let text = String(raw || "");
  // drop form feeds and page-only lines
  text = text.replace(/\f/g, "\n");
  text = text
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (/^\d{1,4}$/.test(t)) return false; // bare page numbers
      if (/^圣经综合解读/.test(t)) return false;
      if (/^复印：/.test(t) || /^时间：/.test(t) || /^字数：/.test(t) || /^开本：/.test(t)) return false;
      return true;
    })
    .join("\n");

  // collapse soft wraps while keeping paragraph-ish bullets
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  // join single newlines that look like mid-sentence wraps
  text = text.replace(/([^\n。！？；:：])\n(?!\n|•|【|[一二三四五六七八九十\d]、)/g, "$1");
  text = text.replace(/[ \t]{2,}/g, " ");
  text = text.replace(/\n[ \t]+/g, "\n");
  text = text.trim();

  // remove trailing directory leftovers / next book intro crumbs if any slipped in
  text = text.replace(/\n*《[^》]+》导读[\s\S]*$/u, "").trim();
  return text;
}

function firstBulletSummary(body) {
  const plain = body.replace(/\s+/g, " ").trim();
  const bullet = plain.match(/•\s*([^•]{12,120})/);
  if (bullet) return `•${bullet[1].trim()}`.slice(0, 80);
  return plain.slice(0, 80);
}

function extractFromPdf(spec) {
  const pdfPath = join(pdfRoot, spec.pdf);
  if (!existsSync(pdfPath)) throw new Error(`Missing PDF: ${pdfPath}`);
  const text = pdftotext(pdfPath);
  const markerRe = /【([^】]+)】/g;
  const matches = [...text.matchAll(markerRe)];
  const resources = [];
  const skipped = [];

  let carry = null;
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const rawMarker = String(match[1] || "").replace(/\s+/g, " ").trim();
    const parsed = parseMarker(rawMarker, carry);
    if (!parsed) {
      if (!/^[上下左右]图/.test(rawMarker) && !rawMarker.startsWith("注") && !/^\d+$/.test(rawMarker)) {
        skipped.push({ pdf: spec.pdf, marker: rawMarker, reason: "unparsed-or-invalid" });
      }
      continue;
    }
    // Keep carry for subsequent bare verse markers in the same chapter stream.
    carry = {
      bookId: parsed.bookId,
      chapter: parsed.chapter,
      bookToken: parsed.bookToken,
    };
    if (!booksFilter.has(parsed.bookId)) continue;
    if (!spec.books.includes(parsed.bookId) && parsed.bookId !== "Ezra") {
      // for multi-book pdfs, still accept parsed books in filter
    }
    // For CMC-15-18 we only want Ezra in default 1-15 scope; filter handles it.

    const start = match.index + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = cleanBody(text.slice(start, end));
    if (body.length < 8) {
      skipped.push({ pdf: spec.pdf, marker: rawMarker, reason: "empty-body" });
      continue;
    }

    const meta = BOOK_ID_META[parsed.bookId];
    if (!meta) continue;
    const verseLabel =
      parsed.verseFrom === parsed.verseTo
        ? `${parsed.chapter}:${parsed.verseFrom}`
        : `${parsed.chapter}:${parsed.verseFrom}-${parsed.verseTo}`;
    const id =
      parsed.verseFrom === parsed.verseTo
        ? `cmc-${parsed.bookId.toLowerCase()}-${parsed.chapter}-${parsed.verseFrom}`
        : `cmc-${parsed.bookId.toLowerCase()}-${parsed.chapter}-${parsed.verseFrom}-${parsed.verseTo}`;

    const primaryAnchor = parsed.verses[0];
    const title = `${meta.name} ${verseLabel} 综合解读`;
    const summary = firstBulletSummary(body);

    resources.push({
      id,
      title,
      type: "commentary",
      verses: parsed.verses,
      primaryAnchor,
      body,
      summary,
      source: `圣经综合解读·${meta.name}`,
      debugMeta: {
        sourceLabel: `圣经综合解读·${meta.name}`,
        sourceStream: "cmc-comprehensive-commentary",
        sourcePdf: spec.pdf,
        rawMarker: `【${rawMarker}】`,
        bookFolder: `${meta.no}_${meta.name}`,
        primaryAnchor,
        readerInclusion: "reader-facing",
        extraction: "pdftotext-cmc-v1",
      },
    });
  }

  return { resources, skipped, markerCount: matches.length };
}

function dedupeResources(resources) {
  const map = new Map();
  for (const resource of resources) {
    const prev = map.get(resource.id);
    if (!prev || (resource.body?.length ?? 0) > (prev.body?.length ?? 0)) {
      map.set(resource.id, resource);
    }
  }
  return [...map.values()].sort((a, b) => {
    const [ab, ac, av] = a.primaryAnchor.split(".");
    const [bb, bc, bv] = b.primaryAnchor.split(".");
    if (ab !== bb) return String(ab).localeCompare(String(bb));
    if (Number(ac) !== Number(bc)) return Number(ac) - Number(bc);
    return Number(av) - Number(bv);
  });
}

const started = Date.now();
const all = [];
const skippedAll = [];
const perPdf = [];

for (const spec of PDF_SPECS) {
  // skip genesis pdf entirely unless include genesis
  if (spec.pdf === "CMC-01.pdf" && !includeGenesis) continue;
  // skip pdf if none of its books requested
  if (!spec.books.some((b) => booksFilter.has(b))) continue;
  const result = extractFromPdf(spec);
  all.push(...result.resources);
  skippedAll.push(...result.skipped);
  perPdf.push({
    pdf: spec.pdf,
    markers: result.markerCount,
    extracted: result.resources.length,
    skipped: result.skipped.length,
  });
  console.error(`[extract] ${spec.pdf}: extracted=${result.resources.length} markers=${result.markerCount}`);
}

let resources = dedupeResources(all);

if (mergeExisting && existsSync(outPath)) {
  try {
    const previous = JSON.parse(readFileSync(outPath, "utf8"));
    const previousResources = Array.isArray(previous?.resources) ? previous.resources : [];
    // Keep cards outside this run's book filter; replace books being re-extracted.
    const kept = previousResources.filter((resource) => {
      const book = String(resource.primaryAnchor || resource.verses?.[0] || "").split(".")[0];
      return book && !booksFilter.has(book);
    });
    resources = dedupeResources([...kept, ...resources]);
    console.error(`[extract] merged with existing file: kept=${kept.length} new/updated=${all.length} total=${resources.length}`);
  } catch (error) {
    console.error(`[extract] merge skipped: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const byBook = resources.reduce((acc, resource) => {
  const book = resource.primaryAnchor.split(".")[0];
  acc[book] = (acc[book] ?? 0) + 1;
  return acc;
}, {});

const scopeLabel = stage
  ? `stage-${stage}`
  : includeGenesis
    ? "custom-including-genesis"
    : "custom";

const payload = {
  metadata: {
    generatedAt: new Date().toISOString(),
    sourceRoot: pdfRoot,
    scope: scopeLabel,
    stage: stage || undefined,
    books: [...booksFilter].sort(),
    totalResources: resources.length,
    byBook,
    perPdf,
    skippedCount: skippedAll.length,
    extractor: "extractCmcComprehensiveCommentary.mjs",
  },
  resources,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      outPath,
      totalResources: resources.length,
      byBook,
      perPdf,
      skippedCount: skippedAll.length,
      skippedSample: skippedAll.slice(0, 12),
      durationMs: Date.now() - started,
    },
    null,
    2,
  ),
);
