# Reader Encyclopedia Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the reader's separate 百科 and 字典 card categories into one 百科 category without losing legacy saved-layout visibility.

**Architecture:** Keep `StudyResource.type === "link"` as the data seam for encyclopedia-like cards. Remove `dictionary` from the runtime layout interface, route every link resource through the single `encyclopedia` module, and treat old `dictionary` layout entries only as migration input when local storage is restored.

**Tech Stack:** React 19, TypeScript 5.8, Vitest, Testing Library, Vite.

## Global Constraints

- Change only `/Users/simon/OHB/one-holy-bible`; do not publish or copy into `one-holy-bible-github`.
- Preserve unrelated changes in the dirty worktree.
- Do not import OCR sample resources in this change; their verse anchors and content QA are not complete.
- Do not change `StudyResource.type`; both historical dictionary cards and encyclopedia cards remain `link`.
- Verify the real reader in the Codex in-app browser.
- Do not create a commit unless the user explicitly asks for one.

---

### Task 1: Lock the merged category behavior with failing tests

**Files:**
- Modify: `src/domain/types.test.ts`
- Modify: `src/components/Workbench.test.tsx`

**Interfaces:**
- Consumes: `defaultWorkbenchLayout`, `Workbench`, `layoutStorageKey`, `StudyResource.type === "link"`.
- Produces: Behavior tests for one 百科 module, unified link-card placement/labeling, and legacy dictionary-layout migration.

- [x] **Step 1: Update the default-layout expectation**

  Expect module IDs `commentary`, `media`, `encyclopedia`, `notes` and titles `注释`, `媒体`, `百科`, `笔记`.

- [x] **Step 2: Update the right-dock category test**

  Assert that the right dock and sticky jump bar expose 百科 once, expose no 字典 region/button, and keep all four current categories reachable.

- [x] **Step 3: Add a dictionary-source link fixture assertion**

  Render a link resource whose source/category contains `Dictionary`/`字典`; assert that it appears inside the 百科 region and its visible type label is 百科.

- [x] **Step 4: Add a legacy layout migration test**

  Store an old layout where `encyclopedia.visible` is false and `dictionary.visible` is true; render the reader and assert the merged 百科 module is visible while 字典 is absent.

- [x] **Step 5: Run the focused tests and verify RED**

  Run: `npm test -- src/domain/types.test.ts src/components/Workbench.test.tsx`

  Expected: failures show that `dictionary` still exists and dictionary-like link resources still render separately.

### Task 2: Collapse the runtime module and migrate old layouts

**Files:**
- Modify: `src/domain/layout.ts`
- Modify: `src/components/Workbench.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: old local-storage `modules` entries that may contain `dictionary`.
- Produces: `ResourceModuleId` without `dictionary`; `moduleResources("encyclopedia", resources)` returning every link; visible label 百科 for every link.

- [x] **Step 1: Remove `dictionary` from the runtime layout interface**

  Delete `dictionary` from `ResourceModuleId` and `defaultWorkbenchLayout.modules`.

- [x] **Step 2: Merge legacy visibility during restore**

  When restoring the default encyclopedia module, combine stored `encyclopedia.visible` and `dictionary.visible` with OR semantics. If neither legacy entry exists, use the default visibility. Never emit a runtime dictionary module.

- [x] **Step 3: Simplify card grouping**

  Remove dictionary-name heuristics. Make the encyclopedia module and legacy backlinks module return all `link` resources.

- [x] **Step 4: Unify visible copy**

  Return 百科 for the encyclopedia module, legacy backlinks module, and every `link` card type label. Remove 字典 and 百科和字典 runtime copy.

- [x] **Step 5: Remove dictionary from the jump targets**

  Set jump modules to `commentary`, `media`, `encyclopedia`, `notes`.

- [x] **Step 6: Resize the jump bar to the four merged categories**

  Change the sticky jump-bar grid from five equal columns to four, so the removed dictionary slot does not leave an empty track or truncate the remaining labels.

- [x] **Step 7: Run the focused tests and verify GREEN**

  Run: `npm test -- src/domain/types.test.ts src/components/Workbench.test.tsx`

  Expected: all focused tests pass.

### Task 3: Verify types, build, and the real reader

**Files:**
- Inspect: `src/domain/layout.ts`
- Inspect: `src/components/Workbench.tsx`
- Inspect: `src/domain/types.test.ts`
- Inspect: `src/components/Workbench.test.tsx`

**Interfaces:**
- Consumes: the completed merged module behavior.
- Produces: fresh automated and visual evidence that the reader exposes one 百科 category.

- [x] **Step 1: Inspect the scoped diff**

  Run: `git diff -- src/domain/layout.ts src/components/Workbench.tsx src/domain/types.test.ts src/components/Workbench.test.tsx`

  Confirm no unrelated file changes were introduced by this task.

- [x] **Step 2: Run the production build**

  Run: `npm run build`

  Expected: exit code 0.

- [x] **Step 3: Start the current development app**

  Start Vite on an unused localhost port and record the new process/URL.

- [x] **Step 4: Verify in the Codex in-app browser**

  Open the actual reader and confirm the sticky category bar reads `注释 / 媒体 / 百科 / 笔记`, contains no 字典 chip, and the visible sections match the jump bar without overlap.

- [x] **Step 5: Check the browser console for task-related errors**

  Confirm there are no new render, key, or navigation errors caused by the category merge.

## Self-Review

- Spec coverage: one 百科 module, unified link grouping, unified visible type, jump-bar update, and legacy saved-layout migration are each covered.
- Placeholder scan: no TBD/TODO/implement-later steps remain.
- Type consistency: runtime module ID is `encyclopedia`; only migration input may contain the legacy string `dictionary`.
