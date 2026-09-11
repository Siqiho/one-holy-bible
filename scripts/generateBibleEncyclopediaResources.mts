#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

type VerseId = `${string}.${number}.${number}`;

const resourceVersion = "bible-encyclopedia-resources-v1";
const source = "圣经百科辞典";
const sourcePdf = "/Users/simon/OHB/圣经百科辞典.pdf";
const category = "百科";
const userParts = [
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

type UserPart = typeof userParts[number];
type CategoryCounts = Record<UserPart, number>;

interface AnchoredEntryInput {
  anchorRefs?: unknown[];
  body: string;
  debugMeta?: {
    section?: string | null;
    subsection?: string | null;
    userParts?: string[];
    [key: string]: unknown;
  };
  english?: string;
  headingPdfPage?: number;
  id?: string;
  match?: unknown;
  primaryAnchor: VerseId;
  sourcePdfPages?: number[];
  title: string;
  verses: VerseId[];
  [key: string]: unknown;
}

interface AnchoredPayloadInput {
  entries: unknown[];
  metadata?: Record<string, unknown>;
}

interface GenerateOptions {
  generatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
}

function assertNonemptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a nonempty string`);
  }
}

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function normalizeGeneratedAt(value: string, label: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date`);
  return date.toISOString();
}

export function generatedAtFromOptions(value: string | undefined, env = process.env): string {
  if (value !== undefined) return normalizeGeneratedAt(value, "--generated-at");

  const sourceDateEpoch = env.SOURCE_DATE_EPOCH;
  if (sourceDateEpoch === undefined || sourceDateEpoch.trim().length === 0) {
    throw new Error("Missing deterministic timestamp: pass --generated-at or set SOURCE_DATE_EPOCH");
  }

  if (!/^\d+$/.test(sourceDateEpoch)) {
    throw new Error("SOURCE_DATE_EPOCH must be an integer Unix timestamp in seconds");
  }
  return new Date(Number(sourceDateEpoch) * 1000).toISOString();
}

function normalizeInput(rawInput: unknown): AnchoredPayloadInput {
  assertRecord(rawInput, "input");
  if (!Array.isArray(rawInput.entries)) throw new Error("input.entries must be an array");
  const metadata = isRecord(rawInput.metadata) ? rawInput.metadata : undefined;
  return { entries: rawInput.entries, ...(metadata ? { metadata } : {}) };
}

function normalizeEntry(rawEntry: unknown, index: number): AnchoredEntryInput {
  const label = `entries[${index}]`;
  assertRecord(rawEntry, label);
  assertNonemptyString(rawEntry.title, `${label}.title`);
  assertNonemptyString(rawEntry.body, `${label}.body`);
  assertNonemptyString(rawEntry.primaryAnchor, `${label}.primaryAnchor`);
  if (!Array.isArray(rawEntry.verses) || rawEntry.verses.length === 0) {
    throw new Error(`${label}.verses must be a nonempty array`);
  }
  for (const [verseIndex, verseId] of rawEntry.verses.entries()) {
    assertNonemptyString(verseId, `${label}.verses[${verseIndex}]`);
  }
  if (!rawEntry.verses.includes(rawEntry.primaryAnchor)) {
    throw new Error(`${label}.primaryAnchor must be included in verses`);
  }

  const debugMeta = rawEntry.debugMeta;
  assertRecord(debugMeta, `${label}.debugMeta`);
  if (!Array.isArray(debugMeta.userParts) || debugMeta.userParts.length === 0) {
    throw new Error(`${label}.debugMeta.userParts must be a nonempty array`);
  }
  if (new Set(debugMeta.userParts).size !== debugMeta.userParts.length) {
    throw new Error(`${label}.debugMeta.userParts must be unique`);
  }
  for (const part of debugMeta.userParts) {
    if (!userParts.includes(part as UserPart)) {
      throw new Error(`${label}.debugMeta.userParts contains an unsupported category`);
    }
  }

  if (!Array.isArray(rawEntry.sourcePdfPages) || rawEntry.sourcePdfPages.length === 0) {
    throw new Error(`${label}.sourcePdfPages must be a nonempty array`);
  }
  for (const [pageIndex, page] of rawEntry.sourcePdfPages.entries()) {
    assertPositiveInteger(page, `${label}.sourcePdfPages[${pageIndex}]`);
  }
  if (rawEntry.headingPdfPage !== undefined) {
    assertPositiveInteger(rawEntry.headingPdfPage, `${label}.headingPdfPage`);
  }

  return rawEntry as unknown as AnchoredEntryInput;
}

function emptyCategoryCounts(): CategoryCounts {
  return Object.fromEntries(userParts.map((part) => [part, 0])) as CategoryCounts;
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeOcrBody(value: string): string {
  return value
    .trim()
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/[ \t]*\n[ \t]*/g, "").replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

function summaryFromBody(body: string): string {
  return compactWhitespace(body).slice(0, 180);
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function pageNumber(entry: AnchoredEntryInput): number {
  return entry.headingPdfPage ?? Math.min(...entry.sourcePdfPages!);
}

function pageEndNumber(entry: AnchoredEntryInput): number {
  return Math.max(...entry.sourcePdfPages!);
}

function bodyPageFromPdfPage(pdfPage: number): number | undefined {
  const page = pdfPage - 63;
  return page > 0 ? page : undefined;
}

function uniqueResourceId(baseId: string, seenIds: Map<string, number>): string {
  const count = seenIds.get(baseId) ?? 0;
  seenIds.set(baseId, count + 1);
  if (count === 0) return baseId;
  return `${baseId}-${count + 1}`;
}

function resourceIdForEntry(entry: AnchoredEntryInput, seenIds: Map<string, number>): string {
  const baseId = `bible-encyclopedia-${String(pageNumber(entry)).padStart(4, "0")}-${slugify(entry.title)}`;
  return uniqueResourceId(baseId, seenIds);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function entryResource(entry: AnchoredEntryInput, seenIds: Map<string, number>) {
  const pdfPage = pageNumber(entry);
  const pdfPageEnd = pageEndNumber(entry);
  const page = bodyPageFromPdfPage(pdfPage);
  const pageEnd = bodyPageFromPdfPage(pdfPageEnd);
  const entryUserParts = entry.debugMeta!.userParts as UserPart[];
  const body = normalizeOcrBody(entry.body);
  const summary = summaryFromBody(body);
  const english = optionalString(entry.english);
  const section = typeof entry.debugMeta?.section === "string" ? entry.debugMeta.section : null;
  const subsection = typeof entry.debugMeta?.subsection === "string" ? entry.debugMeta.subsection : null;
  const ocrProfile = optionalString(entry.debugMeta?.ocrProfile);
  const inventoryUserParts = Array.isArray(entry.debugMeta?.inventoryUserParts)
    ? entry.debugMeta.inventoryUserParts.filter((part): part is string => typeof part === "string")
    : undefined;
  const senseEnglishNames = Array.isArray(entry.debugMeta?.senseEnglishNames)
    ? entry.debugMeta.senseEnglishNames.filter((name): name is string => typeof name === "string")
    : undefined;
  const mergedSenseCount = Number.isInteger(entry.debugMeta?.mergedSenseCount)
    ? Number(entry.debugMeta?.mergedSenseCount)
    : undefined;

  return {
    id: resourceIdForEntry(entry, seenIds),
    title: entry.title.trim(),
    type: "link",
    verses: [...entry.verses],
    primaryAnchor: entry.primaryAnchor,
    body,
    summary,
    searchText: compactWhitespace([
      entry.title,
      english,
      body,
      summary,
      source,
      category,
      ...entryUserParts,
      section,
      subsection,
    ].filter((value): value is string => typeof value === "string").join(" ")),
    source,
    category,
    debugMeta: {
      sourceStream: "bible-encyclopedia-dictionary",
      subtype: "encyclopedia-entry",
      heading: entry.title.trim(),
      ...(english ? { english } : {}),
      userParts: entryUserParts,
      section,
      subsection,
      ...(ocrProfile ? { ocrProfile } : {}),
      ...(inventoryUserParts && inventoryUserParts.length > 0 ? { inventoryUserParts } : {}),
      ...(senseEnglishNames && senseEnglishNames.length > 0 ? { senseEnglishNames } : {}),
      ...(mergedSenseCount ? { mergedSenseCount } : {}),
      sourcePdf: source,
      sourcePdfPath: sourcePdf,
      sourcePdfPages: [...entry.sourcePdfPages!],
      headingPdfPage: entry.headingPdfPage ?? pdfPage,
      ...(page ? { page } : {}),
      ...(pageEnd ? { pageEnd } : {}),
      ...(page ? { pageLabel: pageEnd && pageEnd !== page ? `p.${page}-${pageEnd}` : `p.${page}` } : {}),
      pdfPage,
      ...(pdfPageEnd !== pdfPage ? { pdfPageEnd } : {}),
      primaryAnchor: entry.primaryAnchor,
      anchorRefs: Array.isArray(entry.anchorRefs) ? stableValue(entry.anchorRefs) : [],
      match: entry.match === undefined ? null : stableValue(entry.match),
      matchedInventory: entry.match !== undefined && entry.match !== null,
      ...(typeof entry.id === "string" && entry.id.trim().length > 0 ? { sourceEntryId: entry.id } : {}),
    },
  };
}

export function generateBibleEncyclopediaResourcePayload(rawInput: unknown, options: GenerateOptions) {
  const input = normalizeInput(rawInput);
  const counts = emptyCategoryCounts();
  const seenIds = new Map<string, number>();
  const resources = input.entries.map((rawEntry, index) => {
    const entry = normalizeEntry(rawEntry, index);
    for (const part of entry.debugMeta!.userParts as UserPart[]) counts[part] += 1;
    return entryResource(entry, seenIds);
  });

  return {
    metadata: {
      schemaVersion: 1,
      version: resourceVersion,
      generatedAt: normalizeGeneratedAt(options.generatedAt, "generatedAt"),
      source,
      sourcePdf,
      resourceType: "link",
      category,
      userParts: [...userParts],
      totalResources: resources.length,
      categoryCounts: counts,
    },
    resources,
  };
}

async function writeJson(path: string, payload: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function cliOptions(argv: string[]): { input: string; output: string; generatedAt: string } {
  const { values } = parseArgs({
    args: argv,
    options: {
      "generated-at": { type: "string" },
      input: { type: "string", short: "i" },
      output: { type: "string", short: "o" },
    },
  });

  assertNonemptyString(values.input, "--input");
  assertNonemptyString(values.output, "--output");
  return {
    generatedAt: generatedAtFromOptions(values["generated-at"]),
    input: values.input,
    output: values.output,
  };
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const options = cliOptions(argv);
  const input = JSON.parse(await readFile(options.input, "utf8"));
  const payload = generateBibleEncyclopediaResourcePayload(input, { generatedAt: options.generatedAt });
  await writeJson(options.output, payload);
  console.log(`Generated ${payload.resources.length} Bible encyclopedia resources: ${options.output}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
