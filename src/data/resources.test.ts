import { describe, expect, it } from "vitest";

import type { StudyResource } from "../domain/resources";
import { mergeResourcesById, mergeStableAndWorkbenchResources } from "./resources";

function commentary(id: string, title: string): StudyResource {
  return {
    id,
    title,
    type: "commentary",
    verses: ["Gen.1.1"],
    primaryAnchor: "Gen.1.1",
    body: title,
  };
}

describe("mergeResourcesById", () => {
  it("keeps one resource per id and lets later generated sources override earlier ones", () => {
    const merged = mergeResourcesById(
      [commentary("cmc-gen-1-1", "旧 Genesis 注释")],
      [commentary("cmc-gen-1-1", "工作台同步注释"), commentary("cmc-gen-1-2", "工作台新增注释")],
    );

    expect(merged).toHaveLength(2);
    expect(merged.map((resource) => resource.id)).toEqual(["cmc-gen-1-1", "cmc-gen-1-2"]);
    expect(merged.find((resource) => resource.id === "cmc-gen-1-1")?.title).toBe("工作台同步注释");
  });
});

describe("mergeStableAndWorkbenchResources", () => {
  it("hides a tombstoned stable card without mutating the canonical stable list, then restores it later", () => {
    const hiddenStableCard = commentary("stable-hidden", "Canonical stable card");
    const visibleStableCard = commentary("stable-visible", "Always visible card");
    const stableResources = [hiddenStableCard, visibleStableCard];
    const workbenchResources = [commentary("workbench-card", "Workbench card")];

    const hiddenProjection = mergeStableAndWorkbenchResources(
      stableResources,
      workbenchResources,
      ["stable-hidden"],
    );

    expect(hiddenProjection.map((resource) => resource.id)).toEqual([
      "stable-visible",
      "workbench-card",
    ]);
    expect(stableResources).toEqual([hiddenStableCard, visibleStableCard]);

    const restoredProjection = mergeStableAndWorkbenchResources(
      stableResources,
      workbenchResources,
      [],
    );

    expect(restoredProjection.map((resource) => resource.id)).toEqual([
      "stable-hidden",
      "stable-visible",
      "workbench-card",
    ]);
    expect(restoredProjection[0]).toBe(hiddenStableCard);
  });

  it("overlays a workbench resource on the filtered stable projection by id", () => {
    const merged = mergeStableAndWorkbenchResources(
      [commentary("shared-card", "Canonical stable card")],
      [commentary("shared-card", "Workbench override")],
      [],
    );

    expect(merged).toEqual([commentary("shared-card", "Workbench override")]);
  });

  it("hides a stable image twin while its workbench card is present, and falls back to it when the workbench card is gone", () => {
    const stableImage = commentary("genesis-cmc-01-p015-img003", "2701 与三角数分解");
    const otherStable = commentary("genesis-cmc-01-p001-img000", "无工作台孪生卡");
    const workbenchTwin = commentary("document-image-p009-img002", "2701 与三角数分解");
    const unrelatedWorkbench = commentary("document-image-p009-img007", "另一张图");
    const twins = { "document-image-p009-img002": "genesis-cmc-01-p015-img003" };

    const deduped = mergeStableAndWorkbenchResources(
      [stableImage, otherStable],
      [workbenchTwin, unrelatedWorkbench],
      [],
      twins,
    );
    expect(deduped.map((resource) => resource.id)).toEqual([
      "genesis-cmc-01-p001-img000",
      "document-image-p009-img002",
      "document-image-p009-img007",
    ]);

    const workbenchTwinUnsynced = mergeStableAndWorkbenchResources(
      [stableImage, otherStable],
      [unrelatedWorkbench],
      [],
      twins,
    );
    expect(workbenchTwinUnsynced.map((resource) => resource.id)).toEqual([
      "genesis-cmc-01-p015-img003",
      "genesis-cmc-01-p001-img000",
      "document-image-p009-img007",
    ]);
  });
});
