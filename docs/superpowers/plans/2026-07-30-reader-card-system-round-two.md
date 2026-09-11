# Reader Card System Round Two Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three structurally distinct, interactive reader-card-system prototype variants—经文边注台、源流图谱桌、灵修行程桌—while preserving the existing three choices and their shareable URLs.

**Architecture:** Keep the existing Vite multi-page prototype as the sole entrypoint. Refactor only its prototype-local variant registry and chrome, then add one React component and one namespaced stylesheet per new visual direction. Each new variant owns in-memory state and has no imports from production Workbench, data, domain, or styles.

**Tech Stack:** React 19, TypeScript, Vite, lucide-react, prototype-local CSS, Codex in-app Browser.

## Global Constraints

- Modify only `prototypes/reader-card-system/**`, `src/prototypes/reader-card-system/**`, and this plan.
- Preserve the existing numeric mapping: `?v=1` 稳态栅格, `?v=2` 静读卷宗, `?v=3` 快捷工具架; append new directions at `?v=4`, `?v=5`, and `?v=6`.
- New style axes: 经文边注台 = verse-anchor topology; 源流图谱桌 = source/relationship traceability; 灵修行程桌 = study-session rhythm.
- Do not change `src/App.tsx`, `src/main.tsx`, `src/components/Workbench.tsx`, `src/styles.css`, production data, localStorage keys, or Vite configuration.
- Keep state in React memory; every visible control must have a local, visible response.
- Preserve warm-paper, calm-ink, low-chroma brass, and restrained 150–220ms motion; honor reduced motion.
- The picker must remain keyboard accessible with `1`–`6`, `ArrowLeft`, `ArrowRight`, and `R`; ignore those shortcuts in editable controls.

---

### Task 1: Extend the prototype registry and compact picker

**Files:**
- Modify: `src/prototypes/reader-card-system/PrototypeApp.tsx`
- Modify: `src/prototypes/reader-card-system/prototype.css`

**Interfaces:**
- Consumes: the six `VariantDefinition` entries.
- Produces: stable `?v=1..6` selection, six compact picker items, and the existing replay behavior.

- [ ] **Step 1: Replace index-only variant entries with explicit metadata**

```tsx
type VariantDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  Component: React.ComponentType<{ replayKey: number }>;
};

const variants: VariantDefinition[] = [
  { id: "stable-grid", label: "稳态栅格", shortLabel: "稳态", Component: StableGrid },
  { id: "quiet-dossier", label: "静读卷宗", shortLabel: "静读", Component: QuietDossier },
  { id: "command-shelf", label: "快捷工具架", shortLabel: "工具", Component: CommandShelf },
  { id: "scripture-margin", label: "经文边注台", shortLabel: "边注", Component: ScriptureMargin },
  { id: "source-atlas", label: "源流图谱桌", shortLabel: "图谱", Component: SourceAtlas },
  { id: "study-journey", label: "灵修行程桌", shortLabel: "行程", Component: StudyJourney },
];
```

- [ ] **Step 2: Keep numeric links and add readable labels**

Use the current `v` parser and update it to accept 1–6. Render `shortLabel` visually in picker buttons, set `aria-label={label}`, retain `aria-current`, `data-active`, and `history.replaceState` with the numeric query. Render the active `Component` as `<ActiveComponent replayKey={replayKey} />`.

- [ ] **Step 3: Make the picker compact-safe without changing its purpose**

Add prototype-only rules that cap the picker to the viewport, enable horizontal scrolling below 560px, retain a single row, hide its scrollbar, and use the existing highlight. When activating an item, call `activeItem.scrollIntoView({ block: "nearest", inline: "center" })` before measuring the highlight.

- [ ] **Step 4: Correct requestAnimationFrame cleanup**

```tsx
useEffect(() => {
  let firstFrame = 0;
  let secondFrame = 0;
  firstFrame = window.requestAnimationFrame(() => {
    secondFrame = window.requestAnimationFrame(() => {
      pickerRef.current?.setAttribute("data-ready", "");
      moveHighlight();
    });
  });
  return () => {
    window.cancelAnimationFrame(firstFrame);
    window.cancelAnimationFrame(secondFrame);
  };
}, [moveHighlight]);
```

### Task 2: Build 经文边注台

**Files:**
- Create: `src/prototypes/reader-card-system/variants/ScriptureMargin.tsx`
- Create: `src/prototypes/reader-card-system/variants/scripture-margin.css`

**Interfaces:**
- Consumes: `PrototypeFrame`, `noteCard`, `studyCard`, `mediaCard`, `WidthMode`.
- Produces: `ScriptureMargin({ replayKey }: { replayKey: number })`.

- [ ] **Step 1: Create the verse-anchor layout**

Render a left `经文脊柱` list, a central paper-like excerpt of Genesis 1:1–3, and a right `页边批注` list. Give each note an anchor (`1`, `2`, `3`) and use the selected anchor state to set a low-chroma brass alignment marker in the central verse and matching note.

- [ ] **Step 2: Add working local interactions**

Clicking a verse or note selects that anchor and updates the live feedback. The selected note exposes `脚注` / `旁注` display placement buttons, a collapse toggle, and copy feedback. The media note uses `TrianglePreview`.

- [ ] **Step 3: Add narrow behavior**

At narrow width, show the scripture surface first, change the left spine into a short horizontal anchor strip, and render the note collection below as sequential footnotes. No action button may shrink below 34px.

### Task 3: Build 源流图谱桌

**Files:**
- Create: `src/prototypes/reader-card-system/variants/SourceAtlas.tsx`
- Create: `src/prototypes/reader-card-system/variants/source-atlas.css`

**Interfaces:**
- Consumes: prototype fixtures and `WidthMode`.
- Produces: `SourceAtlas({ replayKey }: { replayKey: number })`.

- [ ] **Step 1: Create source ledger, relation map, and detail panel**

Render a left source ledger with selectable `用户笔记`, `综合解读`, `媒体`; a central SVG-free relationship map using positioned semantic buttons for `Gen.1.1`, the three fixtures, and their citation nodes; and a right detail panel for the active node.

- [ ] **Step 2: Make relations traceable**

Selecting a source filters visible map nodes. Selecting a node updates the right panel with source, title, summary, references, and a path string such as `Gen.1.1 → 综合解读 → 诗 33:6`. The map must use CSS lines/pseudo-elements or DOM connectors, not external assets.

- [ ] **Step 3: Add narrow behavior**

At narrow width, replace the radial map with a vertical source ladder: scripture node first, then card node, then reference node. Retain selection, filtering, and detail feedback.

### Task 4: Build 灵修行程桌

**Files:**
- Create: `src/prototypes/reader-card-system/variants/StudyJourney.tsx`
- Create: `src/prototypes/reader-card-system/variants/study-journey.css`

**Interfaces:**
- Consumes: prototype fixtures and `WidthMode`.
- Produces: `StudyJourney({ replayKey }: { replayKey: number })`.

- [ ] **Step 1: Create session-stage, current-study, and review-queue layout**

Render a left stage list (`读经`, `观察`, `解释`, `应用`, `祷告`), a central current-stage card with stage-specific prompt and fixture, and a right `稍后回看` queue. The active stage must be visible in all three panes.

- [ ] **Step 2: Add working study-flow interactions**

Clicking a stage changes the prompt and card focus. The current card offers `完成此步`, `加入回看`, and `查看经文`; these update local completion and queue counts with a live message. The queue permits removal and restoration in memory.

- [ ] **Step 3: Add narrow behavior**

At narrow width, turn the stages into a horizontal progress rail above the current study surface; put the review queue after the central content. Keep stage labels readable and controls at least 36px high.

### Task 5: Verify isolated behavior and visual comparison

**Files:**
- Verify only: `prototypes/reader-card-system/**`
- Verify only: `src/prototypes/reader-card-system/**`

**Interfaces:**
- Consumes: the existing Vite development server and Codex in-app Browser.
- Produces: build evidence, browser screenshots, interaction evidence, and zero prototype-to-production imports.

- [ ] **Step 1: Run TypeScript/Vite build**

Run: `npm run build`

Expected: exit code `0`.

- [ ] **Step 2: Confirm isolation**

Run: `rg -n "reader-card-system|ScriptureMargin|SourceAtlas|StudyJourney" src/App.tsx src/main.tsx src/components src/styles.css`

Expected: no output.

- [ ] **Step 3: Exercise all six variants in Codex in-app Browser**

Open `/prototypes/reader-card-system/?v=1`, then select each `v=2` through `v=6`; reload every new variant once; use `1`–`6`, arrows, and `R`; inspect `wide`, `medium`, and `narrow` controls; click at least one local action in each new variant.

- [ ] **Step 4: Check visual and console outcomes**

Capture one screenshot for each new variant. Confirm no Vite error overlay, no horizontal document overflow, no React warning/error in browser logs, and the picker preserves exactly one active item and one `aria-current="true"` item.
