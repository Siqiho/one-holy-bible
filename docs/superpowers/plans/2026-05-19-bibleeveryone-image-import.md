# BibleEveryone Image Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or execute the tasks task-by-task with fresh verification. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the full BibleEveryone image database into OHB as image cards and preserve navigable source-page context for every card.

**Architecture:** Add a generated BibleEveryone resource payload alongside the existing generated resource loaders. A dedicated sync script extracts the public image database, downloads images into `public/resources/bibleeveryone`, builds `StudyResource` image cards, and records source-page navigation metadata in `debugMeta`.

**Tech Stack:** Vite, React, TypeScript, Vitest, Node ESM scripts, static JSON payloads, public resource assets.

---

### Task 1: Add App Loader Integration

**Files:**
- Create: `src/data/bibleEveryoneImageResources.ts`
- Create: `src/data/bibleEveryoneImageResources.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] Write a failing App test proving BibleEveryone image resources load and merge into final resources.
- [ ] Add a generated-resource loader shaped like `workbenchSyncedResources.ts`.
- [ ] Import `loadBibleEveryoneImageResources()` in `App.tsx` and merge it after existing generated sources.
- [ ] Run the targeted App and loader tests.

### Task 2: Add Generator And Assets

**Files:**
- Create: `scripts/syncBibleEveryoneImages.mjs`
- Create: `src/data/generated/bibleEveryoneImageResources.json`
- Create directory: `public/resources/bibleeveryone`

- [ ] Extract all 512 cards from `https://bibleeveryone.com/imagedb.php`.
- [ ] Download each image into `public/resources/bibleeveryone`.
- [ ] Generate one `StudyResource` image card per database card.
- [ ] Preserve title, description, source page links, source image URL, stored asset path, and navigation labels in `debugMeta`.

### Task 3: Verify Navigation And Runtime

**Files:**
- Test: `src/data/bibleEveryoneImageResources.test.ts`
- Test: `src/App.test.tsx`

- [ ] Verify exactly 512 BibleEveryone image cards.
- [ ] Verify every card has `type: "image"`, a local asset path, source URL, and at least one source-page navigation label.
- [ ] Run build or targeted tests.
- [ ] Start the local app, inspect a loaded image card path in Chrome, and read console logs for errors before final reporting.
