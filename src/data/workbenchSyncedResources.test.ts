import { afterEach, describe, expect, it, vi } from "vitest";

import { cacheBustedUrl, loadWorkbenchSyncedResourcePayload, loadWorkbenchSyncedResources, markWorkbenchCardReaderReturned, markWorkbenchCardTemporarilyUnsynced, resetWorkbenchSyncedResourceCache, syncWorkbenchCards, syncWorkbenchProjectResources, updateWorkbenchCardReview, validateWorkbenchSyncedResourcePayload } from "./workbenchSyncedResources";

describe("workbenchSyncedResources", () => {
  afterEach(() => {
    resetWorkbenchSyncedResourceCache();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("loads the workbench synced cards as the app-facing resource set", async () => {
    const payload = await loadWorkbenchSyncedResourcePayload();
    const resources = await loadWorkbenchSyncedResources();
    const imageCount = resources.filter((resource) => resource.type === "image").length;
    const commentaryCount = resources.filter((resource) => resource.type === "commentary").length;
    const excludedTotal = Object.values(payload.metadata.excludedCounts).reduce((total, count) => total + count, 0);

    expect(payload.metadata.sourceApiBase).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(payload.metadata.sourceWorkbenchPath).toBe("/Users/simon/OHB/Edit");
    expect(payload.metadata.excludedResourceIds).toHaveLength(excludedTotal);
    expect(payload.metadata.selectedCounts).toEqual({
      image: imageCount,
      commentary: commentaryCount,
      total: resources.length,
    });
    expect(payload.metadata.totalWorkbenchCards).toBe(resources.length + excludedTotal);
    expect(payload.metadata.workbenchSummary?.total).toBe(payload.metadata.totalWorkbenchCards);
    expect(payload.metadata.workbenchSummary?.bySyncStatus?.temporarily_unsynced ?? 0).toBe(
      payload.metadata.excludedCounts.temporarily_unsynced ?? 0,
    );
    expect(payload.metadata.workbenchSummary?.bySyncStatus?.reader_returned ?? 0).toBe(
      payload.metadata.excludedCounts.reader_returned ?? 0,
    );
    expect(payload.metadata.workbenchSummary?.softDeleted ?? 0).toBe(
      payload.metadata.excludedCounts.soft_deleted ?? 0,
    );
    expect(payload.metadata.workbenchSummary?.byType?.image).toBe(
      imageCount + (payload.metadata.excludedCountsByKind.image ?? 0),
    );
    expect(payload.metadata.workbenchSummary?.byType?.commentary).toBe(
      commentaryCount + (payload.metadata.excludedCountsByKind.commentary ?? 0),
    );
    expect(resources).toHaveLength(payload.metadata.selectedCounts.total);
    expect(resources).toBe(payload.resources);
    expect(new Set(resources.map((resource) => resource.id)).size).toBe(resources.length);
    expect(resources.some((resource) => resource.id === "cmc-lam-1-2")).toBe(false);
  }, 15_000);

  it("keeps every synced resource inside the workbench synced image or text scope", async () => {
    const resources = await loadWorkbenchSyncedResources();
    const imageResources = resources.filter((resource) => resource.type === "image");
    const commentaryResources = resources.filter((resource) => resource.type === "commentary");
    const payload = await loadWorkbenchSyncedResourcePayload();

    expect(imageResources).toHaveLength(payload.metadata.selectedCounts.image);
    expect(commentaryResources).toHaveLength(payload.metadata.selectedCounts.commentary);
    expect(resources.every((resource) => resource.type === "image" || resource.type === "commentary")).toBe(true);

    for (const resource of imageResources) {
      expect(resource.assetPath, resource.id).toMatch(/^\/resources\/workbench\/.+\.png$/);
      expect(resource.debugMeta?.storedAbsolutePath, resource.id).toMatch(
        /^\/Users\/simon\/OHB\/one-holy-bible\/public\/resources\/workbench\/.+\.png$/,
      );
      expect(resource.debugMeta?.sourceAssetPath, resource.id).toMatch(/^\/Users\/simon\/OHB\/Resources\/.+\.png$/);
    }

    for (const resource of resources) {
      if (resource.type === "commentary") {
        expect(resource.primaryAnchor, resource.id).toBeTruthy();
      }
      expect(resource.debugMeta?.syncStatus, resource.id).not.toBe("temporarily_unsynced");
      expect(resource.debugMeta?.syncStatus, resource.id).not.toBe("reader_returned");
    }
  });

  it("carries workbench audit metadata needed to trace synced cards back to the workbench source", async () => {
    const resources = await loadWorkbenchSyncedResources();

    expect(resources.find((resource) => resource.id === "document-image-01-创世记-codex-pdf-p005-img000")).toMatchObject({
      type: "image",
      assetPath: "/resources/workbench/01_创世记/document-image-01-创世记-codex-pdf-p005-img000.png",
      debugMeta: {
        sourceWorkbenchPath: "/Users/simon/OHB/Edit",
        sourceRawKind: "image",
        syncSelection: "workbench-image",
      },
    });

    // A user may retire an entire commentary source. Traceability must not
    // depend on keeping a deleted CMC card in the live projection.
    const commentary = resources.find((resource) => resource.type === "commentary");
    expect(commentary).toMatchObject({
      type: "commentary",
      primaryAnchor: expect.any(String),
      debugMeta: {
        sourceWorkbenchPath: "/Users/simon/OHB/Edit",
        sourceLedgerPath: expect.stringContaining("/Users/simon/OHB/Resources/"),
        syncSelection: "workbench-commentary",
      },
    });
  });

  it("accepts an empty synced payload when every workbench card has been excluded", () => {
    const payload = validateWorkbenchSyncedResourcePayload({
      metadata: {
        copiedImageCount: 0,
        excludedCounts: {
          temporarily_unsynced: 1,
        },
        excludedCountsByKind: {
          commentary: 1,
        },
        excludedResourceIds: ["excluded-card"],
        generatedAt: "2026-05-30T08:30:00.000Z",
        selectedCounts: {
          commentary: 0,
          image: 0,
          total: 0,
        },
        sourceApiBase: "http://127.0.0.1:5179",
        sourceWorkbenchPath: "/Users/simon/OHB/Edit",
        totalWorkbenchCards: 1,
      },
      resources: [],
    });

    expect(payload.resources).toEqual([]);
    expect(payload.metadata.selectedCounts.total).toBe(0);
  });

  it("rejects a direct non-legacy payload when exclusion tombstones are missing", () => {
    const payload = tombstonePayloadWithoutExcludedResourceIds();

    expect(() => validateWorkbenchSyncedResourcePayload(payload as never)).toThrow(
      /excludedResourceIds.*required/i,
    );
  });

  it("rejects a custom-loaded payload when exclusion tombstones are missing", async () => {
    const payload = tombstonePayloadWithoutExcludedResourceIds();

    await expect(loadWorkbenchSyncedResourcePayload({
      payloadLoader: async () => payload as never,
    })).rejects.toThrow(/excludedResourceIds.*required/i);
  });

  it("rejects a missing tombstone field on a force-refresh load", async () => {
    const payload = tombstonePayloadWithoutExcludedResourceIds();

    await expect(loadWorkbenchSyncedResourcePayload({
      forceRefresh: true,
      payloadLoader: async () => payload as never,
    })).rejects.toThrow(
      /excludedResourceIds.*required/i,
    );
  });

  it("accepts sorted tombstones that exactly account for excluded cards and do not overlap selected resources", () => {
    const payload = validateWorkbenchSyncedResourcePayload(tombstonePayload());

    expect(payload.metadata.excludedResourceIds).toEqual([
      "stable-hidden",
      "stable-returned",
    ]);
  });

  it("rejects duplicate exclusion tombstones", () => {
    const payload = tombstonePayload();
    payload.metadata.excludedResourceIds = ["stable-hidden", "stable-hidden"];

    expect(() => validateWorkbenchSyncedResourcePayload(payload)).toThrow(/duplicate exclusion tombstone/i);
  });

  it("rejects unsorted exclusion tombstones", () => {
    const payload = tombstonePayload();
    payload.metadata.excludedResourceIds = ["stable-returned", "stable-hidden"];

    expect(() => validateWorkbenchSyncedResourcePayload(payload)).toThrow(/sorted/i);
  });

  it("rejects exclusion tombstones whose count does not equal excluded reason counts", () => {
    const payload = tombstonePayload();
    payload.metadata.excludedResourceIds = ["stable-hidden"];

    expect(() => validateWorkbenchSyncedResourcePayload(payload)).toThrow(/tombstone count.*excluded count/i);
  });

  it("rejects exclusion tombstones that overlap a selected resource id", () => {
    const payload = tombstonePayload();
    payload.metadata.excludedResourceIds = ["selected-card", "stable-hidden"];

    expect(() => validateWorkbenchSyncedResourcePayload(payload)).toThrow(/selected resource.*exclusion tombstone/i);
  });

  it("rejects non-string or empty exclusion tombstones", () => {
    const payload = tombstonePayload();
    payload.metadata.excludedResourceIds = [""];

    expect(() => validateWorkbenchSyncedResourcePayload(payload)).toThrow(/nonempty strings/i);
  });

  it("rejects duplicate selected resource ids", () => {
    const payload = tombstonePayload();
    payload.metadata.excludedCounts = {};
    payload.metadata.excludedCountsByKind = {};
    payload.metadata.excludedResourceIds = [];
    payload.metadata.selectedCounts = { commentary: 2, image: 0, total: 2 };
    payload.metadata.totalWorkbenchCards = 2;
    payload.resources = [payload.resources[0], { ...payload.resources[0] }];

    expect(() => validateWorkbenchSyncedResourcePayload(payload)).toThrow(/duplicate selected resource id/i);
  });

  it("rejects payloads whose selected counts do not match the resources", () => {
    const currentPayload = tombstonePayload();

    expect(() => validateWorkbenchSyncedResourcePayload({
      ...currentPayload,
      metadata: {
        ...currentPayload.metadata,
        selectedCounts: {
          ...currentPayload.metadata.selectedCounts,
          total: currentPayload.resources.length + 1,
        },
      },
    })).toThrow(/selected total/i);
  });

  it("clears a rejected cached payload so the next load can retry", async () => {
    const validPayload = tombstonePayload();
    const invalidPayload = {
      ...validPayload,
      metadata: {
        ...validPayload.metadata,
        selectedCounts: {
          ...validPayload.metadata.selectedCounts,
          total: validPayload.resources.length + 1,
        },
      },
    };
    const payloadLoader = vi.fn()
      .mockResolvedValueOnce(invalidPayload)
      .mockResolvedValueOnce(validPayload);

    await expect(loadWorkbenchSyncedResourcePayload({ payloadLoader })).rejects.toThrow(/selected total/i);
    await expect(loadWorkbenchSyncedResourcePayload({ payloadLoader })).resolves.toBe(validPayload);
    expect(payloadLoader).toHaveBeenCalledTimes(2);
  });

  it("can clear the cached payload before a manual refresh", async () => {
    const firstPayload = await loadWorkbenchSyncedResourcePayload();

    resetWorkbenchSyncedResourceCache();

    const nextPayload = await loadWorkbenchSyncedResourcePayload();
    expect(nextPayload).toStrictEqual(firstPayload);
  });

  it("adds a refresh cache buster only when a manual refresh is requested", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T15:30:00.000Z"));

    expect(cacheBustedUrl("/assets/workbenchSyncedResources.json", false)).toBe(
      "/assets/workbenchSyncedResources.json",
    );
    expect(cacheBustedUrl("/assets/workbenchSyncedResources.json", true)).toBe(
      "/assets/workbenchSyncedResources.json?refresh=1779377400000",
    );
    expect(cacheBustedUrl("/assets/workbenchSyncedResources.json?url", true)).toBe(
      "/assets/workbenchSyncedResources.json?url&refresh=1779377400000",
    );
  });

  it("marks a source workbench card temporarily unsynced through the Edit API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock);

    await markWorkbenchCardTemporarilyUnsynced({
      cardId: "cmc-gen-1-1",
      sourceApiBase: "http://127.0.0.1:5179/",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:5179/api/card/cmc-gen-1-1/sync-status",
      {
        body: JSON.stringify({ syncStatus: "temporarily_unsynced" }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      },
    );
  });

  it("throws the Edit API error text when marking a workbench card temporarily unsynced fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Card not found" }), {
      headers: { "content-type": "application/json" },
      status: 404,
    })));

    await expect(markWorkbenchCardTemporarilyUnsynced({
      cardId: "missing-card",
      sourceApiBase: "http://127.0.0.1:5179",
    })).rejects.toThrow("Card not found");
  });

  it("marks a source workbench card reader_returned through the Edit API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock);

    await markWorkbenchCardReaderReturned({
      cardId: "cmc-gen-1-1",
      sourceApiBase: "http://127.0.0.1:5179/",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:5179/api/card/cmc-gen-1-1/sync-status",
      {
        body: JSON.stringify({ syncStatus: "reader_returned" }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      },
    );
  });

  it("throws the Edit API error text when marking a workbench card reader_returned fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Card not found" }), {
      headers: { "content-type": "application/json" },
      status: 404,
    })));

    await expect(markWorkbenchCardReaderReturned({
      cardId: "missing-card",
      sourceApiBase: "http://127.0.0.1:5179",
    })).rejects.toThrow("Card not found");
  });

  it("rejects payloads whose reader_returned summary count does not match excluded count", () => {
    expect(() => validateWorkbenchSyncedResourcePayload({
      metadata: {
        copiedImageCount: 0,
        excludedCounts: {
          reader_returned: 1,
        },
        excludedCountsByKind: {
          commentary: 1,
        },
        excludedResourceIds: ["returned-card"],
        generatedAt: "2026-05-30T08:30:00.000Z",
        selectedCounts: {
          commentary: 0,
          image: 0,
          total: 0,
        },
        sourceApiBase: "http://127.0.0.1:5179",
        sourceWorkbenchPath: "/Users/simon/OHB/Edit",
        totalWorkbenchCards: 1,
        workbenchSummary: {
          bySyncStatus: {
            reader_returned: 2,
          },
          total: 1,
        },
      },
      resources: [],
    })).toThrow(/reader_returned summary count does not match excluded count/i);
  });

  it("rejects payloads whose soft-deleted summary count does not match excluded count", () => {
    expect(() => validateWorkbenchSyncedResourcePayload({
      metadata: {
        copiedImageCount: 0,
        excludedCounts: { soft_deleted: 1 },
        excludedCountsByKind: { commentary: 1 },
        excludedResourceIds: ["soft-deleted-card"],
        generatedAt: "2026-07-16T08:30:00.000Z",
        selectedCounts: { commentary: 0, image: 0, total: 0 },
        sourceApiBase: "http://127.0.0.1:5127",
        sourceWorkbenchPath: "/Users/simon/OHB/Edit",
        totalWorkbenchCards: 1,
        workbenchSummary: { softDeleted: 2, total: 1 },
      },
      resources: [],
    })).toThrow(/soft-deleted summary count does not match excluded count/i);
  });

  it("rejects payloads that include resources marked temporarily_unsynced or reader_returned", () => {
    expect(() => validateWorkbenchSyncedResourcePayload({
      metadata: {
        copiedImageCount: 0,
        excludedCounts: {},
        excludedCountsByKind: {},
        excludedResourceIds: [],
        generatedAt: "2026-05-30T08:30:00.000Z",
        selectedCounts: {
          commentary: 1,
          image: 0,
          total: 1,
        },
        sourceApiBase: "http://127.0.0.1:5179",
        sourceWorkbenchPath: "/Users/simon/OHB/Edit",
        totalWorkbenchCards: 1,
      },
      resources: [{
        id: "returned-card",
        title: "退回卡片",
        type: "commentary",
        verses: ["Gen.1.1"],
        body: "body",
        debugMeta: {
          syncStatus: "reader_returned",
        },
      }],
    })).toThrow(/excluded sync status/i);
  });

  it("writes an edited OHB resource draft back through the Edit review API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock);

    await updateWorkbenchCardReview({
      cardId: "cmc-gen-1-1",
      review: {
        body: "OHB 修改后的正文",
        coverageRanges: [{ start: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        status: "approved",
        title: "OHB 修改后的标题",
      },
      sourceApiBase: "http://127.0.0.1:5179/",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:5179/api/review/cmc-gen-1-1",
      {
        body: JSON.stringify({
          body: "OHB 修改后的正文",
          coverageRanges: [{ start: "Gen.1.1" }],
          primaryAnchor: "Gen.1.1",
          status: "approved",
          title: "OHB 修改后的标题",
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      },
    );
  });

  it("explains that the Edit API is offline when review write-back fails to fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(updateWorkbenchCardReview({
      cardId: "cmc-gen-1-1",
      review: {
        body: "OHB 修改后的正文",
        coverageRanges: [{ start: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        status: "approved",
        title: "OHB 修改后的标题",
      },
      sourceApiBase: "http://127.0.0.1:5127",
    })).rejects.toThrow(/无法连接 Edit API（http:\/\/127\.0\.0\.1:5127）/);
  });

  it("throws the Edit API error text when writing an edited resource draft fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Resources 写回失败" }), {
      headers: { "content-type": "application/json" },
      status: 500,
    })));

    await expect(updateWorkbenchCardReview({
      cardId: "cmc-gen-1-1",
      review: {
        body: "OHB 修改后的正文",
        coverageRanges: [{ start: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        status: "approved",
        title: "OHB 修改后的标题",
      },
      sourceApiBase: "http://127.0.0.1:5179",
    })).rejects.toThrow("Resources 写回失败");
  });

  it("syncs project resources through the Edit API and returns the parsed result", async () => {
    const syncResult = {
      ok: true,
      count: 7,
      copiedImageCount: 3,
      outputJsonPath: "/Users/simon/OHB/one-holy-bible/src/data/generated/workbenchSyncedResources.json",
      publicResourceRoot: "/Users/simon/OHB/one-holy-bible/public/resources/workbench",
      stdout: "synced",
      stderr: "",
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(syncResult), {
      headers: { "content-type": "application/json" },
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(syncWorkbenchProjectResources("http://127.0.0.1:5179/")).resolves.toEqual(syncResult);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5179/api/sync", {
      method: "POST",
    });
  });

  it("incrementally upserts selected cards through the Edit API", async () => {
    const syncResult = {
      ok: true,
      count: 19984,
      copiedImageCount: 1,
      patchedIds: ["cmc-gen-1-1"],
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(syncResult), {
      headers: { "content-type": "application/json" },
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(syncWorkbenchCards("http://127.0.0.1:5127/", ["cmc-gen-1-1"])).resolves.toEqual(syncResult);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5127/api/sync/cards", {
      body: JSON.stringify({ action: "upsert", ids: ["cmc-gen-1-1"] }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  });

  it("incrementally removes selected cards through the Edit API", async () => {
    const syncResult = {
      ok: true,
      count: 19982,
      copiedImageCount: 0,
      patchedIds: ["cmc-gen-1-1"],
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(syncResult), {
      headers: { "content-type": "application/json" },
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(syncWorkbenchCards("http://127.0.0.1:5127/", ["cmc-gen-1-1"], "remove")).resolves.toEqual(syncResult);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:5127/api/sync/cards", {
      body: JSON.stringify({ action: "remove", ids: ["cmc-gen-1-1"] }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  });
});

function tombstonePayload() {
  return {
    metadata: {
      copiedImageCount: 0,
      excludedCounts: {
        reader_returned: 1,
        temporarily_unsynced: 1,
      },
      excludedCountsByKind: {
        commentary: 2,
      },
      excludedResourceIds: [
        "stable-hidden",
        "stable-returned",
      ],
      generatedAt: "2026-07-30T08:30:00.000Z",
      selectedCounts: {
        commentary: 1,
        image: 0,
        total: 1,
      },
      sourceApiBase: "http://127.0.0.1:5179",
      sourceWorkbenchPath: "/Users/simon/OHB/Edit",
      totalWorkbenchCards: 3,
    },
    resources: [{
      id: "selected-card",
      title: "Selected card",
      type: "commentary" as const,
      verses: ["Gen.1.1" as const],
      body: "Selected body",
    }],
  };
}

function tombstonePayloadWithoutExcludedResourceIds() {
  const payload = tombstonePayload();
  const metadata: Partial<typeof payload.metadata> = { ...payload.metadata };
  delete metadata.excludedResourceIds;
  return { ...payload, metadata };
}
