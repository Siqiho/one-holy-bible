import type { BibleVersion } from "../domain/bible";
import type { VerseId } from "../domain/verse";

export interface BibleSearchResult {
  verseId: VerseId;
  versionId: string;
  versionLabel: string;
  text: string;
}

export function searchBibleText(versions: BibleVersion[], query: string): BibleSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  return versions.flatMap((version) =>
    version.verses
      .filter((verse) => verse.text.toLowerCase().includes(normalized))
      .map((verse) => ({
        verseId: verse.id,
        versionId: version.id,
        versionLabel: version.label,
        text: verse.text,
      })),
  );
}
