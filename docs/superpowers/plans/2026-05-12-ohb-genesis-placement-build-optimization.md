# OHB Genesis Placement Build Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place all imported Genesis image resources at evidence-backed verses and remove the production entry chunk warning caused by bundling the full Bible library into the main JavaScript bundle.

**Architecture:** Genesis image resources will be built from an explicit placement manifest instead of page-to-chapter fallback rules. Full Bible data will be emitted as JSON assets and loaded asynchronously at app startup, keeping the UI API (`Workbench` gets `BibleVersion[]`) intact while moving the large data payload out of the entry chunk.

**Tech Stack:** React 19, TypeScript, Vite 7, Vitest, Testing Library, `import.meta.glob`, static JSON assets in `src/data/generated`.

---

### Task 1: Genesis Resource Placement Manifest

**Files:**
- Create: `/Users/simon/OHB/one-holy-bible/src/data/genesisResourcePlacements.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/genesisResources.ts`
- Test: `/Users/simon/OHB/one-holy-bible/src/data/sampleBible.test.ts`

- [ ] **Step 1: Write failing placement tests**

Add these expectations inside the existing `"includes all Genesis image resources with type-specific asset folders"` test in `/Users/simon/OHB/one-holy-bible/src/data/sampleBible.test.ts`:

```ts
expect(cmcResources.find((resource) => resource.id === "genesis-cmc-01-p029-img018-572x552")?.verses).toEqual([
  "Gen.1.17",
]);
expect(codexV2Resources.find((resource) => resource.id === "genesis-ohb-genesis-codex-v2-p014-img013-1888x2777")?.verses).toEqual([
  "Gen.2.17",
]);
expect(cmcResources.find((resource) => resource.id === "genesis-cmc-01-p420-img231-692x901")?.verses).toEqual(
  expect.arrayContaining(["Gen.37.13", "Gen.37.25", "Gen.38.1", "Gen.46.1", "Gen.47.12", "Gen.50.14"]),
);
expect(cmcResources.find((resource) => resource.id === "genesis-cmc-01-p001-img000-670x452")?.body).toContain("资源范围：创世记导论");
expect(cmcResources.find((resource) => resource.id === "genesis-cmc-01-p001-img000-670x452")?.verses).toEqual([
  "Gen.1.1",
]);
```

Also replace:

```ts
expect(cmcResources.filter((resource) => resource.verses.includes("Gen.1.1"))).toHaveLength(18);
expect(resource.verses[0]).toMatch(/^Gen\.\d+\.1$/);
```

with:

```ts
expect(cmcResources.filter((resource) => resource.verses.includes("Gen.1.1")).length).toBeGreaterThan(0);
expect(resource.verses[0]).toMatch(/^Gen\.\d+\.\d+$/);
expect(resource.body).toContain("安放置信度：");
expect(resource.body).toContain("安放证据：");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/data/sampleBible.test.ts
```

Expected: FAIL showing `p029_img018` still maps to `Gen.2.1`, `p014_img013` still maps to `Gen.2.1`, and placement metadata is absent.

- [ ] **Step 3: Create the placement manifest**

Create `/Users/simon/OHB/one-holy-bible/src/data/genesisResourcePlacements.ts` with:

```ts
import type { VerseId } from "../domain/verse";

export type GenesisPlacementConfidence = "high" | "medium" | "low";

export interface GenesisVerseRange {
  start: VerseId;
  end: VerseId;
}

export interface GenesisResourcePlacement {
  fileName: string;
  scope?: "book-intro";
  ranges: GenesisVerseRange[];
  confidence: GenesisPlacementConfidence;
  evidenceType: string;
  evidence: string;
}

export const genesisResourcePlacements: Record<string, GenesisResourcePlacement> = {
  "p001_img000_670x452.png": {
    fileName: "p001_img000_670x452.png",
    scope: "book-intro",
    ranges: [{ start: "Gen.1.1", end: "Gen.1.1" }],
    confidence: "high",
    evidenceType: "visual-review-book-intro",
    evidence: "封面/题名页，只含《创世记》《圣经综合解读》等书名信息；作为创世记导论入口，不作为创一1正文注释。",
  },
  "p011_img001_661x631.png": {
    fileName: "p011_img001_661x631.png",
    ranges: [{ start: "Gen.1.1", end: "Gen.1.8" }],
    confidence: "high",
    evidenceType: "visual-review-caption",
    evidence: "图注明确为主前1世纪的希伯来文创世记第一章1-8节羊皮卷残片红外照片。",
  },
  "p014_img013_1888x2777.png": {
    fileName: "p014_img013_1888x2777.png",
    ranges: [{ start: "Gen.2.17", end: "Gen.2.17" }],
    confidence: "medium",
    evidenceType: "ocr-page-ref",
    evidence: "整页 OCR 页首出现创世记 2:17，页面还覆盖 2:20-23，暂以页首锚点安放。",
  },
  "p029_img018_572x552.png": {
    fileName: "p029_img018_572x552.png",
    ranges: [{ start: "Gen.1.17", end: "Gen.1.17" }],
    confidence: "high",
    evidenceType: "pdf-context-exact",
    evidence: "同页文本为【创一 17】，图注说明星系宜居带，属于光体摆列在天空的解释。",
  },
  "p420_img231_692x901.png": {
    fileName: "p420_img231_692x901.png",
    ranges: [
      { start: "Gen.37.13", end: "Gen.37.13" },
      { start: "Gen.37.25", end: "Gen.37.36" },
      { start: "Gen.38.1", end: "Gen.38.30" },
      { start: "Gen.46.1", end: "Gen.47.12" },
      { start: "Gen.50.7", end: "Gen.50.14" },
    ],
    confidence: "high",
    evidenceType: "visual-review-caption",
    evidence: "图注明确为约瑟、犹大生平行踪，并列出五段经文；不是泛配 Gen.50.1。",
  },
};
```

Then extend this object with the evidence-backed rows from `/tmp/ohb_genesis_resource_audit_20260511/candidate_manifest_report_physical_pages.json` and the 47 reviewed low-confidence rows returned in this session. Every filename in the TSV must either have an explicit placement or fall back with `confidence: "low"` and evidence text.

- [ ] **Step 4: Update Genesis resource generation**

In `/Users/simon/OHB/one-holy-bible/src/data/genesisResources.ts`, import the manifest and replace `verseForPage` use with placement lookup. Add helpers:

```ts
function expandVerseRange({ start, end }: GenesisVerseRange): VerseId[] {
  const parsedStart = parseVerseId(start);
  const parsedEnd = parseVerseId(end);
  if (parsedStart.book !== parsedEnd.book || parsedStart.chapter !== parsedEnd.chapter) {
    return [start, end];
  }
  return Array.from(
    { length: parsedEnd.verse - parsedStart.verse + 1 },
    (_, index) => verseIdFromParts(parsedStart.book, parsedStart.chapter, parsedStart.verse + index),
  );
}

function versesForPlacement(placement: GenesisResourcePlacement): VerseId[] {
  return Array.from(new Set(placement.ranges.flatMap(expandVerseRange)));
}
```

For same-chapter ranges, expand every verse. For cross-chapter ranges, keep start and end until a canonical verse-count-aware range expander is introduced.

Build `body` with these lines:

```ts
`资源范围：${placement.scope === "book-intro" ? "创世记导论" : placement.ranges.map((range) => `${range.start}-${range.end}`).join("；")}`,
`安放置信度：${placement.confidence}`,
`安放证据类型：${placement.evidenceType}`,
`安放证据：${placement.evidence}`,
```

- [ ] **Step 5: Run placement tests**

Run:

```bash
npm test -- src/data/sampleBible.test.ts
```

Expected: PASS.

### Task 2: Starter Resource Cleanup Without Breaking UI Tests

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/sampleLibrary.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/sampleBible.test.ts`

- [ ] **Step 1: Write failing sample resource tests**

In `/Users/simon/OHB/one-holy-bible/src/data/sampleBible.test.ts`, change the starter resource expectation so `gen-1-1-map` is no longer required and the total is no longer `genesisResources.length + 5`:

```ts
expect(sampleResources.map((resource) => resource.id)).toEqual(expect.arrayContaining([
  "gen-1-1-creation-note",
  "gen-1-1-video",
  "gen-1-1-html",
  "gen-1-2-note",
]));
expect(sampleResources.map((resource) => resource.id)).not.toContain("gen-1-1-map");
expect(sampleResources).toEqual(expect.arrayContaining(genesisResources));
expect(sampleResources).toHaveLength(genesisResources.length + 4);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/data/sampleBible.test.ts
```

Expected: FAIL because `gen-1-1-map` still exists.

- [ ] **Step 3: Remove the placeholder resource**

Delete the `gen-1-1-map` object from `/Users/simon/OHB/one-holy-bible/src/data/sampleLibrary.ts`.

- [ ] **Step 4: Update Workbench tests to use a real Genesis image resource**

In `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`, replace `gen-1-1-map` layout ids with `genesis-cmc-01-p014-img002-669x195` and replace visible text `"古代近东背景图"` with `"创世记 CMC 插图 p014_img002_669x195"` only in tests that are exercising the old starter image card.

Do not replace `gen-1-1-video`, `gen-1-1-html`, or note resources.

- [ ] **Step 5: Run focused UI tests**

Run:

```bash
npm test -- src/components/Workbench.test.tsx src/data/sampleBible.test.ts
```

Expected: PASS.

### Task 3: Full Bible Data JSON Loader

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/scripts/generateBibleLibrary.mjs`
- Create: `/Users/simon/OHB/one-holy-bible/src/data/generated/bibleLibrary.json`
- Create: `/Users/simon/OHB/one-holy-bible/src/data/loadBibleLibrary.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/App.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/sampleLibrary.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/sampleBible.test.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/lib/bibleSearch.test.ts`

- [ ] **Step 1: Write failing loader tests**

Create `/Users/simon/OHB/one-holy-bible/src/data/loadBibleLibrary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadBibleLibrary } from "./loadBibleLibrary";

describe("loadBibleLibrary", () => {
  it("loads full CUV and KJV Bible versions from generated JSON", async () => {
    const { cuvBible, kjvBible } = await loadBibleLibrary();

    expect(cuvBible.verses.find((verse) => verse.id === "Gen.1.1")?.text).toContain("起初");
    expect(kjvBible.verses.find((verse) => verse.id === "Gen.1.1")?.text).toContain("In the beginning");
    expect(cuvBible.verses.find((verse) => verse.id === "John.3.16")?.text).toContain("神爱世人");
    expect(kjvBible.verses.find((verse) => verse.id === "Rev.22.21")?.text).toBe(
      "The grace of our Lord Jesus Christ be with you all. Amen.",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/data/loadBibleLibrary.test.ts
```

Expected: FAIL because `loadBibleLibrary.ts` does not exist.

- [ ] **Step 3: Update generator to emit JSON plus compatibility TS**

In `/Users/simon/OHB/one-holy-bible/scripts/generateBibleLibrary.mjs`, add:

```js
const JSON_OUTPUT = new URL("../src/data/generated/bibleLibrary.json", import.meta.url);
```

After validation, write:

```js
writeFileSync(JSON_OUTPUT, `${JSON.stringify({ cuvBible: versionObject("cuv", "和合本", "zh", cuvVerses), kjvBible: versionObject("kjv", "KJV", "en", kjvVerses) })}\n`);
```

Add `versionObject`:

```js
function versionObject(id, label, language, verses) {
  return { id, label, language, verses };
}
```

Keep `src/data/bibleLibrary.ts` as a compatibility module for tests and direct imports.

- [ ] **Step 4: Generate JSON**

Run:

```bash
node scripts/generateBibleLibrary.mjs
```

Expected: JSON summary printed and `/Users/simon/OHB/one-holy-bible/src/data/generated/bibleLibrary.json` created.

- [ ] **Step 5: Implement loader**

Create `/Users/simon/OHB/one-holy-bible/src/data/loadBibleLibrary.ts`:

```ts
import type { BibleVersion } from "../domain/bible";

interface BibleLibraryPayload {
  cuvBible: BibleVersion;
  kjvBible: BibleVersion;
}

let cachedLibrary: Promise<BibleLibraryPayload> | null = null;

export function loadBibleLibrary(): Promise<BibleLibraryPayload> {
  cachedLibrary ??= import("./generated/bibleLibrary.json").then((module) => module.default as BibleLibraryPayload);
  return cachedLibrary;
}
```

- [ ] **Step 6: Update App asynchronous loading**

In `/Users/simon/OHB/one-holy-bible/src/App.tsx`, remove the static `bibleLibrary` import and use `useEffect`/`useState`:

```tsx
import { useEffect, useState } from "react";
import type { BibleVersion } from "./domain/bible";
import { loadBibleLibrary } from "./data/loadBibleLibrary";
```

Render a simple app loading state until versions are available:

```tsx
if (!versions) {
  return <main className="app-loading" role="status">正在加载经文库...</main>;
}
```

Pass `versions={[versions.cuvBible, versions.kjvBible]}` to `Workbench`.

- [ ] **Step 7: Decouple sampleLibrary from full Bible**

Remove `cuvGenesis1` and `kjvGenesis1` exports from `/Users/simon/OHB/one-holy-bible/src/data/sampleLibrary.ts`. Tests should import `cuvBible/kjvBible` directly from `./bibleLibrary` or use local fixtures.

- [ ] **Step 8: Update tests**

In `/Users/simon/OHB/one-holy-bible/src/data/sampleBible.test.ts`, remove the `"keeps Genesis compatibility aliases pointed at the full versions"` test and remove `cuvGenesis1/kjvGenesis1` import.

In `/Users/simon/OHB/one-holy-bible/src/lib/bibleSearch.test.ts`, import `cuvBible/kjvBible` from `../data/bibleLibrary` and use them for all search calls.

In `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`, import `cuvBible/kjvBible` from `../data/bibleLibrary` instead of `sampleLibrary`.

- [ ] **Step 9: Run loader and affected tests**

Run:

```bash
npm test -- src/data/loadBibleLibrary.test.ts src/data/sampleBible.test.ts src/lib/bibleSearch.test.ts src/components/Workbench.test.tsx
```

Expected: PASS.

### Task 4: Verification And Preview

**Files:**
- No source file changes unless verification exposes a defect.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run production build into temp output**

Run:

```bash
npm run build -- --outDir /tmp/ohb-build-after-genesis-placement --emptyOutDir
```

Expected: build exits 0. Entry JS should be far below the previous ~12 MB chunk. If Vite still warns, inspect which file is warned before changing code.

- [ ] **Step 3: Inspect output sizes**

Run:

```bash
find /tmp/ohb-build-after-genesis-placement/assets -type f -name '*.js' -print0 | xargs -0 ls -lh
du -sh /tmp/ohb-build-after-genesis-placement
```

Expected: JS entry is no longer dominated by full Bible data. Dist may remain large because Genesis PNG assets are still included.

- [ ] **Step 4: Manual right-side preview**

Keep or start the dev server:

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

Use the Codex in-app Browser on `http://127.0.0.1:5174/`. Verify:

- Initial loading state transitions into Genesis 1.
- `Gen.1.17` shows the star/galactic habitable-zone card `p029_img018`.
- A route/lineage map resource appears on at least one of its expanded anchor verses.
- No old placeholder image card appears for `gen-1-1-map`.

- [ ] **Step 5: Read logs**

Read browser console logs and dev server output. Expected: no runtime errors, no failed JSON load, no missing image asset errors.

