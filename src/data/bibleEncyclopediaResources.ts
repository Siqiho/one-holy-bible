import type { StudyResource } from "../domain/resources";
import { isValidVerse } from "../domain/scriptureRef";
import { parseVerseId, type VerseId } from "../domain/verse";
import bibleEncyclopediaResourcesUrl from "./generated/bibleEncyclopediaResources-v1.json?url";

export const bibleEncyclopediaResourceVersion = "bible-encyclopedia-resources-v1";
export const bibleEncyclopediaSource = "圣经百科辞典";
export const bibleEncyclopediaSourcePdf = "/Users/simon/OHB/圣经百科辞典.pdf";
export const bibleEncyclopediaResourceCategory = "百科";

export const bibleEncyclopediaUserParts = [
  "神名与三一（上帝/基督/圣灵）",
  "重要人名族名",
  "重要地名",
  "圣所圣物 + 主要节期礼仪",
  "典故成语 + 格言",
  "高频教义词",
  "全部新旧约人名",
  "全部新旧约地名",
  "度量货币器物",
  "常见动植物",
  "犹太史/初期教会史",
] as const;

export type BibleEncyclopediaUserPart = typeof bibleEncyclopediaUserParts[number];

type BibleEncyclopediaCategoryCounts = Record<BibleEncyclopediaUserPart, number>;

export interface BibleEncyclopediaResource extends StudyResource {
  category: typeof bibleEncyclopediaResourceCategory;
  debugMeta?: StudyResource["debugMeta"] & {
    matchedInventory?: boolean;
    pageEnd?: number;
    pageLabel?: string;
    pdfPage?: number;
    pdfPageEnd?: number;
    section?: string | null;
    subsection?: string | null;
    userParts?: BibleEncyclopediaUserPart[];
    versesRaw?: string[];
  };
  primaryAnchor: VerseId;
  type: "link";
  verses: VerseId[];
}

export interface BibleEncyclopediaResourcePayload {
  metadata: {
    category: typeof bibleEncyclopediaResourceCategory;
    categoryCounts: BibleEncyclopediaCategoryCounts;
    generatedAt: string;
    resourceType: "link";
    schemaVersion: 1;
    source: typeof bibleEncyclopediaSource;
    sourcePdf: typeof bibleEncyclopediaSourcePdf;
    totalResources: number;
    userParts: BibleEncyclopediaUserPart[];
    version: typeof bibleEncyclopediaResourceVersion;
  };
  resources: BibleEncyclopediaResource[];
}

let cachedPayload: Promise<BibleEncyclopediaResourcePayload> | null = null;

interface LoadBibleEncyclopediaResourcePayloadOptions {
  payloadLoader?: () => Promise<unknown>;
  validVerseIds?: Set<string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid Bible encyclopedia resources payload: ${label} must be an object`);
  }
}

function assertNonemptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid Bible encyclopedia resources payload: ${label} must be a nonempty string`);
  }
}

function assertPositiveInteger(value: unknown, label: string) {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new Error(`Invalid Bible encyclopedia resources payload: ${label} must be a positive integer`);
  }
}

function assertExactMetadataValue<T extends string | number>(
  actual: unknown,
  expected: T,
  label: string,
): asserts actual is T {
  if (actual !== expected) {
    throw new Error(`Invalid Bible encyclopedia resources payload: ${label} must be ${expected}`);
  }
}

function isCanonicalVerseId(value: string, validVerseIds?: Set<string>): value is VerseId {
  if (!/^[1-3]?[A-Za-z][A-Za-z0-9]*\.[1-9]\d*\.[1-9]\d*$/.test(value)) return false;
  try {
    const parsed = parseVerseId(value);
    if (!isValidVerse(parsed.book, parsed.chapter, parsed.verse)) return false;
    return validVerseIds ? validVerseIds.has(value) : true;
  } catch {
    return false;
  }
}

function assertCanonicalVerseId(value: unknown, validVerseIds: Set<string> | undefined, label: string): asserts value is VerseId {
  assertNonemptyString(value, label);
  if (!isCanonicalVerseId(value, validVerseIds)) {
    throw new Error(`Invalid Bible encyclopedia resources payload: ${label} must be an existing canonical VerseId`);
  }
}

function assertMetadata(payload: Record<string, unknown>) {
  const metadata = payload.metadata;
  assertRecord(metadata, "metadata");
  assertExactMetadataValue(metadata.schemaVersion, 1, "metadata.schemaVersion");
  assertExactMetadataValue(metadata.version, bibleEncyclopediaResourceVersion, "metadata.version");
  assertExactMetadataValue(metadata.source, bibleEncyclopediaSource, "metadata.source");
  assertExactMetadataValue(metadata.sourcePdf, bibleEncyclopediaSourcePdf, "metadata.sourcePdf");
  assertExactMetadataValue(metadata.resourceType, "link", "metadata.resourceType");
  assertExactMetadataValue(metadata.category, bibleEncyclopediaResourceCategory, "metadata.category");
  assertNonemptyString(metadata.generatedAt, "metadata.generatedAt");

  if (!Array.isArray(metadata.userParts)) {
    throw new Error("Invalid Bible encyclopedia resources payload: metadata.userParts must be an array");
  }
  if (JSON.stringify(metadata.userParts) !== JSON.stringify(bibleEncyclopediaUserParts)) {
    throw new Error("Invalid Bible encyclopedia resources payload: metadata.userParts must match the 11 approved categories");
  }

  assertRecord(metadata.categoryCounts, "metadata.categoryCounts");
  const countKeys = Object.keys(metadata.categoryCounts);
  if (JSON.stringify(countKeys) !== JSON.stringify(bibleEncyclopediaUserParts)) {
    throw new Error("Invalid Bible encyclopedia resources payload: metadata.categoryCounts must contain exactly the 11 approved categories");
  }

  for (const [category, count] of Object.entries(metadata.categoryCounts)) {
    if (!bibleEncyclopediaUserParts.includes(category as BibleEncyclopediaUserPart)) {
      throw new Error(`Invalid Bible encyclopedia resources payload: unsupported metadata category ${category}`);
    }
    if (!Number.isInteger(count) || Number(count) < 0) {
      throw new Error(`Invalid Bible encyclopedia resources payload: metadata.categoryCounts.${category} must be a nonnegative integer`);
    }
  }

  if (!Number.isInteger(metadata.totalResources) || Number(metadata.totalResources) < 0) {
    throw new Error("Invalid Bible encyclopedia resources payload: metadata.totalResources must be a nonnegative integer");
  }

  return metadata as unknown as BibleEncyclopediaResourcePayload["metadata"];
}

function resourceUserParts(resource: Record<string, unknown>, label: string) {
  const debugMeta = resource.debugMeta;
  assertRecord(debugMeta, `${label}.debugMeta`);
  const userParts = debugMeta.userParts;
  if (!Array.isArray(userParts) || userParts.length === 0) {
    throw new Error(`Invalid Bible encyclopedia resources payload: ${label}.debugMeta.userParts must be a nonempty array`);
  }
  if (new Set(userParts).size !== userParts.length) {
    throw new Error(`Invalid Bible encyclopedia resources payload: ${label}.debugMeta.userParts must be unique`);
  }
  for (const userPart of userParts) {
    if (!bibleEncyclopediaUserParts.includes(userPart as BibleEncyclopediaUserPart)) {
      throw new Error(`Invalid Bible encyclopedia resources payload: ${label}.debugMeta.userParts contains an unsupported category`);
    }
  }
  assertPositiveInteger(debugMeta.pdfPage, `${label}.debugMeta.pdfPage`);
  if (debugMeta.pdfPageEnd !== undefined) {
    assertPositiveInteger(debugMeta.pdfPageEnd, `${label}.debugMeta.pdfPageEnd`);
    if (Number(debugMeta.pdfPageEnd) < Number(debugMeta.pdfPage)) {
      throw new Error(`Invalid Bible encyclopedia resources payload: ${label}.debugMeta.pdfPageEnd must not be before pdfPage`);
    }
  }

  return userParts as BibleEncyclopediaUserPart[];
}

function validateResource(
  resource: unknown,
  index: number,
  validVerseIds: Set<string> | undefined,
  seenResourceIds: Set<string>,
  actualCategoryCounts: BibleEncyclopediaCategoryCounts,
) {
  const label = `resources[${index}]`;
  assertRecord(resource, label);
  assertNonemptyString(resource.id, `${label}.id`);
  assertNonemptyString(resource.title, `${label}.title`);
  assertExactMetadataValue(resource.type, "link", `${label}.type`);
  assertExactMetadataValue(resource.source, bibleEncyclopediaSource, `${label}.source`);
  assertExactMetadataValue(resource.category, bibleEncyclopediaResourceCategory, `${label}.category`);
  assertNonemptyString(resource.body, `${label}.body`);

  if (seenResourceIds.has(resource.id)) {
    throw new Error("Invalid Bible encyclopedia resources payload: duplicate resource id");
  }
  seenResourceIds.add(resource.id);

  if (!Array.isArray(resource.verses) || resource.verses.length === 0) {
    throw new Error(`Invalid Bible encyclopedia resources payload: ${label}.verses must be a nonempty array`);
  }
  if (new Set(resource.verses).size !== resource.verses.length) {
    throw new Error(`Invalid Bible encyclopedia resources payload: ${label}.verses must be unique`);
  }
  for (const [verseIndex, verseId] of resource.verses.entries()) {
    assertCanonicalVerseId(verseId, validVerseIds, `${label}.verses[${verseIndex}]`);
  }

  assertCanonicalVerseId(resource.primaryAnchor, validVerseIds, `${label}.primaryAnchor`);
  if (!resource.verses.includes(resource.primaryAnchor)) {
    throw new Error(`Invalid Bible encyclopedia resources payload: ${label}.primaryAnchor must be included in verses`);
  }

  if (isRecord(resource.debugMeta) && resource.debugMeta.primaryAnchor !== undefined) {
    assertCanonicalVerseId(resource.debugMeta.primaryAnchor, validVerseIds, `${label}.debugMeta.primaryAnchor`);
  }

  for (const userPart of resourceUserParts(resource, label)) {
    actualCategoryCounts[userPart] += 1;
  }
}

export function emptyBibleEncyclopediaCategoryCounts(): BibleEncyclopediaCategoryCounts {
  return Object.fromEntries(
    bibleEncyclopediaUserParts.map((userPart) => [userPart, 0]),
  ) as BibleEncyclopediaCategoryCounts;
}

export function validateBibleEncyclopediaResourcePayload(
  payload: unknown,
  validVerseIds?: Set<string>,
): BibleEncyclopediaResourcePayload {
  assertRecord(payload, "payload");
  const metadata = assertMetadata(payload);
  if (!Array.isArray(payload.resources)) {
    throw new Error("Invalid Bible encyclopedia resources payload: resources must be an array");
  }
  if (metadata.totalResources !== payload.resources.length) {
    throw new Error("Invalid Bible encyclopedia resources payload: metadata.totalResources must match resources length");
  }

  const seenResourceIds = new Set<string>();
  const actualCategoryCounts = emptyBibleEncyclopediaCategoryCounts();
  payload.resources.forEach((resource, index) => {
    validateResource(resource, index, validVerseIds, seenResourceIds, actualCategoryCounts);
  });

  for (const userPart of bibleEncyclopediaUserParts) {
    if (metadata.categoryCounts[userPart] !== actualCategoryCounts[userPart]) {
      throw new Error(`Invalid Bible encyclopedia resources payload: metadata.categoryCounts.${userPart} does not match resources`);
    }
  }

  return payload as unknown as BibleEncyclopediaResourcePayload;
}

export function resetBibleEncyclopediaResourceCache() {
  cachedPayload = null;
}

export async function loadBibleEncyclopediaResourcePayload(
  options: LoadBibleEncyclopediaResourcePayloadOptions = {},
): Promise<BibleEncyclopediaResourcePayload> {
  const validVerseIds = options.validVerseIds;
  const payloadLoader = options.payloadLoader
    ?? (import.meta.env.MODE === "test"
      ? () => import("./generated/bibleEncyclopediaResources-v1.json").then((module) => module.default as unknown)
      : () => fetch(bibleEncyclopediaResourcesUrl).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load Bible encyclopedia resources JSON: ${response.status}`);
        }
        return await response.json() as unknown;
      }));

  cachedPayload ??= payloadLoader()
    .then((payload) => validateBibleEncyclopediaResourcePayload(payload, validVerseIds))
    .catch((error: unknown) => {
      cachedPayload = null;
      throw error;
    });

  return cachedPayload;
}

export async function loadBibleEncyclopediaResources(): Promise<StudyResource[]> {
  const payload = await loadBibleEncyclopediaResourcePayload();
  return payload.resources;
}
