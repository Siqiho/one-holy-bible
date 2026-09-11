import type { StudyResource } from "../domain/resources";
import workbenchSyncedResourcesUrl from "./generated/workbenchSyncedResources-v4.json?url";

interface WorkbenchSyncedResourceCounts {
  commentary: number;
  image: number;
  total: number;
}

interface WorkbenchSourceSummary {
  byReviewStatus?: Record<string, number>;
  byRiskLevel?: Record<string, number>;
  bySyncStatus?: Record<string, number>;
  byType?: Record<string, number>;
  softDeleted?: number;
  total: number;
}

export interface WorkbenchSyncedResourcePayload {
  metadata: {
    copiedImageCount: number;
    excludedCounts: Record<string, number>;
    excludedCountsByKind: Record<string, number>;
    excludedResourceIds: string[];
    generatedAt: string;
    selectedCounts: WorkbenchSyncedResourceCounts;
    sourceApiBase: string;
    sourceWorkbenchPath: string;
    totalWorkbenchCards: number;
    workbenchSummary?: WorkbenchSourceSummary;
  };
  resources: StudyResource[];
}

let cachedPayload: Promise<WorkbenchSyncedResourcePayload> | null = null;

interface LoadWorkbenchSyncedResourceOptions {
  forceRefresh?: boolean;
}

interface LoadWorkbenchSyncedResourcePayloadOptions extends LoadWorkbenchSyncedResourceOptions {
  payloadLoader?: () => Promise<WorkbenchSyncedResourcePayload>;
}

export interface MarkWorkbenchCardSyncStatusOptions {
  cardId: string;
  sourceApiBase: string;
}

export type MarkWorkbenchCardTemporarilyUnsyncedOptions = MarkWorkbenchCardSyncStatusOptions;

export type WorkbenchReviewStatus = "needs_review" | "approved" | "rejected" | "deferred" | "excluded";

export interface UpdateWorkbenchCardReviewOptions {
  cardId: string;
  review: {
    body?: string;
    coverageRanges?: Array<{ start: string; end?: string }>;
    notes?: string;
    primaryAnchor?: string | null;
    status: WorkbenchReviewStatus;
    summary?: string;
    syncStatus?: string;
    title?: string;
  };
  sourceApiBase: string;
}

export interface WorkbenchProjectSyncResult {
  ok: boolean;
  count?: number;
  copiedImageCount?: number;
  outputJsonPath?: string;
  patchedIds?: string[];
  publicResourceRoot?: string;
  stdout?: string;
  stderr?: string;
}

export function resetWorkbenchSyncedResourceCache() {
  cachedPayload = null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateWorkbenchSyncedResourcePayload(
  payload: WorkbenchSyncedResourcePayload,
): WorkbenchSyncedResourcePayload {
  if (!isRecord(payload)) {
    throw new Error("Invalid workbench synced resources payload: expected object");
  }

  if (!Array.isArray(payload.resources)) {
    throw new Error("Invalid workbench synced resources payload: resources must be an array");
  }

  const metadata = payload.metadata;
  if (!isRecord(metadata) || !isRecord(metadata.selectedCounts)) {
    throw new Error("Invalid workbench synced resources payload: selected counts are missing");
  }

  const selectedCounts = metadata.selectedCounts as Partial<WorkbenchSyncedResourceCounts>;
  const excludedCounts = isRecord(metadata.excludedCounts) ? metadata.excludedCounts : {};
  const excludedCountsByKind = isRecord(metadata.excludedCountsByKind) ? metadata.excludedCountsByKind : {};
  const excludedTotal = Object.values(excludedCounts).reduce((total, value) => (
    total + (typeof value === "number" ? value : 0)
  ), 0);
  const totalWorkbenchCards = typeof metadata.totalWorkbenchCards === "number" ? metadata.totalWorkbenchCards : 0;
  const actualImageCount = payload.resources.filter((resource) => resource.type === "image").length;
  const actualCommentaryCount = payload.resources.filter((resource) => resource.type === "commentary").length;
  const workbenchSummary = isRecord(metadata.workbenchSummary) ? metadata.workbenchSummary : null;
  const selectedResourceIds = payload.resources.map((resource) => resource.id);
  const uniqueSelectedResourceIds = new Set(selectedResourceIds);

  if (uniqueSelectedResourceIds.size !== selectedResourceIds.length) {
    throw new Error("Invalid workbench synced resources payload: duplicate selected resource id");
  }

  const excludedResourceIds = metadata.excludedResourceIds;
  if (excludedResourceIds === undefined) {
    throw new Error("Invalid workbench synced resources payload: excludedResourceIds is required");
  }
  if (!Array.isArray(excludedResourceIds) || excludedResourceIds.some((id) => (
    typeof id !== "string" || id.trim().length === 0
  ))) {
    throw new Error("Invalid workbench synced resources payload: exclusion tombstones must be nonempty strings");
  }
  if (new Set(excludedResourceIds).size !== excludedResourceIds.length) {
    throw new Error("Invalid workbench synced resources payload: duplicate exclusion tombstone");
  }
  if (excludedResourceIds.some((id, index) => index > 0 && excludedResourceIds[index - 1] > id)) {
    throw new Error("Invalid workbench synced resources payload: exclusion tombstones must be sorted");
  }
  if (excludedResourceIds.length !== excludedTotal) {
    throw new Error("Invalid workbench synced resources payload: tombstone count does not match excluded count");
  }
  if (excludedResourceIds.some((id) => uniqueSelectedResourceIds.has(id))) {
    throw new Error("Invalid workbench synced resources payload: selected resource overlaps exclusion tombstone");
  }

  if (payload.resources.length === 0 && totalWorkbenchCards === 0 && excludedTotal === 0) {
    throw new Error("Empty workbench synced resources payload");
  }

  if (selectedCounts.total !== payload.resources.length) {
    throw new Error(
      `Invalid workbench synced resources payload: selected total ${selectedCounts.total} does not match ${payload.resources.length} resources`,
    );
  }

  if (selectedCounts.image !== actualImageCount || selectedCounts.commentary !== actualCommentaryCount) {
    throw new Error(
      `Invalid workbench synced resources payload: selected type counts do not match resources`,
    );
  }

  if (payload.resources.length + excludedTotal !== totalWorkbenchCards) {
    throw new Error(
      `Invalid workbench synced resources payload: selected and excluded totals do not match workbench total`,
    );
  }

  if (workbenchSummary && typeof workbenchSummary.total === "number" && workbenchSummary.total !== totalWorkbenchCards) {
    throw new Error(
      `Invalid workbench synced resources payload: workbench summary total does not match metadata total`,
    );
  }

  const summaryBySyncStatus = isRecord(workbenchSummary?.bySyncStatus) ? workbenchSummary.bySyncStatus : null;
  for (const excludedSyncStatus of ["temporarily_unsynced", "reader_returned"] as const) {
    const summaryCount = typeof summaryBySyncStatus?.[excludedSyncStatus] === "number"
      ? summaryBySyncStatus[excludedSyncStatus]
      : null;
    const excludedCount = typeof excludedCounts[excludedSyncStatus] === "number"
      ? excludedCounts[excludedSyncStatus]
      : 0;
    if (summaryCount !== null && summaryCount !== excludedCount) {
      throw new Error(
        excludedSyncStatus === "temporarily_unsynced"
          ? `Invalid workbench synced resources payload: unsynced summary count does not match excluded count`
          : `Invalid workbench synced resources payload: reader_returned summary count does not match excluded count`,
      );
    }
  }

  const summarySoftDeleted = typeof workbenchSummary?.softDeleted === "number" ? workbenchSummary.softDeleted : null;
  const excludedSoftDeleted = typeof excludedCounts.soft_deleted === "number" ? excludedCounts.soft_deleted : 0;
  if (summarySoftDeleted !== null && summarySoftDeleted !== excludedSoftDeleted) {
    throw new Error(
      `Invalid workbench synced resources payload: soft-deleted summary count does not match excluded count`,
    );
  }

  for (const resource of payload.resources) {
    const syncStatus = resource.debugMeta?.syncStatus;
    if (syncStatus === "temporarily_unsynced" || syncStatus === "reader_returned") {
      throw new Error(
        `Invalid workbench synced resources payload: resource ${resource.id} has excluded sync status ${syncStatus}`,
      );
    }
  }

  const summaryByType = isRecord(workbenchSummary?.byType) ? workbenchSummary.byType : null;
  const summaryImageCount = typeof summaryByType?.image === "number" ? summaryByType.image : null;
  const excludedImageCount = typeof excludedCountsByKind.image === "number" ? excludedCountsByKind.image : 0;
  if (summaryImageCount !== null && summaryImageCount !== actualImageCount + excludedImageCount) {
    throw new Error(
      `Invalid workbench synced resources payload: image summary count does not match selected and excluded counts`,
    );
  }

  const summaryCommentaryCount = typeof summaryByType?.commentary === "number" ? summaryByType.commentary : null;
  const excludedCommentaryCount = typeof excludedCountsByKind.commentary === "number" ? excludedCountsByKind.commentary : 0;
  if (summaryCommentaryCount !== null && summaryCommentaryCount !== actualCommentaryCount + excludedCommentaryCount) {
    throw new Error(
      `Invalid workbench synced resources payload: commentary summary count does not match selected and excluded counts`,
    );
  }

  return payload;
}

export function loadWorkbenchSyncedResourcePayload(
  options: LoadWorkbenchSyncedResourcePayloadOptions = {},
): Promise<WorkbenchSyncedResourcePayload> {
  if (options.forceRefresh) {
    resetWorkbenchSyncedResourceCache();
  }

  const resourceUrl = cacheBustedUrl(workbenchSyncedResourcesUrl, options.forceRefresh);
  if (options.forceRefresh) {
    console.info("[app] refreshing workbench synced resources payload", {
      cache: "no-store",
      resourceUrl,
    });
  }

  const payloadLoader = options.payloadLoader
    ?? (import.meta.env.MODE === "test"
      ? () => import("./generated/workbenchSyncedResources-v4.json")
        .then((module) => module.default as unknown as WorkbenchSyncedResourcePayload)
      : () => fetch(resourceUrl, {
      cache: options.forceRefresh ? "no-store" : "default",
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load workbench synced resources JSON: ${response.status}`);
      }
      return await response.json() as WorkbenchSyncedResourcePayload;
    }));

  cachedPayload ??= payloadLoader()
    .then((payload) => validateWorkbenchSyncedResourcePayload(payload))
    .catch((error: unknown) => {
      cachedPayload = null;
      throw error;
    });

  return cachedPayload;
}

export async function loadWorkbenchSyncedResources(
  options: LoadWorkbenchSyncedResourceOptions = {},
): Promise<StudyResource[]> {
  const payload = await loadWorkbenchSyncedResourcePayload(options);
  return payload.resources;
}

export function cacheBustedUrl(url: string, forceRefresh?: boolean) {
  if (!forceRefresh) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}refresh=${Date.now()}`;
}

async function markWorkbenchCardSyncStatus(
  options: MarkWorkbenchCardSyncStatusOptions,
  syncStatus: "temporarily_unsynced" | "reader_returned",
  failureFallback: string,
) {
  const response = await fetchWorkbenchApi(
    options.sourceApiBase,
    `/api/card/${encodeURIComponent(options.cardId)}/sync-status`,
    {
      body: JSON.stringify({ syncStatus }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    },
    "更新卡片同步状态",
  );

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, failureFallback));
  }
}

export async function markWorkbenchCardTemporarilyUnsynced(
  options: MarkWorkbenchCardSyncStatusOptions,
) {
  await markWorkbenchCardSyncStatus(
    options,
    "temporarily_unsynced",
    "Failed to mark workbench card temporarily unsynced",
  );
}

export async function markWorkbenchCardReaderReturned(
  options: MarkWorkbenchCardSyncStatusOptions,
) {
  await markWorkbenchCardSyncStatus(
    options,
    "reader_returned",
    "Failed to mark workbench card reader returned",
  );
}

export async function updateWorkbenchCardReview(options: UpdateWorkbenchCardReviewOptions) {
  const response = await fetchWorkbenchApi(
    options.sourceApiBase,
    `/api/review/${encodeURIComponent(options.cardId)}`,
    {
      body: JSON.stringify(options.review),
      headers: { "content-type": "application/json" },
      method: "PUT",
    },
    "保存卡片修改",
  );

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response, "Failed to update workbench card review"));
  }
}

export async function syncWorkbenchProjectResources(sourceApiBase: string): Promise<WorkbenchProjectSyncResult> {
  const response = await fetchWorkbenchApi(
    sourceApiBase,
    "/api/sync",
    { method: "POST" },
    "同步到 OHB 项目",
  );
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(responseErrorBodyMessage(body) ?? `Failed to sync workbench project resources: ${response.status}`);
  }

  return body as WorkbenchProjectSyncResult;
}

export async function syncWorkbenchCards(
  sourceApiBase: string,
  ids: string[],
  action: "upsert" | "remove" | "purge" = "upsert",
): Promise<WorkbenchProjectSyncResult> {
  const response = await fetchWorkbenchApi(
    sourceApiBase,
    "/api/sync/cards",
    {
      body: JSON.stringify({ action, ids }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
    action === "purge" ? "从阅读台永久移除卡片" : action === "remove" ? "从阅读台拔出卡片" : "写入阅读台",
  );
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(responseErrorBodyMessage(body) ?? `Failed to patch workbench cards: ${response.status}`);
  }

  return body as WorkbenchProjectSyncResult;
}

function normalizedApiBase(sourceApiBase: string) {
  return sourceApiBase.replace(/\/+$/, "");
}

function networkFailureMessage(sourceApiBase: string, action: string, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  const looksLikeNetworkFailure =
    error instanceof TypeError
    || /failed to fetch|networkerror|load failed|econnrefused|fetch failed/i.test(detail);
  if (!looksLikeNetworkFailure) {
    return detail;
  }
  return (
    `${action}失败：无法连接 Edit API（${normalizedApiBase(sourceApiBase)}）。` +
    `请先启动卡片工作台（默认 npm run dev，端口 5179/5127），再重试。原始错误：${detail}`
  );
}

async function fetchWorkbenchApi(sourceApiBase: string, path: string, init: RequestInit, action: string) {
  try {
    return await fetch(`${normalizedApiBase(sourceApiBase)}${path}`, init);
  } catch (error) {
    throw new Error(networkFailureMessage(sourceApiBase, action, error));
  }
}

async function responseErrorMessage(response: Response, fallback: string) {
  const body = await parseResponseBody(response);
  return responseErrorBodyMessage(body) ?? `${fallback}: ${response.status}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await response.json().catch(() => null);
  }
  return await response.text().catch(() => "");
}

function responseErrorBodyMessage(body: unknown) {
  if (isRecord(body) && typeof body.error === "string") return body.error;
  if (typeof body === "string" && body.trim()) return body;
  return null;
}
