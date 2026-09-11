import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bibleEncyclopediaResourceCategory,
  bibleEncyclopediaResourceVersion,
  bibleEncyclopediaSource,
  bibleEncyclopediaSourcePdf,
  bibleEncyclopediaUserParts,
  emptyBibleEncyclopediaCategoryCounts,
  loadBibleEncyclopediaResourcePayload,
  loadBibleEncyclopediaResources,
  resetBibleEncyclopediaResourceCache,
  validateBibleEncyclopediaResourcePayload,
  type BibleEncyclopediaResourcePayload,
} from "./bibleEncyclopediaResources";

const validVerseIds = new Set(["Gen.1.1", "Gen.1.2", "John.3.16"]);

function validResourcePayload(): BibleEncyclopediaResourcePayload {
  const categoryCounts = emptyBibleEncyclopediaCategoryCounts();
  categoryCounts["全部新旧约人名"] = 1;
  categoryCounts["重要人名族名"] = 1;

  return {
    metadata: {
      category: bibleEncyclopediaResourceCategory,
      categoryCounts,
      generatedAt: "2026-08-01T12:00:00.000Z",
      resourceType: "link",
      schemaVersion: 1,
      source: bibleEncyclopediaSource,
      sourcePdf: bibleEncyclopediaSourcePdf,
      totalResources: 1,
      userParts: [...bibleEncyclopediaUserParts],
      version: bibleEncyclopediaResourceVersion,
    },
    resources: [
      {
        body: "亚伯拉罕条目正文。",
        category: bibleEncyclopediaResourceCategory,
        debugMeta: {
          heading: "亚伯拉罕",
          matchedInventory: true,
          page: 1,
          pageEnd: 1,
          pageLabel: "p.1",
          pdfPage: 64,
          pdfPageEnd: 64,
          primaryAnchor: "Gen.1.1",
          sourceStream: "bible-encyclopedia-dictionary",
          subtype: "encyclopedia-entry",
          userParts: ["全部新旧约人名", "重要人名族名"],
        },
        id: "bible-encyclopedia-abraham",
        primaryAnchor: "Gen.1.1",
        searchText: "亚伯拉罕",
        source: bibleEncyclopediaSource,
        summary: "亚伯拉罕条目正文。",
        title: "亚伯拉罕",
        type: "link",
        verses: ["Gen.1.1", "Gen.1.2"],
      },
    ],
  };
}

describe("bibleEncyclopediaResources", () => {
  afterEach(() => {
    resetBibleEncyclopediaResourceCache();
    vi.unstubAllGlobals();
  });

  it("loads the generated production encyclopedia payload", async () => {
    const payload = await loadBibleEncyclopediaResourcePayload();
    const resources = await loadBibleEncyclopediaResources();

    expect(payload.metadata).toMatchObject({
      category: "百科",
      resourceType: "link",
      source: "圣经百科辞典",
      sourcePdf: "/Users/simon/OHB/圣经百科辞典.pdf",
      version: "bible-encyclopedia-resources-v1",
    });
    expect(payload.metadata.userParts).toEqual([...bibleEncyclopediaUserParts]);
    expect(payload.metadata.totalResources).toBeGreaterThan(0);
    expect(Object.values(payload.metadata.categoryCounts).every((count) => count > 0)).toBe(true);
    expect(resources).toBe(payload.resources);
    expect(resources).toHaveLength(payload.metadata.totalResources);
    expect(resources[0]).toMatchObject({ category: "百科", source: "圣经百科辞典", type: "link" });
  });

  it("accepts anchored encyclopedia link resources with approved category metadata", () => {
    const payload = validateBibleEncyclopediaResourcePayload(validResourcePayload(), validVerseIds);

    expect(payload.resources[0]).toMatchObject({
      category: "百科",
      primaryAnchor: "Gen.1.1",
      source: "圣经百科辞典",
      type: "link",
      verses: ["Gen.1.1", "Gen.1.2"],
    });
  });

  it("rejects duplicate resource IDs", () => {
    const payload = validResourcePayload();
    payload.metadata.totalResources = 2;
    payload.metadata.categoryCounts["全部新旧约人名"] = 2;
    payload.metadata.categoryCounts["重要人名族名"] = 2;
    payload.resources.push({ ...payload.resources[0] });

    expect(() => validateBibleEncyclopediaResourcePayload(payload, validVerseIds)).toThrow(/duplicate resource id/i);
  });

  it("rejects resources outside the unified encyclopedia link contract", () => {
    const payload = validResourcePayload();
    payload.resources[0] = {
      ...payload.resources[0],
      category: "字典" as never,
      type: "commentary" as never,
    };

    expect(() => validateBibleEncyclopediaResourcePayload(payload, validVerseIds)).toThrow(/type must be link/i);
  });

  it("rejects category count mismatches and unsupported user parts", () => {
    const payload = validResourcePayload();
    payload.metadata.categoryCounts["全部新旧约人名"] = 0;

    expect(() => validateBibleEncyclopediaResourcePayload(payload, validVerseIds)).toThrow(/categoryCounts.*全部新旧约人名/i);

    const unsupportedPartPayload = validResourcePayload();
    unsupportedPartPayload.resources[0].debugMeta!.userParts = ["历史人物" as never];

    expect(() => validateBibleEncyclopediaResourcePayload(unsupportedPartPayload, validVerseIds)).toThrow(/unsupported category/i);
  });

  it("rejects empty bodies and noncanonical anchors", () => {
    const emptyBodyPayload = validResourcePayload();
    emptyBodyPayload.resources[0].body = " ";

    expect(() => validateBibleEncyclopediaResourcePayload(emptyBodyPayload, validVerseIds)).toThrow(/body must be a nonempty string/i);

    const badVersePayload = validResourcePayload();
    badVersePayload.resources[0].verses = ["Gen.999.1"];

    expect(() => validateBibleEncyclopediaResourcePayload(badVersePayload, validVerseIds)).toThrow(/verses\[0\].*canonical VerseId/i);
  });

  it("rejects primary anchors not included in the resource verses", () => {
    const payload = validResourcePayload();
    payload.resources[0].primaryAnchor = "John.3.16";

    expect(() => validateBibleEncyclopediaResourcePayload(payload, validVerseIds)).toThrow(/primaryAnchor must be included in verses/i);
  });

  it("clears a rejected cached payload so the next load can retry", async () => {
    const validPayload = validResourcePayload();
    const invalidPayload = {
      ...validPayload,
      metadata: {
        ...validPayload.metadata,
        totalResources: 2,
      },
    };
    const payloadLoader = vi.fn()
      .mockResolvedValueOnce(invalidPayload)
      .mockResolvedValueOnce(validPayload);

    await expect(loadBibleEncyclopediaResourcePayload({ payloadLoader, validVerseIds })).rejects.toThrow(/totalResources/i);
    await expect(loadBibleEncyclopediaResourcePayload({ payloadLoader, validVerseIds })).resolves.toBe(validPayload);
    expect(payloadLoader).toHaveBeenCalledTimes(2);
  });
});
