import type { VerseId } from "./verse";

export type ResourceType = "commentary" | "image" | "video" | "html" | "note" | "link";

export interface StudyResource {
  id: string;
  title: string;
  type: ResourceType;
  verses: VerseId[];
  body: string;
  source?: string;
  assetPath?: string;
  createdAt?: string;
  updatedAt?: string;
  path?: string;
}
