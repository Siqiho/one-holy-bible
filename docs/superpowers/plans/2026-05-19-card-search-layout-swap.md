# OHB Card Search And Layout Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or the local subagent workflow for implementation. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add card search, revise the right-side card categories, and swap the left and center card responsibilities.

**Architecture:** Keep the current Workbench state model and move semantics, but rename the user-facing roles. Right dock remains the searchable source library for the current chapter. Center card module becomes a read-only chooser for the currently selected verse or intro. Left dock becomes the editable chapter-scoped card stack previously hosted in the center.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, @dnd-kit, lucide-react, localStorage persistence.

---

### Task 1: Card Search And Right Categories

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/styles.css`

- [x] Add failing tests that the right dock exposes category regions named `笔记`, `注释`, `媒体`, and `百科和字典`.
- [x] Add failing tests that a card search input filters right-dock cards by title/body/type text and logs/search-status updates.
- [x] Implement a `cardQuery` state and a resource filter helper scoped to right-dock source resources.
- [x] Rename the `backlinks` module title and visible `link` label to `百科和字典`.
- [x] Add toolbar card-search UI in the blank area before the existing scripture search.

### Task 2: Swap Left And Center Card Roles

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/styles.css`

- [x] Add failing tests that center `卡片` shows the current verse cards and does not expose the saved-card stack controls.
- [x] Add failing tests that left dock shows the editable chapter-scoped card stack, accepts double-click/drag additions from source cards, supports remove, and persists `centerCardResourceIdsByBook`.
- [x] Move the current `CenterCardBrowser` rendering into the left dock as the chapter-organized user stack.
- [x] Move the current `CurrentVerseCardList` rendering into the center card module.
- [x] Update drop targets, statuses, accessible labels, empty states, and telemetry names so the UI language matches the new roles.

### Task 3: Polish And Verification

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/styles.css`
- Verify: `/Users/simon/OHB/one-holy-bible/logs/`

- [x] Tighten toolbar spacing so card search and scripture search both fit without overlap.
- [x] Ensure side-dock and center-card copy/edit affordances remain usable after the swap.
- [x] Run targeted Workbench tests, full tests, and production build.
- [x] Launch the app, manually verify one main path and one filtered/empty path, then read the generated console/log output for suspicious errors.
