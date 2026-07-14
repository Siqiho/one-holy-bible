import type { BibleVersion } from "../domain/bible";
import { loadPublicBook, type PublicDataLoadOptions } from "./publicBibleData";
import type { PublicBookPayload } from "./publicData";

interface BibleLibraryPayload {
  cuvBible: BibleVersion;
  kjvBible: BibleVersion;
}

export function publicBookToBibleVersions(payload: PublicBookPayload): BibleLibraryPayload {
  return {
    cuvBible: {
      id: "cuv",
      label: "和合本",
      language: "zh",
      verses: payload.cuvVerses,
    },
    kjvBible: {
      id: "kjv",
      label: "KJV",
      language: "en",
      verses: payload.kjvVerses,
    },
  };
}

export async function loadBibleLibrary(
  bookId = "Gen",
  options: PublicDataLoadOptions = {},
): Promise<BibleLibraryPayload> {
  return publicBookToBibleVersions(await loadPublicBook(bookId, options));
}
