import type { BibleVerse } from "../domain/bible";
import type { VerseId } from "../domain/verse";

export type VerseTextLookup = ReadonlyMap<VerseId, string>;

export function createVerseTextLookup(verses: readonly Pick<BibleVerse, "id" | "text">[]): VerseTextLookup {
  const map = new Map<VerseId, string>();
  for (const verse of verses) {
    map.set(verse.id as VerseId, verse.text);
  }
  return map;
}

export function lookupVerseText(lookup: VerseTextLookup | null | undefined, verseId: VerseId): string | undefined {
  return lookup?.get(verseId);
}
