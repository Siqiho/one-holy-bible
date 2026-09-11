# Luke 1 Reader Card Prototype Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe variant 7 as a reusable chapter-reading canvas and make all seven reader-card prototype variants richer using Luke 1 as the shared example chapter.

**Architecture:** A prototype-only Luke 1 content module supplies canonical section ranges, rich card fixtures, and an in-memory hook that reads `/data/books/Luke.json`. The seven variants consume the same chapter model while retaining different information hierarchies and interactions. No production Reader, Workbench, persistence, or mutation path is changed.

**Tech Stack:** React 19, TypeScript, Vite, native CSS, Lucide icons, existing prototype route and shared frame.

## Global Constraints

- Keep all changes inside `src/prototypes/reader-card-system`, `prototypes/reader-card-system`, and this plan.
- Use Luke 1 (`Luke.1.1` through `Luke.1.80`) as the only sample chapter.
- Keep the seven variants structurally distinct; do not reduce them to differently coloured card grids.
- State remains in memory and local public data is read-only.
- Preserve the compact chapter-focus header and responsive behavior at desktop, 760px, and 390px.
- Do not stage, commit, or modify unrelated dirty-worktree files.

---

### Task 1: Shared Luke 1 content model

**Files:**
- Create: `src/prototypes/reader-card-system/lukeChapterOne.ts`
- Modify: `src/prototypes/reader-card-system/shared.tsx`
- Modify: `src/prototypes/reader-card-system/prototype.css`

**Interfaces:**
- Produces: `lukeChapterSections`, `lukeChapterCards`, `useLukeChapterOne()`, and Luke-based `noteCard`, `studyCard`, `mediaCard` fixtures.
- Produces: a reusable narrative preview component and a `PrototypeFrame` header that can show `路加福音 Luke 1` plus `Luke.1.1–80`.

- [ ] **Step 1: Confirm source data**

Run: `rg -n '"bookId": "Luke"|"id": "Luke\.1\.(1|80)"' public/data/books/Luke.json`

Expected: one Luke book package and chapter endpoints `Luke.1.1` / `Luke.1.80`.

- [ ] **Step 2: Add the shared chapter model**

Define six narrative ranges: preface `1–4`, John announced `5–25`, Jesus announced `26–38`, Mary and Elizabeth `39–56`, John born `57–66`, Zechariah's prophecy `67–80`. The hook must fetch `/data/books/Luke.json`, normalize/sort chapter 1, require exactly 80 verses, and fall back to section summaries without throwing into the page.

- [ ] **Step 3: Replace Genesis-only shared fixtures**

Keep the existing fixture export names so variants can migrate independently, but change their titles, bodies, references, and media preview to Luke 1 content.

- [ ] **Step 4: Type-check the shared contract**

Run: `npm exec tsc -- --noEmit`

Expected: PASS.

### Task 2: Enrich variants 1–3

**Files:**
- Modify: `src/prototypes/reader-card-system/variants/StableGrid.tsx`
- Modify: `src/prototypes/reader-card-system/variants/QuietDossier.tsx`
- Modify: `src/prototypes/reader-card-system/variants/CommandShelf.tsx`
- Modify: `src/prototypes/reader-card-system/prototype.css`

**Interfaces:**
- Consumes: Luke fixtures and narrative preview from Task 1.
- Produces: denser stable-grid, quiet-dossier, and command-shelf examples with at least three meaningful Luke 1 items in their primary region.

- [ ] **Step 1: Replace all Genesis labels and feedback strings**

Use `Luke.1.*`, `路加福音 Luke 1`, and narrative-specific copy.

- [ ] **Step 2: Increase useful content density without duplicating structure**

Stable grid emphasizes responsive card identity, dossier emphasizes long-form reading, and command shelf emphasizes actions. Each keeps its existing interaction model.

- [ ] **Step 3: Verify component behavior**

Run: `npm exec tsc -- --noEmit`

Expected: PASS.

### Task 3: Enrich variants 4–6

**Files:**
- Modify: `src/prototypes/reader-card-system/variants/ScriptureMargin.tsx`
- Modify: `src/prototypes/reader-card-system/variants/SourceAtlas.tsx`
- Modify: `src/prototypes/reader-card-system/variants/StudyJourney.tsx`
- Modify their adjacent CSS files only when required.

**Interfaces:**
- Consumes: Luke fixtures and six narrative sections from Task 1.
- Produces: Luke verse anchors/margin notes, a Luke source graph, and a Luke study journey with richer primary and contextual content.

- [ ] **Step 1: Rebuild anchors and graph paths around Luke 1**

Use stable ranges from the shared model, not hardcoded Genesis labels.

- [ ] **Step 2: Preserve real interactions**

Footnote/side-note placement, graph tracing/filtering, stage completion, and review queue state must continue to work.

- [ ] **Step 3: Verify component behavior**

Run: `npm exec tsc -- --noEmit`

Expected: PASS.

### Task 4: Redefine variant 7 as Chapter Reading Canvas

**Files:**
- Rename/modify: `src/prototypes/reader-card-system/variants/GenesisChapterCanvas.tsx` to `ChapterReadingCanvas.tsx`
- Rename/modify: `src/prototypes/reader-card-system/variants/genesis-chapter-canvas.css` to `chapter-reading-canvas.css`
- Modify: `src/prototypes/reader-card-system/PrototypeApp.tsx`

**Interfaces:**
- Consumes: `useLukeChapterOne()` and `lukeChapterSections`.
- Produces: exported `ChapterReadingCanvas` registered under `variant=chapter-reading-canvas`, still at switcher position 7.

- [ ] **Step 1: Remove Genesis-specific naming and creation-day structure**

Rename UI and internal concepts to chapter/section/scene terminology.

- [ ] **Step 2: Render all 80 Luke 1 verses by narrative section**

Left rail navigates six scenes, the centre is the continuous chapter, and the right panel shows people, themes, cross-references, and the active scene's reading cue.

- [ ] **Step 3: Preserve compact-header priority and responsive layouts**

Desktop uses three columns, 621–900px uses two columns with context below, and <=620px prioritizes the centre in one column.

- [ ] **Step 4: Verify the URL contract**

Open: `http://127.0.0.1:1420/prototypes/reader-card-system/?v=7&variant=chapter-reading-canvas`

Expected: switcher shows `7 / 7 章节阅读画布` and reload preserves the variant.

### Task 5: Final integration and visual verification

**Files:**
- Review only: all files under `src/prototypes/reader-card-system`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: a browser-verified, isolated seven-variant prototype set.

- [ ] **Step 1: Run static verification**

Run: `npm run build`

Expected: TypeScript and Vite build pass; the existing project-level chunk-size advisory may remain.

- [ ] **Step 2: Verify all seven variants in the Codex in-app browser**

Confirm every heading, header reference, primary content region, and switcher label uses Luke 1. Exercise one distinctive interaction per variant.

- [ ] **Step 3: Verify responsive boundaries**

At 1280px, 760px, and 390px confirm no document-level horizontal overflow and that controls retain usable dimensions.

- [ ] **Step 4: Verify runtime health and isolation**

Confirm 80 verses are loaded in variant 7, browser console has no warnings/errors, and no production entry imports the prototype.

