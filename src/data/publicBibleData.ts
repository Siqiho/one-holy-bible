import { BIBLE_BOOKS } from "../domain/bibleBooks";
import {
  validatePublicBookPayload,
  validatePublicManifest,
  type PublicBookPayload,
  type PublicDataManifest,
  type PublicScriptureSearchEntry,
} from "./publicData";

const MANIFEST_URL = "/data/manifest.json";
const PUBLIC_DATA_URL_PREFIX = "/data/";
const PUBLIC_DATA_URL_BASE = new URL("https://ohb.invalid/");
const SEARCH_ENTRY_KEYS = new Set([
  "verseId",
  "versionId",
  "versionLabel",
  "book",
  "chapter",
  "verse",
  "text",
]);
const CANONICAL_BOOKS = new Map(BIBLE_BOOKS.map((book) => [book.id, book]));
const PRIVATE_VALUE = /\/Users\/|file:\/\/|127\.0\.0\.1|localhost/i;

type PublicDataFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface PublicDataLoadOptions {
  fetcher?: PublicDataFetcher;
}

export class PublicBookLoadError extends Error {
  readonly bookId: string;
  readonly cause: unknown;

  constructor(bookId: string, message: string, cause?: unknown) {
    super(message);
    this.name = "PublicBookLoadError";
    this.bookId = bookId;
    this.cause = cause;
  }
}

let manifestPromise: Promise<PublicDataManifest> | null = null;
let searchIndexPromise: Promise<PublicScriptureSearchEntry[]> | null = null;
const bookPromises = new Map<string, Promise<PublicBookPayload>>();

function now(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function durationSince(startedAt: number): number {
  return Math.round(now() - startedAt);
}

function logDevelopmentEvent(message: string, details: Record<string, number | string>): void {
  if (import.meta.env.DEV) {
    console.info(message, details);
  }
}

function failureKind(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

function requirePublicDataUrl(url: string, label: string): string {
  let candidate = url;
  const maximumDecodePasses = url.length + 1;

  try {
    for (let pass = 0; candidate.includes("%"); pass += 1) {
      if (pass >= maximumDecodePasses) {
        throw new Error("too many URL decoding passes");
      }
      candidate = decodeURIComponent(candidate);
    }
  } catch {
    throw new Error(`Unsafe public data: ${label} must be rooted at /data/`);
  }

  if (
    !candidate.startsWith("/")
    || candidate.includes("\\")
    || candidate.includes("?")
    || candidate.includes("#")
  ) {
    throw new Error(`Unsafe public data: ${label} must be rooted at /data/`);
  }

  const normalized = new URL(candidate, PUBLIC_DATA_URL_BASE);
  if (
    normalized.origin !== PUBLIC_DATA_URL_BASE.origin
    || !normalized.pathname.startsWith(PUBLIC_DATA_URL_PREFIX)
    || normalized.search !== ""
    || normalized.hash !== ""
  ) {
    throw new Error(`Unsafe public data: ${label} must be rooted at /data/`);
  }

  return normalized.pathname;
}

async function fetchJson(url: string, fetcher: PublicDataFetcher): Promise<unknown> {
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`Public data request failed with status ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

function validateSearchIndex(value: unknown): PublicScriptureSearchEntry[] {
  if (!Array.isArray(value)) {
    throw new Error("Unsafe public data: search index must be an array");
  }

  value.forEach((entry, index) => {
    const label = `search index[${index}]`;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`Unsafe public data: ${label} must be an object`);
    }

    const record = entry as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (!SEARCH_ENTRY_KEYS.has(key)) {
        throw new Error(`Unsafe public data: forbidden field at ${label}.${key}`);
      }
    }

    for (const field of ["verseId", "versionId", "versionLabel", "book", "text"] as const) {
      if (typeof record[field] !== "string") {
        throw new Error(`Unsafe public data: ${label}.${field} must be a string`);
      }
      if (PRIVATE_VALUE.test(record[field])) {
        throw new Error(`Unsafe public data: private value at ${label}.${field}`);
      }
    }

    if (!Number.isInteger(record.chapter) || (record.chapter as number) < 1) {
      throw new Error(`Unsafe public data: ${label}.chapter must be a positive integer`);
    }
    if (!Number.isInteger(record.verse) || (record.verse as number) < 1) {
      throw new Error(`Unsafe public data: ${label}.verse must be a positive integer`);
    }

    const bookId = record.book as string;
    const chapter = record.chapter as number;
    const verse = record.verse as number;
    const availableVerseCount = CANONICAL_BOOKS.get(bookId)?.verseCounts[chapter - 1];
    if (!availableVerseCount || verse > availableVerseCount) {
      throw new Error(`Unsafe public data: ${label} must reference a canonical verse`);
    }
    if (record.verseId !== `${bookId}.${chapter}.${verse}`) {
      throw new Error(`Unsafe public data: ${label}.verseId must match its verse coordinate`);
    }
  });

  return value as PublicScriptureSearchEntry[];
}

export function loadPublicManifest(options: PublicDataLoadOptions = {}): Promise<PublicDataManifest> {
  if (manifestPromise) return manifestPromise;

  const fetcher = options.fetcher ?? fetch;
  const startedAt = now();
  logDevelopmentEvent("[public-data] manifest load started", {});

  const request = fetchJson(MANIFEST_URL, fetcher)
    .then(validatePublicManifest)
    .then((manifest) => {
      requirePublicDataUrl(manifest.searchIndexUrl, "manifest.searchIndexUrl");
      manifest.books.forEach((book, index) => {
        requirePublicDataUrl(book.url, `manifest.books[${index}].url`);
      });
      logDevelopmentEvent("[public-data] manifest load succeeded", {
        bookCount: manifest.books.length,
        durationMs: durationSince(startedAt),
        releaseVersion: manifest.releaseVersion,
      });
      return manifest;
    })
    .catch((error: unknown) => {
      if (manifestPromise === request) {
        manifestPromise = null;
      }
      logDevelopmentEvent("[public-data] manifest load failed", {
        durationMs: durationSince(startedAt),
        errorKind: failureKind(error),
      });
      throw error;
    });

  manifestPromise = request;
  return request;
}

export function loadPublicBook(
  bookId: string,
  options: PublicDataLoadOptions = {},
): Promise<PublicBookPayload> {
  const cached = bookPromises.get(bookId);
  if (cached) return cached;

  const startedAt = now();
  logDevelopmentEvent("[public-data] book load started", { bookId });

  const request = (async () => {
    const manifest = await loadPublicManifest(options);
    const manifestBook = manifest.books.find((book) => book.id === bookId);
    if (!manifestBook) {
      throw new PublicBookLoadError(bookId, `Unknown public Bible book: ${bookId}`);
    }

    const payload = validatePublicBookPayload(
      await fetchJson(requirePublicDataUrl(manifestBook.url, "book URL"), options.fetcher ?? fetch),
    );
    if (payload.bookId !== bookId) {
      throw new Error(`Public book payload book ID does not match ${bookId}`);
    }
    if (
      payload.cuvVerses.length !== manifestBook.cuvVerseCount
      || payload.kjvVerses.length !== manifestBook.kjvVerseCount
      || payload.textCards.length !== manifestBook.textCardCount
    ) {
      throw new Error(`Public book payload counts do not match manifest for ${bookId}`);
    }

    logDevelopmentEvent("[public-data] book load succeeded", {
      bookId,
      textCardCount: payload.textCards.length,
      cuvVerseCount: payload.cuvVerses.length,
      kjvVerseCount: payload.kjvVerses.length,
      durationMs: durationSince(startedAt),
    });
    return payload;
  })().catch((error: unknown) => {
    if (bookPromises.get(bookId) === request) {
      bookPromises.delete(bookId);
    }
    logDevelopmentEvent("[public-data] book load failed", {
      bookId,
      durationMs: durationSince(startedAt),
      errorKind: failureKind(error),
    });
    if (error instanceof PublicBookLoadError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    throw new PublicBookLoadError(bookId, `Failed to load public Bible book ${bookId}: ${detail}`, error);
  });

  bookPromises.set(bookId, request);
  return request;
}

export function loadPublicSearchIndex(
  options: PublicDataLoadOptions = {},
): Promise<PublicScriptureSearchEntry[]> {
  if (searchIndexPromise) return searchIndexPromise;

  const startedAt = now();
  logDevelopmentEvent("[public-data] search index load started", {});

  const request = loadPublicManifest(options)
    .then((manifest) => fetchJson(
      requirePublicDataUrl(manifest.searchIndexUrl, "manifest.searchIndexUrl"),
      options.fetcher ?? fetch,
    ))
    .then(validateSearchIndex)
    .then((entries) => {
      logDevelopmentEvent("[public-data] search index load succeeded", {
        durationMs: durationSince(startedAt),
        entryCount: entries.length,
      });
      return entries;
    })
    .catch((error: unknown) => {
      if (searchIndexPromise === request) {
        searchIndexPromise = null;
      }
      logDevelopmentEvent("[public-data] search index load failed", {
        durationMs: durationSince(startedAt),
        errorKind: failureKind(error),
      });
      throw error;
    });

  searchIndexPromise = request;
  return request;
}

export function resetPublicDataCache(): void {
  manifestPromise = null;
  searchIndexPromise = null;
  bookPromises.clear();
}
