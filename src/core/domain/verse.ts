export type VerseId = `${string}.${number}.${number}`;

export interface ParsedVerseId {
  book: string;
  chapter: number;
  verse: number;
}

const chineseBookMap: Record<string, string> = {
  创: "Gen",
  创世记: "Gen",
};

export function verseIdFromParts(book: string, chapter: number, verse: number): VerseId {
  const normalizedBook = chineseBookMap[book] ?? book;
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
  if (/^[A-Za-z]+\.\d+\.\d+$/.test(raw)) {
    return raw as VerseId;
  }

  const englishMatch = raw.match(/^(Gen)\s+(\d+):(\d+)$/i);
  if (englishMatch) {
    const [, book, chapter, verse] = englishMatch;
    return verseIdFromParts(book[0].toUpperCase() + book.slice(1).toLowerCase(), Number(chapter), Number(verse));
  }

  const chineseMatch = raw.match(/^([\u4e00-\u9fa5]+)\s*(\d+):(\d+)$/);
  if (chineseMatch) {
    const [, bookName, chapter, verse] = chineseMatch;
    const book = chineseBookMap[bookName];
    if (!book) {
      throw new Error(`Unsupported Chinese book name: ${bookName}`);
    }
    return verseIdFromParts(book, Number(chapter), Number(verse));
  }

  throw new Error(`Unsupported Bible reference: ${input}`);
}
