#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { copyFile, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const bibleLibraryPath = path.join(repoRoot, "src/data/generated/bibleLibrary.json");
const bibleLibrary = JSON.parse(await readFile(bibleLibraryPath, "utf8"));
const validCuvVerseIds = new Set(bibleLibrary.cuvBible.verses.map((verse) => verse.id));
const defaultApiBase = "http://127.0.0.1:5179";
const sourceWorkbenchPath = "/Users/simon/OHB/Edit";
const outputJsonPath = path.join(repoRoot, "src/data/generated/workbenchSyncedResources-v4.json");
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
    cardsFile: "",
    outputJsonPath,
    patchCardsFile: "",
    progressFile: "",
    publicResourceRoot,
    resultFile: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--api-base") {
      const value = argv[index + 1];
      if (!value) throw new Error("--api-base requires a value");
      options.apiBase = value.replace(/\/$/, "");
      index += 1;
    } else if (arg === "--cards-file") {
      const value = argv[index + 1];
      if (!value) throw new Error("--cards-file requires a value");
      options.cardsFile = path.resolve(value);
      index += 1;
    } else if (arg === "--patch-cards-file") {
      const value = argv[index + 1];
      if (!value) throw new Error("--patch-cards-file requires a value");
      options.patchCardsFile = path.resolve(value);
      index += 1;
    } else if (arg === "--progress-file") {
      const value = argv[index + 1];
      if (!value) throw new Error("--progress-file requires a value");
      options.progressFile = path.resolve(value);
      index += 1;
    } else if (arg === "--result-file") {
      const value = argv[index + 1];
      if (!value) throw new Error("--result-file requires a value");
      options.resultFile = path.resolve(value);
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

  if (options.resultFile === options.outputJsonPath) {
    throw new Error("--result-file must differ from --output-json");
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

function workbenchSyncExclusionReason(card) {
  if (card.review?.softDeleted === true || card.softDeleted === true) return "soft_deleted";
  const status = card.review?.syncStatus;
  return status === "temporarily_unsynced" || status === "reader_returned" ? status : null;
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null));
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.length > 0)));
}

function assertUniqueValues(values, label) {
  const seenIds = new Set();
  for (const id of values) {
    if (seenIds.has(id)) {
      throw new Error(`Duplicate ${label} id: ${id}`);
    }
    seenIds.add(id);
  }
}

function assertUniqueIds(items, label) {
  assertUniqueValues(items.map((item) => String(item.id)), label);
}

function readerResourceId(card) {
  return String(card.syncDraft?.id ?? card.id);
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
  const sourceStat = await stat(sourceAssetPath);

  if (await pathExists(targetAbsolutePath)) {
    const destStat = await stat(targetAbsolutePath);
    if (destStat.size === sourceStat.size && destStat.mtimeMs >= sourceStat.mtimeMs) {
      return {
        assetPath: `${publicResourceUrlRoot}/${relativePath}`,
        skipped: true,
        sourceAssetPath,
        storedAbsolutePath: targetAbsolutePath,
        storedRelativePath: `public/resources/workbench/${relativePath}`,
      };
    }
  }

  await mkdir(path.dirname(targetAbsolutePath), { recursive: true });
  await copyFile(sourceAssetPath, targetAbsolutePath);

  return {
    assetPath: `${publicResourceUrlRoot}/${relativePath}`,
    skipped: false,
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
    id: readerResourceId(card),
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

export async function loadWorkbenchSyncSource(apiBase) {
  const syncSourceUrl = `${apiBase}/api/sync-source`;
  const bulkResponse = await fetch(syncSourceUrl);
  if (bulkResponse.ok) {
    const payload = await bulkResponse.json();
    if (!Array.isArray(payload?.cards)) {
      throw new Error(`Invalid sync-source payload from ${syncSourceUrl}`);
    }
    assertUniqueIds(payload.cards, "workbench detail");
    console.log(`[syncWorkbenchResources] loaded ${payload.cards.length} cards from sync-source ${apiBase}`);
    return {
      cards: payload.cards,
      source: "sync-source",
      summary: payload.summary,
    };
  }
  if (bulkResponse.status !== 404) {
    throw new Error(`Failed to fetch ${syncSourceUrl}: ${bulkResponse.status} ${bulkResponse.statusText}`);
  }

  const cardsPayload = await fetchJson(`${apiBase}/api/cards`);
  const listItems = cardsPayload.cards ?? [];
  assertUniqueIds(listItems, "workbench card");
  const selectedListItems = listItems.filter((card) => card.kind === "image" || card.kind === "commentary");
  console.log(`[syncWorkbenchResources] fetching ${selectedListItems.length} card details from ${apiBase}`);
  const details = await mapWithConcurrency(selectedListItems, detailConcurrency, async (card) => {
    return await fetchJson(`${apiBase}/api/card/${encodeURIComponent(card.id)}`);
  });
  assertUniqueIds(details, "workbench detail");
  return {
    cards: details,
    source: "n+1",
    summary: cardsPayload.summary,
  };
}

export async function syncWorkbenchFromCards(options) {
  const cards = options.cards ?? [];
  const sourceExclusions = readSourceExclusions(options.sourceExclusions);
  const resolvedOutputJsonPath = options.outputJsonPath ?? outputJsonPath;
  const resolvedPublicRoot = options.publicResourceRoot ?? publicResourceRoot;
  const onProgress = (snapshot) => {
    options.onProgress?.(snapshot);
    if (options.progressFile) {
      writeFileSync(options.progressFile, `${JSON.stringify(snapshot)}\n`);
    }
  };
  assertUniqueIds(cards, "workbench detail");
  const previousExclusions = await readPreviousExclusions(resolvedOutputJsonPath);
  const currentResourceIds = new Set(cards.map(readerResourceId));
  // Full rebuilds must not resurrect an absent source row through a stable fallback.
  // A present, explicitly syncable source row can still restore that same ID.
  const historicalExclusions = new Map(
    [...previousExclusions].filter(([id]) => !currentResourceIds.has(id)),
  );
  reportProgress(onProgress, 18, "正在整理卡片");

  const excludedCounts = {};
  const excludedCountsByKind = {};
  const excludedResourceIds = [];
  const selectedDetails = [];

  for (const card of cards) {
    if (card.kind !== "image" && card.kind !== "commentary") {
      throw new Error(`Unsupported workbench card kind for ${card.id}: ${card.kind}`);
    }
    const exclusionReason = workbenchSyncExclusionReason(card);
    if (exclusionReason) {
      excludedCounts[exclusionReason] = (excludedCounts[exclusionReason] ?? 0) + 1;
      excludedCountsByKind[card.kind] = (excludedCountsByKind[card.kind] ?? 0) + 1;
      excludedResourceIds.push(readerResourceId(card));
      continue;
    }

    selectedDetails.push({
      card,
      syncSelection: card.kind === "image" ? "workbench-image" : "workbench-commentary",
    });
  }

  for (const [id, state] of historicalExclusions) {
    excludedResourceIds.push(id);
    excludedCounts[state.reason] = (excludedCounts[state.reason] ?? 0) + 1;
    excludedCountsByKind[state.kind] = (excludedCountsByKind[state.kind] ?? 0) + 1;
  }

  const resources = [];
  let copiedImageCount = 0;
  let skippedImageCount = 0;
  const imageTotal = selectedDetails.filter(({ card }) => card.kind === "image").length;
  let imageIndex = 0;

  for (const { card, syncSelection } of selectedDetails) {
    if (card.kind === "image") {
      assertCardCanSync(card, syncSelection);
      imageIndex += 1;
      reportProgress(
        onProgress,
        20 + Math.round((imageIndex / Math.max(imageTotal, 1)) * 60),
        `正在处理图片 ${imageIndex}/${imageTotal}`,
      );
      const assetInfo = await copyImageAsset(card, { publicResourceRoot: resolvedPublicRoot });
      copiedImageCount += 1;
      if (assetInfo.skipped) skippedImageCount += 1;
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
  assertUniqueIds(resources, "selected resource");
  assertUniqueValues(excludedResourceIds, "excluded resource");
  excludedResourceIds.sort();
  const excludedTotal = Object.values(excludedCounts).reduce((total, count) => total + count, 0);
  const selectedResourceIds = new Set(resources.map((resource) => resource.id));
  if (excludedResourceIds.length !== excludedTotal) {
    throw new Error("Excluded resource tombstone count does not match exclusion reason counts");
  }
  if (excludedResourceIds.some((id) => selectedResourceIds.has(id))) {
    throw new Error("Selected resource ids overlap excluded resource tombstones");
  }
  if (resources.length + excludedTotal !== cards.length + historicalExclusions.size) {
    throw new Error("Selected and excluded resource totals do not match workbench card total");
  }
  const projectionMetadata = sourceExclusions || historicalExclusions.size
    ? deriveProjectionMetadata(resources, resolveExclusionStates(excludedResourceIds, cards, historicalExclusions, sourceExclusions), options.summary)
    : null;

  reportProgress(onProgress, 88, "正在写入阅读台资源");
  const payload = {
    metadata: {
      copiedImageCount,
      excludedCounts,
      excludedCountsByKind,
      excludedResourceIds,
      generatedAt: new Date().toISOString(),
      selectedCounts,
      skippedImageCount,
      sourceApiBase: options.sourceApiBase ?? "",
      sourceWorkbenchPath,
      totalWorkbenchCards: cards.length,
      workbenchSummary: options.summary,
      ...(projectionMetadata ?? {}),
    },
    resources,
  };

  await writeSyncedPayload(resolvedOutputJsonPath, payload);

  reportProgress(onProgress, 96, "正在完成同步");
  console.log(`[syncWorkbenchResources] wrote ${resources.length} resources to ${resolvedOutputJsonPath}`);
  console.log(`[syncWorkbenchResources] copied ${copiedImageCount} images to ${resolvedPublicRoot}`);
  if (skippedImageCount > 0) {
    console.log(`[syncWorkbenchResources] skipped ${skippedImageCount} unchanged images`);
  }
  console.log(`[syncWorkbenchResources] excluded counts: ${JSON.stringify(excludedCounts)}`);
  return {
    copiedImageCount,
    count: resources.length,
    outputJsonPath: resolvedOutputJsonPath,
    publicResourceRoot: resolvedPublicRoot,
    skippedImageCount,
  };
}

export async function patchWorkbenchSyncedResources(options) {
  const cards = options.cards ?? [];
  const sourceExclusions = readSourceExclusions(options.sourceExclusions);
  const sourceIds = readSourceResourceIds(options.sourceResourceIds, cards, sourceExclusions, options.summary);
  const dropIds = uniqueNonemptyStrings(options.dropIds);
  const resolvedOutputJsonPath = options.outputJsonPath ?? outputJsonPath;
  const resolvedPublicRoot = options.publicResourceRoot ?? publicResourceRoot;
  const onProgress = (snapshot) => {
    options.onProgress?.(snapshot);
    if (options.progressFile) {
      writeFileSync(options.progressFile, `${JSON.stringify(snapshot)}\n`);
    }
  };
  assertUniqueIds(cards, "workbench detail");
  reportProgress(onProgress, 18, "正在读取阅读台索引");

  let existing;
  try {
    existing = JSON.parse(await readFile(resolvedOutputJsonPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("阅读台索引不存在，请先重建阅读台索引");
    }
    throw error;
  }
  if (!Array.isArray(existing?.resources) || !existing?.metadata) {
    throw new Error("Invalid existing workbench synced resources payload");
  }
  const savedExclusionStates = readStoredExclusionStates(existing.metadata);
  const retainedExclusionStates = new Map(savedExclusionStates ?? []);

  const resourcesById = new Map(existing.resources.map((resource) => [resource.id, resource]));
  const resourceOrder = existing.resources.map((resource) => resource.id);
  const orderedIds = new Set(resourceOrder);
  const excludedSet = new Set(existing.metadata.excludedResourceIds ?? []);
  const previousSelected = new Set(existing.resources.map((resource) => resource.id));
  const previousExcluded = new Set(existing.metadata.excludedResourceIds ?? []);

  for (const id of dropIds) {
    resourcesById.delete(id);
    excludedSet.delete(id);
  }
  // Source retirements (including OCR -> original image) can happen outside
  // this API. Remove only stale projections; publishing a replacement still
  // requires an explicit card patch. Keep tombstones to suppress fallbacks.
  const retiredSourceIds = [];
  if (sourceIds) {
    for (const [id, resource] of resourcesById) {
      if (sourceIds.has(id)) continue;
      resourcesById.delete(id);
      excludedSet.add(id);
      retainedExclusionStates.set(id, {
        reason: "unresolved",
        kind: knownExclusionKinds.has(resource.type) ? resource.type : "unknown",
      });
      retiredSourceIds.push(id);
    }
  }
  const imageCards = cards.filter((card) => card.kind === "image" && !workbenchSyncExclusionReason(card));
  let copiedImageCount = 0;
  let skippedImageCount = 0;
  let imageIndex = 0;

  reportProgress(onProgress, 24, "正在增量写入卡片");

  for (const card of cards) {
    if (card.kind !== "image" && card.kind !== "commentary") {
      throw new Error(`Unsupported workbench card kind for ${card.id}: ${card.kind}`);
    }
    const id = readerResourceId(card);
    const exclusionReason = workbenchSyncExclusionReason(card);

    if (exclusionReason) {
      resourcesById.delete(id);
      excludedSet.add(id);
      continue;
    }

    let assetInfo;
    if (card.kind === "image") {
      imageIndex += 1;
      reportProgress(
        onProgress,
        30 + Math.round((imageIndex / Math.max(imageCards.length, 1)) * 50),
        `正在处理图片 ${imageIndex}/${imageCards.length}`,
      );
      assetInfo = await copyImageAsset(card, { publicResourceRoot: resolvedPublicRoot });
      copiedImageCount += 1;
      if (assetInfo.skipped) skippedImageCount += 1;
    }

    resourcesById.set(id, normalizeResource(
      card,
      card.kind === "image" ? "workbench-image" : "workbench-commentary",
      assetInfo,
    ));
    if (!orderedIds.has(id)) {
      resourceOrder.push(id);
      orderedIds.add(id);
    }
    excludedSet.delete(id);
  }

  const resources = resourceOrder
    .filter((id) => resourcesById.has(id))
    .map((id) => resourcesById.get(id));
  const selectedCounts = {
    image: resources.filter((resource) => resource.type === "image").length,
    commentary: resources.filter((resource) => resource.type === "commentary").length,
    total: resources.length,
  };
  const excludedResourceIds = Array.from(excludedSet).sort();
  const metadata = sourceIds || sourceExclusions || savedExclusionStates
    ? deriveProjectionMetadata(
      resources,
      resolveExclusionStates(excludedResourceIds, cards, retainedExclusionStates, sourceExclusions),
      options.summary ?? existing.metadata.sourceWorkbenchSummary,
    )
    : resolvePatchedMetadata({
      dropIds,
      excludedResourceIds,
      existing,
      previousExcluded,
      previousSelected,
      providedSummary: options.summary,
      resources,
      selectedCounts,
    });
  const { excludedCounts, excludedCountsByKind, totalWorkbenchCards, workbenchSummary: summary } = metadata;
  const excludedTotal = Object.values(excludedCounts).reduce((total, count) => total + count, 0);

  assertUniqueIds(resources, "selected resource");
  assertUniqueValues(excludedResourceIds, "excluded resource");
  if (excludedResourceIds.length !== excludedTotal) {
    throw new Error("Excluded resource tombstone count does not match exclusion reason counts");
  }
  if (excludedResourceIds.some((id) => resourcesById.has(id))) {
    throw new Error("Selected resource ids overlap excluded resource tombstones");
  }
  if (resources.length + excludedTotal !== totalWorkbenchCards) {
    throw new Error("Selected and excluded resource totals do not match workbench card total");
  }

  reportProgress(onProgress, 88, "正在写入阅读台资源");
  const payload = {
    metadata: {
      ...existing.metadata,
      ...metadata,
      copiedImageCount: (Number(existing.metadata.copiedImageCount) || 0) + copiedImageCount,
      excludedCounts,
      excludedCountsByKind,
      excludedResourceIds,
      generatedAt: new Date().toISOString(),
      selectedCounts,
      skippedImageCount: (Number(existing.metadata.skippedImageCount) || 0) + skippedImageCount,
      totalWorkbenchCards,
      workbenchSummary: summary,
    },
    resources,
  };
  await writeSyncedPayload(resolvedOutputJsonPath, payload);
  reportProgress(onProgress, 96, "正在完成同步");
  console.log(
    `[syncWorkbenchResources] patched ${cards.length} cards / dropped ${dropIds.length} ids into ${resolvedOutputJsonPath}`,
  );
  console.log(`[syncWorkbenchResources] copied ${copiedImageCount} images to ${resolvedPublicRoot}`);
  if (skippedImageCount > 0) {
    console.log(`[syncWorkbenchResources] skipped ${skippedImageCount} unchanged images`);
  }
  return {
    copiedImageCount,
    count: resources.length,
    outputJsonPath: resolvedOutputJsonPath,
    publicResourceRoot: resolvedPublicRoot,
    ...(sourceIds ? { retiredSourceIds } : {}),
    skippedImageCount,
  };
}

function readSourceResourceIds(value, cards, exclusions, summary) {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length === 0
    || value.some(id => typeof id !== "string" || !id.trim() || id !== id.trim())) {
    throw new Error("sourceResourceIds must be a nonempty complete source inventory");
  }
  assertUniqueValues(value, "source resource");
  if (summary?.total !== value.length) {
    throw new Error("sourceResourceIds count does not match source summary total");
  }
  const ids = new Set(value);
  if (cards.some(card => !ids.has(readerResourceId(card)))
    || Array.from(exclusions?.keys() ?? []).some(id => !ids.has(id))) {
    throw new Error("Card patch or exclusion is outside the current source inventory");
  }
  return ids;
}

function uniqueNonemptyStrings(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((id) => String(id).trim()).filter(Boolean)));
}

const knownExclusionReasons = new Set(["soft_deleted", "temporarily_unsynced", "reader_returned"]);
const knownExclusionKinds = new Set(["image", "commentary"]);

async function readPreviousExclusions(outputPath) {
  let previous;
  try {
    previous = JSON.parse(await readFile(outputPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return new Map();
    throw error;
  }
  const metadata = previous?.metadata;
  if (!metadata || typeof metadata !== "object") throw new Error("Invalid previous exclusion metadata");
  const ids = metadata.excludedResourceIds;
  if (!Array.isArray(ids) || ids.some(id => typeof id !== "string" || !id.trim())) {
    throw new Error("Invalid previous excluded resource IDs");
  }
  assertUniqueValues(ids, "excluded resource");
  const savedStates = readStoredExclusionStates(metadata);
  return new Map(ids.map(id => [id, savedStates?.get(id) ?? { reason: "unresolved", kind: "unknown" }]));
}

function readSourceExclusions(value) {
  if (value === undefined) return null;
  if (!Array.isArray(value)) throw new Error("sourceExclusions must be an array");
  const states = new Map();
  for (const entry of value) {
    if (!entry || typeof entry.id !== "string" || !entry.id.trim()
      || !knownExclusionReasons.has(entry.reason) || !knownExclusionKinds.has(entry.kind)) {
      throw new Error("Invalid sourceExclusions entry");
    }
    if (states.has(entry.id)) throw new Error(`Duplicate sourceExclusions id: ${entry.id}`);
    states.set(entry.id, { reason: entry.reason, kind: entry.kind });
  }
  return states;
}

function readStoredExclusionStates(metadata) {
  const value = metadata.excludedResourceStates;
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid persisted exclusion states");
  }
  const ids = metadata.excludedResourceIds;
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length) {
    throw new Error("Invalid exclusion state IDs");
  }
  const states = new Map(Object.entries(value));
  if (states.size !== ids.length || ids.some((id) => !states.has(id))) {
    throw new Error("Persisted exclusion state IDs do not match tombstones");
  }
  for (const [id, state] of states) {
    if (!id.trim() || !state || typeof state !== "object"
      || !(knownExclusionReasons.has(state.reason) || state.reason === "unresolved")
      || !(knownExclusionKinds.has(state.kind) || state.kind === "unknown")) {
      throw new Error(`Invalid persisted exclusion state: ${id}`);
    }
  }
  const { excludedCounts, excludedCountsByKind } = countExclusionStates(states);
  assertExclusionCounts(metadata.excludedCounts, excludedCounts);
  assertExclusionCounts(metadata.excludedCountsByKind, excludedCountsByKind);
  return states;
}

function assertExclusionCounts(stored, actual) {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)
    || Object.values(stored).some((count) => !Number.isSafeInteger(count) || count < 0)) {
    throw new Error("Invalid persisted exclusion state counts");
  }
  const normalized = (counts) => Object.entries(counts).filter(([, count]) => count > 0).sort(([a], [b]) => a.localeCompare(b));
  if (JSON.stringify(normalized(stored)) !== JSON.stringify(normalized(actual))) {
    throw new Error("Persisted exclusion state counts do not match tombstones");
  }
}

function resolveExclusionStates(ids, cards, savedStates, sourceStates) {
  const changedStates = new Map();
  for (const card of cards) {
    const reason = workbenchSyncExclusionReason(card);
    if (reason) changedStates.set(readerResourceId(card), { reason, kind: card.kind });
  }
  // A missing source row is not permission to remove its fallback-suppression ID.
  return new Map(ids.map((id) => [id,
    changedStates.get(id) ?? savedStates?.get(id) ?? sourceStates?.get(id) ?? { reason: "unresolved", kind: "unknown" },
  ]));
}

function countExclusionStates(states) {
  const excludedCounts = {};
  const excludedCountsByKind = {};
  for (const { reason, kind } of states.values()) {
    excludedCounts[reason] = (excludedCounts[reason] ?? 0) + 1;
    excludedCountsByKind[kind] = (excludedCountsByKind[kind] ?? 0) + 1;
  }
  return { excludedCounts, excludedCountsByKind };
}

function deriveProjectionMetadata(resources, states, sourceWorkbenchSummary) {
  const { excludedCounts, excludedCountsByKind } = countExclusionStates(states);
  const byType = { ...excludedCountsByKind };
  const bySyncStatus = {};
  for (const resource of resources) {
    const kind = knownExclusionKinds.has(resource.type) ? resource.type : "unknown";
    const syncStatus = typeof resource.debugMeta?.syncStatus === "string" && resource.debugMeta.syncStatus
      ? resource.debugMeta.syncStatus : "unknown";
    byType[kind] = (byType[kind] ?? 0) + 1;
    bySyncStatus[syncStatus] = (bySyncStatus[syncStatus] ?? 0) + 1;
  }
  for (const [reason, count] of Object.entries(excludedCounts)) {
    if (reason !== "soft_deleted") bySyncStatus[reason] = (bySyncStatus[reason] ?? 0) + count;
  }
  const totalWorkbenchCards = resources.length + states.size;
  return {
    excludedCounts,
    excludedCountsByKind,
    excludedResourceStates: Object.fromEntries(states),
    totalWorkbenchCards,
    // Review/risk distributions are only known for the separate source snapshot.
    workbenchSummary: { total: totalWorkbenchCards, byType, bySyncStatus, softDeleted: excludedCounts.soft_deleted ?? 0 },
    sourceWorkbenchSummary,
  };
}

function resolvePatchedMetadata(options) {
  const summary = options.providedSummary ?? options.existing.metadata.workbenchSummary;
  const excludedCounts = excludedCountsFromSummary(
    summary,
    options.existing.metadata.excludedCounts,
    options.excludedResourceIds,
  );
  const excludedCountsByKind = excludedCountsByKindFromSummary(
    summary,
    options.existing.metadata.excludedCountsByKind,
    options.selectedCounts,
  );
  const excludedTotal = Object.values(excludedCounts).reduce((total, count) => total + count, 0);
  const totalWorkbenchCards = typeof summary?.total === "number"
    ? summary.total
    : options.resources.length + excludedTotal;
  const selectedIds = new Set(options.resources.map((resource) => resource.id));
  const consistent =
    options.excludedResourceIds.length === excludedTotal
    && options.resources.length + excludedTotal === totalWorkbenchCards
    && !options.excludedResourceIds.some((id) => selectedIds.has(id));

  if (consistent && (options.providedSummary || options.dropIds.length === 0)) {
    return {
      excludedCounts,
      excludedCountsByKind,
      totalWorkbenchCards,
      workbenchSummary: summary,
    };
  }

  if (options.dropIds.length) {
    return incrementallyDropMetadata(options);
  }

  return {
    excludedCounts,
    excludedCountsByKind,
    totalWorkbenchCards,
    workbenchSummary: summary,
  };
}

function incrementallyDropMetadata(options) {
  const droppedSelectedIds = options.dropIds.filter(
    (id) => options.previousSelected.has(id) && !options.previousExcluded.has(id),
  );
  const droppedExcludedIds = options.dropIds.filter((id) => options.previousExcluded.has(id));
  const droppedTotal = new Set([...droppedSelectedIds, ...droppedExcludedIds]).size;
  const excludedCounts = alignCountRecord(
    decrementKeyedCounts(options.existing.metadata.excludedCounts ?? {}, droppedExcludedIds.length, [
      "soft_deleted",
      "temporarily_unsynced",
      "reader_returned",
    ]),
    options.excludedResourceIds.length,
    "soft_deleted",
  );
  const previousTotal = Number(options.existing.metadata.totalWorkbenchCards);
  const workbenchSummary = incrementSummaryAfterDrop(options.existing.metadata.workbenchSummary, {
    droppedExcluded: droppedExcludedIds.length,
    droppedSelected: droppedSelectedIds.length,
    droppedTotal,
  });
  return {
    excludedCounts,
    excludedCountsByKind: excludedCountsByKindFromSummary(
      workbenchSummary,
      options.existing.metadata.excludedCountsByKind,
      options.selectedCounts,
    ),
    totalWorkbenchCards: Number.isFinite(previousTotal)
      ? Math.max(0, previousTotal - droppedTotal)
      : options.resources.length + options.excludedResourceIds.length,
    workbenchSummary,
  };
}

function incrementSummaryAfterDrop(summary, counts) {
  if (!summary || typeof summary !== "object") return summary;
  const next = {
    ...summary,
    bySyncStatus: { ...(summary.bySyncStatus ?? {}) },
    byType: { ...(summary.byType ?? {}) },
  };
  if (typeof next.total === "number") next.total = Math.max(0, next.total - counts.droppedTotal);
  if (typeof next.softDeleted === "number") {
    next.softDeleted = Math.max(0, next.softDeleted - counts.droppedExcluded);
  }
  if (counts.droppedSelected) {
    next.bySyncStatus = decrementKeyedCounts(next.bySyncStatus, counts.droppedSelected, ["syncable"]);
  }
  if (counts.droppedTotal) {
    next.byType = decrementKeyedCounts(next.byType, counts.droppedTotal, ["commentary", "image"]);
  }
  return next;
}

function decrementKeyedCounts(counts, amount, keys) {
  const next = { ...counts };
  let remaining = amount;
  for (const key of keys) {
    if (!remaining) break;
    const have = Number(next[key]) || 0;
    const take = Math.min(have, remaining);
    if (!take) continue;
    next[key] = have - take;
    remaining -= take;
    if (!next[key]) delete next[key];
  }
  return next;
}

function alignCountRecord(counts, targetLength, fillKey) {
  const next = { ...counts };
  const total = Object.values(next).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const delta = targetLength - total;
  if (delta > 0) {
    next[fillKey] = (Number(next[fillKey]) || 0) + delta;
  } else if (delta < 0) {
    let remaining = -delta;
    for (const key of Object.keys(next)) {
      const have = Number(next[key]) || 0;
      const take = Math.min(have, remaining);
      next[key] = have - take;
      remaining -= take;
      if (!next[key]) delete next[key];
      if (!remaining) break;
    }
  }
  return pruneZeroCounts(next);
}

function pruneZeroCounts(counts) {
  const next = {};
  for (const [key, value] of Object.entries(counts)) {
    if (Number(value) > 0) next[key] = Number(value);
  }
  return next;
}

function excludedCountsFromSummary(summary, fallback, excludedResourceIds) {
  if (summary && (summary.bySyncStatus || typeof summary.softDeleted === "number")) {
    const counts = {};
    const unsynced = summary.bySyncStatus?.temporarily_unsynced ?? 0;
    const returned = summary.bySyncStatus?.reader_returned ?? 0;
    const softDeleted = summary.softDeleted ?? 0;
    if (unsynced) counts.temporarily_unsynced = unsynced;
    if (returned) counts.reader_returned = returned;
    if (softDeleted) counts.soft_deleted = softDeleted;
    return counts;
  }
  const fallbackTotal = Object.values(fallback ?? {}).reduce((total, count) => total + count, 0);
  if (fallback && fallbackTotal === excludedResourceIds.length) {
    return { ...fallback };
  }
  return excludedResourceIds.length ? { temporarily_unsynced: excludedResourceIds.length } : {};
}

function excludedCountsByKindFromSummary(summary, fallback, selectedCounts) {
  if (summary?.byType) {
    const counts = {};
    const image = Math.max(0, (summary.byType.image ?? 0) - selectedCounts.image);
    const commentary = Math.max(0, (summary.byType.commentary ?? 0) - selectedCounts.commentary);
    if (image) counts.image = image;
    if (commentary) counts.commentary = commentary;
    return counts;
  }
  return { ...(fallback ?? {}) };
}

async function writeSyncedPayload(resolvedOutputJsonPath, payload) {
  await mkdir(path.dirname(resolvedOutputJsonPath), { recursive: true });
  const temporaryOutputPath = `${resolvedOutputJsonPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(temporaryOutputPath, `${JSON.stringify(payload)}\n`);
    await rename(temporaryOutputPath, resolvedOutputJsonPath);
  } finally {
    await unlink(temporaryOutputPath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
}

function reportProgress(onProgress, percent, message) {
  onProgress?.({
    message,
    percent,
    phase: "syncing",
  });
}

export async function loadWorkbenchCardsFile(cardsFile) {
  const payload = JSON.parse(await readFile(cardsFile, "utf8"));
  const cards = Array.isArray(payload?.cards) ? payload.cards : null;
  const dropIds = Array.isArray(payload?.dropIds) ? payload.dropIds : [];
  if (!cards && dropIds.length === 0) {
    throw new Error(`Invalid cards file: ${cardsFile}`);
  }
  const resolvedCards = cards ?? [];
  assertUniqueIds(resolvedCards, "workbench detail");
  console.log(`[syncWorkbenchResources] loaded ${resolvedCards.length} cards from cards-file`);
  return {
    cards: resolvedCards,
    dropIds,
    source: "cards-file",
    sourceExclusions: payload.sourceExclusions,
    sourceResourceIds: payload.sourceResourceIds,
    summary: payload.summary,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.patchCardsFile) {
    const source = await loadWorkbenchCardsFile(options.patchCardsFile);
    const result = await patchWorkbenchSyncedResources({
      cards: source.cards,
      dropIds: source.dropIds,
      outputJsonPath: options.outputJsonPath,
      progressFile: options.progressFile,
      publicResourceRoot: options.publicResourceRoot,
      sourceApiBase: options.apiBase,
      sourceExclusions: source.sourceExclusions,
      sourceResourceIds: source.sourceResourceIds,
      summary: source.summary,
    });
    if (options.resultFile) await writeSyncedPayload(options.resultFile, result);
    return;
  }
  const source = options.cardsFile
    ? await loadWorkbenchCardsFile(options.cardsFile)
    : await loadWorkbenchSyncSource(options.apiBase);
  const result = await syncWorkbenchFromCards({
    cards: source.cards,
    outputJsonPath: options.outputJsonPath,
    progressFile: options.progressFile,
    publicResourceRoot: options.publicResourceRoot,
    sourceApiBase: options.apiBase,
    sourceExclusions: source.sourceExclusions,
    summary: source.summary,
  });
  if (options.resultFile) await writeSyncedPayload(options.resultFile, result);
}

function isCliEntry() {
  const entry = process.argv[1];
  return Boolean(entry) && path.resolve(entry) === scriptPath;
}

if (isCliEntry()) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
