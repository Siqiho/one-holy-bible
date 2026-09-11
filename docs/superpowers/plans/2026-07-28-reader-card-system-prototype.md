# Reader Card System Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three genuinely different, interactive reading-desk card-system prototypes behind the standard Prototype Skill picker so Simon can choose a direction without changing production UI code.

**Architecture:** Add a Vite multi-page prototype at `/prototypes/reader-card-system/` with its own React entrypoint and namespaced stylesheet. The harness renders exactly one variant at a time, persists selection through `?v=1..3`, and follows the picker markup, styling, keyboard, and highlight behavior verbatim. All content and state are prototype-local; no production file imports prototype code.

**Tech Stack:** React 19, TypeScript, Vite 7, lucide-react, namespaced vanilla CSS, Codex in-app Browser.

## Global Constraints

- Do not modify `src/App.tsx`, `src/main.tsx`, `src/components/Workbench.tsx`, `src/styles.css`, `vite.config.ts`, or any production data.
- Keep every prototype selector beneath `.reader-card-prototype`, except the exact `.proto-picker*` selectors required by the Prototype Skill.
- Render one full-size variant at a time; do not compare postage-stamp thumbnails side by side.
- Use the project's warm-paper, calm-ink, low-chroma brass visual personality with realistic Genesis 1:1 card copy.
- Every visible button must perform a prototype-local action and expose an accessible name.
- Keep UI motion under 300ms, use ease-out entrances, and disable nonessential motion under `prefers-reduced-motion: reduce`.
- Variant 1 is **稳态栅格**, axis: responsive layout; variant 2 is **静读卷宗**, axis: progressive disclosure and reading immersion; variant 3 is **快捷工具架**, axis: high-frequency action model.
- Do not install dependencies, commit, deploy, or integrate a winning direction into production during this exploration.

---

### Task 1: Create the isolated Vite page and picker harness

**Files:**
- Create: `prototypes/reader-card-system/index.html`
- Create: `src/prototypes/reader-card-system/main.tsx`
- Create: `src/prototypes/reader-card-system/PrototypeApp.tsx`
- Create: `src/prototypes/reader-card-system/prototype.css`

**Interfaces:**
- Consumes: React 19 and the existing Vite development server.
- Produces: `PrototypeApp`, a three-item picker, a keyed variant mount, URL-state synchronization, and a live announcement region.

- [ ] **Step 1: Add the independent HTML entrypoint**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>阅读台卡片系统原型</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/prototypes/reader-card-system/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Add the prototype-only React entrypoint**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PrototypeApp } from "./PrototypeApp";
import "./prototype.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><PrototypeApp /></StrictMode>,
);
```

- [ ] **Step 3: Implement the fixed picker behavior**

`PrototypeApp` must use the exact picker structure:

```tsx
<nav className="proto-picker" aria-label="Prototype variants">
  <span className="proto-picker-highlight" aria-hidden="true" />
  <button className="proto-picker-item">稳态栅格</button>
  <button className="proto-picker-item">静读卷宗</button>
  <button className="proto-picker-item">快捷工具架</button>
  <span className="proto-picker-divider" aria-hidden="true" />
  <button className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)">↻</button>
</nav>
```

Wire clicks, keys `1`–`3`, `ArrowLeft`, `ArrowRight`, and `R`; ignore editable targets and modifier chords; persist with `history.replaceState(..., "?v=N")`; set exactly one `data-active` and `aria-current="true"`; remount with a changing `key`; enable `data-ready` only after two animation frames.

- [ ] **Step 4: Copy the picker CSS verbatim and namespace all prototype UI styles**

Copy `.proto-picker`, `.proto-picker-highlight`, `.proto-picker-item`, `.proto-picker-divider`, `.proto-picker-replay`, the top-position override, and reduced-motion block from `PICKER.md` without changing values. Define project-facing colors only beneath `.reader-card-prototype`.

- [ ] **Step 5: Confirm the isolated page is served**

Run: `curl -I http://127.0.0.1:1420/prototypes/reader-card-system/`

Expected: `HTTP/1.1 200 OK` and an HTML response without changing the main `/` page.

### Task 2: Build three divergent, interactive variants

**Files:**
- Create: `src/prototypes/reader-card-system/shared.tsx`
- Create: `src/prototypes/reader-card-system/variants/StableGrid.tsx`
- Create: `src/prototypes/reader-card-system/variants/QuietDossier.tsx`
- Create: `src/prototypes/reader-card-system/variants/CommandShelf.tsx`
- Modify: `src/prototypes/reader-card-system/PrototypeApp.tsx`
- Modify: `src/prototypes/reader-card-system/prototype.css`

**Interfaces:**
- Consumes: `VariantProps { replayKey: number }`, realistic Genesis fixture copy, and local React state.
- Produces: `StableGrid`, `QuietDossier`, and `CommandShelf` React components.

- [ ] **Step 1: Add shared, realistic fixtures and accessible primitive controls**

```ts
export const noteCard = {
  source: "用户笔记",
  title: "起初，神创造天地",
  body: "“起初”声明时间、宇宙和历史都在神的创造中开始。",
  references: ["Gen.1.1", "约 1:1"],
};
```

Include a media fixture titled `2701 的三角数图示` with a CSS-rendered geometric preview so the prototype does not depend on production data or mutate card assets.

- [ ] **Step 2: Implement 稳态栅格**

Use `container-type: inline-size` and a three-track card header: fixed-size navigation controls, a `minmax(0, 1fr)` identity block, and fixed-size actions. Below the narrow threshold, switch to two rows instead of shrinking controls; preserve readable source/title hierarchy. Provide working width switches (`宽`, `中`, `窄`), collapse/expand, copy feedback, and a local dismiss/undo action.

- [ ] **Step 3: Implement 静读卷宗**

Make one lead reading card visually dominant with a quiet metadata line, 20–22px serif body text, restrained reference pills, and a single `更多操作` trigger. Reveal edit/copy/remove actions only when the trigger is opened or keyboard focus enters the action region. Provide working collapse, copy feedback, inline edit/save/cancel, and related-card selection.

- [ ] **Step 4: Implement 快捷工具架**

Separate card identity from a stable labeled command bar containing `定位`, `折叠`, `编辑`, `复制`, and `移除`. At narrow widths, let the command bar scroll horizontally with intact 40px controls rather than compressing. Provide working inline edit/save/cancel, collapse/expand, copy feedback, local removal, and undo.

- [ ] **Step 5: Add purposeful motion and reduced-motion handling**

Use only opacity and transform for card entrance/action reveal, duration `140ms`–`220ms`, and an ease-out curve. Add:

```css
@media (prefers-reduced-motion: reduce) {
  .reader-card-prototype *,
  .reader-card-prototype *::before,
  .reader-card-prototype *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Task 3: Verify every picker state and interaction in the target browser

**Files:**
- Verify only: `prototypes/reader-card-system/index.html`
- Verify only: `src/prototypes/reader-card-system/**`

**Interfaces:**
- Consumes: the running Vite page at `http://127.0.0.1:1420/prototypes/reader-card-system/`.
- Produces: fresh TypeScript/build evidence, browser screenshots, interaction evidence, and a clean console report.

- [ ] **Step 1: Run static compilation and the production build**

Run: `npm run build`

Expected: both TypeScript commands and Vite build exit `0` without introducing a dependency or production-file modification.

- [ ] **Step 2: Open the true target page in Codex in-app Browser**

Confirm URL `/prototypes/reader-card-system/`, title `阅读台卡片系统原型`, and visible picker labels `稳态栅格`, `静读卷宗`, `快捷工具架`.

- [ ] **Step 3: Verify picker behavior**

Click each picker item and press `1`, `2`, `3`, `ArrowLeft`, `ArrowRight`, and `R`. Confirm one variant renders at a time, `?v=N` updates, reload preserves the variant, and the active highlight moves without animating the variant swap.

- [ ] **Step 4: Verify every variant at representative widths**

At wide, medium, and narrow in-app-browser widths, exercise all visible controls. Confirm no icon/control is compressed or clipped, titles remain legible, scroll/wrap behavior matches each named axis, and every action gives visible local feedback.

- [ ] **Step 5: Inspect browser console and screenshots**

Capture one screenshot per variant and read console entries after all interactions. Expected: no uncaught exceptions, React key warnings, failed resource loads, or horizontal overflow outside the intentional command shelf.

- [ ] **Step 6: Inspect the final diff**

Run: `git status --short -- prototypes/reader-card-system src/prototypes/reader-card-system docs/superpowers/plans/2026-07-28-reader-card-system-prototype.md`

Expected: only the isolated prototype, its plan, and no production file are listed for this task.
