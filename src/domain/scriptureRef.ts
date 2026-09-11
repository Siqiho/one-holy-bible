import { bibleBooks, getBibleBook } from "./bibleBooks";
import type { VerseId } from "./verse";
import { verseIdFromParts } from "./verse";

export type ScriptureRefConfidence = "high" | "medium" | "low";

export interface ScriptureDetectContext {
  /** Current card book, used for relative same-book refs like （十七 5）. */
  sourceBookId?: string;
  /** Current card chapter, used for same-chapter verse lists like （1、21、27 节） / （7 节）. */
  sourceChapter?: number;
}

export type ScriptureRefPattern =
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

export interface DetectedScriptureRef {
  raw: string;
  start: number;
  end: number;
  verseIds: VerseId[];
  confidence: ScriptureRefConfidence;
  pattern: ScriptureRefPattern;
}

const TRADITIONAL_TO_SIMPLIFIED: Record<string, string> = {
  來: "来",
  後: "后",
  書: "书",
  記: "记",
  論: "论",
  語: "语",
  詩: "诗",
  傳: "传",
  爾: "尔",
  約: "约",
  彌: "弥",
  舊: "旧",
  與: "与",
};

const CN_DIGIT: Record<string, number> = {
  "零": 0,
  "〇": 0,
  "○": 0,
  "Ｏ": 0,
  "0": 0,
  "一": 1,
  "壹": 1,
  "二": 2,
  "两": 2,
  "兩": 2,
  "贰": 2,
  "三": 3,
  "叁": 3,
  "四": 4,
  "五": 5,
  "六": 6,
  "七": 7,
  "八": 8,
  "九": 9,
  "十": 10,
  "廿": 20,
  "卅": 30,
};

/** Trailing prose attached to real citations inside parentheses. */
const TRAILING_NOTE_PATTERN =
  /(?:七十士译本|原文[^\s；;，,。]{0,12}|同|本节同|下同|上同|参看).*$/u;

/** Book tokens sorted longest-first for greedy matching. */
const BOOK_TOKENS: Array<{ token: string; bookId: string }> = (() => {
  const entries = new Map<string, string>();

  const register = (token: string, bookId: string) => {
    const trimmed = token.trim();
    if (!trimmed) return;
    if (!entries.has(trimmed)) entries.set(trimmed, bookId);
    const simplified = simplifyChinese(trimmed);
    if (simplified && !entries.has(simplified)) entries.set(simplified, bookId);
  };

  for (const book of bibleBooks) {
    const candidates = [
      book.chineseShortName,
      book.chineseName,
      ...book.aliases.filter((alias) => /[\u4e00-\u9fff]/.test(alias)),
    ];
    for (const raw of candidates) register(raw, book.id);
  }

  const extra: Array<[string, string]> = [
    ["來", "Heb"],
    ["約壹", "1John"],
    ["約貳", "2John"],
    ["約叄", "3John"],
    ["約一", "1John"],
    ["約二", "2John"],
    ["約三", "3John"],
    ["约一", "1John"],
    ["约二", "2John"],
    ["约三", "3John"],
    ["犹大书", "Jude"],
    ["俄巴底亚书", "Obad"],
    ["腓利门书", "Phlm"],
    ["提", "Titus"],
    ["提多", "Titus"],
  ];
  for (const [token, bookId] of extra) register(token, bookId);

  return [...entries.entries()]
    .map(([token, bookId]) => ({ token, bookId }))
    .sort((a, b) => b.token.length - a.token.length || a.token.localeCompare(b.token, "zh-CN"));
})();

const BOOK_TOKEN_PATTERN = BOOK_TOKENS.map((entry) => escapeRegExp(entry.token)).join("|");
const CN_NUM_TOKEN = "[一二三四五六七八九十廿卅百千零〇○两兩壹贰叁0-9]+";
const VERSE_ATOM = "\\d+(?:\\s*[-–—~～]\\s*\\d+)?";
const VERSE_SEQ = `${VERSE_ATOM}(?:\\s*[、,，]\\s*${VERSE_ATOM})*`;

const WIKI_LINK_PATTERN = /\[\[([^\]]+)\]\]/g;
const PAREN_SPAN_PATTERN = /[（(]([^（）()]{1,120})[）)]/g;

/**
 * Standalone absolute citation outside chains, used by parseComprehensiveAbsoluteRef helpers.
 * Examples: 申三十二 15 | 弗六 12 | 出十九 6 | 犹 7
 */
const RELATIVE_CHAPTER_UNIT_PATTERN = new RegExp(
  `^(${CN_NUM_TOKEN})\\s+(${VERSE_SEQ})(?:\\s*节)?$`,
);

/** Same-book cross-chapter span: 十二 10-十三 4 / 十六 1-十七 17 */
const RELATIVE_CROSS_CHAPTER_RANGE_PATTERN = new RegExp(
  "^(" + CN_NUM_TOKEN + ")\\s+(\\d+)\\s*[-–—~～]\\s*(" + CN_NUM_TOKEN + ")\\s+(\\d+)$",
);

const SAME_CHAPTER_VERSE_UNIT_PATTERN = new RegExp(
  `^(${VERSE_SEQ})\\s*节$`,
);

export function simplifyChinese(input: string): string {
  return [...input].map((char) => TRADITIONAL_TO_SIMPLIFIED[char] ?? char).join("");
}

export function parseChineseNumeral(input: string): number | null {
  const raw = simplifyChinese(input).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const bare = raw.replace(/^第/, "").replace(/[章节節]$/, "");
  if (!bare) return null;

  if (/^\d+$/.test(bare)) {
    const value = Number(bare);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  let total = 0;
  let current = 0;
  let sawDigit = false;

  for (const char of bare) {
    if (char === "十") {
      // 十 / 十一 / 一百十一 — pending ones default to 1 before multiplying by ten.
      if (current === 0) current = 1;
      total += current * 10;
      current = 0;
      sawDigit = true;
      continue;
    }
    if (char === "廿" || char === "卅") {
      // 廿=20, 卅=30; allow 廿四=24.
      total += CN_DIGIT[char] ?? 0;
      current = 0;
      sawDigit = true;
      continue;
    }
    if (char === "百") {
      if (!sawDigit) current = 1;
      total += current * 100;
      current = 0;
      sawDigit = true;
      continue;
    }
    if (char === "千") {
      if (!sawDigit) current = 1;
      total += current * 1000;
      current = 0;
      sawDigit = true;
      continue;
    }

    const digit = CN_DIGIT[char];
    if (digit === undefined) return null;
    // 「一百零五」: after 百, 零 is a placeholder and should not become a digit place.
    if (digit === 0 && total > 0 && current === 0) {
      sawDigit = true;
      continue;
    }
    // digits after 廿/卅/十 already folded into total should add ones place via current.
    current = current * 10 + digit;
    sawDigit = true;
  }

  total += current;
  return sawDigit && total > 0 ? total : null;
}

export function resolveBookToken(token: string): string | undefined {
  const simplified = simplifyChinese(token.trim());
  if (!simplified) return undefined;

  const exact = BOOK_TOKENS.find((entry) => entry.token === simplified);
  if (exact) return exact.bookId;

  const lower = simplified.toLocaleLowerCase();
  const aliasHit = bibleBooks.find((book) => book.aliases.some((alias) => alias.toLocaleLowerCase() === lower));
  return aliasHit?.id;
}

export function isValidVerse(bookId: string, chapter: number, verse: number): boolean {
  const book = getBibleBook(bookId);
  if (!book) return false;
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapterCount) return false;
  const verseCount = book.verseCounts[chapter - 1];
  if (!verseCount) return false;
  return Number.isInteger(verse) && verse >= 1 && verse <= verseCount;
}

export function parseVerseSequence(input: string, maxVerses = 12): number[] | null {
  const raw = input.replace(/\s+/g, "");
  if (!raw) return null;

  const parts = raw.split(/[、,，]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const verses: number[] = [];
  for (const part of parts) {
    const range = part.match(/^(\d+)(?:[-–—~～](\d+))?$/);
    if (!range) return null;
    const from = Number(range[1]);
    const to = range[2] ? Number(range[2]) : from;
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) return null;
    for (let verse = from; verse <= to; verse += 1) {
      verses.push(verse);
      if (verses.length > maxVerses) return verses.slice(0, maxVerses);
    }
  }

  return verses.length > 0 ? verses : null;
}

interface ParsedCitationUnit {
  verseIds: VerseId[];
  bookId?: string;
  kind: "absolute" | "relative-chapter" | "relative-verse" | "single-chapter-book" | "study-absolute" | "study-relative";
}

/**
 * Parse one citation unit such as:
 * - 出十九 6 / 罗一 26-27 / 犹 7
 * - 十七 5 / 十八 2、9-10 / 一 4、10、12
 * - 7 节 / 3-4 节 / 1、21、27 节
 */

interface AbsoluteCandidate {
  bookId: string;
  chapter: number;
  verses: number[];
  kind: "absolute" | "single-chapter-book";
}

function enumerateAbsoluteCandidates(cleaned: string): AbsoluteCandidate[] {
  const candidates: AbsoluteCandidate[] = [];
  const simplified = simplifyChinese(cleaned);

  for (const entry of BOOK_TOKENS) {
    if (!simplified.startsWith(entry.token)) continue;
    let rest = simplified.slice(entry.token.length).trim();
    if (!rest) continue;

    // Pattern A: <book><chapter> <verses>
    const withChapter = rest.match(new RegExp(`^(${CN_NUM_TOKEN})\\s+(${VERSE_SEQ})$`));
    if (withChapter) {
      const chapter = parseChineseNumeral(withChapter[1] ?? "");
      const verses = parseVerseSequence(withChapter[2] ?? "");
      if (chapter !== null && verses) {
        candidates.push({ bookId: entry.bookId, chapter, verses, kind: "absolute" });
      }
      continue;
    }

    // Pattern B: single-chapter book + verses only, e.g. 犹 7
    const versesOnly = rest.match(new RegExp(`^(${VERSE_SEQ})$`));
    if (versesOnly) {
      const book = getBibleBook(entry.bookId);
      if (book?.chapterCount === 1) {
        const verses = parseVerseSequence(versesOnly[1] ?? "");
        if (verses) {
          candidates.push({ bookId: entry.bookId, chapter: 1, verses, kind: "single-chapter-book" });
        }
      }
    }
  }

  // Prefer more specific / longer book tokens first (BOOK_TOKENS already longest-first),
  // but caller still validates verse existence and may accept a shorter-book candidate later.
  return candidates;
}

export function parseCitationUnit(
  input: string,
  context: ScriptureDetectContext & { carryBookId?: string } = {},
): ParsedCitationUnit | null {
  const cleaned = sanitizeCitationUnit(input);
  if (!cleaned) return null;

  // Absolute with optional chapter (single-chapter books omit chapter).
  // Try longest book token first, then backtrack so "约一 51" prefers John 1:51 over invalid 1John 51.
  const absoluteCandidates = enumerateAbsoluteCandidates(cleaned);
  for (const candidate of absoluteCandidates) {
    const verseIds = toValidVerseIds(candidate.bookId, candidate.chapter, candidate.verses);
    if (!verseIds) continue;
    return {
      verseIds,
      bookId: candidate.bookId,
      kind: candidate.kind,
    };
  }

  // Study-bible absolute: 太10:2 / 来11:3 / 王下25:27-30 / 约14:27注 / 赛21.9
  const studyAbs = cleaned.match(
    new RegExp(`^(${BOOK_TOKEN_PATTERN})\\s*(\\d+)\\s*[:：.．]\\s*(${VERSE_SEQ})$`),
  );
  if (studyAbs) {
    const bookId = resolveBookToken(studyAbs[1] ?? "");
    const chapter = Number(studyAbs[2]);
    const verses = parseVerseSequence(studyAbs[3] ?? "");
    if (bookId && Number.isInteger(chapter) && verses) {
      const verseIds = toValidVerseIds(bookId, chapter, verses);
      if (verseIds) {
        return { verseIds, bookId, kind: "study-absolute" };
      }
    }
  }

  // Single-chapter books with verse: 俄15节 / 犹7 / 门1节
  {
    const mSingle = cleaned.match(
      new RegExp(`^(${BOOK_TOKEN_PATTERN})\\s*(\\d+)(?:\\s*[-–—~～]\\s*(\\d+))?\\s*节?$`),
    );
    if (mSingle) {
      const bookId = resolveBookToken(mSingle[1] ?? "");
      const counts = bookId ? getBibleBook(bookId)?.verseCounts : undefined;
      if (bookId && counts?.length === 1) {
        const verseFrom = Number(mSingle[2]);
        const verseTo = mSingle[3] ? Number(mSingle[3]) : verseFrom;
        const verses: number[] = [];
        if (Number.isInteger(verseFrom) && Number.isInteger(verseTo) && verseTo >= verseFrom) {
          for (let v = verseFrom; v <= Math.min(verseTo, verseFrom + 30); v += 1) verses.push(v);
        }
        const verseIds = verses.length ? toValidVerseIds(bookId, 1, verses) : null;
        if (verseIds) {
          return { verseIds, bookId, kind: "study-absolute" };
        }
      }
    }
  }

  // Study-bible book + multiple chapter:verse chunks:
  // 徒19:21，20:1-3 / 赛43:18-19,65:17-23 / 徒16:9-17:15、18:5
  {
    const multi = cleaned.match(
      new RegExp(`^(${BOOK_TOKEN_PATTERN})\\s*(.+)$`),
    );
    if (multi) {
      const bookId = resolveBookToken(multi[1] ?? "");
      const rest = (multi[2] ?? "").trim();
      if (bookId && /[:：]/.test(rest)) {
        const chunks = rest
          .split(/[，,；;、]/)
          .map((part) => part.trim())
          .filter(Boolean);
        const verseIds: VerseId[] = [];
        let ok = chunks.length > 0;
        let carryChapter: number | undefined;
        for (const chunk of chunks) {
          const cross = chunk.match(/^(\d+)\s*[:：]\s*(\d+)\s*[-–—~～]\s*(\d+)\s*[:：]\s*(\d+)$/);
          if (cross) {
            const ids = expandCrossChapterRange(
              bookId,
              Number(cross[1]),
              Number(cross[2]),
              Number(cross[3]),
              Number(cross[4]),
            );
            if (!ids) {
              ok = false;
              break;
            }
            verseIds.push(...ids);
            carryChapter = Number(cross[3]);
            continue;
          }
          const one = chunk.match(/^(\d+)\s*[:：.．]\s*(.+)$/);
          if (one) {
            const chapter = Number(one[1]);
            const verses = parseVerseSequence(one[2] ?? "");
            if (!Number.isInteger(chapter) || !verses) {
              ok = false;
              break;
            }
            const ids = toValidVerseIds(bookId, chapter, verses);
            if (!ids) {
              ok = false;
              break;
            }
            verseIds.push(...ids);
            carryChapter = chapter;
            continue;
          }
          // Same-chapter bare verse atoms after a chapter:verse: 14:16-18、26 / 16:7-14、20:22
          if (carryChapter != null) {
            const verses = parseVerseSequence(chunk);
            if (!verses) {
              ok = false;
              break;
            }
            const ids = toValidVerseIds(bookId, carryChapter, verses);
            if (!ids) {
              ok = false;
              break;
            }
            verseIds.push(...ids);
            continue;
          }
          ok = false;
          break;
        }
        if (ok && verseIds.length > 0) {
          return { verseIds: uniqueVerseIds(verseIds), bookId, kind: "study-absolute" };
        }
      }
    }
  }

  // Study-bible / commentary chapter-only refs: 出7-15章 / 王下17章 / 书21章
  const studyChapterOnly = cleaned.match(
    new RegExp(`^(${BOOK_TOKEN_PATTERN})\\s*(\\d+)(?:\\s*[-–—~～]\\s*(\\d+))?\\s*章$`),
  );
  if (studyChapterOnly) {
    const bookId = resolveBookToken(studyChapterOnly[1] ?? "");
    const fromChapter = Number(studyChapterOnly[2]);
    const toChapter = studyChapterOnly[3] ? Number(studyChapterOnly[3]) : fromChapter;
    if (bookId && Number.isInteger(fromChapter) && Number.isInteger(toChapter) && toChapter >= fromChapter) {
      const book = getBibleBook(bookId);
      if (book && fromChapter >= 1 && toChapter <= book.chapterCount) {
        // Represent chapter refs by first verse of each chapter (hover preview anchor).
        const verseIds: VerseId[] = [];
        for (let chapter = fromChapter; chapter <= Math.min(toChapter, fromChapter + 11); chapter += 1) {
          if (isValidVerse(bookId, chapter, 1)) {
            verseIds.push(verseIdFromParts(bookId, chapter, 1));
          }
        }
        if (verseIds.length > 0) {
          return { verseIds, bookId, kind: "study-absolute" };
        }
      }
    }
  }

  // multi relative chapter:verse list without book: 1:3，22:7 / 1:1，4，22:8
  if ((context.carryBookId ?? context.sourceBookId) && /[:：]/.test(cleaned) && !/^[\u4e00-\u9fff]/.test(cleaned)) {
    const bookId = context.carryBookId ?? context.sourceBookId!;
    const chunks = cleaned
      .split(/[，,；;、]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (chunks.length >= 2 && chunks.every((chunk) => /^\d+\s*[:：.\\．]\s*\d+/.test(chunk) || /^\d+$/.test(chunk))) {
      const verseIds: VerseId[] = [];
      let ok = true;
      let lastChapter: number | null = null;
      for (const chunk of chunks) {
        const cross = chunk.match(/^(\d+)\s*[:：.\\．]\s*(\d+)\s*[-–—~～]\s*(\d+)\s*[:：.\\．]\s*(\d+)$/);
        if (cross) {
          const ids = expandCrossChapterRange(bookId, Number(cross[1]), Number(cross[2]), Number(cross[3]), Number(cross[4]));
          if (!ids) { ok = false; break; }
          verseIds.push(...ids);
          lastChapter = Number(cross[3]);
          continue;
        }
        const one = chunk.match(/^(\d+)\s*[:：.\\．]\s*(.+)$/);
        if (one) {
          const chapter = Number(one[1]);
          const verses = parseVerseSequence(one[2] ?? "");
          const ids = Number.isInteger(chapter) && verses ? toValidVerseIds(bookId, chapter, verses) : null;
          if (!ids) { ok = false; break; }
          verseIds.push(...ids);
          lastChapter = chapter;
          continue;
        }
        // bare verse continuing previous chapter: 1:1，4，22:8 -> 4 uses chapter 1
        if (/^\d+$/.test(chunk) && lastChapter !== null) {
          const verse = Number(chunk);
          if (!isValidVerse(bookId, lastChapter, verse)) { ok = false; break; }
          verseIds.push(verseIdFromParts(bookId, lastChapter, verse));
          continue;
        }
        ok = false;
        break;
      }
      if (ok && verseIds.length > 0) {
        return { verseIds: uniqueVerseIds(verseIds), bookId, kind: "study-relative" };
      }
    }
  }

  // Study-bible cross-chapter relative/absolute-less form: 1:17-2:10 / 4:8-5:15
  const studyCross = cleaned.match(/^(\d+)\s*[:：]\s*(\d+)\s*[-–—~～]\s*(\d+)\s*[:：]\s*(\d+)$/);
  if (studyCross) {
    const bookId = context.carryBookId ?? context.sourceBookId;
    if (bookId) {
      const fromChapter = Number(studyCross[1]);
      const fromVerse = Number(studyCross[2]);
      const toChapter = Number(studyCross[3]);
      const toVerse = Number(studyCross[4]);
      if (
        Number.isInteger(fromChapter) &&
        Number.isInteger(fromVerse) &&
        Number.isInteger(toChapter) &&
        Number.isInteger(toVerse)
      ) {
        const verseIds = expandCrossChapterRange(bookId, fromChapter, fromVerse, toChapter, toVerse);
        if (verseIds) {
          return { verseIds, bookId, kind: "study-relative" };
        }
      }
    }
  }

  // Study-bible relative in current/carry book: 1:1 / 2:7-9 / 1:11-12
  const studyRel = cleaned.match(new RegExp(`^(\\d+)\\s*[:：]\\s*(${VERSE_SEQ})$`));
  if (studyRel) {
    const bookId = context.carryBookId ?? context.sourceBookId;
    const chapter = Number(studyRel[1]);
    const verses = parseVerseSequence(studyRel[2] ?? "");
    if (bookId && Number.isInteger(chapter) && verses) {
      const verseIds = toValidVerseIds(bookId, chapter, verses);
      if (verseIds) {
        return { verseIds, bookId, kind: "study-relative" };
      }
    }
  }

  // Relative chapter-only: 13章 / 1-7章 / 主要是8-9章
  {
    const relCh = cleaned.match(/^(?:主要是|尤其是|尤其|特别是|特别)?(\d+)(?:\s*[-–—~～]\s*(\d+))?\s*章$/);
    if (relCh && context.sourceBookId) {
      const fromChapter = Number(relCh[1]);
      const toChapter = relCh[2] ? Number(relCh[2]) : fromChapter;
      const book = getBibleBook(context.sourceBookId);
      if (
        book &&
        Number.isInteger(fromChapter) &&
        Number.isInteger(toChapter) &&
        fromChapter >= 1 &&
        toChapter <= book.chapterCount &&
        toChapter >= fromChapter
      ) {
        const verseIds: VerseId[] = [];
        for (let chapter = fromChapter; chapter <= Math.min(toChapter, fromChapter + 11); chapter += 1) {
          if (isValidVerse(context.sourceBookId, chapter, 1)) {
            verseIds.push(verseIdFromParts(context.sourceBookId, chapter, 1));
          }
        }
        if (verseIds.length > 0) {
          return { verseIds, bookId: context.sourceBookId, kind: "study-relative" };
        }
      }
    }
  }

  // 见9节 / 参16节 / 另见17节 (same-chapter pointers)
  const seeVerse = cleaned.match(/^(?:见|参|另见|参见)?\s*第?\s*(\d+(?:\s*[-–—~～]\s*\d+)?(?:\s*[、,，]\s*\d+(?:\s*[-–—~～]\s*\d+)?)*)\s*节$/);
  if (seeVerse && context.sourceBookId && context.sourceChapter) {
    const verses = parseVerseSequence(seeVerse[1] ?? "");
    if (verses) {
      const verseIds = toValidVerseIds(context.sourceBookId, context.sourceChapter, verses);
      if (verseIds) {
        return { verseIds, bookId: context.sourceBookId, kind: "relative-verse" };
      }
    }
  }

  // Same-chapter: 7 节 / 3-4 节 / 1、21、27 节
  const sameChapter = SAME_CHAPTER_VERSE_UNIT_PATTERN.exec(cleaned);
  if (sameChapter) {
    if (!context.sourceBookId || !context.sourceChapter) return null;
    const verses = parseVerseSequence(sameChapter[1] ?? "");
    if (!verses) return null;
    const verseIds = toValidVerseIds(context.sourceBookId, context.sourceChapter, verses);
    if (!verseIds) return null;
    return {
      verseIds,
      bookId: context.sourceBookId,
      kind: "relative-verse",
    };
  }

  // Same-book cross-chapter span: 十二 10-十三 4
  const cross = RELATIVE_CROSS_CHAPTER_RANGE_PATTERN.exec(cleaned);
  if (cross) {
    const bookId = context.carryBookId ?? context.sourceBookId;
    if (bookId) {
      const fromChapter = parseChineseNumeral(cross[1] ?? "");
      const fromVerse = Number(cross[2]);
      const toChapter = parseChineseNumeral(cross[3] ?? "");
      const toVerse = Number(cross[4]);
      if (
        fromChapter !== null &&
        toChapter !== null &&
        Number.isInteger(fromVerse) &&
        Number.isInteger(toVerse) &&
        (toChapter > fromChapter || (toChapter === fromChapter && toVerse >= fromVerse))
      ) {
        const verseIds = expandCrossChapterRange(bookId, fromChapter, fromVerse, toChapter, toVerse);
        if (verseIds) {
          return {
            verseIds,
            bookId,
            kind: "relative-chapter",
          };
        }
      }
    }
  }

  // Relative chapter in current/carry book: 十七 5 / 十八 2、9-10
  const relative = RELATIVE_CHAPTER_UNIT_PATTERN.exec(cleaned);
  if (relative) {
    // Avoid treating pure book names as chapter numerals if they ever match.
    if (resolveBookToken(relative[1] ?? "")) return null;

    const bookId = context.carryBookId ?? context.sourceBookId;
    if (!bookId) return null;

    const chapter = parseChineseNumeral(relative[1] ?? "");
    const verses = parseVerseSequence(relative[2] ?? "");
    if (chapter === null || !verses) return null;

    const verseIds = toValidVerseIds(bookId, chapter, verses);
    if (!verseIds) return null;
    return {
      verseIds,
      bookId,
      kind: "relative-chapter",
    };
  }

  return null;
}

export function parseComprehensiveAbsoluteRef(input: string): VerseId | null {
  const trimmed = input.trim().replace(/^[（(]/, "").replace(/[）)]$/, "");
  const parsed = parseCitationUnit(trimmed);
  if (!parsed || parsed.verseIds.length !== 1) return null;
  if (parsed.kind !== "absolute" && parsed.kind !== "single-chapter-book") return null;
  return parsed.verseIds[0] ?? null;
}

export function detectScriptureRefs(
  text: string,
  context: ScriptureDetectContext = {},
): DetectedScriptureRef[] {
  if (!text) return [];

  // Normalize soft line-wraps inside potential citations so "来二\n\n10" still parses.
  const normalizedText = text
    .replace(/\r\n?/g, "\n")
    // OCR broken chapter:verse separators: 14.：27 / 53：|2 / 创1：.1
    .replace(/(?<=\d)\s*[:：]\s*[\.．]\s*(?=\d)/g, ":")
    .replace(/(?<=\d)\s*[\.．]\s*[:：]\s*[|｜]?\s*(?=\d)/g, ":")
    .replace(/(?<=\d)\s*[:：]\s*[|｜]\s*(?=\d)/g, ":");
  const hits: DetectedScriptureRef[] = [];
  const occupied = new IntervalSet();

  // 1) wiki links
  for (const match of normalizedText.matchAll(WIKI_LINK_PATTERN)) {
    const rawInner = match[1] ?? "";
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const verseId = tryNormalizeLoose(rawInner);
    if (!verseId || occupied.overlaps(start, end)) continue;
    occupied.add(start, end);
    hits.push({
      raw: match[0],
      start,
      end,
      verseIds: [verseId],
      confidence: "high",
      pattern: "wiki",
    });
  }

  // 2) parenthetical citation groups — main comprehensive-commentary surface
  PAREN_SPAN_PATTERN.lastIndex = 0;
  for (const match of normalizedText.matchAll(PAREN_SPAN_PATTERN)) {
    const full = match[0];
    const inner = match[1] ?? "";
    const start = match.index ?? 0;
    const end = start + full.length;
    if (occupied.overlaps(start, end)) continue;

    const group = parseParentheticalCitationGroup(inner, context);
    if (!group || group.units.length === 0) continue;

    // Multi-unit chains: emit one interactive mark for the whole parenthesis when units
    // are tightly chained, but prefer per-unit marks when we can locate sub-spans cleanly.
    if (group.units.length === 1) {
      const unit = group.units[0]!;
      occupied.add(start, end);
      hits.push({
        raw: full.slice(1, full.length - 1),
        start,
        end,
        verseIds: unit.verseIds,
        confidence: "high",
        pattern: patternForUnit(unit),
      });
      continue;
    }

    // Try to map each unit back onto the inner text for finer hover targets.
    const unitHits = locateUnitsInParenthesis(full, inner, start, group.units);
    if (unitHits.length === group.units.length) {
      for (const hit of unitHits) {
        if (occupied.overlaps(hit.start, hit.end)) continue;
        occupied.add(hit.start, hit.end);
        hits.push(hit);
      }
      continue;
    }

    // Fallback: one mark for the whole chain.
    occupied.add(start, end);
    hits.push({
      raw: full.slice(1, full.length - 1),
      start,
      end,
      verseIds: uniqueVerseIds(group.units.flatMap((unit) => unit.verseIds)),
      confidence: "high",
      pattern: "comprehensive-chain",
    });
  }

  // 3) bare study-bible absolute citations: 太10:2 / 来11:3注 / 王下25:27-30
    const bareStudyAbsolute = new RegExp(
    "(?<![\u4e00-\u9fffA-Za-z0-9])(?:" + BOOK_TOKEN_PATTERN + ")\s*\d+\s*[:：.．]\s*[|｜]?\s*(?:" + VERSE_SEQ + ")(?:注)?(?![\w\u4e00-\u9fff:：])",
    "g",
  );
  for (const match of normalizedText.matchAll(bareStudyAbsolute)) {
    const full = match[0];
    const start = match.index ?? 0;
    const end = start + full.length;
    if (occupied.overlaps(start, end)) continue;
    const parsed = parseCitationUnit(full.replace(/注$/u, ""), context);
    if (!parsed) continue;
    occupied.add(start, end);
    hits.push({
      raw: full,
      start,
      end,
      verseIds: parsed.verseIds,
      confidence: "high",
      pattern: "study-absolute",
    });
  }

  // 3b) bare multi-chunk study refs: 见徒19:21，20:1-3 / 赛43:18-19,65:17-23
  {
    const multiBare = new RegExp(
      "(?<![\\u4e00-\\u9fffA-Za-z0-9])(?:见|参|另见|参见|但见|尤见|呼应|注意)?" +
        "(?:" + BOOK_TOKEN_PATTERN + ")" +
        "\\s*" +
        "\\d+\\s*[:：.．]\\s*\\d+(?:\\s*[-–—~～]\\s*\\d+)?(?:\\s*[:：.．]\\s*\\d+)?" +
        "(?:\\s*[，,；;、.]\\s*\\d+\\s*[:：.．]\\s*\\d+(?:\\s*[-–—~～]\\s*\\d+)?(?:\\s*[:：.．]\\s*\\d+)?)*" +
        "(?:注)?",
      "g",
    );
    for (const match of normalizedText.matchAll(multiBare)) {
      const full = match[0];
      const start = match.index ?? 0;
      const end = start + full.length;
      if (occupied.overlaps(start, end)) continue;
      const parsed = parseCitationUnit(full, context);
      if (!parsed) continue;
      occupied.add(start, end);
      hits.push({
        raw: full,
        start,
        end,
        verseIds: parsed.verseIds,
        confidence: "high",
        pattern: "study-absolute",
      });
    }
  }

  // 4) chained / residual study absolute tokens (来11:3：启4:11)
  const bareStudyToken = new RegExp(
    "(?:" + BOOK_TOKEN_PATTERN + ")\\s*\\d+\\s*[:：]\\s*(?:" + VERSE_SEQ + ")(?:注)?",
    "g",
  );
  for (const match of normalizedText.matchAll(bareStudyToken)) {
    const full = match[0];
    const start = match.index ?? 0;
    const end = start + full.length;
    if (occupied.overlaps(start, end)) continue;
    const prev = start > 0 ? normalizedText[start - 1] : "";
    const next = end < normalizedText.length ? normalizedText[end] : "";
    const nearChain = /[：；;，,\s（(]/.test(prev || " ") || /[：；;，,\s）)。；]/.test(next || " ");
    if (!nearChain && prev && /[\u4e00-\u9fffA-Za-z0-9]/.test(prev)) continue;
    const parsed = parseCitationUnit(full.replace(/注$/u, ""), context);
    if (!parsed) continue;
    occupied.add(start, end);
    hits.push({
      raw: full,
      start,
      end,
      verseIds: parsed.verseIds,
      confidence: nearChain ? "high" : "medium",
      pattern: "study-absolute",
    });
  }

  // 5) bare comprehensive absolute: 申三十二 15
  const bareAbsolute = new RegExp(
    "(?<![\\u4e00-\\u9fffA-Za-z0-9])(?:" + BOOK_TOKEN_PATTERN + ")\\s*(?:" + CN_NUM_TOKEN + ")\\s+(?:" + VERSE_ATOM + ")(?![\\w\\u4e00-\\u9fff])",
    "g",
  );
  for (const match of normalizedText.matchAll(bareAbsolute)) {
    const full = match[0];
    const start = match.index ?? 0;
    const end = start + full.length;
    if (occupied.overlaps(start, end)) continue;
    if (!isBoundedCitation(normalizedText, start, end)) continue;
    const parsed = parseCitationUnit(full, context);
    if (!parsed || parsed.kind === "relative-verse" || parsed.kind === "study-relative") continue;
    occupied.add(start, end);
    hits.push({
      raw: full,
      start,
      end,
      verseIds: parsed.verseIds,
      confidence: "medium",
      pattern: patternForUnit(parsed),
    });
  }

  // 5b) bare study cross-chapter ranges (before relative ch:vs): 1:17-2:10 / 4:8-5:15
  if (context.sourceBookId) {
    const crossPat = /(?<![\w\u4e00-\u9fff])\d+\s*[:：]\s*\d+\s*[-–—~～]\s*\d+\s*[:：]\s*\d+(?![\w]|\d|[:：]\s*\d)/g;
    for (const match of normalizedText.matchAll(crossPat)) {
      const full = match[0];
      const start = match.index ?? 0;
      const end = start + full.length;
      if (occupied.overlaps(start, end)) continue;
      const parsed = parseCitationUnit(full, context);
      if (!parsed) continue;
      occupied.add(start, end);
      hits.push({
        raw: full,
        start,
        end,
        verseIds: parsed.verseIds,
        confidence: "medium",
        pattern: "study-relative",
      });
    }
  }

  // 6) bare study relative with card context: 见1:28注 / （2:7-9） already handled / 1:11-12
  // Run after cross-chapter (step 11 moved above) is ideal; also refuse when "ch:vs-ch:vs" continues.
  if (context.sourceBookId) {
    const bareStudyRelative = new RegExp(
      "\\d+\\s*[:：]\\s*(?:" + VERSE_SEQ + ")(?:注)?(?!\\s*[:：]\\s*\\d)",
      "g",
    );
    for (const match of normalizedText.matchAll(bareStudyRelative)) {
      const full = match[0];
      const start = match.index ?? 0;
      const end = start + full.length;
      if (occupied.overlaps(start, end)) continue;
      const prev = start > 0 ? normalizedText[start - 1] : "";
      const next = end < normalizedText.length ? normalizedText[end] : "";
      // Skip if glued to latin/digit (years, decimals) or clearly part of book-qualified ref already claimed.
      if (prev && /[\dA-Za-z]/.test(prev)) continue;
      if (next && /[A-Za-z]/.test(next)) continue;
      // Do not steal the front of a cross-chapter range like 20:7-22:5
      if (/[:：]\s*\d/.test(normalizedText.slice(end, end + 4))) continue;
      const parsed = parseCitationUnit(full.replace(/注$/u, ""), context);
      if (!parsed || parsed.kind !== "study-relative") continue;
      occupied.add(start, end);
      hits.push({
        raw: full,
        start,
        end,
        verseIds: parsed.verseIds,
        confidence: "medium",
        pattern: "study-relative",
      });
    }
  }

  // 7) chapter:verse lists ending with 节, e.g. 1:11-12、16-17、19节
  if (context.sourceBookId) {
    const chapterVerseListPat = new RegExp(
      "\\d+\\s*[:：]\\s*(?:" + VERSE_SEQ + ")\\s*节",
      "g",
    );
    for (const match of normalizedText.matchAll(chapterVerseListPat)) {
      const full = match[0];
      const start = match.index ?? 0;
      const end = start + full.length;
      if (occupied.overlaps(start, end)) continue;
      const parsed = parseCitationUnit(full, context);
      if (!parsed) continue;
      occupied.add(start, end);
      hits.push({
        raw: full,
        start,
        end,
        verseIds: parsed.verseIds,
        confidence: "high",
        pattern: "study-relative",
      });
    }
  }

  // 8) same-chapter compact lists ending with 节: 16-17、19节 / 14节
  if (context.sourceBookId && context.sourceChapter) {
    const listPat = new RegExp(
      "(?<![\\w\\u4e00-\\u9fff:：])(?:" + VERSE_SEQ + ")\\s*节(?![\\w\\u4e00-\\u9fff])",
      "g",
    );
    for (const match of normalizedText.matchAll(listPat)) {
      const full = match[0];
      const start = match.index ?? 0;
      const end = start + full.length;
      if (occupied.overlaps(start, end)) continue;
      const parsed = parseCitationUnit(full, context);
      if (!parsed) continue;
      occupied.add(start, end);
      hits.push({
        raw: full,
        start,
        end,
        verseIds: parsed.verseIds,
        confidence: "high",
        pattern: patternForUnit(parsed),
      });
    }
  }

  // 9) bare chapter-only refs: 出7-15章 / 王下17章
  const bareChapterOnly = new RegExp(
    "(?<![\\u4e00-\\u9fffA-Za-z0-9])(?:见|参|另见|参见|但见|尤见)?" +
      "(?:" + BOOK_TOKEN_PATTERN + ")" +
      "\\s*\\d+(?:\\s*[-–—~～]\\s*\\d+)?\\s*章(?![0-9A-Za-z])",
    "g",
  );
  for (const match of normalizedText.matchAll(bareChapterOnly)) {
    const full = match[0];
    const start = match.index ?? 0;
    const end = start + full.length;
    if (occupied.overlaps(start, end)) continue;
    const parsed = parseCitationUnit(full, context);
    if (!parsed) continue;
    occupied.add(start, end);
    hits.push({
      raw: full,
      start,
      end,
      verseIds: parsed.verseIds,
      confidence: "medium",
      pattern: "study-absolute",
    });
  }

  // 9b) single-chapter book + verse with 节: 犹6节 / 见犹6节注 / 俄15节
  {
    const singleChapterVerse = new RegExp(
      "(?<![\\u4e00-\\u9fffA-Za-z0-9])(?:见|参|另见|参见|但见)?" +
        "(?:" + BOOK_TOKEN_PATTERN + ")" +
        "\\s*\\d+(?:\\s*[-–—~～]\\s*\\d+)?\\s*节(?:注)?(?![\\w\\u4e00-\\u9fff])",
      "g",
    );
    for (const match of normalizedText.matchAll(singleChapterVerse)) {
      const full = match[0];
      const start = match.index ?? 0;
      const end = start + full.length;
      if (occupied.overlaps(start, end)) continue;
      const parsed = parseCitationUnit(full.replace(/注$/u, ""), context);
      if (!parsed) continue;
      occupied.add(start, end);
      hits.push({
        raw: full,
        start,
        end,
        verseIds: parsed.verseIds,
        confidence: "high",
        pattern: "study-absolute",
      });
    }
  }

  // 10) 见9节 / 参2节 / 另见17节
  if (context.sourceBookId && context.sourceChapter) {
    const seePat = /(?:见|参|另见|参见)\s*第?\s*(\d+(?:\s*[-–—~～]\s*\d+)?(?:\s*[、,，]\s*\d+(?:\s*[-–—~～]\s*\d+)?)*)\s*节/g;
    for (const match of normalizedText.matchAll(seePat)) {
      const full = match[0];
      const start = match.index ?? 0;
      const end = start + full.length;
      if (occupied.overlaps(start, end)) continue;
      const parsed = parseCitationUnit(full, context);
      if (!parsed) continue;
      occupied.add(start, end);
      hits.push({
        raw: full,
        start,
        end,
        verseIds: parsed.verseIds,
        confidence: "high",
        pattern: patternForUnit(parsed),
      });
    }
  }

  // 12) bare relative chapter-only with card book: 13章 / 8-9章
  if (context.sourceBookId) {
    const relChapterPat = /(?<![\w\u4e00-\u9fff])(?:主要是|尤其是|尤其|特别是|特别)?(\d+)(?:\s*[-–—~～]\s*(\d+))?\s*章(?![0-9A-Za-z])/g;
    for (const match of normalizedText.matchAll(relChapterPat)) {
      const full = match[0];
      const start = match.index ?? 0;
      const end = start + full.length;
      if (occupied.overlaps(start, end)) continue;
      // Skip if immediately preceded by a book token char already claimed.
      const prev = start > 0 ? normalizedText[start - 1] : "";
      if (prev && /[\u4e00-\u9fffA-Za-z]/.test(prev)) continue;
      const fromChapter = Number(match[1]);
      const toChapter = match[2] ? Number(match[2]) : fromChapter;
      const book = getBibleBook(context.sourceBookId);
      if (!book || !Number.isInteger(fromChapter) || !Number.isInteger(toChapter)) continue;
      if (fromChapter < 1 || toChapter > book.chapterCount || toChapter < fromChapter) continue;
      const verseIds: VerseId[] = [];
      for (let chapter = fromChapter; chapter <= Math.min(toChapter, fromChapter + 11); chapter += 1) {
        if (isValidVerse(context.sourceBookId, chapter, 1)) {
          verseIds.push(verseIdFromParts(context.sourceBookId, chapter, 1));
        }
      }
      if (verseIds.length === 0) continue;
      occupied.add(start, end);
      hits.push({
        raw: full,
        start,
        end,
        verseIds,
        confidence: "medium",
        pattern: "study-relative",
      });
    }
  }

  // 13) bare multi relative chapter:verse lists without book: 1:3，22:7 / 1:1，22:6,16
  if (context.sourceBookId) {
    const multiRel = /(?<![\w\u4e00-\u9fff])\d+\s*[:：.\\．]\s*\d+(?:\s*[-–—~～]\s*\d+)?(?:\s*[:：.\\．]\s*\d+)?(?:\s*[，,；;、]\s*\d+(?:\s*[:：.\\．]\s*\d+(?:\s*[-–—~～]\s*\d+)?(?:\s*[:：.\\．]\s*\d+)?)?)+/g;
    for (const match of normalizedText.matchAll(multiRel)) {
      const full = match[0];
      const start = match.index ?? 0;
      const end = start + full.length;
      if (occupied.overlaps(start, end)) continue;
      const prev = start > 0 ? normalizedText[start - 1] : "";
      if (prev && /[\u4e00-\u9fffA-Za-z]/.test(prev)) continue; // likely book-qualified already handled
      const parsed = parseCitationUnit(full, context);
      if (!parsed) continue;
      occupied.add(start, end);
      hits.push({
        raw: full,
        start,
        end,
        verseIds: parsed.verseIds,
        confidence: "medium",
        pattern: "study-relative",
      });
    }
  }

  return hits.sort((a, b) => a.start - b.start || a.end - b.end);
}


function parseParentheticalCitationGroup(
  inner: string,
  context: ScriptureDetectContext,
): { units: ParsedCitationUnit[] } | null {
  const compact = inner
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(TRAILING_NOTE_PATTERN, "")
    .trim();
  if (!compact) return null;

  // Reject obvious non-scripture parentheses early.
  if (/Nuzi|Hammurabi|Perfect Number|Triangular|Pythagoras|Amenemhat|Akhenaten|主前|主后|年龄|可以被观测|犹太古史记|卷\s*\d|原文是|即「|为他|本节$|见《和修》|和修|拉丁|ex nihilo|Tiamat|美索不达米亚|导论|地图|讲道集|希腊文动词/.test(compact) || /^[一二三四五六七八九十百]+$/.test(compact) || /^\d+$/.test(compact)) {
    // Still allow leading scripture before a note separator: "本节，来二 5-7"
    if (!/[；;]/.test(compact) && !/(?:^|，|,)\s*(?:来|太|可|路|约|徒|罗|林|加|弗|腓|西|帖|提|雅|彼|犹|启|创|出|利|民|申|书|士|得|撒|王|代|拉|尼|斯|伯|诗|箴|传|歌|赛|耶|哀|结|但|何|珥|摩|俄|拿|弥|鸿|哈|番|该|亚|玛)/.test(compact)) {
      if (/^(本节|原文|即|为)/.test(compact) || /Nuzi|Hammurabi|犹太古史记|Perfect|Triangular|卷\s*\d/.test(compact)) {
        // Special-case "本节，来二 5-7"
        const afterSection = compact.match(/^本节\s*[，,;；]\s*(.+)$/);
        if (!afterSection) return null;
        return parseParentheticalCitationGroup(afterSection[1] ?? "", context);
      }
    }
  }

  // "本节，来二 5-7" / "本节；七 5、9、16"
  const strippedSection = compact.replace(/^本节\s*[，,;；]\s*/, "");

  const segments = splitCitationSegments(strippedSection);
  if (segments.length === 0) return null;

  const units: ParsedCitationUnit[] = [];
  let carryBookId = context.sourceBookId;

  for (const segment of segments) {
    const parsed = parseCitationUnit(segment, {
      sourceBookId: context.sourceBookId,
      sourceChapter: context.sourceChapter,
      carryBookId,
    });
    if (!parsed) {
      // If any segment fails in a multi-segment group, abandon the whole parenthesis
      // only when we have zero successes so far; otherwise stop at first failure.
      if (units.length === 0) return null;
      break;
    }
    units.push(parsed);
    if (parsed.bookId) carryBookId = parsed.bookId;
  }

  return units.length > 0 ? { units } : null;
}

/**
 * Split a parenthetical body into citation units.
 * Prefer ； then split on ， only when the next token begins a new citation.
 */
function splitCitationSegments(input: string): string[] {
  // Study-bible chains often use Chinese colon between refs: 来11:3：启4:11
  const major = input
    .split(/[；;]/)
    .flatMap((part) => part.split(/(?<=\d)\s*：\s*(?=[太可路约徒罗加弗腓西帖提前后提多门来雅彼约壹贰叁犹启创出利民申书士得撒王代拉尼斯伯诗箴传歌赛耶哀结但何珥摩俄拿弥鸿哈番该亚玛林彼前后上下壹贰叁]|\d+\s*[:：])/u))
    .map((part) => part.trim())
    .filter(Boolean);

  const segments: string[] = [];
  for (const chunk of major) {
    // Split on ，/, and on 、 when the next token begins another chapter/book citation.
    // Keep verse lists like "2、9-10" intact (next token is a verse number, not a chapter word).
    const pieces = chunk.split(
      /(?<=\d)\s*[，,]\s*(?=(?:[太可路约徒罗加弗腓西帖提前后提多门来雅彼约壹贰叁犹启创出利民申书士得撒王代拉尼斯伯诗箴传歌赛耶哀结但何珥摩俄拿弥鸿哈番该亚玛林彼前后上下]{1,3}|[一二三四五六七八九十廿卅百千零〇○两兩壹贰叁]+|\d+\s*节))/u,
    );
    for (const piece of pieces) {
      const subpieces = piece.split(
        /(?<=\d)\s*、\s*(?=[一二三四五六七八九十廿卅百千零〇○两兩壹贰叁]+(?:\s+\d|\s*\d)|[太可路约徒罗加弗腓西帖提前后提多门来雅彼约壹贰叁犹启创出利民申书士得撒王代拉尼斯伯诗箴传歌赛耶哀结但何珥摩俄拿弥鸿哈番该亚玛林彼前后上下]{1,3})/u,
      );
      for (const sub of subpieces) {
        const trimmed = sub.trim();
        if (trimmed) segments.push(trimmed);
      }
    }
  }
  return segments;
}

function locateUnitsInParenthesis(
  full: string,
  inner: string,
  parenStart: number,
  units: ParsedCitationUnit[],
): DetectedScriptureRef[] {
  const hits: DetectedScriptureRef[] = [];
  // Work on the inner string with original indices relative to full = "(" + inner + ")"
  const openLen = 1;
  const normalizedInner = inner;

  const segments = splitCitationSegments(
    normalizedInner
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .replace(TRAILING_NOTE_PATTERN, "")
      .replace(/^本节\s*[，,;；]\s*/, "")
      .trim(),
  );

  if (segments.length !== units.length) return [];

  // Find each segment string inside inner from cursor, allowing flexible whitespace.
  let searchFrom = 0;
  for (let index = 0; index < units.length; index += 1) {
    const segment = segments[index]!;
    const unit = units[index]!;
    const found = findFlexible(normalizedInner, segment, searchFrom);
    if (!found) return [];

    const start = parenStart + openLen + found.start;
    const end = parenStart + openLen + found.end;
    hits.push({
      raw: normalizedInner.slice(found.start, found.end),
      start,
      end,
      verseIds: unit.verseIds,
      confidence: "high",
      pattern: patternForUnit(unit),
    });
    searchFrom = found.end;
  }

  // Ensure whole-parenthesis coverage is not required; marks are on units only.
  void full;
  return hits;
}

function findFlexible(
  haystack: string,
  needle: string,
  from: number,
): { start: number; end: number } | null {
  // Exact first
  const exact = haystack.indexOf(needle, from);
  if (exact >= 0) return { start: exact, end: exact + needle.length };

  // Flexible whitespace: build regex from needle chars.
  const parts = needle
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s*");
  const pattern = new RegExp(parts, "g");
  pattern.lastIndex = from;
  const match = pattern.exec(haystack);
  if (!match) return null;
  return { start: match.index, end: match.index + match[0].length };
}

function patternForUnit(unit: ParsedCitationUnit): ScriptureRefPattern {
  if (unit.kind === "study-absolute") return "study-absolute";
  if (unit.kind === "study-relative") return "study-relative";
  if (unit.kind === "absolute" || unit.kind === "single-chapter-book") return "comprehensive-absolute";
  if (unit.kind === "relative-chapter") return "comprehensive-relative-chapter";
  if (unit.verseIds.length > 1) return "comprehensive-relative-verse-list";
  return "comprehensive-relative-verse";
}

function sanitizeCitationUnit(input: string): string {
  let value = input
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(TRAILING_NOTE_PATTERN, "")
    .replace(/注$/u, "")
    .replace(/^[（(]/, "")
    .replace(/[）)]$/, "")
    .trim();

  // Broken colon OCR: 14.：27 / 14.:27 / 53：|2 / 1：.1
  value = value.replace(/(?<=\d)\s*[:：]\s*[\.．]\s*(?=\d)/g, ":");
  value = value.replace(/(?<=\d)\s*[\.．]?\s*[:：]\s*[|｜]?\s*(?=\d)/g, ":");

  // After a chapter:verse atom, dots often separate more verse atoms: 24-25.27，34
  // Also split glued next chapter chunks: 16:7-14.20:22 -> 16:7-14、20:22
  // Keep bare bookless chapter.verse forms like 21.9 for later parsing when no prior colon chunk.
  value = value.replace(/(?<=:\d[\d\-–—~～]*)\.(?=\d)/g, "、");
  value = value.replace(/(?<=：\d[\d\-–—~～]*)\.(?=\d)/g, "、");
  value = value.replace(/(?<=\d)\.(?=\d+\s*[:：])/g, "、");

  // Strip leading prose wrappers common in study notes before the real citation.
  // e.g. 大前提，9b-10a节 / 呼应赛21.9 / 尤见2章 / 注意出20:17...
  const leadingProse =
    /^(?:大前提|小前提|前提|注意|呼应|尤其是|尤其|特别是|特别|主要是|包括|参看|参见|另见|但见|尤见|见|参)\s*[：:，,、]?\s*/u;
  value = value.replace(leadingProse, "").trim();
  value = value.replace(leadingProse, "").trim();
  value = value.replace(/第(?=\d)/g, "");

  // Drop trailing explanatory tails after a complete citation unit.
  // e.g. 2:10-22，尤其是22节 / 出20:17中关于内在欲望的诫命
  value = value
    .replace(/[，,；;]\s*(?:尤其是|特别是|主要是|即|就是).*$/u, "")
    .replace(/(?<=\d)\s*(?:中|里|内).*$/u, "")
    .trim();

  // Strip verse letter suffixes used in outlines: 3a / 16b / 3b* / 9b-10a
  value = value.replace(/(?<=\d)[a-zA-Z*]+/g, "");

  // Strip wrappers like "在...的引述" and trailing Chinese prose crumbs.
  value = value.replace(/^在/, "").replace(/的引述$/, "").trim();
  value = value.replace(/(?:中摩西的特别税|等|及以下|及以下经文|有暗示)$/u, "").trim();

  return value;
}

function expandCrossChapterRange(
  bookId: string,
  fromChapter: number,
  fromVerse: number,
  toChapter: number,
  toVerse: number,
  maxVerses = 12,
): VerseId[] | null {
  if (!isValidVerse(bookId, fromChapter, fromVerse) || !isValidVerse(bookId, toChapter, toVerse)) {
    return null;
  }

  const book = getBibleBook(bookId);
  if (!book) return null;

  const verseIds: VerseId[] = [];
  for (let chapter = fromChapter; chapter <= toChapter; chapter += 1) {
    const chapterVerseCount = book.verseCounts[chapter - 1];
    if (!chapterVerseCount) return null;
    const startVerse = chapter === fromChapter ? fromVerse : 1;
    const endVerse = chapter === toChapter ? toVerse : chapterVerseCount;
    if (startVerse > endVerse) return null;
    for (let verse = startVerse; verse <= endVerse; verse += 1) {
      verseIds.push(verseIdFromParts(bookId, chapter, verse));
      if (verseIds.length >= maxVerses) {
        return verseIds;
      }
    }
  }
  return verseIds.length > 0 ? verseIds : null;
}

function toValidVerseIds(bookId: string, chapter: number, verses: number[]): VerseId[] | null {
  const verseIds: VerseId[] = [];
  for (const verse of verses) {
    // Skip illegal verse numbers inside ranges (e.g. 3John 13-15 has only 14 verses in CUV)
    // rather than rejecting the whole citation. Purely invalid singles still yield null.
    if (!isValidVerse(bookId, chapter, verse)) continue;
    verseIds.push(verseIdFromParts(bookId, chapter, verse));
  }
  return verseIds.length > 0 ? verseIds : null;
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

function tryNormalizeLoose(input: string): VerseId | null {
  const raw = input.replace(/\[\[|\]\]/g, "").trim();
  if (!raw) return null;

  const comprehensive = parseComprehensiveAbsoluteRef(raw);
  if (comprehensive) return comprehensive;

  const parsed = parseCitationUnit(raw);
  if (parsed?.verseIds.length === 1) return parsed.verseIds[0] ?? null;

  const dot = raw.match(/^([A-Za-z0-9]+)\.(\d+)\.(\d+)$/);
  if (dot) {
    const bookId = resolveBookToken(dot[1] ?? "") ?? getBibleBook(dot[1] ?? "")?.id;
    const chapter = Number(dot[2]);
    const verse = Number(dot[3]);
    if (bookId && isValidVerse(bookId, chapter, verse)) {
      return verseIdFromParts(bookId, chapter, verse);
    }
  }

  const spaced = raw.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (spaced) {
    const bookId = resolveBookToken(spaced[1] ?? "");
    const chapter = Number(spaced[2]);
    const verse = Number(spaced[3]);
    if (bookId && isValidVerse(bookId, chapter, verse)) {
      return verseIdFromParts(bookId, chapter, verse);
    }
  }

  const compact = raw.match(/^([\u4e00-\u9fff壹贰叁]+)\s*(\d+):(\d+)$/);
  if (compact) {
    const bookId = resolveBookToken(compact[1] ?? "");
    const chapter = Number(compact[2]);
    const verse = Number(compact[3]);
    if (bookId && isValidVerse(bookId, chapter, verse)) {
      return verseIdFromParts(bookId, chapter, verse);
    }
  }

  return null;
}

function isBoundedCitation(text: string, start: number, end: number): boolean {
  const prev = start > 0 ? text[start - 1] : "";
  const next = end < text.length ? text[end] : "";
  const boundary = /[\s，。；、：:！？,.!?;"'“”‘’（）()\[\]【】《》〈〉…—\-]/u;
  const prevOk = !prev || boundary.test(prev);
  const nextOk = !next || boundary.test(next) || /[节節注]/.test(next);
  return prevOk && nextOk;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class IntervalSet {
  private ranges: Array<{ start: number; end: number }> = [];

  add(start: number, end: number) {
    this.ranges.push({ start, end });
  }

  overlaps(start: number, end: number) {
    return this.ranges.some((range) => start < range.end && end > range.start);
  }
}
