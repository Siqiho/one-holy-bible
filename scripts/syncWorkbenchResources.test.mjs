import { lstat, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { mergeStableAndWorkbenchResources } from "../src/data/resources";
import { validateWorkbenchSyncedResourcePayload } from "../src/data/workbenchSyncedResources";
import { patchWorkbenchSyncedResources, syncWorkbenchFromCards } from "./syncWorkbenchResources.mjs";

const scriptPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "syncWorkbenchResources.mjs");
const roots = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

describe("syncWorkbenchResources", () => {
  it("reconciles retired OCR projections against current source IDs without publishing restored images", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-retired-ocr-"));
    roots.push(root);
    const options = { outputJsonPath: path.join(root, "index.json"), publicResourceRoot: path.join(root, "images") };
    const retired = commentaryDetail("image-text-retired", "旧 OCR", "syncable");
    const keep = commentaryDetail("keep", "保留原样", "syncable");
    const held = commentaryDetail("old-deletion", "已删除", "reader_returned");
    await syncWorkbenchFromCards({ ...options, cards: [retired, keep, held] });
    const before = JSON.parse(await readFile(options.outputJsonPath, "utf8"));
    const patch = { ...options, cards: [], sourceResourceIds: ["keep", "document-image-restored"],
      sourceExclusions: [], summary: commentarySummary({ syncable: 1, not_ready: 1 }, 2) };
    const receipt = await patchWorkbenchSyncedResources(patch);
    const after = JSON.parse(await readFile(options.outputJsonPath, "utf8"));
    expect(receipt.retiredSourceIds).toEqual(["image-text-retired"]);
    expect(after.resources).toEqual([before.resources[1]]);
    expect(after.metadata.excludedResourceIds).toEqual(["image-text-retired", "old-deletion"]);
    expect(after.metadata.excludedResourceStates["image-text-retired"]).toEqual({ reason: "unresolved", kind: "commentary" });
    expect(validateWorkbenchSyncedResourcePayload(after)).toBe(after);
    expect(mergeStableAndWorkbenchResources([retired.syncDraft], after.resources, after.metadata.excludedResourceIds).map(r => r.id)).toEqual(["keep"]);
    const retry = await patchWorkbenchSyncedResources(patch);
    const repeated = JSON.parse(await readFile(options.outputJsonPath, "utf8"));
    expect(retry.retiredSourceIds).toEqual([]);
    expect({ ...repeated.metadata, generatedAt: null }).toEqual({ ...after.metadata, generatedAt: null });
    expect(repeated.resources).toEqual(after.resources);
  });

  it.each([
    { sourceResourceIds: [] },
    { sourceResourceIds: ["keep", "keep"] },
    { sourceResourceIds: ["keep", ""] },
    { sourceResourceIds: ["keep"], summary: { total: 2 } },
    { sourceResourceIds: ["keep"], cards: [commentaryDetail("outside", "不在来源中", "syncable")] },
    { sourceResourceIds: ["keep"], sourceExclusions: [{ id: "outside", reason: "soft_deleted", kind: "commentary" }] },
  ])("rejects incomplete source inventories without replacing the Reader index: %j", async (invalid) => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-source-inventory-"));
    roots.push(root);
    const options = { outputJsonPath: path.join(root, "index.json"), publicResourceRoot: path.join(root, "images") };
    await syncWorkbenchFromCards({ ...options, cards: [commentaryDetail("keep", "保留", "syncable")] });
    const before = await readFile(options.outputJsonPath, "utf8");
    await expect(patchWorkbenchSyncedResources({ ...options, cards: [], summary: { total: 1 }, ...invalid })).rejects.toThrow(/source/i);
    expect(await readFile(options.outputJsonPath, "utf8")).toBe(before);
  });

  it("keeps missing-source tombstones on a full rebuild and permits explicit source restoration", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-full-sync-tombstones-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "index.json");
    const options = { outputJsonPath, publicResourceRoot: path.join(root, "images") };
    const target = commentaryDetail("target", "正常同步", "syncable");
    const missing = commentaryDetail("missing", "旧卡的排除记录", "reader_returned");
    await syncWorkbenchFromCards({ ...options, cards: [target, missing] });

    await syncWorkbenchFromCards({ ...options, cards: [target], summary: commentarySummary({ syncable: 1 }, 1), sourceExclusions: [] });
    const rebuilt = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(rebuilt.metadata.excludedResourceIds).toEqual(["missing"]);
    expect(rebuilt.metadata.excludedResourceStates).toEqual({ missing: { reason: "unresolved", kind: "unknown" } });
    expect(rebuilt.metadata.totalWorkbenchCards).toBe(2);
    expect(rebuilt.metadata.sourceWorkbenchSummary.total).toBe(1);
    expect(validateWorkbenchSyncedResourcePayload(rebuilt)).toBe(rebuilt);
    expect(mergeStableAndWorkbenchResources([{ id: "missing", type: "commentary" }], rebuilt.resources, rebuilt.metadata.excludedResourceIds).map(resource => resource.id)).toEqual(["target"]);

    await syncWorkbenchFromCards({ ...options, cards: [target] });
    const repeated = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(repeated.metadata.excludedResourceStates).toEqual(rebuilt.metadata.excludedResourceStates);
    expect(repeated.resources).toEqual(rebuilt.resources);

    await syncWorkbenchFromCards({ ...options, cards: [target, commentaryDetail("missing", "明确恢复", "syncable")] });
    const restored = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(restored.metadata.excludedResourceIds).toEqual([]);
    expect(restored.resources.map(resource => resource.id)).toEqual(["target", "missing"]);
    expect(validateWorkbenchSyncedResourcePayload(restored)).toBe(restored);
  });

  it.each([["duplicate", ["held", "held"]], ["missing", undefined], ["null", null]])("refuses a full rebuild with %s historical exclusions before replacing the index", async (_label, ids) => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-full-sync-invalid-tombstones-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "index.json");
    const previous = JSON.stringify({ metadata: { excludedResourceIds: ids }, resources: [] });
    await writeFile(outputJsonPath, previous);
    await expect(syncWorkbenchFromCards({ outputJsonPath, publicResourceRoot: path.join(root, "images"), cards: [] })).rejects.toThrow(/exclusion|excluded/i);
    expect(await readFile(outputJsonPath, "utf8")).toBe(previous);
  });

  it("writes compact JSON without losing text, metadata, or untouched resources", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-compact-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "index.json");
    const options = { outputJsonPath, publicResourceRoot: path.join(root, "images") };
    const first = commentaryDetail("first", "含换行\n和引号\"的中文", "syncable");
    const untouched = commentaryDetail("untouched", "保持原样", "syncable");
    await syncWorkbenchFromCards({ ...options, cards: [first, untouched], summary: commentarySummary({ syncable: 2 }, 2) });
    const fullText = await readFile(outputJsonPath, "utf8");
    const original = JSON.parse(fullText);
    expect(fullText).toBe(`${JSON.stringify(original)}\n`);

    const updated = commentaryDetail("first", "更新的中文\n第二行", "syncable");
    await patchWorkbenchSyncedResources({ ...options, cards: [updated], summary: commentarySummary({ syncable: 2 }, 2) });
    const patchedText = await readFile(outputJsonPath, "utf8");
    const patched = JSON.parse(patchedText);
    expect(patchedText).toBe(`${JSON.stringify(patched)}\n`);
    expect(patched.resources.map(resource => resource.id)).toEqual(["first", "untouched"]);
    expect(patched.resources[0].body).toBe(updated.draft.body);
    expect(patched.resources[1]).toEqual(original.resources[1]);
    expect({ ...patched.metadata, generatedAt: null }).toEqual({ ...original.metadata, generatedAt: null });
  });

  it("writes a small CLI result receipt for a completed full sync", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-result-"));
    roots.push(root);
    const cardsFile = path.join(root, "cards.json");
    const outputJsonPath = path.join(root, "index.json");
    const publicResourceRoot = path.join(root, "images");
    const resultFile = path.join(root, "result.json");
    await writeFile(cardsFile, JSON.stringify({ cards: [commentaryDetail("one", "一张卡", "syncable")] }));

    await execScript(["--cards-file", cardsFile, "--output-json", outputJsonPath, "--public-resource-root", publicResourceRoot, "--result-file", resultFile]);

    const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
    const resultText = await readFile(resultFile, "utf8");
    expect(JSON.parse(resultText)).toEqual({ count: payload.resources.length, copiedImageCount: 0, skippedImageCount: 0, outputJsonPath, publicResourceRoot });
    expect(Buffer.byteLength(resultText)).toBeLessThan(1024);
    expect((await readdir(root)).filter(name => name.includes(".tmp-"))).toEqual([]);
  });

  it("reports per-operation image counts in a patch receipt instead of cumulative metadata", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-patch-result-"));
    roots.push(root);
    const sourceImage = path.join(root, "source.png");
    const sourceLedger = path.join(root, "source.jsonl");
    await writeFile(sourceImage, Buffer.from("89504e470d0a1a0a", "hex"));
    await writeFile(sourceLedger, `${JSON.stringify({ assetPath: sourceImage })}\n`);
    const first = imageDetail("first", "第一张图片", sourceLedger);
    const second = imageDetail("second", "另一张图片", sourceLedger);
    const outputJsonPath = path.join(root, "index.json");
    const publicResourceRoot = path.join(root, "images");
    await syncWorkbenchFromCards({ cards: [first, second], outputJsonPath, publicResourceRoot });
    const original = JSON.parse(await readFile(outputJsonPath, "utf8"));
    const patchCardsFile = path.join(root, "patch.json");
    const resultFile = path.join(root, "result.json");
    await writeFile(patchCardsFile, JSON.stringify({ cards: [first] }));

    await execScript(["--patch-cards-file", patchCardsFile, "--output-json", outputJsonPath, "--public-resource-root", publicResourceRoot, "--result-file", resultFile]);

    const patched = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(JSON.parse(await readFile(resultFile, "utf8"))).toEqual({ count: 2, copiedImageCount: 1, skippedImageCount: 1, outputJsonPath, publicResourceRoot });
    expect(patched.metadata.copiedImageCount).toBe(3);
    expect(patched.resources[1]).toEqual(original.resources[1]);
  });

  it("does not publish a result receipt when the index path is a directory", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-result-failure-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "index.json");
    await mkdir(outputJsonPath);
    await writeFile(path.join(outputJsonPath, "sentinel"), "preserve");
    const cardsFile = path.join(root, "cards.json");
    const resultFile = path.join(root, "result.json");
    await writeFile(cardsFile, JSON.stringify({ cards: [commentaryDetail("one", "一张卡", "syncable")] }));

    await expect(execScript(["--cards-file", cardsFile, "--output-json", outputJsonPath, "--public-resource-root", path.join(root, "images"), "--result-file", resultFile])).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("EISDIR") });

    await expect(stat(resultFile)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(path.join(outputJsonPath, "sentinel"), "utf8")).toBe("preserve");
    expect((await readdir(root)).filter(name => name.includes(".tmp-"))).toEqual([]);
  });

  it("rejects a receipt path that would overwrite the Reader index", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-result-overlap-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "index.json");
    const cardsFile = path.join(root, "cards.json");
    await writeFile(outputJsonPath, "preserve index");
    await writeFile(cardsFile, JSON.stringify({ cards: [] }));

    await expect(execScript(["--cards-file", cardsFile, "--output-json", outputJsonPath, "--result-file", outputJsonPath])).rejects.toMatchObject({ stderr: expect.stringContaining("--result-file must differ from --output-json") });

    expect(await readFile(outputJsonPath, "utf8")).toBe("preserve index");
  });

  it("keeps the committed index intact if publishing its receipt fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-result-publish-failure-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "index.json");
    const cardsFile = path.join(root, "cards.json");
    const resultFile = path.join(root, "result.json");
    await mkdir(resultFile);
    await writeFile(path.join(resultFile, "sentinel"), "preserve receipt target");
    await writeFile(cardsFile, JSON.stringify({ cards: [commentaryDetail("one", "一张卡", "syncable")] }));

    await expect(execScript(["--cards-file", cardsFile, "--output-json", outputJsonPath, "--public-resource-root", path.join(root, "images"), "--result-file", resultFile])).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("rename") });

    expect(JSON.parse(await readFile(outputJsonPath, "utf8")).resources.map(resource => resource.id)).toEqual(["one"]);
    expect(await readFile(path.join(resultFile, "sentinel"), "utf8")).toBe("preserve receipt target");
    expect((await readdir(root)).filter(name => name.includes(".tmp-"))).toEqual([]);
  });

  it("preserves order and unique IDs when a batch replaces, drops, and re-adds cards", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-patch-order-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "index.json");
    const options = { outputJsonPath, publicResourceRoot: path.join(root, "images") };
    const first = commentaryDetail("first", "原卡", "syncable");
    const second = commentaryDetail("second", "未选择的卡片", "syncable");
    await syncWorkbenchFromCards({ ...options, cards: [first, second], summary: commentarySummary({ syncable: 2 }, 2) });
    const original = JSON.parse(await readFile(outputJsonPath, "utf8"));
    const patch = {
      ...options,
      cards: [commentaryDetail("first", "修改后", "syncable"), commentaryDetail("new", "新增", "syncable")],
      dropIds: ["first"],
      summary: commentarySummary({ syncable: 3 }, 3)
    };

    await patchWorkbenchSyncedResources(patch);
    const patched = JSON.parse(await readFile(outputJsonPath, "utf8"));
    await patchWorkbenchSyncedResources(patch);
    const repeated = JSON.parse(await readFile(outputJsonPath, "utf8"));

    expect(patched.resources.map(resource => resource.id)).toEqual(["first", "second", "new"]);
    expect(patched.resources[1]).toEqual(original.resources[1]);
    expect(repeated.resources).toEqual(patched.resources);
    expect({ ...repeated.metadata, generatedAt: null }).toEqual({ ...patched.metadata, generatedAt: null });
  });

  it("separates current source statistics from the projection and retains unresolved fallback tombstones", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-source-drift-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "index.json");
    const options = { outputJsonPath, publicResourceRoot: path.join(root, "images") };
    const target = commentaryDetail("target", "待更新", "syncable");
    const untouched = commentaryDetail("untouched", "保持原样", "syncable");
    const held = commentaryDetail("held", "仍未同步", "temporarily_unsynced");
    const orphan = commentaryDetail("orphan", "仅旧索引保留的标记", "reader_returned");
    await syncWorkbenchFromCards({ ...options, cards: [target, untouched, held, orphan], summary: commentarySummary({ syncable: 2, temporarily_unsynced: 1, reader_returned: 1 }, 4) });
    const original = JSON.parse(await readFile(outputJsonPath, "utf8"));
    const sourceSummary = { ...commentarySummary({ syncable: 2 }, 3), softDeleted: 1, byRiskLevel: { low: 3 }, byReviewStatus: { needs_review: 3 } };
    const sourceExclusions = [{ id: "held", reason: "soft_deleted", kind: "commentary" }];
    const patch = { ...options, cards: [commentaryDetail("target", "已更新", "syncable")], summary: sourceSummary, sourceExclusions };

    await patchWorkbenchSyncedResources(patch);
    const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));

    expect(payload.resources.map(resource => resource.id)).toEqual(["target", "untouched"]);
    expect(payload.resources[1]).toEqual(original.resources[1]);
    expect(payload.metadata.excludedResourceIds).toEqual(original.metadata.excludedResourceIds);
    expect(payload.metadata.excludedResourceStates).toEqual({ held: { reason: "soft_deleted", kind: "commentary" }, orphan: { reason: "unresolved", kind: "unknown" } });
    expect(payload.metadata.excludedCounts).toEqual({ soft_deleted: 1, unresolved: 1 });
    expect(payload.metadata.excludedCountsByKind).toEqual({ commentary: 1, unknown: 1 });
    expect(payload.metadata.totalWorkbenchCards).toBe(4);
    expect(payload.metadata.workbenchSummary).toEqual({ total: 4, byType: { commentary: 3, unknown: 1 }, bySyncStatus: { syncable: 2, unresolved: 1 }, softDeleted: 1 });
    expect(payload.metadata.sourceWorkbenchSummary).toEqual(sourceSummary);
    expect(validateWorkbenchSyncedResourcePayload(payload)).toBe(payload);
    expect(mergeStableAndWorkbenchResources([{ id: "orphan", title: "旧版备用卡片", type: "commentary" }], payload.resources, payload.metadata.excludedResourceIds).some(resource => resource.id === "orphan")).toBe(false);

    await patchWorkbenchSyncedResources({ ...patch, sourceExclusions: [{ id: "held", reason: "reader_returned", kind: "commentary" }] });
    const retried = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect({ ...retried.metadata, generatedAt: null }).toEqual({ ...payload.metadata, generatedAt: null });
    expect(retried.resources).toEqual(payload.resources);

    await patchWorkbenchSyncedResources({ ...options, cards: [commentaryDetail("held", "恢复同步", "syncable")], summary: commentarySummary({ syncable: 3 }, 3) });
    const upserted = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(upserted.metadata.excludedResourceStates).toEqual({ orphan: { reason: "unresolved", kind: "unknown" } });
    expect(upserted.metadata.excludedCounts).toEqual({ unresolved: 1 });
    expect(upserted.metadata.totalWorkbenchCards).toBe(4);

    await patchWorkbenchSyncedResources({ ...options, cards: [commentaryDetail("target", "退出同步", "temporarily_unsynced")] });
    const removed = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(removed.metadata.excludedCounts).toEqual({ unresolved: 1, temporarily_unsynced: 1 });
    expect(removed.metadata.excludedResourceStates.target).toEqual({ reason: "temporarily_unsynced", kind: "commentary" });
    expect(removed.resources.find(resource => resource.id === "untouched")).toEqual(original.resources[1]);

    await patchWorkbenchSyncedResources({ ...options, dropIds: ["orphan"] });
    const purged = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(purged.metadata.excludedResourceIds).toEqual(["target"]);
    expect(purged.metadata.excludedResourceStates).toEqual({ target: { reason: "temporarily_unsynced", kind: "commentary" } });
    expect(purged.metadata.excludedCounts).toEqual({ temporarily_unsynced: 1 });
    expect(purged.metadata.totalWorkbenchCards).toBe(3);
    expect(validateWorkbenchSyncedResourcePayload(purged)).toBe(purged);
  });

  it("passes sourceExclusions through the cards-file CLI protocol", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-source-states-cli-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "index.json");
    const publicResourceRoot = path.join(root, "images");
    const target = commentaryDetail("target", "可同步", "syncable");
    const held = commentaryDetail("held", "未同步", "temporarily_unsynced");
    const summary = commentarySummary({ syncable: 1, temporarily_unsynced: 1 }, 2);
    const sourceExclusions = [{ id: "held", reason: "temporarily_unsynced", kind: "commentary" }];
    const cardsFile = path.join(root, "cards.json");
    const resultFile = path.join(root, "result.json");
    await writeFile(cardsFile, JSON.stringify({ cards: [target, held], summary, sourceExclusions }));

    await execScript(["--cards-file", cardsFile, "--output-json", outputJsonPath, "--public-resource-root", publicResourceRoot, "--result-file", resultFile]);
    const full = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(full.metadata.excludedResourceStates).toEqual({ held: { reason: "temporarily_unsynced", kind: "commentary" } });
    expect(full.metadata.sourceWorkbenchSummary).toEqual(summary);

    await writeFile(cardsFile, JSON.stringify({ cards: [target], summary: commentarySummary({ syncable: 1 }, 1), sourceExclusions: [] }));
    await execScript(["--patch-cards-file", cardsFile, "--output-json", outputJsonPath, "--public-resource-root", publicResourceRoot, "--result-file", resultFile]);
    const patched = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(patched.metadata.excludedResourceStates).toEqual(full.metadata.excludedResourceStates);
    expect(patched.metadata.totalWorkbenchCards).toBe(2);
    expect(patched.metadata.sourceWorkbenchSummary.total).toBe(1);
    expect(JSON.parse(await readFile(resultFile, "utf8")).count).toBe(1);
  });

  it.each([
    { sourceExclusions: null },
    { sourceExclusions: [{ id: "held", reason: "made_up", kind: "commentary" }] },
    { sourceExclusions: [{ id: "held", reason: "temporarily_unsynced", kind: "made_up" }] },
    { sourceExclusions: [{ id: "held", reason: "temporarily_unsynced", kind: "commentary" }, { id: "held", reason: "soft_deleted", kind: "commentary" }] }
  ])("rejects malformed source exclusion states before replacing the index: %j", async ({ sourceExclusions }) => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-invalid-source-states-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "index.json");
    const options = { outputJsonPath, publicResourceRoot: path.join(root, "images") };
    const target = commentaryDetail("target", "可同步", "syncable");
    await syncWorkbenchFromCards({ ...options, cards: [target] });
    const before = await readFile(outputJsonPath, "utf8");

    await expect(patchWorkbenchSyncedResources({ ...options, cards: [target], sourceExclusions })).rejects.toThrow(/sourceExclusions/);

    expect(await readFile(outputJsonPath, "utf8")).toBe(before);
  });

  it.each(["wrong-count", "wrong-kind-count", "invalid-reason", "missing-state", "extra-state"])("rejects a persisted exclusion-state mismatch before replacement: %s", async (corruption) => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-invalid-stored-states-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "index.json");
    const options = { outputJsonPath, publicResourceRoot: path.join(root, "images") };
    const target = commentaryDetail("target", "可同步", "syncable");
    const held = commentaryDetail("held", "未同步", "temporarily_unsynced");
    await syncWorkbenchFromCards({ ...options, cards: [target, held] });
    const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
    payload.metadata.excludedResourceStates = { held: { reason: "temporarily_unsynced", kind: "commentary" } };
    if (corruption === "wrong-count") payload.metadata.excludedCounts = { soft_deleted: 1 };
    if (corruption === "wrong-kind-count") payload.metadata.excludedCountsByKind = { image: 1 };
    if (corruption === "invalid-reason") payload.metadata.excludedResourceStates.held.reason = "made_up";
    if (corruption === "missing-state") delete payload.metadata.excludedResourceStates.held;
    if (corruption === "extra-state") payload.metadata.excludedResourceStates.extra = { reason: "unresolved", kind: "unknown" };
    const before = JSON.stringify(payload);
    await writeFile(outputJsonPath, before);

    await expect(patchWorkbenchSyncedResources({ ...options, cards: [target] })).rejects.toThrow(/exclusion state/);

    expect(await readFile(outputJsonPath, "utf8")).toBe(before);
  });

  it("reports soft-deleted cards separately from active unsynced cards", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-soft-delete-"));
    roots.push(root);
    const cards = [
      listItem("active-unsynced", "commentary", "正常未同步", "temporarily_unsynced"),
      { ...listItem("soft-deleted", "commentary", "已软删除", "temporarily_unsynced"), softDeleted: true }
    ];
    const details = {
      "active-unsynced": detail({
        id: "active-unsynced",
        kind: "commentary",
        title: "正常未同步",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        syncStatus: "temporarily_unsynced",
        verses: ["Gen.1.1"]
      }),
      "soft-deleted": detail({
        id: "soft-deleted",
        kind: "commentary",
        title: "已软删除",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        softDeleted: true,
        syncStatus: "temporarily_unsynced",
        verses: ["Gen.1.1"]
      })
    };
    const server = await startFakeApi({ cards, details });
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");

    try {
      await execScript([
        "--api-base",
        server.url,
        "--output-json",
        outputJsonPath,
        "--public-resource-root",
        path.join(root, "public/resources/workbench")
      ]);
      const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));

      expect(payload.resources).toEqual([]);
      expect(payload.metadata.excludedCounts).toEqual({
        temporarily_unsynced: 1,
        soft_deleted: 1
      });
      expect(payload.metadata.excludedCountsByKind).toEqual({ commentary: 2 });
      expect(payload.metadata.excludedResourceIds).toEqual([
        "active-unsynced",
        "soft-deleted"
      ]);
      expect(payload.metadata.excludedResourceIds).toHaveLength(
        Object.values(payload.metadata.excludedCounts).reduce((total, count) => total + count, 0)
      );
      expect(payload.metadata.selectedCounts.total).toBe(0);
      expect(payload.metadata.totalWorkbenchCards).toBe(2);
      expect(payload.metadata.workbenchSummary).toMatchObject({
        bySyncStatus: { temporarily_unsynced: 1 },
        softDeleted: 1,
        total: 2
      });
    } finally {
      await server.close();
    }
  });

  it("matches the workbench synced filter by excluding temporarily unsynced and reader_returned cards", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-"));
    roots.push(root);
    const sourceImage = path.join(root, "source.png");
    await writeFile(sourceImage, Buffer.from("89504e470d0a1a0a", "hex"));
    const sourceLedger = path.join(root, "source-ledger.jsonl");
    await writeFile(sourceLedger, `${JSON.stringify({ assetPath: sourceImage })}\n`, "utf8");

    const cards = [
      listItem("exact-commentary", "commentary", "精确注释"),
      listItem("broad-commentary", "commentary", "跨节注释", "temporarily_unsynced"),
      listItem("reader-returned-commentary", "commentary", "读者退回注释", "reader_returned"),
      listItem("broad-no-status-commentary", "commentary", "跨节但旧 API 未标状态"),
      listItem("image-card", "image", "图片卡"),
      listItem("unsynced-image-card", "image", "未同步图片卡", "temporarily_unsynced")
    ];
    const details = {
      "exact-commentary": detail({
        id: "exact-commentary",
        kind: "commentary",
        title: "精确注释",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        syncStatus: "syncable",
        verses: ["Gen.1.1"]
      }),
      "broad-commentary": detail({
        id: "broad-commentary",
        kind: "commentary",
        title: "跨节注释",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.2" }],
        primaryAnchor: "Gen.1.1",
        syncStatus: "temporarily_unsynced",
        verses: ["Gen.1.1", "Gen.1.2"]
      }),
      "reader-returned-commentary": detail({
        id: "reader-returned-commentary",
        kind: "commentary",
        title: "读者退回注释",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        syncStatus: "reader_returned",
        verses: ["Gen.1.1"]
      }),
      "broad-no-status-commentary": detail({
        id: "broad-no-status-commentary",
        kind: "commentary",
        title: "跨节但旧 API 未标状态",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.2" }],
        primaryAnchor: "Gen.1.1",
        syncStatus: "not_ready",
        verses: ["Gen.1.1", "Gen.1.2"]
      }),
      "image-card": detail({
        id: "image-card",
        kind: "image",
        title: "图片卡",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.2" }],
        primaryAnchor: "Gen.1.1",
        sourceLedger,
        sourceLine: 1,
        verses: ["Gen.1.1", "Gen.1.2"]
      }),
      "unsynced-image-card": detail({
        id: "unsynced-image-card",
        kind: "image",
        title: "未同步图片卡",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.2" }],
        primaryAnchor: "Gen.1.1",
        sourceLedger,
        sourceLine: 1,
        syncStatus: "temporarily_unsynced",
        verses: ["Gen.1.1", "Gen.1.2"]
      })
    };
    const server = await startFakeApi({ cards, details });
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");

    try {
      const { stdout } = await execScript([
        "--api-base",
        server.url,
        "--output-json",
        outputJsonPath,
        "--public-resource-root",
        publicResourceRoot
      ]);
      const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));

      expect(payload.resources.map((resource) => resource.id)).toEqual([
        "exact-commentary",
        "broad-no-status-commentary",
        "image-card"
      ]);
      expect(payload.resources.map((resource) => resource.id)).not.toContain("reader-returned-commentary");
      expect(payload.metadata.excludedCounts).toMatchObject({
        temporarily_unsynced: 2,
        reader_returned: 1
      });
      expect(payload.metadata.excludedCountsByKind).toEqual({
        commentary: 2,
        image: 1
      });
      expect(payload.metadata.excludedResourceIds).toEqual([
        "broad-commentary",
        "reader-returned-commentary",
        "unsynced-image-card"
      ]);
      expect(payload.metadata.excludedResourceIds).toHaveLength(
        Object.values(payload.metadata.excludedCounts).reduce((total, count) => total + count, 0)
      );
      expect(payload.metadata.excludedResourceIds.every((id) => (
        !payload.resources.some((resource) => resource.id === id)
      ))).toBe(true);
      expect(payload.metadata.selectedCounts).toMatchObject({
        commentary: 2,
        image: 1,
        total: 3
      });
      expect(payload.resources.find((resource) => resource.id === "exact-commentary").debugMeta.syncSelection).toBe("workbench-commentary");
      expect(payload.resources.find((resource) => resource.id === "broad-no-status-commentary").debugMeta.syncSelection).toBe(
        "workbench-commentary"
      );
      expect(payload.resources.find((resource) => resource.id === "image-card").debugMeta.syncSelection).toBe("workbench-image");
      expect(stdout).toContain("excluded counts");
    } finally {
      await server.close();
    }
  });

  it("adds a book-level navigation fallback for synced image cards without exact anchors", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-"));
    roots.push(root);
    const sourceImage = path.join(root, "source.png");
    await writeFile(sourceImage, Buffer.from("89504e470d0a1a0a", "hex"));
    const sourceLedger = path.join(root, "source-ledger.jsonl");
    await writeFile(sourceLedger, `${JSON.stringify({ assetPath: sourceImage })}\n`, "utf8");

    const cards = [listItem("unanchored-image-card", "image", "无精确锚点图片卡")];
    const details = {
      "unanchored-image-card": detail({
        id: "unanchored-image-card",
        kind: "image",
        title: "无精确锚点图片卡",
        coverageRanges: [],
        primaryAnchor: "Bogus.1.1",
        sourceLedger,
        sourceLine: 1,
        verses: ["Gen.999.999"]
      })
    };
    const server = await startFakeApi({ cards, details });
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");

    try {
      await execScript([
        "--api-base",
        server.url,
        "--output-json",
        outputJsonPath,
        "--public-resource-root",
        publicResourceRoot
      ]);
      const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
      const imageResource = payload.resources.find((resource) => resource.id === "unanchored-image-card");

      expect(imageResource).toMatchObject({
        bookIntro: "Gen",
        type: "image",
        verses: [],
        debugMeta: {
          bookFolder: "01_创世记",
          navigationRepair: "book-folder-fallback"
        }
      });
      expect(imageResource).not.toHaveProperty("primaryAnchor");
    } finally {
      await server.close();
    }
  });

  it("prefers valid verse navigation over stale book-intro metadata", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-"));
    roots.push(root);
    const sourceImage = path.join(root, "source.png");
    await writeFile(sourceImage, Buffer.from("89504e470d0a1a0a", "hex"));
    const sourceLedger = path.join(root, "source-ledger.jsonl");
    await writeFile(sourceLedger, `${JSON.stringify({ assetPath: sourceImage })}\n`, "utf8");

    const cards = [
      listItem("mapped-intro-image", "image", "已映射序章图片"),
      listItem("mapped-intro-commentary", "commentary", "已映射序章文字")
    ];
    const details = {
      "mapped-intro-image": detail({
        id: "mapped-intro-image",
        kind: "image",
        title: "已映射序章图片",
        bookIntro: "Gen",
        coverageRanges: [{ start: "Gen.1.2", end: "Gen.1.2" }],
        navigationPrimaryAnchors: ["book-intro:Gen", "Gen.1.2"],
        primaryAnchor: "Gen.1.2",
        sourceLedger,
        sourceLine: 1,
        verses: ["Gen.1.2"]
      }),
      "mapped-intro-commentary": detail({
        id: "mapped-intro-commentary",
        kind: "commentary",
        title: "已映射序章文字",
        bookIntro: "Gen",
        coverageRanges: [{ start: "Gen.1.2", end: "Gen.1.2" }],
        navigationPrimaryAnchors: ["book-intro:Gen", "Gen.1.2"],
        primaryAnchor: "Gen.1.2",
        verses: ["Gen.1.2"]
      })
    };
    const server = await startFakeApi({ cards, details });
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");

    try {
      await execScript([
        "--api-base",
        server.url,
        "--output-json",
        outputJsonPath,
        "--public-resource-root",
        publicResourceRoot
      ]);
      const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
      const imageResource = payload.resources.find((resource) => resource.id === "mapped-intro-image");

      expect(imageResource).toMatchObject({
        primaryAnchor: "Gen.1.2",
        verses: ["Gen.1.2"],
        debugMeta: {
          navigationPrimaryAnchors: ["Gen.1.2"]
        }
      });
      expect(imageResource).not.toHaveProperty("bookIntro");
      expect(imageResource.debugMeta.navigationPrimaryAnchors).not.toContain("book-intro:Gen");
      const commentaryResource = payload.resources.find((resource) => resource.id === "mapped-intro-commentary");
      expect(commentaryResource).not.toHaveProperty("bookIntro");
      expect(commentaryResource.debugMeta.navigationPrimaryAnchors).toEqual(["Gen.1.2"]);
    } finally {
      await server.close();
    }
  });

  it("adds book-level navigation and debug anchors for new-document image cards from any Bible book folder", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-"));
    roots.push(root);
    const sourceImage = path.join(root, "source.png");
    await writeFile(sourceImage, Buffer.from("89504e470d0a1a0a", "hex"));
    const sourceLedger = path.join(root, "source-ledger.jsonl");
    await writeFile(sourceLedger, `${JSON.stringify({ assetPath: sourceImage })}\n`, "utf8");

    const cards = [
      listItem("romans-unanchored-image-card", "image", "罗马书无精确锚点图片卡", undefined, "45_罗马书")
    ];
    const details = {
      "romans-unanchored-image-card": detail({
        id: "romans-unanchored-image-card",
        kind: "image",
        title: "罗马书无精确锚点图片卡",
        bookFolder: "45_罗马书",
        coverageRanges: [],
        primaryAnchor: null,
        sourceLedger,
        sourceLine: 1,
        verses: []
      })
    };
    const server = await startFakeApi({ cards, details });
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");

    try {
      await execScript([
        "--api-base",
        server.url,
        "--output-json",
        outputJsonPath,
        "--public-resource-root",
        publicResourceRoot
      ]);
      const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
      const imageResource = payload.resources.find((resource) => resource.id === "romans-unanchored-image-card");

      expect(imageResource).toMatchObject({
        bookIntro: "Rom",
        type: "image",
        verses: [],
        debugMeta: {
          bookFolder: "45_罗马书",
          navigationPrimaryAnchors: ["book-intro:Rom"],
          navigationRepair: "book-folder-fallback"
        }
      });
    } finally {
      await server.close();
    }
  });

  it("rejects synced image cards when no verse, primary anchor, book intro, or debug navigation can be derived", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-"));
    roots.push(root);
    const sourceImage = path.join(root, "source.png");
    await writeFile(sourceImage, Buffer.from("89504e470d0a1a0a", "hex"));
    const sourceLedger = path.join(root, "source-ledger.jsonl");
    await writeFile(sourceLedger, `${JSON.stringify({ assetPath: sourceImage })}\n`, "utf8");

    const cards = [
      listItem("unknown-unanchored-image-card", "image", "未知书卷无导航图片卡", undefined, "unknown-book")
    ];
    const details = {
      "unknown-unanchored-image-card": detail({
        id: "unknown-unanchored-image-card",
        kind: "image",
        title: "未知书卷无导航图片卡",
        bookFolder: "unknown-book",
        coverageRanges: [],
        primaryAnchor: "Bogus.1.1",
        sourceLedger,
        sourceLine: 1,
        verses: ["Gen.999.999"]
      })
    };
    const server = await startFakeApi({ cards, details });
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");
    const copiedImagePath = path.join(publicResourceRoot, "unknown-book", "unknown-unanchored-image-card.png");

    try {
      await expect(execScript([
        "--api-base",
        server.url,
        "--output-json",
        outputJsonPath,
        "--public-resource-root",
        publicResourceRoot
      ])).rejects.toMatchObject({
        stderr: expect.stringContaining("Image resource unknown-unanchored-image-card has no navigation target")
      });
      await expect(stat(copiedImagePath)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await server.close();
    }
  });

  it("rejects duplicate card ids returned by the workbench list API", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-duplicate-list-"));
    roots.push(root);
    const cards = [
      listItem("duplicate-card", "commentary", "重复列表卡片 A"),
      listItem("duplicate-card", "commentary", "重复列表卡片 B")
    ];
    const details = {
      "duplicate-card": detail({
        id: "duplicate-card",
        kind: "commentary",
        title: "重复列表卡片",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        verses: ["Gen.1.1"]
      })
    };
    const server = await startFakeApi({ cards, details });

    try {
      await expect(execScript([
        "--api-base",
        server.url,
        "--output-json",
        path.join(root, "workbenchSyncedResources.json"),
        "--public-resource-root",
        path.join(root, "public/resources/workbench")
      ])).rejects.toMatchObject({
        stderr: expect.stringMatching(/duplicate workbench card id.*duplicate-card/i)
      });
    } finally {
      await server.close();
    }
  });

  it("rejects duplicate card ids returned by the workbench detail API", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-duplicate-detail-"));
    roots.push(root);
    const cards = [
      listItem("list-card-a", "commentary", "列表卡片 A"),
      listItem("list-card-b", "commentary", "列表卡片 B")
    ];
    const duplicateDetail = detail({
      id: "duplicate-detail",
      kind: "commentary",
      title: "重复详情卡片",
      coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
      primaryAnchor: "Gen.1.1",
      verses: ["Gen.1.1"]
    });
    const server = await startFakeApi({
      cards,
      details: {
        "list-card-a": duplicateDetail,
        "list-card-b": duplicateDetail
      }
    });

    try {
      await expect(execScript([
        "--api-base",
        server.url,
        "--output-json",
        path.join(root, "workbenchSyncedResources.json"),
        "--public-resource-root",
        path.join(root, "public/resources/workbench")
      ])).rejects.toMatchObject({
        stderr: expect.stringMatching(/duplicate workbench detail id.*duplicate-detail/i)
      });
    } finally {
      await server.close();
    }
  });

  it("emits an excluded Reader resource id that hides the matching stable resource", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-reader-resource-id-"));
    roots.push(root);
    const cards = [
      listItem("source-card", "commentary", "来源卡片", "temporarily_unsynced")
    ];
    const details = {
      "source-card": detail({
        id: "source-card",
        kind: "commentary",
        resourceId: "stable-reader-card",
        title: "来源卡片",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        syncStatus: "temporarily_unsynced",
        verses: ["Gen.1.1"]
      })
    };
    const server = await startFakeApi({ cards, details });
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");

    try {
      await execScript([
        "--api-base",
        server.url,
        "--output-json",
        outputJsonPath,
        "--public-resource-root",
        path.join(root, "public/resources/workbench")
      ]);
      const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
      const stableResources = [{
        id: "stable-reader-card",
        title: "Stable Reader card",
        type: "commentary",
        verses: ["Gen.1.1"],
        body: "Stable body"
      }];

      expect(payload.metadata.excludedResourceIds).toEqual(["stable-reader-card"]);
      expect(mergeStableAndWorkbenchResources(
        stableResources,
        payload.resources,
        payload.metadata.excludedResourceIds
      )).toEqual([]);
    } finally {
      await server.close();
    }
  });

  it("rejects duplicate excluded Reader resource ids produced by distinct workbench details", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-duplicate-excluded-resource-"));
    roots.push(root);
    const cards = [
      listItem("source-a", "commentary", "来源 A", "temporarily_unsynced"),
      listItem("source-b", "commentary", "来源 B", "reader_returned")
    ];
    const details = {
      "source-a": detail({
        id: "source-a",
        kind: "commentary",
        resourceId: "duplicate-excluded-resource",
        title: "来源 A",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        syncStatus: "temporarily_unsynced",
        verses: ["Gen.1.1"]
      }),
      "source-b": detail({
        id: "source-b",
        kind: "commentary",
        resourceId: "duplicate-excluded-resource",
        title: "来源 B",
        coverageRanges: [{ start: "Gen.1.2", end: "Gen.1.2" }],
        primaryAnchor: "Gen.1.2",
        syncStatus: "reader_returned",
        verses: ["Gen.1.2"]
      })
    };
    const server = await startFakeApi({ cards, details });

    try {
      await expect(execScript([
        "--api-base",
        server.url,
        "--output-json",
        path.join(root, "workbenchSyncedResources.json"),
        "--public-resource-root",
        path.join(root, "public/resources/workbench")
      ])).rejects.toMatchObject({
        stderr: expect.stringMatching(/duplicate excluded resource id.*duplicate-excluded-resource/i)
      });
    } finally {
      await server.close();
    }
  });

  it("rejects duplicate selected resource ids produced by distinct workbench details", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-duplicate-resource-"));
    roots.push(root);
    const cards = [
      listItem("detail-a", "commentary", "详情 A"),
      listItem("detail-b", "commentary", "详情 B")
    ];
    const details = {
      "detail-a": detail({
        id: "detail-a",
        kind: "commentary",
        resourceId: "duplicate-resource",
        title: "详情 A",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        verses: ["Gen.1.1"]
      }),
      "detail-b": detail({
        id: "detail-b",
        kind: "commentary",
        resourceId: "duplicate-resource",
        title: "详情 B",
        coverageRanges: [{ start: "Gen.1.2", end: "Gen.1.2" }],
        primaryAnchor: "Gen.1.2",
        verses: ["Gen.1.2"]
      })
    };
    const server = await startFakeApi({ cards, details });

    try {
      await expect(execScript([
        "--api-base",
        server.url,
        "--output-json",
        path.join(root, "workbenchSyncedResources.json"),
        "--public-resource-root",
        path.join(root, "public/resources/workbench")
      ])).rejects.toMatchObject({
        stderr: expect.stringMatching(/duplicate selected resource id.*duplicate-resource/i)
      });
    } finally {
      await server.close();
    }
  });

  it("cleans the sibling temporary output when the atomic rename fails", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-atomic-output-"));
    roots.push(root);
    const cards = [listItem("commentary-card", "commentary", "注释卡片")];
    const details = {
      "commentary-card": detail({
        id: "commentary-card",
        kind: "commentary",
        title: "注释卡片",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        verses: ["Gen.1.1"]
      })
    };
    const server = await startFakeApi({ cards, details });
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    await mkdir(outputJsonPath);

    try {
      await expect(execScript([
        "--api-base",
        server.url,
        "--output-json",
        outputJsonPath,
        "--public-resource-root",
        path.join(root, "public/resources/workbench")
      ])).rejects.toBeTruthy();
      expect((await readdir(root)).filter((entry) => entry.startsWith("workbenchSyncedResources.json.tmp-"))).toEqual([]);
    } finally {
      await server.close();
    }
  });

  it("atomically replaces the output path instead of writing through an existing symlink", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-atomic-replace-"));
    roots.push(root);
    const cards = [listItem("commentary-card", "commentary", "注释卡片")];
    const details = {
      "commentary-card": detail({
        id: "commentary-card",
        kind: "commentary",
        title: "注释卡片",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        verses: ["Gen.1.1"]
      })
    };
    const server = await startFakeApi({ cards, details });
    const sentinelPath = path.join(root, "sentinel.json");
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const sentinel = JSON.stringify({ metadata: { excludedResourceIds: ["retired-card"] }, resources: [], sentinel: true });
    await writeFile(sentinelPath, sentinel, "utf8");
    await symlink(sentinelPath, outputJsonPath);

    try {
      await execScript([
        "--api-base",
        server.url,
        "--output-json",
        outputJsonPath,
        "--public-resource-root",
        path.join(root, "public/resources/workbench")
      ]);

      expect(await readFile(sentinelPath, "utf8")).toBe(sentinel);
      expect(JSON.parse(await readFile(outputJsonPath, "utf8")).metadata.excludedResourceIds).toEqual(["retired-card"]);
      expect((await lstat(outputJsonPath)).isSymbolicLink()).toBe(false);
      expect(JSON.parse(await readFile(outputJsonPath, "utf8")).resources).toHaveLength(1);
      expect((await readdir(root)).filter((entry) => entry.startsWith("workbenchSyncedResources.json.tmp-"))).toEqual([]);
    } finally {
      await server.close();
    }
  });

  it("loads all card details from /api/sync-source in one request instead of N+1 /api/card calls", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-bulk-"));
    roots.push(root);
    const cards = [
      listItem("exact-commentary", "commentary", "精确注释"),
      listItem("unsynced-commentary", "commentary", "未同步注释", "temporarily_unsynced")
    ];
    const details = {
      "exact-commentary": detail({
        id: "exact-commentary",
        kind: "commentary",
        title: "精确注释",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        syncStatus: "syncable",
        verses: ["Gen.1.1"]
      }),
      "unsynced-commentary": detail({
        id: "unsynced-commentary",
        kind: "commentary",
        title: "未同步注释",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
        primaryAnchor: "Gen.1.1",
        syncStatus: "temporarily_unsynced",
        verses: ["Gen.1.1"]
      })
    };
    const hits = { card: 0, cards: 0, syncSource: 0 };
    const server = await startFakeApi({
      cards,
      details,
      hits,
      syncSource: {
        cards: Object.values(details),
        summary: { total: 2, bySyncStatus: { syncable: 1, temporarily_unsynced: 1 } }
      }
    });
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");

    try {
      const { stdout } = await execScript([
        "--api-base",
        server.url,
        "--output-json",
        outputJsonPath,
        "--public-resource-root",
        path.join(root, "public/resources/workbench")
      ]);
      const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));

      expect(hits.syncSource).toBe(1);
      expect(hits.card).toBe(0);
      expect(hits.cards).toBe(0);
      expect(payload.resources.map((resource) => resource.id)).toEqual(["exact-commentary"]);
      expect(payload.metadata.excludedCounts).toEqual({ temporarily_unsynced: 1 });
      expect(stdout).toContain("sync-source");
    } finally {
      await server.close();
    }
  });

  it("accepts a local --cards-file and does not call the Edit API", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-cards-file-"));
    roots.push(root);
    const cardsFile = path.join(root, "cards.json");
    await writeFile(
      cardsFile,
      JSON.stringify({
        cards: [
          detail({
            id: "exact-commentary",
            kind: "commentary",
            title: "精确注释",
            coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
            primaryAnchor: "Gen.1.1",
            syncStatus: "syncable",
            verses: ["Gen.1.1"]
          })
        ],
        summary: { total: 1 }
      }),
      "utf8"
    );
    const hits = { card: 0, cards: 0, syncSource: 0 };
    const server = await startFakeApi({
      cards: [listItem("should-not-fetch", "commentary", "不应请求")],
      details: {},
      hits
    });
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");

    try {
      const { stdout } = await execScript([
        "--api-base",
        server.url,
        "--cards-file",
        cardsFile,
        "--output-json",
        outputJsonPath,
        "--public-resource-root",
        path.join(root, "public/resources/workbench")
      ]);
      const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
      expect(hits.syncSource).toBe(0);
      expect(hits.cards).toBe(0);
      expect(hits.card).toBe(0);
      expect(payload.resources.map((resource) => resource.id)).toEqual(["exact-commentary"]);
      expect(stdout).toContain("cards-file");
    } finally {
      await server.close();
    }
  });

  it("skips recopying an image whose destination already matches the source size and mtime", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-skip-copy-"));
    roots.push(root);
    const sourceImage = path.join(root, "source.png");
    await writeFile(sourceImage, Buffer.from("89504e470d0a1a0a", "hex"));
    const sourceLedger = path.join(root, "source-ledger.jsonl");
    await writeFile(sourceLedger, `${JSON.stringify({ assetPath: sourceImage })}\n`, "utf8");
    const cards = [listItem("image-card", "image", "图片卡")];
    const details = {
      "image-card": detail({
        id: "image-card",
        kind: "image",
        title: "图片卡",
        coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.2" }],
        primaryAnchor: "Gen.1.1",
        sourceLedger,
        sourceLine: 1,
        verses: ["Gen.1.1", "Gen.1.2"]
      })
    };
    const server = await startFakeApi({ cards, details });
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");
    const args = [
      "--api-base",
      server.url,
      "--output-json",
      outputJsonPath,
      "--public-resource-root",
      publicResourceRoot
    ];

    try {
      await execScript(args);
      const destPath = path.join(publicResourceRoot, "01_创世记", "image-card.png");
      const firstStat = await stat(destPath);
      await new Promise((resolve) => setTimeout(resolve, 20));
      const { stdout } = await execScript(args);
      const secondStat = await stat(destPath);

      expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs);
      expect(secondStat.size).toBe(firstStat.size);
      expect(stdout).toContain("skipped 1 unchanged");
    } finally {
      await server.close();
    }
  });

  it("upserts one commentary into an existing payload without pulling excluded cards in", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-patch-insert-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");
    const kept = commentaryDetail("kept-commentary", "已在阅读台", "syncable");
    const parked = commentaryDetail("parked-unsynced", "未同步抽屉", "temporarily_unsynced");
    const incoming = commentaryDetail("incoming-commentary", "新插入注释", "syncable");

    await syncWorkbenchFromCards({
      cards: [kept, parked],
      outputJsonPath,
      publicResourceRoot,
      summary: commentarySummary({ syncable: 1, temporarily_unsynced: 1 }, 2)
    });

    const result = await patchWorkbenchSyncedResources({
      cards: [incoming],
      outputJsonPath,
      publicResourceRoot,
      summary: commentarySummary({ syncable: 2, temporarily_unsynced: 1 }, 3)
    });

    const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(result.count).toBe(2);
    expect(payload.resources.map((resource) => resource.id)).toEqual([
      "kept-commentary",
      "incoming-commentary"
    ]);
    expect(payload.resources.find((resource) => resource.id === "incoming-commentary").title).toBe("新插入注释");
    expect(payload.metadata.excludedResourceIds).toEqual(["parked-unsynced"]);
    expect(payload.metadata.excludedCounts).toEqual({ temporarily_unsynced: 1 });
    expect(payload.metadata.selectedCounts).toEqual({ commentary: 2, image: 0, total: 2 });
    expect(payload.metadata.totalWorkbenchCards).toBe(3);
  });

  it("removes one selected card from the payload and leaves the other selected card in place", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-patch-remove-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");
    const kept = commentaryDetail("kept-commentary", "留在阅读台", "syncable");
    const leaving = commentaryDetail("leaving-commentary", "拔出这一张", "syncable");

    await syncWorkbenchFromCards({
      cards: [kept, leaving],
      outputJsonPath,
      publicResourceRoot,
      summary: commentarySummary({ syncable: 2 }, 2)
    });

    const unsyncedLeaving = commentaryDetail("leaving-commentary", "拔出这一张", "temporarily_unsynced");
    await patchWorkbenchSyncedResources({
      cards: [unsyncedLeaving],
      outputJsonPath,
      publicResourceRoot,
      summary: commentarySummary({ syncable: 1, temporarily_unsynced: 1 }, 2)
    });

    const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(payload.resources.map((resource) => resource.id)).toEqual(["kept-commentary"]);
    expect(payload.metadata.excludedResourceIds).toEqual(["leaving-commentary"]);
    expect(payload.metadata.excludedCounts).toEqual({ temporarily_unsynced: 1 });
    expect(payload.metadata.selectedCounts.total).toBe(1);
    expect(payload.metadata.totalWorkbenchCards).toBe(2);
  });

  it("copies only the patched image and leaves the other image file untouched", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-patch-image-"));
    roots.push(root);
    const firstSource = path.join(root, "first.png");
    const secondSource = path.join(root, "second.png");
    await writeFile(firstSource, Buffer.from("89504e470d0a1a0a11", "hex"));
    await writeFile(secondSource, Buffer.from("89504e470d0a1a0a22", "hex"));
    const firstLedger = path.join(root, "first-ledger.jsonl");
    const secondLedger = path.join(root, "second-ledger.jsonl");
    await writeFile(firstLedger, `${JSON.stringify({ assetPath: firstSource })}\n`, "utf8");
    await writeFile(secondLedger, `${JSON.stringify({ assetPath: secondSource })}\n`, "utf8");
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");
    const firstImage = imageDetail("first-image", "第一张图", firstLedger);
    const secondImage = imageDetail("second-image", "第二张图", secondLedger);

    await syncWorkbenchFromCards({
      cards: [firstImage],
      outputJsonPath,
      publicResourceRoot,
      summary: {
        bySyncStatus: { syncable: 1 },
        byType: { image: 1 },
        softDeleted: 0,
        total: 1
      }
    });
    const firstDest = path.join(publicResourceRoot, "01_创世记", "first-image.png");
    const firstStat = await stat(firstDest);
    await new Promise((resolve) => setTimeout(resolve, 20));

    const result = await patchWorkbenchSyncedResources({
      cards: [secondImage],
      outputJsonPath,
      publicResourceRoot,
      summary: {
        bySyncStatus: { syncable: 2 },
        byType: { image: 2 },
        softDeleted: 0,
        total: 2
      }
    });

    const secondDest = path.join(publicResourceRoot, "01_创世记", "second-image.png");
    const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(result.copiedImageCount).toBe(1);
    expect(payload.resources.map((resource) => resource.id)).toEqual(["first-image", "second-image"]);
    expect(await readFile(secondDest)).toEqual(await readFile(secondSource));
    expect((await stat(firstDest)).mtimeMs).toBe(firstStat.mtimeMs);
  });

  it("updates an already selected card in place without changing exclusion tombstones", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-patch-update-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");
    const selected = commentaryDetail("selected-commentary", "旧标题", "syncable");
    const parked = commentaryDetail("parked-unsynced", "未同步抽屉", "temporarily_unsynced");

    await syncWorkbenchFromCards({
      cards: [selected, parked],
      outputJsonPath,
      publicResourceRoot,
      summary: commentarySummary({ syncable: 1, temporarily_unsynced: 1 }, 2)
    });

    await patchWorkbenchSyncedResources({
      cards: [commentaryDetail("selected-commentary", "改过的标题", "syncable")],
      outputJsonPath,
      publicResourceRoot,
      summary: commentarySummary({ syncable: 1, temporarily_unsynced: 1 }, 2)
    });

    const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(payload.resources).toHaveLength(1);
    expect(payload.resources[0]).toMatchObject({
      id: "selected-commentary",
      title: "改过的标题"
    });
    expect(payload.metadata.excludedResourceIds).toEqual(["parked-unsynced"]);
    expect(payload.metadata.totalWorkbenchCards).toBe(2);
  });

  it("permanently drops one recycle-bin card from the payload without rewriting the others", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-patch-purge-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");
    const kept = commentaryDetail("kept-commentary", "留在阅读台", "syncable");
    const trashed = commentaryDetail("trashed-commentary", "回收站这一张", "temporarily_unsynced");
    trashed.review.softDeleted = true;

    await syncWorkbenchFromCards({
      cards: [kept, trashed],
      outputJsonPath,
      publicResourceRoot,
      summary: {
        bySyncStatus: { syncable: 1 },
        byType: { commentary: 2 },
        softDeleted: 1,
        total: 2
      }
    });
    const seeded = JSON.parse(await readFile(outputJsonPath, "utf8"));
    seeded.resources[0].title = "SENTINEL-KEEP";
    await writeFile(outputJsonPath, `${JSON.stringify(seeded, null, 2)}\n`, "utf8");

    await patchWorkbenchSyncedResources({
      dropIds: ["trashed-commentary"],
      outputJsonPath,
      publicResourceRoot,
      summary: commentarySummary({ syncable: 1 }, 1)
    });

    const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(payload.resources.map((resource) => resource.id)).toEqual(["kept-commentary"]);
    expect(payload.resources[0].title).toBe("SENTINEL-KEEP");
    expect(payload.metadata.excludedResourceIds).toEqual([]);
    expect(payload.metadata.excludedCounts).toEqual({});
    expect(payload.metadata.selectedCounts.total).toBe(1);
    expect(payload.metadata.totalWorkbenchCards).toBe(1);
  });

  it("permanently drops a still-selected card without turning it into a tombstone", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-patch-purge-selected-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");
    const kept = commentaryDetail("kept-commentary", "留在阅读台", "syncable");
    const doomed = commentaryDetail("doomed-commentary", "还在阅读台里", "syncable");

    await syncWorkbenchFromCards({
      cards: [kept, doomed],
      outputJsonPath,
      publicResourceRoot,
      summary: commentarySummary({ syncable: 2 }, 2)
    });
    const seeded = JSON.parse(await readFile(outputJsonPath, "utf8"));
    seeded.resources[0].title = "SENTINEL-KEEP";
    await writeFile(outputJsonPath, `${JSON.stringify(seeded, null, 2)}\n`, "utf8");

    await patchWorkbenchSyncedResources({
      dropIds: ["doomed-commentary"],
      outputJsonPath,
      publicResourceRoot,
      summary: commentarySummary({ syncable: 1 }, 1)
    });

    const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(payload.resources.map((resource) => resource.id)).toEqual(["kept-commentary"]);
    expect(payload.resources[0].title).toBe("SENTINEL-KEEP");
    expect(payload.metadata.excludedResourceIds).toEqual([]);
    expect(payload.metadata.totalWorkbenchCards).toBe(1);
  });

  it("drops one recycle-bin tombstone incrementally when the remaining workbench summary would hide leftover tombstones", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-patch-purge-ghost-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");
    const kept = commentaryDetail("kept-commentary", "留在阅读台", "syncable");
    const ghostA = commentaryDetail("ghost-a", "已删墓碑 A", "temporarily_unsynced");
    const ghostB = commentaryDetail("ghost-b", "已删墓碑 B", "temporarily_unsynced");
    ghostA.review.softDeleted = true;
    ghostB.review.softDeleted = true;

    await syncWorkbenchFromCards({
      cards: [kept, ghostA, ghostB],
      outputJsonPath,
      publicResourceRoot,
      summary: {
        bySyncStatus: { syncable: 1 },
        byType: { commentary: 3 },
        softDeleted: 2,
        total: 3
      }
    });
    const seeded = JSON.parse(await readFile(outputJsonPath, "utf8"));
    seeded.resources[0].title = "SENTINEL-KEEP";
    await writeFile(outputJsonPath, `${JSON.stringify(seeded, null, 2)}\n`, "utf8");

    await patchWorkbenchSyncedResources({
      dropIds: ["ghost-a"],
      outputJsonPath,
      publicResourceRoot,
      summary: commentarySummary({ syncable: 1 }, 1)
    });

    const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
    expect(payload.resources.map((resource) => resource.id)).toEqual(["kept-commentary"]);
    expect(payload.resources[0].title).toBe("SENTINEL-KEEP");
    expect(payload.metadata.excludedResourceIds).toEqual(["ghost-b"]);
    expect(payload.metadata.excludedCounts).toEqual({ soft_deleted: 1 });
    expect(payload.metadata.totalWorkbenchCards).toBe(2);
    expect(payload.metadata.workbenchSummary).toMatchObject({
      softDeleted: 1,
      total: 2
    });
  });

  it("keeps image and commentary exclusion kinds aligned with the summary after dropping a tombstone", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-sync-workbench-patch-purge-kinds-"));
    roots.push(root);
    const outputJsonPath = path.join(root, "workbenchSyncedResources.json");
    const publicResourceRoot = path.join(root, "public/resources/workbench");
    const kept = commentaryDetail("kept-commentary", "留在阅读台", "syncable");
    const parkedImage = imageDetail("parked-image", "回收站图片", "/tmp/parked-image.jsonl");
    parkedImage.review.softDeleted = true;
    parkedImage.review.syncStatus = "temporarily_unsynced";
    const ghostCommentary = commentaryDetail("ghost-commentary", "回收站文字", "temporarily_unsynced");
    ghostCommentary.review.softDeleted = true;

    await syncWorkbenchFromCards({
      cards: [kept, parkedImage, ghostCommentary],
      outputJsonPath,
      publicResourceRoot,
      summary: {
        bySyncStatus: { syncable: 1 },
        byType: { commentary: 2, image: 1 },
        softDeleted: 2,
        total: 3
      }
    });

    await patchWorkbenchSyncedResources({
      dropIds: ["ghost-commentary"],
      outputJsonPath,
      publicResourceRoot,
      summary: commentarySummary({ syncable: 1 }, 1)
    });

    const payload = JSON.parse(await readFile(outputJsonPath, "utf8"));
    const selected = payload.metadata.selectedCounts;
    const byKind = payload.metadata.excludedCountsByKind ?? {};
    const byType = payload.metadata.workbenchSummary.byType;
    expect((byType.image ?? 0)).toBe((selected.image ?? 0) + (byKind.image ?? 0));
    expect((byType.commentary ?? 0)).toBe((selected.commentary ?? 0) + (byKind.commentary ?? 0));
    expect(payload.metadata.excludedResourceIds).toEqual(["parked-image"]);
  });
});

function listItem(id, kind, title, syncStatus, bookFolder = "01_创世记") {
  return {
    bookFolder,
    id,
    kind,
    primaryAnchor: "Gen.1.1",
    reviewStatus: "needs_review",
    riskLevel: "low",
    syncStatus,
    title
  };
}

function commentaryDetail(id, title, syncStatus) {
  return detail({
    id,
    kind: "commentary",
    title,
    coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
    primaryAnchor: "Gen.1.1",
    syncStatus,
    verses: ["Gen.1.1"]
  });
}

function commentarySummary(bySyncStatus, total) {
  return {
    bySyncStatus,
    byType: { commentary: total },
    softDeleted: 0,
    total
  };
}

function imageDetail(id, title, sourceLedger) {
  return detail({
    id,
    kind: "image",
    title,
    coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.2" }],
    primaryAnchor: "Gen.1.1",
    sourceLedger,
    sourceLine: 1,
    verses: ["Gen.1.1", "Gen.1.2"]
  });
}

function detail({ bookFolder = "01_创世记", bookIntro = null, coverageRanges, id, kind, navigationPrimaryAnchors = [], primaryAnchor, resourceId = id, softDeleted = false, sourceLedger, sourceLine, syncStatus = "not_ready", title, verses }) {
  return {
    draft: { body: `${title}正文`, title, type: kind },
    id,
    kind,
    navigation: {
      bookIntro,
      coverageRanges,
      primaryAnchor,
      relatedRanges: [],
      verses
    },
    review: {
      riskFlags: [],
      riskLevel: "low",
      softDeleted,
      status: "needs_review",
      syncStatus
    },
    sourceRef: {
      bookFolder,
      line: sourceLine ?? 1,
      sourceFile: sourceLedger ?? "/tmp/commentary-ledger.jsonl",
      sourceKey: id,
      sourceLabel: "fixture"
    },
    syncDraft: {
      body: `${title}正文`,
      debugMeta: { navigationPrimaryAnchors },
      id: resourceId,
      primaryAnchor,
      title,
      type: kind,
      verses
    }
  };
}

function execScript(args) {
  return new Promise((resolve, reject) => {
    execFile("node", [scriptPath, ...args], { encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function startFakeApi({ cards, details, hits, syncSource }) {
  const activeCards = cards.filter((card) => card.softDeleted !== true);
  const countBy = (items, key) => items.reduce((counts, item) => {
    const value = item[key];
    if (value) counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/api/sync-source") {
      if (hits) hits.syncSource = (hits.syncSource ?? 0) + 1;
      if (!syncSource) {
        response.statusCode = 404;
        response.end();
        return;
      }
      sendJson(response, syncSource);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/cards") {
      if (hits) hits.cards = (hits.cards ?? 0) + 1;
      sendJson(response, {
        cards,
        summary: {
          byReviewStatus: countBy(activeCards, "reviewStatus"),
          byRiskLevel: countBy(activeCards, "riskLevel"),
          bySyncStatus: countBy(activeCards, "syncStatus"),
          byType: countBy(activeCards, "kind"),
          softDeleted: cards.length - activeCards.length,
          total: cards.length
        }
      });
      return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/card/")) {
      if (hits) hits.card = (hits.card ?? 0) + 1;
      if (syncSource) {
        response.statusCode = 500;
        response.end("n+1 card detail is disabled when sync-source is available");
        return;
      }
      const cardId = decodeURIComponent(url.pathname.replace("/api/card/", ""));
      sendJson(response, details[cardId]);
      return;
    }
    response.statusCode = 404;
    response.end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
    url: `http://127.0.0.1:${address.port}`
  };
}

function sendJson(response, payload) {
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(payload));
}
