export type VerseId = `${string}.${number}.${number}`;

export interface ParsedVerseId {
  book: string;
  chapter: number;
  verse: number;
}

import { bookAliases } from "./bibleBooks";

function normalizeBookName(book: string): string | undefined {
  return bookAliases[book.trim().toLocaleLowerCase()];
}

export function verseIdFromParts(book: string, chapter: number, verse: number): VerseId {
  const normalizedBook = normalizeBookName(book) ?? book;
  return `${normalizedBook}.${chapter}.${verse}` as VerseId;
}

export function parseVerseId(id: VerseId | string): ParsedVerseId {
  const raw = id.replace(/\[\[|\]\]/g, "");
  const [book, chapter, verse] = raw.split(".");
  if (!book || !chapter || !verse || Number.isNaN(Number(chapter)) || Number.isNaN(Number(verse))) {
    throw new Error(`Invalid verse id: ${id}`);
  }
  return { book, chapter: Number(chapter), verse: Number(verse) };
}

export function normalizeVerseRef(input: string): VerseId {
  const raw = input.replace(/\[\[|\]\]/g, "").trim();
  const dotMatch = raw.match(/^(.+?)\.(\d+)\.(\d+)$/);
  if (dotMatch) {
    const [, book, chapter, verse] = dotMatch;
    const normalizedBook = normalizeBookName(book);
    if (normalizedBook) {
      return verseIdFromParts(normalizedBook, Number(chapter), Number(verse));
    }
  }

  const referenceMatch = raw.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (referenceMatch) {
    const [, book, chapter, verse] = referenceMatch;
    const normalizedBook = normalizeBookName(book);
    if (normalizedBook) {
      return verseIdFromParts(normalizedBook, Number(chapter), Number(verse));
    }
  }

  const compactEnglishMatch = raw.match(/^([1-3]?[A-Za-z]+)\s*(\d+):(\d+)$/);
  if (compactEnglishMatch) {
    const [, book, chapter, verse] = compactEnglishMatch;
    const normalizedBook = normalizeBookName(book);
    if (normalizedBook) {
      return verseIdFromParts(normalizedBook, Number(chapter), Number(verse));
    }
  }

  const compactChineseMatch = raw.match(/^([\u4e00-\u9fa5壹贰叁]+)\s*(\d+):(\d+)$/);
  if (compactChineseMatch) {
    const [, book, chapter, verse] = compactChineseMatch;
    const normalizedBook = normalizeBookName(book);
    if (normalizedBook) {
      return verseIdFromParts(normalizedBook, Number(chapter), Number(verse));
    }
  }

  throw new Error(`Unsupported Bible reference: ${input}`);
}
