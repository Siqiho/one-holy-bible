import type { BibleVersion } from "../domain/bible";
import bibleLibraryUrl from "./generated/bibleLibrary.json?url";

interface BibleLibraryPayload {
  cuvBible: BibleVersion;
  kjvBible: BibleVersion;
}

let cachedLibrary: Promise<BibleLibraryPayload> | null = null;

export function loadBibleLibrary(): Promise<BibleLibraryPayload> {
  cachedLibrary ??= import.meta.env.MODE === "test"
    ? import("./generated/bibleLibrary.json").then((module) => module.default as BibleLibraryPayload)
    : fetch(bibleLibraryUrl).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load Bible library JSON: ${response.status}`);
      }
      return await response.json() as BibleLibraryPayload;
    }).catch((error: unknown) => {
      cachedLibrary = null;
      throw error;
    });
  return cachedLibrary;
}
