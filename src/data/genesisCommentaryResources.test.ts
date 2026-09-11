import { describe, expect, it } from "vitest";

import { loadGenesisCommentaryResourcePayload, loadGenesisCommentaryResources } from "./genesisCommentaryResources";
import { genesisResources } from "./genesisResources";
import { sampleResources } from "./sampleLibrary";

const genesisVersePattern = /^Gen\.\d+\.\d+$/;

describe("genesisCommentaryResources", () => {
  it("loads every text commentary card from the Resources ledger", async () => {
    const genesisCommentaryResources = await loadGenesisCommentaryResources();

    expect(genesisCommentaryResources).toHaveLength(1625);
    expect(new Set(genesisCommentaryResources.map((resource) => resource.id)).size).toBe(1625);
    expect(genesisCommentaryResources.every((resource) => resource.type === "commentary")).toBe(true);
  });

  it("does not publish CMC rows that only repeat scripture text", async () => {
    const genesisCommentaryResources = await loadGenesisCommentaryResources();
    const resourceIds = new Set(genesisCommentaryResources.map((resource) => resource.id));

    expect(resourceIds.has("cmc-gen-39-11")).toBe(false);
    expect(resourceIds.has("cmc-gen-39-12")).toBe(false);
    expect(resourceIds.has("cmc-gen-39-13")).toBe(false);

    const studyNoteForJosephsTemptation = genesisCommentaryResources.find(
      (resource) => resource.id === "study-note-gen-39-10-12",
    );
    expect(studyNoteForJosephsTemptation).toMatchObject({
      primaryAnchor: "Gen.39.10",
      verses: ["Gen.39.10", "Gen.39.11", "Gen.39.12"],
      source: "研读本圣经·创世记",
    });
    expect(studyNoteForJosephsTemptation?.body).toContain("约瑟坚决拒绝波提乏妻子的挑逗");

    const studyNoteForFalseAccusation = genesisCommentaryResources.find(
      (resource) => resource.id === "study-note-gen-39-13-15",
    );
    expect(studyNoteForFalseAccusation).toMatchObject({
      primaryAnchor: "Gen.39.13",
      verses: ["Gen.39.13", "Gen.39.14", "Gen.39.15"],
      source: "研读本圣经·创世记",
    });
    expect(studyNoteForFalseAccusation?.body).toContain("说服家里的人支持她");
  });

  it("keeps reader-facing content and audit metadata for every card", async () => {
    const genesisCommentaryResources = await loadGenesisCommentaryResources();

    for (const resource of genesisCommentaryResources) {
      expect(resource.title, resource.id).toBeTruthy();
      expect(resource.body, resource.id).toBeTruthy();
      expect(resource.summary, resource.id).toBeTruthy();
      expect(resource.searchText, resource.id).toBeTruthy();
      expect(resource.source, resource.id).toBeTruthy();
      expect(resource.debugMeta?.commentaryKey, resource.id).toBe(resource.id);
      expect(resource.debugMeta?.sourceLedgerPath, resource.id).toBe(
        "/Users/simon/OHB/Resources/01_创世记/无图经文注释卡片台账_20260514_181756/资源审计台账.jsonl",
      );
      expect(resource.debugMeta?.sourcePdfPath, resource.id).toMatch(/^\/Users\/simon\/OHB\/文档\/创世纪\/.+\.pdf$/);
      expect(resource.debugMeta?.sourcePdfSha256, resource.id).toMatch(/^[a-f0-9]{64}$/);
      expect(resource.debugMeta?.sourceEvidenceSnippet, resource.id).toBeTruthy();
      expect(["needs_review", "verified"], resource.id).toContain(resource.debugMeta?.reviewStatus);
      expect(["not_ready", "verified"], resource.id).toContain(resource.debugMeta?.syncStatus);
    }
  });

  it("separates display coverage from the primary navigation anchor", async () => {
    const genesisCommentaryResources = await loadGenesisCommentaryResources();

    for (const resource of genesisCommentaryResources) {
      expect(resource.verses.length, resource.id).toBeGreaterThan(0);
      expect(resource.primaryAnchor, resource.id).toMatch(genesisVersePattern);
      expect(resource.verses, resource.id).toContain(resource.primaryAnchor);
      for (const verse of resource.verses) {
        expect(verse, resource.id).toMatch(genesisVersePattern);
      }
    }

    const broadStudyNote = genesisCommentaryResources.find((resource) => resource.id === "study-note-gen-1-1-2-3");
    expect(broadStudyNote?.primaryAnchor).toBe("Gen.1.1");
    expect(broadStudyNote?.verses).toEqual(expect.arrayContaining(["Gen.1.1", "Gen.1.31", "Gen.2.3"]));
    expect(broadStudyNote?.debugMeta?.navigationRisk).toBe("broad-range");

    const repairedRange = genesisCommentaryResources.find((resource) => resource.id === "cmc-gen-44-6-10");
    expect(repairedRange?.primaryAnchor).toBe("Gen.44.6");
    expect(repairedRange?.verses).toEqual(["Gen.44.6", "Gen.44.7", "Gen.44.8", "Gen.44.9", "Gen.44.10"]);
    expect(repairedRange?.debugMeta?.navigationRepair).toContain("coverage range was expanded");
  });

  it("preserves source stream counts and longform commentary status", async () => {
    const genesisCommentaryResources = await loadGenesisCommentaryResources();

    const streamCounts = genesisCommentaryResources.reduce<Record<string, number>>((counts, resource) => {
      const stream = resource.debugMeta?.sourceStream ?? "unknown";
      counts[stream] = (counts[stream] ?? 0) + 1;
      return counts;
    }, {});

    expect(streamCounts).toEqual({
      "cmc-comprehensive-commentary": 866,
      "message-genesis-1-11-supplemental": 8,
      "study-bible-notes": 751,
    });
    expect(genesisCommentaryResources.filter((resource) => (resource.debugMeta?.bodyChars ?? 0) > 3000)).toHaveLength(8);
    expect(
      genesisCommentaryResources.find((resource) => resource.id === "message-gen-2-4-3-24-expelled-from-eden"),
    ).toMatchObject({
      primaryAnchor: "Gen.2.4",
      debugMeta: {
        bodyChars: 42453,
        navigationRisk: "broad-range",
        sourceStream: "message-genesis-1-11-supplemental",
      },
    });
  });

  it("keeps the generated commentary payload as the async app-facing extension to starter resources", async () => {
    const payload = await loadGenesisCommentaryResourcePayload();
    const genesisCommentaryResources = payload.resources;
    const sampleResourceIds = new Set(sampleResources.map((resource) => resource.id));
    const commentaryResourceIds = new Set(genesisCommentaryResources.map((resource) => resource.id));

    expect(payload.metadata).toMatchObject({
      sourceGeneratedAt: "2026-05-14T18:17:56+08:00",
      sourceLedgerPath: "/Users/simon/OHB/Resources/01_创世记/无图经文注释卡片台账_20260514_181756/资源审计台账.jsonl",
      totalResources: 1625,
    });
    expect(sampleResources).toHaveLength(genesisResources.length + 4);
    expect(sampleResourceIds.has("cmc-gen-1-1")).toBe(false);
    expect(commentaryResourceIds.has("cmc-gen-1-1")).toBe(true);

    const appResources = [...sampleResources, ...genesisCommentaryResources];
    expect(appResources).toHaveLength(genesisResources.length + genesisCommentaryResources.length + 4);
    expect(appResources.find((resource) => resource.id === "cmc-gen-1-1")).toMatchObject({
      title: "创世记 1:1 综合解读",
      type: "commentary",
      primaryAnchor: "Gen.1.1",
      source: "圣经综合解读·创世记",
    });
  });
});
