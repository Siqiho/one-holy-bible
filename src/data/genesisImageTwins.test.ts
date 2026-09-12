import { describe, expect, it } from "vitest";

import { genesisWorkbenchImageTwins } from "./genesisImageTwins";
import { genesisResources } from "./genesisResources";

describe("genesisWorkbenchImageTwins", () => {
  it("points every workbench Genesis image twin at an existing curated stable image card", () => {
    const stableIds = new Set(genesisResources.filter((resource) => resource.type === "image").map((resource) => resource.id));
    const entries = Object.entries(genesisWorkbenchImageTwins);

    expect(entries.length).toBeGreaterThan(200);
    for (const [workbenchId, stableId] of entries) {
      expect(workbenchId, `${workbenchId} should be a workbench Genesis image card`).toMatch(/^document-image-01-创世记-/);
      expect(stableIds.has(stableId), `${workbenchId} → ${stableId} missing from genesisResources`).toBe(true);
    }
  });
});
