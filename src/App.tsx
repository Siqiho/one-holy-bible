import { useEffect, useRef, useState } from "react";
import { ReaderView } from "./components/ReaderView";
import { Workbench } from "./components/Workbench";
import { loadBibleEncyclopediaResources } from "./data/bibleEncyclopediaResources";
import { loadBibleEveryoneImageResources } from "./data/bibleEveryoneImageResources";
import { loadBibleLibrary } from "./data/loadBibleLibrary";
import { mergeResourcesById, mergeStableAndWorkbenchResources } from "./data/resources";
import { sampleResources } from "./data/sampleLibrary";
import { loadWorkbenchSyncedResourcePayload, markWorkbenchCardReaderReturned, syncWorkbenchCards, updateWorkbenchCardReview, type UpdateWorkbenchCardReviewOptions, type WorkbenchReviewStatus, type WorkbenchSyncedResourcePayload } from "./data/workbenchSyncedResources";
import type { BibleVersion } from "./domain/bible";
import type { StudyResource } from "./domain/resources";
import { parseVerseId, verseIdFromParts, type VerseId } from "./domain/verse";
import { defaultWorkbenchLayout } from "./domain/layout";
import "./styles.css";

interface LoadedBibleLibrary {
  cuvBible: BibleVersion;
  kjvBible: BibleVersion;
}

export const viewModeStorageKey = "one-holy-bible-view-mode";

type AppViewMode = "workbench" | "reader";

function storedViewMode(): AppViewMode {
  try {
    const stored = window.localStorage.getItem(viewModeStorageKey);
    if (stored === "workbench") return "workbench";
    return "reader";
  } catch {
    return "reader";
  }
}

function persistViewMode(mode: AppViewMode) {
  try {
    window.localStorage.setItem(viewModeStorageKey, mode);
  } catch {
    // Best effort only; mode still switches for the current session.
  }
}

interface LoadedAppData extends LoadedBibleLibrary {
  stableResources: StudyResource[];
  resources: StudyResource[];
  workbenchSync: WorkbenchSyncedResourcePayload["metadata"];
}

function countBy<T extends string>(values: T[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function appResourceSummary(workbenchSyncedResources: StudyResource[]) {
  return {
    syncStatusCounts: countBy(workbenchSyncedResources.map((resource) => resource.debugMeta?.syncStatus ?? "missing")),
    typeCounts: countBy(workbenchSyncedResources.map((resource) => resource.type)),
    workbenchCount: workbenchSyncedResources.length,
  };
}

function appPayloadSummary(payload: WorkbenchSyncedResourcePayload) {
  return {
    ...appResourceSummary(payload.resources),
    excludedCounts: payload.metadata.excludedCounts,
    excludedCountsByKind: payload.metadata.excludedCountsByKind,
    excludedResourceIds: payload.metadata.excludedResourceIds,
    selectedCounts: payload.metadata.selectedCounts,
    sourceApiBase: payload.metadata.sourceApiBase,
    totalWorkbenchCards: payload.metadata.totalWorkbenchCards,
    workbenchSummary: payload.metadata.workbenchSummary,
  };
}

function logAppInfo(message: string, details: Record<string, unknown>) {
  if (import.meta.env.PROD) return;
  console.info(message, details);
  console.info(message, JSON.stringify(details));
}

function isWorkbenchReviewStatus(value: unknown): value is WorkbenchReviewStatus {
  return value === "needs_review"
    || value === "approved"
    || value === "rejected"
    || value === "deferred"
    || value === "excluded";
}

function compactReview(
  review: UpdateWorkbenchCardReviewOptions["review"],
): UpdateWorkbenchCardReviewOptions["review"] {
  return Object.fromEntries(
    Object.entries(review).filter(([, value]) => value !== undefined),
  ) as UpdateWorkbenchCardReviewOptions["review"];
}

function coverageRangesFromResource(resource: StudyResource) {
  const ranges = resource.debugMeta?.coverageRanges ?? [];
  return ranges
    .filter((range) => typeof range.start === "string")
    .map((range) => ({
      start: range.start,
      ...(typeof range.end === "string" ? { end: range.end } : {}),
    }));
}

function exactCoverageRanges(primaryAnchor: string | null) {
  if (!primaryAnchor) return [];
  return [{ start: primaryAnchor, end: primaryAnchor }];
}

function resourceHasExactDraftPlacement(
  resource: StudyResource,
  draft: { primaryAnchor?: string | null },
) {
  if (draft.primaryAnchor === undefined) return true;

  const expectedAnchor = draft.primaryAnchor || null;
  const actualAnchor = resource.primaryAnchor ?? resource.verses[0] ?? null;
  if (actualAnchor !== expectedAnchor) return false;

  const expectedVerses = expectedAnchor ? [expectedAnchor] : [];
  if (
    resource.verses.length !== expectedVerses.length
    || resource.verses.some((verseId, index) => verseId !== expectedVerses[index])
  ) {
    return false;
  }

  const actualRanges = coverageRangesFromResource(resource);
  const expectedRanges = exactCoverageRanges(expectedAnchor);
  return actualRanges.length === expectedRanges.length
    && actualRanges.every((range, index) => (
      range.start === expectedRanges[index]?.start
      && (range.end ?? range.start) === expectedRanges[index]?.end
    ));
}

function workbenchReviewForResource(
  resource: StudyResource,
  draft: { body: string; title: string; primaryAnchor?: string | null },
) {
  const status = isWorkbenchReviewStatus(resource.debugMeta?.reviewStatus)
    ? resource.debugMeta.reviewStatus
    : "needs_review";
  const primaryAnchor = draft.primaryAnchor !== undefined
    ? draft.primaryAnchor
    : resource.primaryAnchor
      ?? resource.debugMeta?.primaryAnchor
      ?? resource.verses[0]
      ?? null;
  const coverageRanges = draft.primaryAnchor !== undefined
    ? exactCoverageRanges(primaryAnchor)
    : coverageRangesFromResource(resource);

  return compactReview({
    body: draft.body,
    coverageRanges,
    primaryAnchor,
    status,
    summary: resource.type === "image" ? draft.body : resource.summary,
    syncStatus: resource.debugMeta?.syncStatus,
    title: draft.title,
  });
}

function refreshedPayloadStillHasSourceCard(
  payload: WorkbenchSyncedResourcePayload,
  sourceWorkbenchCardId: string,
) {
  return payload.resources.some((resource) => resource.debugMeta?.sourceWorkbenchCardId === sourceWorkbenchCardId);
}

function refreshedPayloadHasEditedResource(
  payload: WorkbenchSyncedResourcePayload,
  sourceWorkbenchCardId: string,
  draft: { body: string; title: string; primaryAnchor?: string | null },
) {
  return payload.resources.some((resource) => (
    resource.debugMeta?.sourceWorkbenchCardId === sourceWorkbenchCardId
    && resource.title === draft.title
    && resource.body === draft.body
    && (
      draft.primaryAnchor === undefined
      || (resource.primaryAnchor ?? resource.verses[0] ?? null) === (draft.primaryAnchor || null)
    )
    && resourceHasExactDraftPlacement(resource, draft)
  ));
}

export default function App() {
  const [appData, setAppData] = useState<LoadedAppData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [viewMode, setViewMode] = useState<AppViewMode>(storedViewMode);
  const [workbenchVerseId, setWorkbenchVerseId] = useState<VerseId>("Gen.1.1");
  const [isRefreshingResources, setIsRefreshingResources] = useState(false);
  const [unsyncingResourceId, setUnsyncingResourceId] = useState<string | null>(null);
  const appDataRef = useRef<LoadedAppData | null>(null);
  const resourceOperationSequenceRef = useRef(0);
  const resourceOperationQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    appDataRef.current = appData;
  }, [appData]);

  function beginResourceOperation() {
    resourceOperationSequenceRef.current += 1;
    setIsRefreshingResources(true);
    return resourceOperationSequenceRef.current;
  }

  function finishResourceOperation(operationSequence: number) {
    if (resourceOperationSequenceRef.current === operationSequence) {
      setIsRefreshingResources(false);
    }
  }

  function applyWorkbenchPayload(
    currentAppData: LoadedAppData,
    workbenchPayload: WorkbenchSyncedResourcePayload,
    operationSequence: number,
  ) {
    const mergedResources = mergeStableAndWorkbenchResources(
      currentAppData.stableResources,
      workbenchPayload.resources,
      workbenchPayload.metadata.excludedResourceIds,
    );
    if (resourceOperationSequenceRef.current === operationSequence) {
      const nextAppData = {
        ...currentAppData,
        resources: mergedResources,
        workbenchSync: workbenchPayload.metadata,
      };
      appDataRef.current = nextAppData;
      setAppData(nextAppData);
      setLoadError(null);
    } else {
      logAppInfo("[app] stale workbench resource refresh ignored", {
        activeSequence: resourceOperationSequenceRef.current,
        operationSequence,
      });
    }
    return mergedResources;
  }

  function enqueueResourceOperation<T>(operation: () => Promise<T>) {
    const queued = resourceOperationQueueRef.current.then(operation, operation);
    resourceOperationQueueRef.current = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }

  useEffect(() => {
    let isMounted = true;
    const startedAt = performance.now();
    logAppInfo("[app] data load started", {
      attempt: loadAttempt + 1,
    });

    Promise.all([
      loadBibleLibrary(),
      loadBibleEncyclopediaResources(),
      loadBibleEveryoneImageResources(),
      loadWorkbenchSyncedResourcePayload(),
    ]).then(([loadedVersions, bibleEncyclopediaResources, bibleEveryoneImageResources, workbenchPayload]) => {
      if (isMounted) {
        const stableResources = mergeResourcesById(
          sampleResources,
          bibleEncyclopediaResources,
          bibleEveryoneImageResources,
        );
        const mergedResources = mergeStableAndWorkbenchResources(
          stableResources,
          workbenchPayload.resources,
          workbenchPayload.metadata.excludedResourceIds,
        );
        setLoadError(null);
        logAppInfo("[app] data load succeeded", {
          bibleEveryoneCount: bibleEveryoneImageResources.length,
          bibleEncyclopediaCount: bibleEncyclopediaResources.length,
          durationMs: Math.round(performance.now() - startedAt),
          mergedCount: mergedResources.length,
          stableCount: stableResources.length,
          ...appPayloadSummary(workbenchPayload),
        });
        setAppData({
          ...loadedVersions,
          stableResources,
          resources: mergedResources,
          workbenchSync: workbenchPayload.metadata,
        });
      }
    }).catch((error: unknown) => {
      console.error("[app] failed to load app data", error);
      logAppInfo("[app] data load failed", {
        attempt: loadAttempt + 1,
        durationMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : String(error),
      });
      if (isMounted) {
        setLoadError("经文库或卡片资源加载失败，请检查本地预览服务后重试。");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [loadAttempt]);

  async function refreshWorkbenchResources() {
    return enqueueResourceOperation(async () => {
    const currentAppData = appDataRef.current;
    if (!currentAppData) return;
    const operationSequence = beginResourceOperation();
    const startedAt = performance.now();
    const previousMergedCount = currentAppData.resources.length;
    logAppInfo("[app] workbench refresh started", {
      previousMergedCount,
    });
    try {
      const workbenchPayload = await loadWorkbenchSyncedResourcePayload({ forceRefresh: true });
      const mergedResources = applyWorkbenchPayload(currentAppData, workbenchPayload, operationSequence);
      logAppInfo("[app] workbench refresh succeeded", {
        durationMs: Math.round(performance.now() - startedAt),
        mergedCount: mergedResources.length,
        previousMergedCount,
        ...appPayloadSummary(workbenchPayload),
      });
    } catch (error: unknown) {
      console.error("[app] failed to refresh workbench synced resources", error);
      logAppInfo("[app] workbench refresh failed", {
        durationMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : String(error),
        previousMergedCount,
      });
      throw error;
    } finally {
      finishResourceOperation(operationSequence);
    }
    });
  }

  async function unsyncWorkbenchResource(resourceId: string) {
    return enqueueResourceOperation(async () => {
    const currentAppData = appDataRef.current;
    if (!currentAppData) return;
    const resource = currentAppData.resources.find((candidate) => candidate.id === resourceId);
    const sourceWorkbenchCardId = resource?.debugMeta?.sourceWorkbenchCardId;
    const sourceApiBase = currentAppData.workbenchSync.sourceApiBase;
    if (!resource || !sourceWorkbenchCardId) {
      throw new Error(`Cannot unsync workbench resource without source card metadata: ${resourceId}`);
    }

    const operationSequence = beginResourceOperation();
    setUnsyncingResourceId(resourceId);
    const startedAt = performance.now();
    logAppInfo("[app] workbench resource unsync started", {
      resourceId,
      sourceApiBase,
      sourceWorkbenchCardId,
    });
    try {
      await markWorkbenchCardReaderReturned({
        cardId: sourceWorkbenchCardId,
        sourceApiBase,
      });
      logAppInfo("[app] workbench resource source marked reader_returned", {
        resourceId,
        sourceWorkbenchCardId,
      });
      const syncResult = await syncWorkbenchCards(sourceApiBase, [sourceWorkbenchCardId], "remove");
      logAppInfo("[app] workbench project sync after unsync succeeded", {
        copiedImageCount: syncResult.copiedImageCount,
        count: syncResult.count,
        resourceId,
        sourceWorkbenchCardId,
      });
      const workbenchPayload = await loadWorkbenchSyncedResourcePayload({ forceRefresh: true });
      if (refreshedPayloadStillHasSourceCard(workbenchPayload, sourceWorkbenchCardId)) {
        throw new Error(`Refreshed workbench payload still includes unsynced source card: ${sourceWorkbenchCardId}`);
      }
      const mergedResources = applyWorkbenchPayload(currentAppData, workbenchPayload, operationSequence);
      logAppInfo("[app] workbench resource unsync succeeded", {
        durationMs: Math.round(performance.now() - startedAt),
        mergedCount: mergedResources.length,
        resourceId,
        sourceWorkbenchCardId,
        ...appPayloadSummary(workbenchPayload),
      });
    } catch (error: unknown) {
      console.error("[app] failed to unsync workbench resource", error);
      logAppInfo("[app] workbench resource unsync failed", {
        durationMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : String(error),
        resourceId,
        sourceWorkbenchCardId,
      });
      throw error;
    } finally {
      finishResourceOperation(operationSequence);
      setUnsyncingResourceId(null);
    }
    });
  }

  async function updateWorkbenchResource(
    resourceId: string,
    draft: { body: string; title: string; primaryAnchor?: string | null },
  ) {
    return enqueueResourceOperation(async () => {
    const currentAppData = appDataRef.current;
    if (!currentAppData) return;
    const resource = currentAppData.resources.find((candidate) => candidate.id === resourceId);
    const sourceWorkbenchCardId = resource?.debugMeta?.sourceWorkbenchCardId;
    const sourceApiBase = currentAppData.workbenchSync.sourceApiBase;
    if (!resource || !sourceWorkbenchCardId) {
      throw new Error(`Cannot update workbench resource without source card metadata: ${resourceId}`);
    }

    const operationSequence = beginResourceOperation();
    const startedAt = performance.now();
    logAppInfo("[app] workbench resource edit sync started", {
      bodyLength: draft.body.length,
      resourceId,
      sourceApiBase,
      sourceWorkbenchCardId,
      title: draft.title,
    });
    try {
      await updateWorkbenchCardReview({
        cardId: sourceWorkbenchCardId,
        review: workbenchReviewForResource(resource, draft),
        sourceApiBase,
      });
      logAppInfo("[app] workbench resource edit source updated", {
        resourceId,
        sourceWorkbenchCardId,
      });
      // Optimistically show the saved text in OHB immediately after Edit write-back.
      setAppData((previous) => {
        if (!previous) return previous;
        const nextResources = previous.resources.map((candidate) => {
          if (candidate.id !== resourceId) return candidate;
          const primaryAnchor = draft.primaryAnchor as VerseId | null | undefined;
          return {
            ...candidate,
            body: draft.body,
            title: draft.title,
            ...(draft.primaryAnchor !== undefined
              ? {
                  debugMeta: {
                    ...candidate.debugMeta,
                    coverageRanges: exactCoverageRanges(primaryAnchor || null) as Array<{ start: VerseId; end: VerseId }>,
                  },
                  primaryAnchor: primaryAnchor || undefined,
                  verses: primaryAnchor ? [primaryAnchor] : candidate.verses,
                }
              : {}),
          };
        });
        const next = { ...previous, resources: nextResources };
        appDataRef.current = next;
        return next;
      });
      try {
        const syncResult = await syncWorkbenchCards(sourceApiBase, [sourceWorkbenchCardId]);
        logAppInfo("[app] workbench project sync after edit succeeded", {
          copiedImageCount: syncResult.copiedImageCount,
          count: syncResult.count,
          resourceId,
          sourceWorkbenchCardId,
        });
        const workbenchPayload = await loadWorkbenchSyncedResourcePayload({ forceRefresh: true });
        if (!refreshedPayloadHasEditedResource(workbenchPayload, sourceWorkbenchCardId, draft)) {
          throw new Error(
            `项目资源已生成，但刷新后的经文定位仍包含旧范围，或未读到刚保存的内容（${sourceWorkbenchCardId}）。请点“刷新资源”或检查同步输出文件是否为 codex-v4。`,
          );
        }
        const mergedResources = applyWorkbenchPayload(currentAppData, workbenchPayload, operationSequence);
        logAppInfo("[app] workbench resource edit sync succeeded", {
          durationMs: Math.round(performance.now() - startedAt),
          mergedCount: mergedResources.length,
          resourceId,
          sourceWorkbenchCardId,
          ...appPayloadSummary(workbenchPayload),
        });
      } catch (syncError: unknown) {
        // Content already written to Edit/Resources; do not discard that success.
        const message = syncError instanceof Error ? syncError.message : String(syncError);
        logAppInfo("[app] workbench resource edit project sync failed after source write", {
          durationMs: Math.round(performance.now() - startedAt),
          error: message,
          resourceId,
          sourceWorkbenchCardId,
        });
        throw new Error(`正文已写回工作台，但项目同步/刷新失败：${message}`);
      }
    } catch (error: unknown) {
      console.error("[app] failed to sync edited workbench resource", error);
      logAppInfo("[app] workbench resource edit sync failed", {
        durationMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : String(error),
        resourceId,
        sourceWorkbenchCardId,
      });
      throw error;
    } finally {
      finishResourceOperation(operationSequence);
    }
    });
  }

  if (loadError) {
    return (
      <main className="app-loading" role="alert">
        <p>{loadError}</p>
        <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
          重新加载经文库和卡片
        </button>
      </main>
    );
  }

  if (!appData) {
    return <main className="app-loading" role="status">正在加载经文库和卡片资源...</main>;
  }

  function switchViewMode(mode: AppViewMode) {
    setViewMode(mode);
    persistViewMode(mode);
  }

  if (viewMode === "reader") {
    return (
      <ReaderView
        versions={[appData.cuvBible, appData.kjvBible]}
        resources={appData.resources}
        initialPosition={parseVerseId(workbenchVerseId)}
        onExitReader={(position) => {
          setWorkbenchVerseId(verseIdFromParts(position.book, position.chapter, position.verse));
          switchViewMode("workbench");
        }}
      />
    );
  }

  return (
    <Workbench
      isRefreshingResources={isRefreshingResources}
      versions={[appData.cuvBible, appData.kjvBible]}
      resources={appData.resources}
      initialVerseId={workbenchVerseId}
      initialLayout={defaultWorkbenchLayout}
      onRefreshResources={refreshWorkbenchResources}
      onUnsyncResource={unsyncWorkbenchResource}
      onUpdateWorkbenchResource={updateWorkbenchResource}
      unsyncingResourceId={unsyncingResourceId}
      onOpenReader={(verseId) => {
        setWorkbenchVerseId(verseId);
        switchViewMode("reader");
      }}
    />
  );
}
