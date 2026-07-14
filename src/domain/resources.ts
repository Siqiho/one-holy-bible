import type { VerseId } from "./verse";

export type ResourceType = "commentary" | "image" | "video" | "html" | "note" | "link";

export interface StudyResourceDebugMeta {
  page?: number;
  pageRange?: number[];
  primaryAnchor?: VerseId;
  coverageRanges?: Array<{ start: VerseId; end?: VerseId }>;
  sourceLabel?: string;
  externalResourceId?: string;
}

export interface StudyResource {
  id: string;
  title: string;
  type: ResourceType;
  verses: VerseId[];
  primaryAnchor?: VerseId;
  bookIntro?: string;
  body: string;
  summary?: string;
  searchText?: string;
  source?: string;
  assetPath?: string;
  createdAt?: string;
  updatedAt?: string;
  path?: string;
  debugMeta?: StudyResourceDebugMeta;
}
