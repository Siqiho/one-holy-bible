import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const scriptPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "syncWorkbenchResources.mjs");
const roots = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

describe("syncWorkbenchResources", () => {
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

function detail({ bookFolder = "01_创世记", bookIntro = null, coverageRanges, id, kind, navigationPrimaryAnchors = [], primaryAnchor, sourceLedger, sourceLine, syncStatus = "not_ready", title, verses }) {
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
      id,
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

async function startFakeApi({ cards, details }) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/api/cards") {
      sendJson(response, {
        cards,
        summary: {
          byReviewStatus: { needs_review: cards.length },
          byRiskLevel: { low: cards.length },
          bySyncStatus: { temporarily_unsynced: 1 },
          byType: { commentary: 3, image: 1 },
          total: cards.length
        }
      });
      return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/card/")) {
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
