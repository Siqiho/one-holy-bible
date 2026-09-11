import { describe, expect, it } from "vitest";

import { loadBibleEveryoneImageResourcePayload, loadBibleEveryoneImageResources } from "./bibleEveryoneImageResources";

describe("bibleEveryoneImageResources", () => {
  it("loads all BibleEveryone image database cards as image resources", async () => {
    const payload = await loadBibleEveryoneImageResourcePayload();
    const resources = await loadBibleEveryoneImageResources();

    expect(payload.metadata.sourceUrl).toBe("https://bibleeveryone.com/imagedb.php");
    expect(payload.metadata.totalImages).toBe(512);
    expect(resources).toHaveLength(512);
    expect(resources).toBe(payload.resources);
    expect(new Set(resources.map((resource) => resource.id)).size).toBe(resources.length);
    expect(resources.every((resource) => resource.type === "image")).toBe(true);
  });

  it("keeps local image assets and navigation context for every image card", async () => {
    const payload = await loadBibleEveryoneImageResourcePayload();
    const resources = await loadBibleEveryoneImageResources();
    const countedNavigationLabels = new Map<string, number>();

    for (const resource of resources) {
      expect(resource.assetPath, resource.id).toMatch(/^\/resources\/bibleeveryone\/.+\.(?:jpg|jpeg|png|webp|gif)$/i);
      expect(resource.source, resource.id).toBe("BibleEveryone 聖經圖庫");
      expect(resource.debugMeta?.sourceUrl, resource.id).toMatch(/^https:\/\/bibleeveryone\.com\/imagedb\.php/);
      expect(resource.debugMeta?.sourceImageUrl, resource.id).toMatch(/^https:\/\/bibleeveryone\.com\//);
      expect(resource.debugMeta?.storedRelativePath, resource.id).toMatch(/^public\/resources\/bibleeveryone\/.+/);
      expect(resource.debugMeta?.navigationLabels, resource.id).toEqual(expect.any(Array));
      expect((resource.debugMeta?.navigationLabels as string[]).length, resource.id).toBeGreaterThan(0);
      expect(resource.debugMeta?.unmappedNavigationLabels, resource.id).toEqual([]);
      expect(resource.debugMeta?.navigationPrimaryAnchors, resource.id).toEqual(resource.verses);

      if (resource.debugMeta?.navigationRisk === "unanchored-overview") {
        expect(resource.verses, resource.id).toEqual([]);
        expect(resource.primaryAnchor, resource.id).toBeUndefined();
        expect(resource.bookIntro, resource.id).toBeUndefined();
        expect(resource.debugMeta.coverageRanges, resource.id).toEqual([]);
      } else {
        expect(resource.debugMeta?.coverageRanges?.length, resource.id).toBeGreaterThan(0);
      }

      for (const label of resource.debugMeta?.navigationLabels ?? []) {
        countedNavigationLabels.set(label, (countedNavigationLabels.get(label) ?? 0) + 1);
      }
    }

    expect(Object.fromEntries(countedNavigationLabels)).toEqual(payload.metadata.navigationLabelCounts);
  });

  it("includes representative Biblical place cards with their source-page navigation labels", async () => {
    const resources = await loadBibleEveryoneImageResources();
    const kadeshBarnea = resources.find((resource) => resource.title.includes("加低斯巴尼亞"));

    expect(kadeshBarnea).toMatchObject({
      type: "image",
      title: "加低斯巴尼亞 Kadesh Barnea (曠野綠洲)",
      debugMeta: {
        navigationLabels: expect.arrayContaining([
          "亞伯拉罕生平旅程",
          "摩西出埃及之旅",
          "掃羅第三及第四場戰役",
          "大衛國土的擴展",
        ]),
      },
    });
  });

  it("anchors multi-context cards to every mapped source-page navigation path", async () => {
    const resources = await loadBibleEveryoneImageResources();
    const kadeshBarnea = resources.find((resource) => resource.title.includes("加低斯巴尼亞"));

    expect(kadeshBarnea?.verses).toEqual(expect.arrayContaining([
      "Gen.12.1",
      "Exod.13.17",
      "1Sam.14.47",
      "2Sam.8.1",
    ]));
    expect(kadeshBarnea?.primaryAnchor).toBe("Gen.12.1");
    expect(kadeshBarnea?.debugMeta?.navigationPrimaryAnchors).toEqual(expect.arrayContaining([
      "Gen.12.1",
      "Exod.13.17",
      "1Sam.14.47",
      "2Sam.8.1",
    ]));
  });

  it("does not pin broad BibleEveryone timeline maps to Genesis when visual content is a canon-level overview", async () => {
    const resources = await loadBibleEveryoneImageResources();
    const broadOnlyOverviewTitles = [
      "以色列獨立時期地圖",
      "埃及帝國地圖",
      "巴比倫帝國地圖",
      "希臘帝國地圖",
      "波斯帝國地圖",
      "聖經書卷全圖",
    ];

    const broadOnlyOverviews = broadOnlyOverviewTitles.map((title) => {
      const resource = resources.find((candidate) => candidate.title === title);
      expect(resource, title).toBeDefined();
      return resource!;
    });

    for (const resource of broadOnlyOverviews) {
      expect(resource.verses, resource.title).not.toContain("Gen.1.1");
      expect(resource.verses, resource.title).toEqual([]);
      expect(resource.bookIntro, resource.title).not.toBe("Gen");
      expect(resource.primaryAnchor, resource.title).not.toBe("Gen.1.1");
      expect(resource.primaryAnchor, resource.title).toBeUndefined();
      expect(resource.debugMeta?.navigationPrimaryAnchors, resource.title).not.toContain("Gen.1.1");
      expect(resource.debugMeta?.navigationPrimaryAnchors, resource.title).toEqual([]);
      expect(resource.debugMeta?.navigationRisk, resource.title).toBe("unanchored-overview");
      expect(resource.debugMeta?.unmappedNavigationLabels, resource.title).toEqual([]);
    }

    expect(resources.find((resource) => resource.title === "亞述帝國地圖")).toMatchObject({
      verses: ["2Kgs.17.24"],
      primaryAnchor: "2Kgs.17.24",
      debugMeta: {
        navigationPrimaryAnchors: ["2Kgs.17.24"],
      },
    });
    expect(resources.find((resource) => resource.title === "亞述帝國地圖")?.bookIntro).not.toBe("Gen");

    expect(resources.find((resource) => resource.title === "羅馬帝國地圖")).toMatchObject({
      verses: ["Luke.2.1"],
      primaryAnchor: "Luke.2.1",
      bookIntro: "Luke",
      debugMeta: {
        navigationPrimaryAnchors: ["Luke.2.1"],
      },
    });

    expect(resources.find((resource) => resource.title === "聖約2：與亞伯拉罕的約")).toMatchObject({
      verses: ["Gen.15.18"],
      primaryAnchor: "Gen.15.18",
      debugMeta: {
        navigationPrimaryAnchors: ["Gen.15.18"],
      },
    });
  });
});
