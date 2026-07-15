import type { VerseId } from "./verse";

export interface BibleVerse {
  id: VerseId;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleVersion {
  id: "cuv" | "kjv" | string;
  label: string;
  language: "zh" | "en" | string;
  verses: BibleVerse[];
}
