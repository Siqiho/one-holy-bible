import type { StudyResource } from "../domain/resources";
import bibleEveryoneImageResourcesUrl from "./generated/bibleEveryoneImageResources.json?url";

export interface BibleEveryoneImageResourcePayload {
  metadata: {
    downloadedImageCount: number;
    generatedAt: string;
    sourceUrl: string;
    totalImages: number;
  };
  resources: StudyResource[];
}

let cachedPayload: Promise<BibleEveryoneImageResourcePayload> | null = null;

export function loadBibleEveryoneImageResourcePayload(): Promise<BibleEveryoneImageResourcePayload> {
  cachedPayload ??= import.meta.env.MODE === "test"
    ? import("./generated/bibleEveryoneImageResources.json").then((module) => module.default as BibleEveryoneImageResourcePayload)
    : fetch(bibleEveryoneImageResourcesUrl).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load BibleEveryone image resources JSON: ${response.status}`);
      }
      return await response.json() as BibleEveryoneImageResourcePayload;
    }).catch((error: unknown) => {
      cachedPayload = null;
      throw error;
    });

  return cachedPayload;
}

export async function loadBibleEveryoneImageResources(): Promise<StudyResource[]> {
  const payload = await loadBibleEveryoneImageResourcePayload();
  return payload.resources;
}
