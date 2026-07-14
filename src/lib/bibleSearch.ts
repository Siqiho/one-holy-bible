import type { BibleVersion } from "../domain/bible";
import type { PublicScriptureSearchEntry } from "../data/publicData";
import type { VerseId } from "../domain/verse";
import { getBibleBook } from "../domain/bibleBooks";

export interface BibleSearchResult {
  verseId: VerseId;
  versionId: string;
  versionLabel: string;
  text: string;
}

export interface BibleSearchMatchRange {
  start: number;
  end: number;
}

export interface IndexedBibleSearchResult extends BibleSearchResult {
  book: string;
  chapter: number;
  verse: number;
  matchRanges: BibleSearchMatchRange[];
}

export type BibleSearchVersionFilter = "all" | string;
export type BibleSearchScope = "all" | "old" | "new" | string;

export interface BibleSearchOptions {
  version?: BibleSearchVersionFilter;
  scope?: BibleSearchScope;
  maxResults?: number;
}

export interface BibleSearchResponse {
  totalCount: number;
  results: IndexedBibleSearchResult[];
}

export interface BibleSearchIndex {
  search(query: string, options?: BibleSearchOptions): BibleSearchResponse;
}

interface IndexedVerse {
  verseId: VerseId;
  versionId: string;
  versionLabel: string;
  text: string;
  normalizedText: string;
  book: string;
  chapter: number;
  verse: number;
  testament?: "old" | "new";
}

const indexCache = new WeakMap<BibleVersion[], BibleSearchIndex>();

function normalizeSearchText(text: string): string {
  return text.trim().toLocaleLowerCase();
}

function findMatchRanges(normalizedText: string, normalizedQuery: string): BibleSearchMatchRange[] {
  const ranges: BibleSearchMatchRange[] = [];
  let searchFrom = 0;
  let matchStart = normalizedText.indexOf(normalizedQuery, searchFrom);

  while (matchStart !== -1) {
    const matchEnd = matchStart + normalizedQuery.length;
    ranges.push({ start: matchStart, end: matchEnd });
    searchFrom = matchEnd;
    matchStart = normalizedText.indexOf(normalizedQuery, searchFrom);
  }

  return ranges;
}

function matchesScope(verse: IndexedVerse, scope: BibleSearchScope): boolean {
  if (scope === "all") {
    return true;
  }
  if (scope === "old" || scope === "new") {
    return verse.testament === scope;
  }
  return verse.book === scope;
}

function toResult(verse: IndexedVerse, matchRanges: BibleSearchMatchRange[]): IndexedBibleSearchResult {
  return {
    verseId: verse.verseId,
    versionId: verse.versionId,
    versionLabel: verse.versionLabel,
    text: verse.text,
    book: verse.book,
    chapter: verse.chapter,
    verse: verse.verse,
    matchRanges,
  };
}

function makeBibleSearchIndexFromVerses(indexedVerses: IndexedVerse[]): BibleSearchIndex {
  return {
    search(query: string, options: BibleSearchOptions = {}): BibleSearchResponse {
      const normalizedQuery = normalizeSearchText(query);
      if (!normalizedQuery) {
        return { totalCount: 0, results: [] };
      }

      const versionFilter = options.version ?? "all";
      const scope = options.scope ?? "all";
      const maxResults = options.maxResults ?? Number.POSITIVE_INFINITY;
      const results: IndexedBibleSearchResult[] = [];
      let totalCount = 0;

      for (const verse of indexedVerses) {
        if (versionFilter !== "all" && verse.versionId !== versionFilter) continue;
        if (!matchesScope(verse, scope)) continue;
        const matchRanges = findMatchRanges(verse.normalizedText, normalizedQuery);
        if (matchRanges.length === 0) continue;
        totalCount += 1;
        if (results.length < maxResults) results.push(toResult(verse, matchRanges));
      }

      return { totalCount, results };
    },
  };
}

function makeBibleSearchIndex(versions: BibleVersion[]): BibleSearchIndex {
  return makeBibleSearchIndexFromVerses(versions.flatMap((version) =>
    version.verses.map((verse) => ({
      verseId: verse.id,
      versionId: version.id,
      versionLabel: version.label,
      text: verse.text,
      normalizedText: normalizeSearchText(verse.text),
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      testament: getBibleBook(verse.book)?.testament,
    })),
  ));
}

const publicIndexCache = new WeakMap<PublicScriptureSearchEntry[], BibleSearchIndex>();

export function createPublicScriptureSearchIndex(entries: PublicScriptureSearchEntry[]): BibleSearchIndex {
  const cached = publicIndexCache.get(entries);
  if (cached) return cached;
  const index = makeBibleSearchIndexFromVerses(entries.map((entry) => ({
    ...entry,
    normalizedText: normalizeSearchText(entry.text),
    testament: getBibleBook(entry.book)?.testament,
  })));
  publicIndexCache.set(entries, index);
  return index;
}

export function createBibleSearchIndex(versions: BibleVersion[]): BibleSearchIndex {
  const existingIndex = indexCache.get(versions);
  if (existingIndex) {
    return existingIndex;
  }

  const index = makeBibleSearchIndex(versions);
  indexCache.set(versions, index);
  return index;
}

export function searchBibleText(versions: BibleVersion[], query: string, options?: BibleSearchOptions): BibleSearchResult[] {
  return createBibleSearchIndex(versions)
    .search(query, options)
    .results.map((result) => ({
      verseId: result.verseId,
      versionId: result.versionId,
      versionLabel: result.versionLabel,
      text: result.text,
    }));
}
