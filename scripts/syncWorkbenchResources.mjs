#!/usr/bin/env node
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const bibleLibraryPath = path.join(repoRoot, "src/data/generated/bibleLibrary.json");
const bibleLibrary = JSON.parse(await readFile(bibleLibraryPath, "utf8"));
const validCuvVerseIds = new Set(bibleLibrary.cuvBible.verses.map((verse) => verse.id));
const defaultApiBase = "http://127.0.0.1:5179";
const sourceWorkbenchPath = "/Users/simon/OHB/Edit";
const outputJsonPath = path.join(repoRoot, "src/data/generated/workbenchSyncedResources【codex-v4】.json");
const publicResourceRoot = path.join(repoRoot, "public/resources/workbench");
const publicResourceUrlRoot = "/resources/workbench";
const detailConcurrency = 24;
const bookIdsByFolderNumber = [
  "Gen",
  "Exod",
  "Lev",
  "Num",
  "Deut",
  "Josh",
  "Judg",
  "Ruth",
  "1Sam",
  "2Sam",
  "1Kgs",
  "2Kgs",
  "1Chr",
  "2Chr",
  "Ezra",
  "Neh",
  "Esth",
  "Job",
  "Ps",
  "Prov",
  "Eccl",
  "Song",
  "Isa",
  "Jer",
  "Lam",
  "Ezek",
  "Dan",
  "Hos",
  "Joel",
  "Amos",
  "Obad",
  "Jonah",
  "Mic",
  "Nah",
  "Hab",
  "Zeph",
  "Hag",
  "Zech",
  "Mal",
  "Matt",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Rom",
  "1Cor",
  "2Cor",
  "Gal",
  "Eph",
  "Phil",
  "Col",
  "1Thess",
  "2Thess",
  "1Tim",
  "2Tim",
  "Titus",
  "Phlm",
  "Heb",
  "Jas",
  "1Pet",
  "2Pet",
  "1John",
  "2John",
  "3John",
  "Jude",
  "Rev",
];

function parseArgs(argv) {
  const options = {
    apiBase: defaultApiBase,
    outputJsonPath,
    publicResourceRoot,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--api-base") {
      const value = argv[index + 1];
      if (!value) throw new Error("--api-base requires a value");
      options.apiBase = value.replace(/\/$/, "");
      index += 1;
    } else if (arg === "--output-json") {
      const value = argv[index + 1];
      if (!value) throw new Error("--output-json requires a value");
      options.outputJsonPath = path.resolve(value);
      index += 1;
    } else if (arg === "--public-resource-root") {
      const value = argv[index + 1];
      if (!value) throw new Error("--public-resource-root requires a value");
      options.publicResourceRoot = path.resolve(value);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return await response.json();
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

function isExcludedFromWorkbenchSync(card) {
  const status = card.review?.syncStatus;
  return status === "temporarily_unsynced" || status === "reader_returned";
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null));
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.length > 0)));
}

function isValidVerseAnchor(value) {
  if (typeof value !== "string") return false;
  const match = value.match(/^[^.]+\.(\d+)\.(\d+)$/);
  return Boolean(match && Number(match[1]) > 0 && Number(match[2]) > 0 && validCuvVerseIds.has(value));
}

function hasValidVerseNavigation(primaryAnchor, verses) {
  return isValidVerseAnchor(primaryAnchor) || verses.some(isValidVerseAnchor);
}

function bookIdFromFolder(bookFolder) {
  const match = String(bookFolder ?? "").match(/^(\d{2})_/);
  if (!match) return undefined;
  return bookIdsByFolderNumber[Number(match[1]) - 1];
}

function sanitizePathSegment(value) {
  return String(value)
    .replace(/[\/:]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extensionFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext || ".png";
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function readSourceAssetFromLedger(card) {
  const sourceFile = card.sourceRef?.sourceFile;
  const sourceLine = card.sourceRef?.line ?? card.syncDraft?.debugMeta?.sourceLedgerLine;
  if (!sourceFile || !sourceLine) return undefined;

  const fileText = await readFile(sourceFile, "utf8");
  const line = fileText.split(/\r?\n/)[sourceLine - 1];
  if (!line) return undefined;

  const row = JSON.parse(line);
  return row.assetPath
    ?? row.asset_path
    ?? row.card_draft?.assetPath
    ?? row.source?.assetPath
    ?? row.image?.assetPath;
}

async function resolveImageAssetPath(card) {
  const candidates = uniqueStrings([
    card.sourceRef?.assetPath,
    card.syncDraft?.assetPath,
    await readSourceAssetFromLedger(card),
  ]);

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Missing image asset for ${card.id}; tried ${candidates.join(", ") || "no candidate paths"}`);
}

async function copyImageAsset(card, options) {
  const sourceAssetPath = await resolveImageAssetPath(card);
  const bookFolder = card.sourceRef?.bookFolder ?? "unknown-book";
  const safeBookFolder = sanitizePathSegment(bookFolder) || "unknown-book";
  const targetFileName = `${sanitizePathSegment(card.id)}${extensionFromPath(sourceAssetPath)}`;
  const relativePath = `${safeBookFolder}/${targetFileName}`;
  const targetAbsolutePath = path.join(options.publicResourceRoot, relativePath);

  await mkdir(path.dirname(targetAbsolutePath), { recursive: true });
  await copyFile(sourceAssetPath, targetAbsolutePath);

  return {
    assetPath: `${publicResourceUrlRoot}/${relativePath}`,
    sourceAssetPath,
    storedAbsolutePath: targetAbsolutePath,
    storedRelativePath: `public/resources/workbench/${relativePath}`,
  };
}

function bookIntroFallbackForCard(card) {
  if (card.kind !== "image") return undefined;
  if (card.navigation?.bookIntro ?? card.syncDraft?.bookIntro) return undefined;
  const primaryAnchor = card.navigation?.primaryAnchor ?? card.syncDraft?.primaryAnchor;
  const verses = card.navigation?.verses ?? card.syncDraft?.verses ?? [];
  if (hasValidVerseNavigation(primaryAnchor, verses)) return undefined;
  return bookIdFromFolder(card.sourceRef?.bookFolder);
}

function navigationPrimaryAnchorsForResource(resource, card) {
  const anchors = uniqueStrings([
    ...(card.syncDraft?.debugMeta?.navigationPrimaryAnchors ?? []),
    ...(resource.bookIntro ? [`book-intro:${resource.bookIntro}`] : []),
    resource.primaryAnchor,
    ...(resource.verses ?? []),
  ]);
  return hasValidVerseNavigation(resource.primaryAnchor, resource.verses ?? [])
    ? anchors.filter((anchor) => !anchor.startsWith("book-intro:"))
    : anchors;
}

function assertImageNavigationTarget(resource) {
  if (resource.type !== "image") return;
  if (
    hasValidVerseNavigation(resource.primaryAnchor, resource.verses ?? [])
    || resource.bookIntro
    || (resource.debugMeta?.navigationPrimaryAnchors ?? []).some((anchor) => (
      anchor.startsWith("book-intro:") || isValidVerseAnchor(anchor)
    ))
  ) {
    return;
  }

  const source = [
    resource.debugMeta?.bookFolder,
    resource.debugMeta?.sourceLedgerPath,
    resource.debugMeta?.sourceLedgerLine,
  ].filter(Boolean).join(" ");
  throw new Error(`Image resource ${resource.id} has no navigation target; source=${source || "unknown"}`);
}

function normalizeDebugMeta(card, syncSelection, assetInfo, navigationRepair) {
  return compactObject({
    ...(card.syncDraft?.debugMeta ?? {}),
    sourceWorkbenchPath,
    sourceWorkbenchCardId: card.id,
    sourceRawKind: card.kind,
    sourceAssetPath: assetInfo?.sourceAssetPath,
    sourceLedgerLine: card.sourceRef?.line ?? card.syncDraft?.debugMeta?.sourceLedgerLine,
    sourceLedgerPath: card.sourceRef?.sourceFile ?? card.syncDraft?.debugMeta?.sourceLedgerPath,
    sourcePdfPath: card.sourceRef?.pdfPath,
    sourceLabel: card.sourceRef?.sourceLabel,
    sourceEvidenceSnippet: card.sourceRef?.evidenceSnippet,
    sourceEvidencePage: card.sourceRef?.page,
    sourceKey: card.sourceRef?.sourceKey,
    bookFolder: card.sourceRef?.bookFolder,
    page: card.sourceRef?.page,
    primaryAnchor: card.navigation?.primaryAnchor ?? card.syncDraft?.primaryAnchor,
    coverageRanges: card.navigation?.coverageRanges,
    relatedRanges: card.navigation?.relatedRanges,
    navigationRisk: card.navigation?.navigationRisk,
    riskLevel: card.review?.riskLevel,
    riskFlags: card.review?.riskFlags,
    reviewStatus: card.review?.status,
    contentStatus: card.review?.contentStatus,
    navigationStatus: card.review?.navigationStatus,
    readerInclusion: card.review?.readerInclusion,
    syncStatus: card.review?.syncStatus,
    syncSelection,
    navigationRepair,
    storedAbsolutePath: assetInfo?.storedAbsolutePath,
    storedRelativePath: assetInfo?.storedRelativePath,
  });
}

function normalizeResource(card, syncSelection, assetInfo) {
  const draft = card.syncDraft ?? {};
  const fallbackBookIntro = bookIntroFallbackForCard(card);
  const verses = (card.navigation?.verses ?? draft.verses ?? []).filter(isValidVerseAnchor);
  const rawPrimaryAnchor = card.navigation?.primaryAnchor ?? draft.primaryAnchor;
  const primaryAnchor = isValidVerseAnchor(rawPrimaryAnchor) ? rawPrimaryAnchor : undefined;
  const bookIntro = hasValidVerseNavigation(primaryAnchor, verses)
    ? undefined
    : card.navigation?.bookIntro ?? draft.bookIntro ?? fallbackBookIntro;
  const resource = compactObject({
    id: String(draft.id ?? card.id),
    title: String(draft.title ?? card.draft?.title ?? card.id),
    type: draft.type ?? card.kind,
    verses,
    primaryAnchor,
    bookIntro,
    body: String(draft.body ?? card.draft?.body ?? ""),
    summary: draft.summary,
    searchText: draft.searchText,
    source: draft.source,
    assetPath: assetInfo?.assetPath ?? draft.assetPath,
    debugMeta: normalizeDebugMeta(
      card,
      syncSelection,
      assetInfo,
      fallbackBookIntro ? "book-folder-fallback" : undefined,
    ),
  });

  if (resource.bookIntro === null) delete resource.bookIntro;
  if (resource.type === "image" || (card.syncDraft?.debugMeta?.navigationPrimaryAnchors ?? []).length > 0) {
    const navigationPrimaryAnchors = navigationPrimaryAnchorsForResource(resource, card);
    if (navigationPrimaryAnchors.length > 0) {
      resource.debugMeta = {
        ...resource.debugMeta,
        navigationPrimaryAnchors,
      };
    }
  }
  if (resource.type === "image") {
    assertImageNavigationTarget(resource);
  }
  return resource;
}

function assertCardCanSync(card, syncSelection) {
  normalizeResource(card, syncSelection);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cardsPayload = await fetchJson(`${options.apiBase}/api/cards`);
  const listItems = cardsPayload.cards ?? [];
  const selectedListItems = listItems.filter((card) => card.kind === "image" || card.kind === "commentary");

  console.log(`[syncWorkbenchResources] fetching ${selectedListItems.length} card details from ${options.apiBase}`);
  const details = await mapWithConcurrency(selectedListItems, detailConcurrency, async (card) => {
    return await fetchJson(`${options.apiBase}/api/card/${encodeURIComponent(card.id)}`);
  });

  const excludedCounts = {};
  const excludedCountsByKind = {};
  const selectedDetails = [];

  for (const card of details) {
    if (isExcludedFromWorkbenchSync(card)) {
      const status = card.review?.syncStatus ?? "unknown";
      excludedCounts[status] = (excludedCounts[status] ?? 0) + 1;
      excludedCountsByKind[card.kind] = (excludedCountsByKind[card.kind] ?? 0) + 1;
      continue;
    }

    if (card.kind === "image") {
      selectedDetails.push({ card, syncSelection: "workbench-image" });
      continue;
    }

    selectedDetails.push({ card, syncSelection: "workbench-commentary" });
  }

  const resources = [];
  let copiedImageCount = 0;

  for (const { card, syncSelection } of selectedDetails) {
    if (card.kind === "image") {
      assertCardCanSync(card, syncSelection);
      const assetInfo = await copyImageAsset(card, options);
      copiedImageCount += 1;
      resources.push(normalizeResource(card, syncSelection, assetInfo));
    } else {
      resources.push(normalizeResource(card, syncSelection));
    }
  }

  const selectedCounts = {
    image: resources.filter((resource) => resource.type === "image").length,
    commentary: resources.filter((resource) => resource.type === "commentary").length,
    total: resources.length,
  };

  const payload = {
    metadata: {
      copiedImageCount,
      excludedCounts,
      excludedCountsByKind,
      generatedAt: new Date().toISOString(),
      selectedCounts,
      sourceApiBase: options.apiBase,
      sourceWorkbenchPath,
      totalWorkbenchCards: listItems.length,
      workbenchSummary: cardsPayload.summary,
    },
    resources,
  };

  await mkdir(path.dirname(options.outputJsonPath), { recursive: true });
  await writeFile(options.outputJsonPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`[syncWorkbenchResources] wrote ${resources.length} resources to ${options.outputJsonPath}`);
  console.log(`[syncWorkbenchResources] copied ${copiedImageCount} images to ${options.publicResourceRoot}`);
  console.log(`[syncWorkbenchResources] excluded counts: ${JSON.stringify(excludedCounts)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
