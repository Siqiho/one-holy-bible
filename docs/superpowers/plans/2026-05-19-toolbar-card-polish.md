# OHB Toolbar And Card Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or the local subagent workflow for implementation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shift the two toolbar search controls slightly to the right and make resource cards feel more rounded and refined like the existing center module buttons, without changing card content or dimensions.

**Architecture:** Keep the React structure unchanged. Make a focused CSS pass on toolbar flex spacing and resource-card surface treatment, then guard the change with lightweight style assertions and browser QA.

**Tech Stack:** React 19, TypeScript, Vitest, CSS OKLCH tokens, Chrome visual verification.

---

### Task 1: Toolbar Search Offset

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/styles.css`
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`

- [x] Add a style assertion that `.card-search` has a left offset/margin that pushes both search controls rightward from the module group.
- [x] Update `.card-search` so the search pair starts farther right, using toolbar flex spacing instead of absolute positioning.
- [x] Keep `.toolbar__group--layout { margin-left: auto; }` so save/reset remain pinned at the far right.
- [x] Verify responsive rules at `max-width: 1100px` reduce the offset so the toolbar does not overflow.

### Task 2: Rounded Resource Card Surface

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/styles.css`
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`

- [x] Add style assertions that `.resource-card` uses a rounder radius than the old `var(--radius-md)` and has a warmer layered surface/border treatment.
- [x] Increase the base `.resource-card` border radius only, without changing padding, width, height, grid layout, or text clamps.
- [x] Add matching roundness to `.resource-card-drag-preview` so drag feedback does not look sharper than the cards.
- [x] Preserve current card content, action buttons, collapse controls, and current-verse/center card semantics.

### Task 3: Verification

**Files:**
- Verify only, no extra product files unless a screenshot is captured under `/Users/simon/OHB/one-holy-bible/logs/`.

- [x] Run `npm test -- src/components/Workbench.test.tsx --reporter=verbose`.
- [x] Run `npm run build`.
- [x] Open `http://127.0.0.1:1420/` in Chrome, verify the search controls moved right and card corners are visibly rounder.
- [x] Read browser console logs and dev-server log output for warnings/errors.
