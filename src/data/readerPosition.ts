import { chaptersForBook, getBibleBook } from "../domain/bibleBooks";

export const readerPositionStorageKey = "one-holy-bible-reader-position";

export interface ReaderPosition {
  book: string;
  chapter: number;
  verse: number;
}

export const defaultReaderPosition: ReaderPosition = { book: "Gen", chapter: 1, verse: 1 };

/** Last reading position persisted by the reader, clamped to a valid book/chapter. */
export function storedReaderPosition(): ReaderPosition {
  try {
    const raw = window.localStorage.getItem(readerPositionStorageKey);
    if (!raw) return defaultReaderPosition;
    const parsed = JSON.parse(raw) as Partial<ReaderPosition>;
    const book = typeof parsed.book === "string" && getBibleBook(parsed.book) ? parsed.book : defaultReaderPosition.book;
    const chapterCount = chaptersForBook(book);
    const chapter = typeof parsed.chapter === "number" && parsed.chapter >= 1 && parsed.chapter <= chapterCount
      ? parsed.chapter
      : 1;
    const verse = typeof parsed.verse === "number" && parsed.verse >= 1 ? parsed.verse : 1;
    return { book, chapter, verse };
  } catch {
    return defaultReaderPosition;
  }
}
