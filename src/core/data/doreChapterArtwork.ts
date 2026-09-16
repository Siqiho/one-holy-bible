import release from "../../../PUBLIC_RELEASE.json";
import { getBibleBook } from "../domain/bibleBooks";
export interface DoreChapterArtwork {
  page: number; book: string; chapter: number; title: string;
  scriptureReference: string | null; assetPath: string;
}
interface ArtworkAsset extends DoreChapterArtwork {
  sha256: string; bytes: number; width: number; height: number; mimeType: "image/jpeg";
}
let cached: Promise<Map<string, DoreChapterArtwork>> | undefined;
export function loadDoreChapterArtworkByChapter(): Promise<Map<string, DoreChapterArtwork>> {
  cached ??= fetch("/data/dore-artwork.json").then(async response => {
    if (!response.ok) throw new Error(`Artwork request failed: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), n => n.toString(16).padStart(2, "0")).join("");
    if (digest !== release.doreArtworkSha256) throw new Error("Artwork manifest integrity mismatch");
    const payload = JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes)) as {schemaVersion: number; entries: ArtworkAsset[]};
    if (payload.schemaVersion !== 1 || !Array.isArray(payload.entries) || payload.entries.length !== release.doreArtworkCount) throw new Error("Invalid artwork manifest");
    const result = new Map<string, DoreChapterArtwork>();
    for (const entry of payload.entries) {
      const book = getBibleBook(entry.book);
      const match = typeof entry.assetPath === "string" && entry.assetPath.match(/^https:\/\/raw\.githubusercontent\.com\/Siqiho\/one-holy-bible-assets\/[a-f0-9]{40}\/dore\/([a-f0-9]{64})\.jpg$/);
      if (!book || !Number.isInteger(entry.chapter) || entry.chapter < 1 || entry.chapter > book.chapterCount || !match || match[1] !== entry.sha256 || entry.mimeType !== "image/jpeg") throw new Error("Invalid chapter artwork descriptor");
      const key = `${entry.book}.${entry.chapter}`;
      if (result.has(key)) throw new Error("Duplicate chapter artwork");
      result.set(key, entry);
    }
    return result;
  }).catch(error => { cached = undefined; throw error; });
  return cached;
}
