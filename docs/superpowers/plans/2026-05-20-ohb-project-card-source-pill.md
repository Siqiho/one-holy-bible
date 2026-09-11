# OHB Project Card Source Pill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make OHB project body resource cards show source names as quiet capsule labels without Chinese book-title brackets, while keeping card text closer to the scripture reading typography.

**Architecture:** Keep the change in the existing `Workbench` card rendering path. Normalize display labels at the UI helper boundary, then adjust the existing `.resource-card__type` selector into a capsule so all reused card surfaces stay consistent.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, CSS.

---

### Task 1: Source Label Behavior

**Files:**
- Modify: `src/components/Workbench.test.tsx`
- Modify: `src/components/Workbench.tsx`

- [x] **Step 1: Write the failing test**

Update the existing resource category card test so `.resource-card__type` expects `用户笔记`, `笔记`, `综合解读`, `圣经研修本`, and `百科和字典`, and add absence checks for `《综合解读》` and `《用户笔记》`.

- [x] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- src/components/Workbench.test.tsx --runInBand`

Expected before implementation: FAIL because `resourceHeaderLabel()` still wraps text with `《》`.

- [x] **Step 3: Implement label normalization**

Change `resourceHeaderLabel()` so it returns normalized plain source labels instead of calling `wrapBookTitleLabel()`. Keep `displayableSourceName()` as the source-name mapping point and strip any old `《》` defensively from labels.

- [x] **Step 4: Re-run the targeted test**

Run: `npm test -- src/components/Workbench.test.tsx --runInBand`

Expected after implementation: PASS for source label expectations.

### Task 2: Capsule Styling And Typography

**Files:**
- Modify: `src/components/Workbench.test.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Write the failing style assertions**

Extend the existing CSS polish test so `.resource-card__type` must use `inline-flex`, `border-radius: 999px`, capsule padding, quiet border/background, normal text transform, and zero letter spacing.

- [x] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- src/components/Workbench.test.tsx --runInBand`

Expected before styling: FAIL because `.resource-card__type` is still a small uppercase block label.

- [x] **Step 3: Implement card source capsule styling**

Update `.resource-card__type` and its center/saved variants to look like a quiet source capsule. Adjust card title/body sizes slightly toward reading-body scale without changing card layout dimensions.

- [x] **Step 4: Re-run tests and build**

Run: `npm test -- src/components/Workbench.test.tsx --runInBand`

Run: `npm run build`

Expected: both commands exit successfully.

### Task 3: Visual And Observability Verification

**Files:**
- No source files unless verification exposes a defect.

- [x] **Step 1: Open the app in the Codex browser**

Use the existing Vite dev server if it is running, otherwise start `npm run dev -- --host 127.0.0.1`.

- [x] **Step 2: Verify the main visual path**

Open `http://127.0.0.1:5173/`, inspect resource cards, and confirm source labels appear as capsules without `《》`.

- [x] **Step 3: Inspect logs**

Check the browser console and terminal output for rendering, asset, or test-related errors.
