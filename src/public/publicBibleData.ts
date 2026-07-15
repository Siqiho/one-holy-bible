import {
  validatePublicBookPayload,
  validatePublicManifest,
  validatePublicSearchIndex,
  type PublicBookPayload,
  type PublicDataManifest,
  type PublicDataMode,
  type PublicScriptureSearchEntry,
} from "./publicData";
import { publicReleaseMode } from "./releaseMode";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface PublicDataLoadOptions {
  fetcher?: Fetcher;
  mode?: PublicDataMode;
}

export class PublicBookLoadError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "PublicBookLoadError";
    if (cause !== undefined) {
      Object.defineProperty(this, "cause", { configurable: true, value: cause });
    }
  }
}

let manifestPromise: Promise<PublicDataManifest> | undefined;
let searchIndexPromise: Promise<PublicScriptureSearchEntry[]> | undefined;
const bookPromises = new Map<string, Promise<PublicBookPayload>>();

function publicFetcher(fetcher?: Fetcher): Fetcher {
  if (fetcher) return fetcher;
  return globalThis.fetch.bind(globalThis);
}

async function fetchBytes(url: string, fetcher: Fetcher): Promise<ArrayBuffer> {
  const response = await fetcher(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new PublicBookLoadError(`Public data request failed with status ${response.status}: ${url}`);
  return response.arrayBuffer();
}

function parseJson(bytes: ArrayBuffer, url: string): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (cause) {
    throw new PublicBookLoadError(`Public data response is not valid JSON: ${url}`, cause);
  }
}

async function fetchJson(url: string, fetcher: Fetcher) {
  return parseJson(await fetchBytes(url, fetcher), url);
}

async function sha256(bytes: ArrayBuffer) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new PublicBookLoadError("Public book integrity verification requires Web Crypto");
  const digest = new Uint8Array(await subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fetchVerifiedBookJson(
  url: string,
  expected: { bytes: number; sha256: string },
  fetcher: Fetcher,
) {
  const bytes = await fetchBytes(url, fetcher);
  if (bytes.byteLength !== expected.bytes) {
    throw new PublicBookLoadError(`Public book integrity byte count mismatch: ${url}`);
  }
  if (await sha256(bytes) !== expected.sha256) {
    throw new PublicBookLoadError(`Public book integrity sha256 mismatch: ${url}`);
  }
  return parseJson(bytes, url);
}

function observe(event: string, details: Record<string, unknown>) {
  if (import.meta.env?.DEV) console.info(`[public-data] ${event}`, details);
}

export function loadPublicManifest(options: PublicDataLoadOptions = {}): Promise<PublicDataManifest> {
  if (manifestPromise) return manifestPromise;
  const fetcher = publicFetcher(options.fetcher);
  manifestPromise = fetchJson("/data/manifest.json", fetcher)
    .then((value) => validatePublicManifest(value, { mode: options.mode ?? publicReleaseMode }))
    .then((manifest) => {
      observe("manifest-loaded", { bookCount: manifest.books.length, releaseVersion: manifest.releaseVersion });
      return manifest;
    })
    .catch((cause) => {
      manifestPromise = undefined;
      observe("manifest-load-failed", { message: cause instanceof Error ? cause.message : String(cause) });
      throw cause;
    });
  return manifestPromise;
}

export function loadPublicBook(bookId: string, options: PublicDataLoadOptions = {}): Promise<PublicBookPayload> {
  const existing = bookPromises.get(bookId);
  if (existing) return existing;
  const promise = loadPublicManifest(options)
    .then(async (manifest) => {
      const entry = manifest.books.find((book) => book.id === bookId);
      if (!entry) throw new PublicBookLoadError(`Public manifest does not contain book: ${bookId}`);
      const payload = validatePublicBookPayload(await fetchVerifiedBookJson(
        entry.url,
        entry,
        publicFetcher(options.fetcher),
      ), {
        mode: options.mode ?? publicReleaseMode,
      });
      if (payload.bookId !== bookId) throw new PublicBookLoadError(`Public book ID mismatch: expected ${bookId}, received ${payload.bookId}`);
      const actualCounts = {
        cuvVerseCount: payload.cuvVerses.length,
        kjvVerseCount: payload.kjvVerses.length,
        textCardCount: payload.textCards.length,
        imageCardCount: payload.imageCards.length,
      };
      const mismatch = (Object.keys(actualCounts) as Array<keyof typeof actualCounts>)
        .find((field) => actualCounts[field] !== entry[field]);
      if (mismatch) {
        throw new PublicBookLoadError(`Public book counts do not match manifest for ${bookId}: ${mismatch}`);
      }
      observe("book-loaded", { bookId, ...actualCounts });
      return payload;
    })
    .catch((cause) => {
      bookPromises.delete(bookId);
      observe("book-load-failed", { bookId, message: cause instanceof Error ? cause.message : String(cause) });
      if (cause instanceof PublicBookLoadError) throw cause;
      throw new PublicBookLoadError(`Unable to load public book ${bookId}`, cause);
    });
  bookPromises.set(bookId, promise);
  return promise;
}

export function loadPublicSearchIndex(options: PublicDataLoadOptions = {}): Promise<PublicScriptureSearchEntry[]> {
  if (searchIndexPromise) return searchIndexPromise;
  searchIndexPromise = loadPublicManifest(options)
    .then((manifest) => fetchJson(manifest.searchIndexUrl, publicFetcher(options.fetcher)))
    .then(validatePublicSearchIndex)
    .then((entries) => {
      observe("search-index-loaded", { entryCount: entries.length });
      return entries;
    })
    .catch((cause) => {
      searchIndexPromise = undefined;
      observe("search-index-load-failed", { message: cause instanceof Error ? cause.message : String(cause) });
      throw cause;
    });
  return searchIndexPromise;
}

export function resetPublicDataCache() {
  manifestPromise = undefined;
  searchIndexPromise = undefined;
  bookPromises.clear();
}
