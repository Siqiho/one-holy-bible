import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { bibleBooks } from "../src/domain/bibleBooks.ts";

const KJV_PDF = "/Users/simon/OHB/圣经本体/The-Holy-Bible-King-James-Version.pdf";
const CUV_PDF = "/Users/simon/OHB/圣经本体/圣经_和合本圣经.pdf";
const OUTPUT = new URL("../src/data/bibleLibrary.ts", import.meta.url);
const JSON_OUTPUT = new URL("../src/data/generated/bibleLibrary.json", import.meta.url);

const bookOrder = new Map(bibleBooks.map((book, index) => [book.id, index]));

const kjvVersePatches = [
  {
    id: "Phil.4.23",
    book: "Phil",
    chapter: 4,
    verse: 23,
    text: "The grace of our Lord Jesus Christ be with you all. Amen.",
    reason: "Source KJV PDF ends Philippians at Phil.4.22.",
  },
  {
    id: "1Thess.5.28",
    book: "1Thess",
    chapter: 5,
    verse: 28,
    text: "The grace of our Lord Jesus Christ be with you. Amen.",
    reason: "Source KJV PDF ends 1 Thessalonians at 1Thess.5.27.",
  },
  {
    id: "Heb.13.25",
    book: "Heb",
    chapter: 13,
    verse: 25,
    text: "Grace be with you all. Amen.",
    reason: "Source KJV PDF ends Hebrews at Heb.13.24.",
  },
  {
    id: "Rev.22.21",
    book: "Rev",
    chapter: 22,
    verse: 21,
    text: "The grace of our Lord Jesus Christ be with you all. Amen.",
    reason: "Source KJV PDF ends Revelation at Rev.22.20.",
  },
];

const cuvVerseNumberNotes = [
  "Source CUV PDF numbers 1Chr.22.1 as 1Chr.21.31, then numbers 1Chr.22.2-19 as 1Chr.22.1-18; the generator normalizes that local offset to the canonical 31,102-verse scheme.",
  "Source CUV PDF extracts Matt.10.25 as 10:2; the generator repairs that truncated marker from canonical verse order.",
  "Source CUV PDF extracts John.7.53 and John.8.1 as one bare :1 line; the generator splits it into the canonical two verses.",
  "Source CUV PDF omits the Gal.3.29 marker before Gal.4.1; the generator appends the standard CUV verse and keeps the PDF's Gal.4.1 text.",
];

const cuvVersePatches = [
  {
    id: "Gal.3.29",
    book: "Gal",
    chapter: 3,
    verse: 29,
    text: "你们既属乎基督，就是亚伯拉罕的后裔，是照着应许承受产业的了。",
    reason: "Source CUV PDF skips Gal.3.29 between Gal.3.28 and Gal.4.1.",
  },
];

function extractPdfText(pdfPath, args) {
  const dir = mkdtempSync(join(tmpdir(), "one-holy-bible-"));
  const out = join(dir, "out.txt");
  try {
    execFileSync("pdftotext", [...args, pdfPath, out], { stdio: "pipe" });
    return readFileSync(out, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function cleanText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\f/g, "\n")
    .replace(/Downloaded from www\.holybooks\.com - https:\/\/www\.holybooks\.com\/download-bible\//g, "\n")
    .replace(/Downloaded from www\.holybooks\.com/g, "\n")
    .replace(/\u00a0/g, " ");
}

function normalizeSpaces(text) {
  return text.replace(/\s+/g, " ").trim();
}

function stripKjvTrailingHeading(text, shouldStrip) {
  if (!shouldStrip) return text;

  return text
    .replace(
      /\s+(?:(?:Old|New) Testament\s+)?(?:The|A)\s+(?:(?:First|Second|Third|Fourth|Fifth)\s+)?(?:Book|Gospel|Acts|Epistle|General|Proverbs|Song|Lamentations|Revelation)\b.*$/i,
      "",
    )
    .trim();
}

function sortVerses(verses) {
  return verses.sort((a, b) => {
    const bookDelta = (bookOrder.get(a.book) ?? Number.MAX_SAFE_INTEGER) - (bookOrder.get(b.book) ?? Number.MAX_SAFE_INTEGER);
    return bookDelta || a.chapter - b.chapter || a.verse - b.verse;
  });
}

function applyVersePatches(verses, patches) {
  const byId = new Map(verses.map((verse) => [verse.id, verse]));
  const applied = [];

  for (const patch of patches) {
    if (!byId.has(patch.id)) {
      const { reason: _reason, ...verse } = patch;
      verses.push(verse);
      byId.set(patch.id, verse);
      applied.push(patch);
    }
  }

  sortVerses(verses);
  return applied;
}

function nextCanonicalVerse(book, chapter, verse) {
  if (!book) return null;
  const chapterLastVerse = book.verseCounts[chapter - 1] ?? 0;
  if (chapter < 1 || chapter > book.chapterCount || !chapterLastVerse) return null;
  if (verse < chapterLastVerse) {
    return { chapter, verse: verse + 1 };
  }
  if (chapter < book.chapterCount) {
    return { chapter: chapter + 1, verse: 1 };
  }
  return null;
}

function parseKjv(rawText) {
  const text = cleanText(rawText);
  const firstBookStart = text.indexOf("The First Book of Moses, called Genesis");
  if (firstBookStart === -1) throw new Error("KJV Genesis marker not found");
  const scripture = text.slice(firstBookStart);
  const markerPattern = /\{(\d+):(\d+)\}/g;
  const markers = [...scripture.matchAll(markerPattern)];
  const verses = [];
  let bookIndex = 0;

  for (let i = 0; i < markers.length; i += 1) {
    const marker = markers[i];
    const chapter = Number(marker[1]);
    const verse = Number(marker[2]);
    if (chapter === 1 && verse === 1 && verses.length > 0) {
      bookIndex += 1;
    }
    const book = bibleBooks[bookIndex];
    if (!book) throw new Error(`KJV has more book starts than expected near marker ${marker[0]}`);

    const start = marker.index + marker[0].length;
    const end = markers[i + 1]?.index ?? scripture.length;
    const nextMarker = markers[i + 1];
    const isBookBoundary =
      nextMarker?.[1] === "1" &&
      nextMarker?.[2] === "1" &&
      bookIndex < bibleBooks.length - 1;
    const verseText = stripKjvTrailingHeading(normalizeSpaces(
      scripture
        .slice(start, end)
        .replace(/(?:^|\s)(?:Page \d+ [A-Za-z0-9 ]+|[A-Za-z0-9 ]+ Page \d+)(?:\s|$)/g, " ")
        .replace(/\[[ ]/g, "["),
    ), isBookBoundary);

    verses.push({
      id: `${book.id}.${chapter}.${verse}`,
      book: book.id,
      chapter,
      verse,
      text: verseText,
    });
  }

  return verses;
}

function parseCuv(rawText) {
  const lines = cleanText(rawText).split("\n");
  const verses = [];
  let bookIndex = -1;
  let currentBook = null;
  let current = null;
  let lastAccepted = { chapter: 0, verse: 0 };
  const bookNameToIndex = new Map(bibleBooks.map((book, index) => [book.chineseName, index]));
  bookNameToIndex.set("腓力比书", bibleBooks.findIndex((book) => book.id === "Phil"));

  function pushCurrent() {
    if (!current) return;
    const text = normalizeSpaces(current.text);
    for (const verse of current.verses) {
      verses.push({
        id: `${current.book}.${current.chapter}.${verse}`,
        book: current.book,
        chapter: current.chapter,
        verse,
        text,
      });
      lastAccepted = { chapter: current.chapter, verse };
    }
    current = null;
  }

  function pushVerse(bookId, chapter, verse, text) {
    verses.push({
      id: `${bookId}.${chapter}.${verse}`,
      book: bookId,
      chapter,
      verse,
      text: normalizeSpaces(text),
    });
    lastAccepted = { chapter, verse };
  }

  function parseVerseNumbers(firstVerse, joinedVerseNumbers) {
    const verseNumbers = [Number(firstVerse)];
    if (!joinedVerseNumbers) return verseNumbers;

    const tail = joinedVerseNumbers.replace(/\s/g, "");
    const rangeMatch = tail.match(/^[-—](\d+)$/);
    if (rangeMatch) {
      const end = Number(rangeMatch[1]);
      for (let verse = verseNumbers[0] + 1; verse <= end; verse += 1) {
        verseNumbers.push(verse);
      }
      return verseNumbers;
    }

    for (const part of tail.split(/[、,，]/)) {
      if (part) verseNumbers.push(Number(part));
    }
    return verseNumbers;
  }

  function normalizeCuvVerseNumbers(bookId, chapter, verseNumbers) {
    if (bookId === "1Chr" && chapter === 21 && verseNumbers.length === 1 && verseNumbers[0] === 31) {
      return { chapter: 22, verseNumbers: [1] };
    }

    if (bookId === "1Chr" && chapter === 22) {
      return { chapter, verseNumbers: verseNumbers.map((verse) => verse + 1) };
    }

    return { chapter, verseNumbers };
  }

  function lastVerseForChapter(chapter) {
    return currentBook?.verseCounts[chapter - 1] ?? 0;
  }

  function inferBareChapter(firstVerse) {
    if (!current) return 1;
    const currentLastVerse = current.verses.at(-1);
    const currentChapterIsComplete = currentLastVerse === lastVerseForChapter(current.chapter);
    if (firstVerse === 1 && currentChapterIsComplete) {
      return current.chapter + 1;
    }
    return current.chapter;
  }

  function expectedNextVerse() {
    if (current) {
      return nextCanonicalVerse(currentBook, current.chapter, current.verses.at(-1));
    }
    if (lastAccepted.chapter) {
      return nextCanonicalVerse(currentBook, lastAccepted.chapter, lastAccepted.verse);
    }
    return null;
  }

  function markerMovesBackward(chapter, verseNumbers) {
    if (lastAccepted.chapter === 0) return false;
    const firstVerse = verseNumbers[0];
    return chapter < lastAccepted.chapter || (chapter === lastAccepted.chapter && firstVerse <= lastAccepted.verse);
  }

  function markerIsInCanonicalRange(chapter, verseNumbers) {
    if (!currentBook || chapter < 1 || chapter > currentBook.chapterCount) return false;
    const expectedLastVerse = lastVerseForChapter(chapter);
    return verseNumbers.every((verse) => verse >= 1 && verse <= expectedLastVerse);
  }

  function startsWithVerseMarker(value) {
    return /^(\d+):(\d+)/.test(value) || /^:(\d+)/.test(value);
  }

  function isPageOrHeaderLine(line) {
    return /^\d+$/.test(line) || /^[\d\s]+$/.test(line) || /^(旧约|新约|旧 约|新 约)$/.test(line) || /^(旧约|新约)\s+\S+/.test(line);
  }

  function nextMeaningfulLine(startIndex) {
    for (let index = startIndex; index < lines.length; index += 1) {
      const candidate = lines[index].trim();
      if (candidate) return candidate;
    }
    return "";
  }

  function nextVerseOrMeaningfulLine(startIndex) {
    for (let index = startIndex; index < lines.length; index += 1) {
      const candidate = lines[index].trim();
      if (!candidate || isPageOrHeaderLine(candidate)) continue;
      return candidate;
    }
    return "";
  }

  function isStructuralLine(line, nextLine) {
    if (startsWithVerseMarker(line)) return false;
    if (isPageOrHeaderLine(line)) return true;
    if (line.includes("目录") || line.startsWith("计 ")) return true;
    if (/^[①②③④⑤⑥⑦⑧⑨⑩]+$/.test(line)) return true;
    if (/^[\u4e00-\u9fa5]{1,4}\s*\d+：\d+/.test(line)) return true;

    const nextStartsVerse = startsWithVerseMarker(nextLine);
    const looksLikeShortHeading = /^[\u4e00-\u9fa5A-Za-z0-9（）()：:；;、，,\-—\s]+$/.test(line)
      && line.length <= 42
      && !/[。！？!?；;，,、”’'"]$/.test(line);
    return nextStartsVerse && looksLikeShortHeading;
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    const line = rawLine.trim();
    if (!line) continue;

    const exactBookIndex = bookNameToIndex.get(line);
    if (exactBookIndex !== undefined && exactBookIndex > bookIndex) {
      pushCurrent();
      bookIndex = exactBookIndex;
      currentBook = bibleBooks[bookIndex];
      current = null;
      lastAccepted = { chapter: 0, verse: 0 };
      continue;
    }

    if (!currentBook) continue;
    if (isStructuralLine(line, nextVerseOrMeaningfulLine(lineIndex + 1))) continue;

    let verseMatch = line.match(/^(\d+):(\d+)((?:\s*[-—]\s*\d+|\s*[、,，]\s*\d+)*)\s*(.*)$/);
    let chapter;
    let versesInMarker;
    let text;
    if (verseMatch) {
      chapter = Number(verseMatch[1]);
      versesInMarker = parseVerseNumbers(verseMatch[2], verseMatch[3]);
      text = verseMatch[4];
    } else {
      verseMatch = line.match(/^:(\d+)((?:\s*[-—]\s*\d+|\s*[、,，]\s*\d+)*)\s*(.*)$/);
      if (verseMatch) {
        chapter = inferBareChapter(Number(verseMatch[1]));
        versesInMarker = parseVerseNumbers(verseMatch[1], verseMatch[2]);
        text = verseMatch[3];
      }
    }

    if (verseMatch) {
      const normalized = normalizeCuvVerseNumbers(currentBook.id, chapter, versesInMarker);
      chapter = normalized.chapter;
      versesInMarker = normalized.verseNumbers;

      const nextVerse = expectedNextVerse();
      const firstVerse = versesInMarker[0];

      if (
        currentBook.id === "John" &&
        current?.chapter === 7 &&
        current.verses.at(-1) === 52 &&
        line.startsWith(":1 于是各人都回家去了，耶稣却往橄榄山去。")
      ) {
        pushCurrent();
        pushVerse(currentBook.id, 7, 53, "于是各人都回家去了。");
        current = {
          book: currentBook.id,
          chapter: 8,
          verses: [1],
          text: "耶稣却往橄榄山去。",
        };
        continue;
      }

      if (
        currentBook.id === "Gal" &&
        current?.chapter === 3 &&
        current.verses.at(-1) === 28 &&
        line.startsWith(":1 我说那承受产业的")
      ) {
        pushCurrent();
        current = {
          book: currentBook.id,
          chapter: 4,
          verses: [1],
          text,
        };
        continue;
      }

      if (
        nextVerse &&
        markerMovesBackward(chapter, versesInMarker) &&
        chapter === nextVerse.chapter &&
        firstVerse < nextVerse.verse
      ) {
        chapter = nextVerse.chapter;
        versesInMarker = [nextVerse.verse];
      }

      if (!markerIsInCanonicalRange(chapter, versesInMarker)) {
        continue;
      }
      if (markerMovesBackward(chapter, versesInMarker)) {
        continue;
      }
      pushCurrent();
      current = {
        book: currentBook.id,
        chapter,
        verses: versesInMarker,
        text,
      };
      continue;
    }

    if (current) {
      current.text += ` ${line}`;
    }
  }

  pushCurrent();
  return verses;
}

function validateVersion(name, verses) {
  const errors = [];
  const ids = new Set();
  for (const verse of verses) {
    if (ids.has(verse.id)) throw new Error(`${name} duplicate verse id: ${verse.id}`);
    ids.add(verse.id);
  }

  for (const book of bibleBooks) {
    const bookVerses = verses.filter((verse) => verse.book === book.id);
    if (!bookVerses.length) throw new Error(`${name} missing book ${book.id}`);

    for (let chapter = 1; chapter <= book.chapterCount; chapter += 1) {
      const chapterVerses = bookVerses.filter((verse) => verse.chapter === chapter);
      const expected = book.verseCounts[chapter - 1];
      if (chapterVerses.length !== expected) {
        const actualVerses = new Set(chapterVerses.map((verse) => verse.verse));
        const missing = [];
        for (let verse = 1; verse <= expected; verse += 1) {
          if (!actualVerses.has(verse)) missing.push(`${book.id}.${chapter}.${verse}`);
        }
        errors.push(
          `${name} ${book.id}.${chapter} expected ${expected} verses, got ${chapterVerses.length}; missing ${missing.join(", ")}`,
        );
      }
    }
  }

  for (const verseId of ["Gen.1.1", "John.3.16", "Rev.22.21"]) {
    if (!ids.has(verseId)) throw new Error(`${name} missing known verse ${verseId}`);
  }

  if (errors.length) {
    throw new Error(errors.slice(0, 100).join("\n"));
  }
}

function versesSource(verses) {
  const json = JSON.stringify(verses);
  const chunkSize = 16_000;
  const chunks = [];
  for (let index = 0; index < json.length; index += chunkSize) {
    chunks.push(json.slice(index, index + chunkSize));
  }

  return `JSON.parse([
${chunks.map((chunk) => `  ${JSON.stringify(chunk)}`).join(",\n")}
].join("")) as BibleVersion["verses"]`;
}

function versionSource(id, label, language, versesVariableName) {
  return `{
  id: ${JSON.stringify(id)},
  label: ${JSON.stringify(label)},
  language: ${JSON.stringify(language)},
  verses: ${versesVariableName},
}`;
}

function versionObject(id, label, language, verses) {
  return { id, label, language, verses };
}

const kjvVerses = parseKjv(extractPdfText(KJV_PDF, ["-raw"]));
const appliedKjvPatches = applyVersePatches(kjvVerses, kjvVersePatches);
const cuvVerses = parseCuv(extractPdfText(CUV_PDF, ["-raw"]));
const appliedCuvPatches = applyVersePatches(cuvVerses, cuvVersePatches);

validateVersion("KJV", kjvVerses);
validateVersion("CUV", cuvVerses);

const output = `import type { BibleVersion } from "../domain/bible";

// Generated by scripts/generateBibleLibrary.mjs from local KJV and CUV PDFs using pdftotext.
// The source KJV PDF omits these final epistle/revelation verses; the generator appends standard KJV text:
${kjvVersePatches.map((patch) => `// - ${patch.id}: ${patch.reason}`).join("\n")}
// Source CUV PDF numbering normalization:
${cuvVerseNumberNotes.map((note) => `// - ${note}`).join("\n")}
${cuvVersePatches.map((patch) => `// - ${patch.id}: ${patch.reason}`).join("\n")}
const cuvVerses = ${versesSource(cuvVerses)};
const kjvVerses = ${versesSource(kjvVerses)};

export const cuvBible: BibleVersion = ${versionSource("cuv", "和合本", "zh", "cuvVerses")};

export const kjvBible: BibleVersion = ${versionSource("kjv", "KJV", "en", "kjvVerses")};
`;

writeFileSync(OUTPUT, output);
mkdirSync(dirname(JSON_OUTPUT.pathname), { recursive: true });
writeFileSync(JSON_OUTPUT, `${JSON.stringify({
  cuvBible: versionObject("cuv", "和合本", "zh", cuvVerses),
  kjvBible: versionObject("kjv", "KJV", "en", kjvVerses),
})}\n`);

const chapterCount = new Set(kjvVerses.map((verse) => `${verse.book}.${verse.chapter}`)).size;
console.log(JSON.stringify({
  cuvVerses: cuvVerses.length,
  kjvVerses: kjvVerses.length,
  books: bibleBooks.length,
  chapters: chapterCount,
  appliedKjvPatches: appliedKjvPatches.map((patch) => patch.id),
  appliedCuvPatches: appliedCuvPatches.map((patch) => patch.id),
}, null, 2));
