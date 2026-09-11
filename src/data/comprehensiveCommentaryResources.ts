import type { StudyResource } from "../domain/resources";
import comprehensiveCommentaryResourcesUrl from "./generated/comprehensiveCommentaryResources.json?url";

interface ComprehensiveCommentaryResourcesPayload {
  metadata: {
    byBook?: Record<string, number>;
    extractor?: string;
    generatedAt?: string;
    scope?: string;
    sourceRoot?: string;
    totalResources: number;
  };
  resources: StudyResource[];
}

let cachedPayload: Promise<ComprehensiveCommentaryResourcesPayload> | null = null;

export function loadComprehensiveCommentaryResourcePayload(): Promise<ComprehensiveCommentaryResourcesPayload> {
  cachedPayload ??= import.meta.env.MODE === "test"
    ? import("./generated/comprehensiveCommentaryResources.json").then(
        (module) => module.default as ComprehensiveCommentaryResourcesPayload,
      )
    : fetch(comprehensiveCommentaryResourcesUrl)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Failed to load comprehensive commentary resources JSON: ${response.status}`);
          }
          return (await response.json()) as ComprehensiveCommentaryResourcesPayload;
        })
        .catch((error: unknown) => {
          cachedPayload = null;
          throw error;
        });
  return cachedPayload;
}

export async function loadComprehensiveCommentaryResources(): Promise<StudyResource[]> {
  const payload = await loadComprehensiveCommentaryResourcePayload();
  return payload.resources;
}
