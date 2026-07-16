# One Holy Bible Natural Paper Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reversible local “纸张模式” Demo to the existing OHB workbench so the user can compare the current theme with the approved B “现代暖纸” direction on real scripture and resource cards.

**Architecture:** Keep the existing `Workbench` component and three-pane layout intact. Add one local theme state plus a `data-paper-theme` attribute at the workbench root, use scoped CSS token overrides for the warm-paper appearance, and mark only known black-and-white archival image families for multiply-style paper blending. No data schema, resource JSON, routing, deployment, or remote state changes are allowed.

**Tech Stack:** React 19, TypeScript 5.8, Vitest 4, Testing Library, CSS/OKLCH, Lucide React, Vite 7.

## Global Constraints

- The current default OHB theme must remain visually and behaviorally unchanged when paper mode is off.
- The approved visual lane is B “现代暖纸”: light natural yellowing, warm gray-brown ink, book typography for reading content, modern system-sans controls.
- Black-and-white scans, engravings, and white-backed line art may blend into paper; color images must retain their original color.
- Preserve the existing toolbar, left dock, center reader, right dock, drag/drop, collapse, resize, search, selected verse, and card behavior.
- The Demo is local only: do not deploy, publish, sync GitHub, or modify the separate public repository.
- Do not add a font dependency or downloadable font asset in this Demo; use a robust local serif stack.
- Normal body text must meet WCAG AA 4.5:1 contrast.
- The target source files already contain unrelated user changes. Back them up first and do not commit source-file changes wholesale; validate the exact Demo delta against the preflight backup.

---

## File Structure

- Modify `src/components/Workbench.tsx`: theme state, local preference storage, toolbar toggle, root theme attribute, and explicit archival-image blend markers.
- Modify `src/components/Workbench.test.tsx`: theme toggle/persistence tests, non-reset behavior checks, archival-vs-color image classification tests, and CSS contract assertions.
- Modify `src/styles.css`: scoped warm-paper tokens, reading typography, paper surfaces, selected-verse treatment, and explicitly marked image blending.
- Create backup folder under `/Users/simon/备份/codex/`: byte-for-byte preflight copies of all three target files plus `README.md`.

No new runtime module is necessary. Theme behavior is small and specific to `Workbench`; extracting a general theming framework would exceed the Demo scope.

---

### Task 1: Back Up the Live Targets and Add the Reversible Theme Toggle

**Files:**
- Backup: `src/components/Workbench.tsx`
- Backup: `src/components/Workbench.test.tsx`
- Backup: `src/styles.css`
- Modify: `src/components/Workbench.tsx:1-25, 2722-2780, 4380-4590`
- Test: `src/components/Workbench.test.tsx`

**Interfaces:**
- Produces: `paperThemeStorageKey: "one-holy-bible-paper-theme"`.
- Produces: root attribute `data-paper-theme="default" | "warm"`.
- Produces: toolbar button with accessible name `开启纸张模式` or `关闭纸张模式` and `aria-pressed`.
- Preserves: all existing `WorkbenchProps` and layout persistence interfaces.

- [ ] **Step 1: Create the required preflight backup**

Run:

```bash
backup_dir="/Users/simon/备份/codex/ohb-natural-paper-demo-preflight-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir/src/components" "$backup_dir/src"
cp src/components/Workbench.tsx "$backup_dir/src/components/Workbench.tsx"
cp src/components/Workbench.test.tsx "$backup_dir/src/components/Workbench.test.tsx"
cp src/styles.css "$backup_dir/src/styles.css"
```

Create `$backup_dir/README.md` with:

```markdown
# OHB 自然纸页 Demo 修改前备份

- 备份原因：在现有脏工作区中制作可撤回的自然纸页主题 Demo，保存三个目标文件的修改前状态。
- 原文件：`/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- 原文件：`/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`
- 原文件：`/Users/simon/OHB/one-holy-bible/src/styles.css`
- 备份时间：使用创建备份目录时的本地时间。
```

Expected: the backup folder contains exactly the three source copies and `README.md`.

- [ ] **Step 2: Write the failing theme-toggle test**

Add this test near the existing toolbar tests in `src/components/Workbench.test.tsx`:

```tsx
it("toggles and restores the local warm paper theme without changing the selected verse", async () => {
  render(
    <Workbench
      versions={[cuvBible, kjvBible]}
      resources={sampleResources}
      initialLayout={dualCenterLayout}
    />,
  );

  const workbench = screen.getByRole("main");
  const firstVerse = screen.getByRole("button", { name: "1 起初，神创造天地。" });
  const paperButton = screen.getByRole("button", { name: "开启纸张模式" });

  expect(workbench).toHaveAttribute("data-paper-theme", "default");
  expect(paperButton).toHaveAttribute("aria-pressed", "false");
  expect(firstVerse).toHaveAttribute("aria-current", "true");

  await userEvent.click(paperButton);

  expect(workbench).toHaveAttribute("data-paper-theme", "warm");
  expect(screen.getByRole("button", { name: "关闭纸张模式" })).toHaveAttribute("aria-pressed", "true");
  expect(firstVerse).toHaveAttribute("aria-current", "true");
  expect(localStorage.getItem(paperThemeStorageKey)).toBe("warm");

  await userEvent.click(screen.getByRole("button", { name: "关闭纸张模式" }));

  expect(workbench).toHaveAttribute("data-paper-theme", "default");
  expect(firstVerse).toHaveAttribute("aria-current", "true");
  expect(localStorage.getItem(paperThemeStorageKey)).toBe("default");
});
```

Update the test import to include `paperThemeStorageKey` from `./Workbench`.

- [ ] **Step 3: Run the focused test and verify that it fails**

Run:

```bash
npx vitest run src/components/Workbench.test.tsx -t "toggles and restores the local warm paper theme" --reporter=dot
```

Expected: FAIL because `paperThemeStorageKey` and the paper-theme button do not exist.

- [ ] **Step 4: Implement minimal theme state and persistence**

In `src/components/Workbench.tsx`, add `SunMedium` to the Lucide import and define:

```tsx
export const paperThemeStorageKey = "one-holy-bible-paper-theme";
type PaperTheme = "default" | "warm";

function storedPaperTheme(): PaperTheme {
  try {
    return window.localStorage.getItem(paperThemeStorageKey) === "warm" ? "warm" : "default";
  } catch {
    return "default";
  }
}

function persistPaperTheme(theme: PaperTheme) {
  try {
    window.localStorage.setItem(paperThemeStorageKey, theme);
  } catch {
    // The visual Demo remains usable when local persistence is unavailable.
  }
}
```

Inside `Workbench`, add:

```tsx
const [paperTheme, setPaperTheme] = useState<PaperTheme>(storedPaperTheme);
const isWarmPaperTheme = paperTheme === "warm";

function togglePaperTheme() {
  const nextTheme: PaperTheme = isWarmPaperTheme ? "default" : "warm";
  setPaperTheme(nextTheme);
  persistPaperTheme(nextTheme);
  setStatus(nextTheme === "warm" ? "纸张模式已开启" : "纸张模式已关闭");
}
```

Change the root element and add the toggle before the refresh action in the existing layout group:

```tsx
<main className="workbench" data-paper-theme={paperTheme}>
```

```tsx
<button
  aria-label={isWarmPaperTheme ? "关闭纸张模式" : "开启纸张模式"}
  aria-pressed={isWarmPaperTheme}
  className="toolbar-button toolbar-button--paper"
  title={isWarmPaperTheme ? "恢复默认主题" : "使用现代暖纸主题"}
  type="button"
  onClick={togglePaperTheme}
>
  <SunMedium size={16} />
  纸张模式
</button>
```

- [ ] **Step 5: Run the focused test and verify that it passes**

Run:

```bash
npx vitest run src/components/Workbench.test.tsx -t "toggles and restores the local warm paper theme" --reporter=dot
```

Expected: PASS.

- [ ] **Step 6: Add and run the stored-theme restoration test**

Add:

```tsx
it("restores the warm paper theme from local storage", () => {
  localStorage.setItem(paperThemeStorageKey, "warm");

  render(
    <Workbench
      versions={[cuvBible, kjvBible]}
      resources={sampleResources}
      initialLayout={dualCenterLayout}
    />,
  );

  expect(screen.getByRole("main")).toHaveAttribute("data-paper-theme", "warm");
  expect(screen.getByRole("button", { name: "关闭纸张模式" })).toHaveAttribute("aria-pressed", "true");
});
```

Run:

```bash
npx vitest run src/components/Workbench.test.tsx -t "paper theme" --reporter=dot
```

Expected: both paper-theme tests PASS.

Do not commit the source files because they contained unrelated changes before this task. Record the backup path and continue with delta-based review.

---

### Task 2: Mark Only Known Archival Images for Paper Blending

**Files:**
- Modify: `src/components/Workbench.tsx:816-860, 1360-1435, 1840-1910, 4790-4820`
- Test: `src/components/Workbench.test.tsx`

**Interfaces:**
- Produces: `shouldBlendImageWithPaper(resource: StudyResource): boolean`.
- Produces: `data-paper-blend="true"` only on image elements from known archival source families.
- Consumes: existing `StudyResource.type` and `StudyResource.assetPath`.

- [ ] **Step 1: Write the failing classifier test**

Update the `Workbench` test import to include `shouldBlendImageWithPaper`, then add:

```tsx
it("marks archival monochrome image families for paper blending without touching color images", () => {
  expect(shouldBlendImageWithPaper({
    id: "archive-scan",
    title: "旧书版画",
    type: "image",
    verses: ["Gen.1.1"],
    body: "",
    assetPath: "/src/assets/resources/genesis/images/cmc-01/p011_img001_661x631.png",
  })).toBe(true);

  expect(shouldBlendImageWithPaper({
    id: "codex-scan",
    title: "创世记版画",
    type: "image",
    verses: ["Gen.1.1"],
    body: "",
    assetPath: "/src/assets/resources/genesis/images/ohb-genesis-codex-v2/p008_img007_1893x2778.png",
  })).toBe(true);

  expect(shouldBlendImageWithPaper({
    id: "color-photo",
    title: "彩色照片",
    type: "image",
    verses: ["Gen.1.1"],
    body: "",
    assetPath: "/resources/color/landscape.webp",
  })).toBe(false);
});
```

- [ ] **Step 2: Run the classifier test and verify that it fails**

Run:

```bash
npx vitest run src/components/Workbench.test.tsx -t "marks archival monochrome image families" --reporter=dot
```

Expected: FAIL because `shouldBlendImageWithPaper` is not exported.

- [ ] **Step 3: Implement the explicit archival-family classifier**

Add near the existing image resource helpers:

```tsx
export function shouldBlendImageWithPaper(resource: StudyResource) {
  if (resource.type !== "image" || !resource.assetPath) return false;

  const normalizedPath = resource.assetPath.toLowerCase();
  return normalizedPath.includes("/cmc-01/")
    || normalizedPath.includes("/ohb-genesis-codex-v2/")
    || normalizedPath.includes("/ohb-genesis-codex-v2-crops/");
}
```

Apply the marker to all three image render paths, including the zoomable card image, normal card image, and lightbox image:

```tsx
data-paper-blend={shouldBlendImageWithPaper(resource) ? "true" : undefined}
```

For the lightbox use `previewImageResource`:

```tsx
data-paper-blend={shouldBlendImageWithPaper(previewImageResource) ? "true" : undefined}
```

- [ ] **Step 4: Run the classifier and relevant image-card tests**

Run:

```bash
npx vitest run src/components/Workbench.test.tsx -t "archival monochrome|image resource|图片预览" --reporter=dot
```

Expected: the new classifier test and existing image-card/lightbox tests PASS.

---

### Task 3: Implement the Scoped B “Modern Warm Paper” Visual System

**Files:**
- Modify: `src/styles.css:1-40, 80-120, 914-1700, 2210-2290, 3108-3245, end of file`
- Test: `src/components/Workbench.test.tsx`

**Interfaces:**
- Consumes: root `data-paper-theme="warm"` from Task 1.
- Consumes: image-level `data-paper-blend="true"` from Task 2.
- Produces: scoped warm-paper theme tokens and typography without changing default selectors.

- [ ] **Step 1: Write the failing CSS contract test**

Add near the existing CSS polish test:

```tsx
it("scopes the modern warm paper palette, book typography, and image blending to paper mode", () => {
  expect(styles).toMatch(/\.workbench\[data-paper-theme="warm"\]\s*{[^}]*--canvas:/s);
  expect(styles).toMatch(/\.workbench\[data-paper-theme="warm"\][\s\S]*?\.verse-text\s*{[^}]*font-family:/s);
  expect(styles).toMatch(/\.workbench\[data-paper-theme="warm"\][\s\S]*?\[data-paper-blend="true"\]\s*{[^}]*mix-blend-mode:\s*multiply/s);
  expect(styles).toMatch(/\.workbench\[data-paper-theme="warm"\][\s\S]*?\.verse-button\[aria-current="true"\]/s);
  expect(styles).not.toMatch(/^img\s*{[^}]*filter:/m);
});
```

- [ ] **Step 2: Run the CSS test and verify that it fails**

Run:

```bash
npx vitest run src/components/Workbench.test.tsx -t "scopes the modern warm paper palette" --reporter=dot
```

Expected: FAIL because the scoped theme selectors do not exist.

- [ ] **Step 3: Add the scoped warm-paper token layer**

Append a clearly delimited section near the end of `src/styles.css`:

```css
/* Modern warm paper demo */
.workbench[data-paper-theme="warm"] {
  --canvas: oklch(92% 0.048 96);
  --surface: oklch(96.5% 0.043 98);
  --surface-2: oklch(93.5% 0.04 96);
  --surface-3: oklch(89% 0.038 92);
  --ink: oklch(31% 0.035 75);
  --ink-soft: oklch(42% 0.032 75);
  --muted: oklch(51% 0.028 76);
  --faint: oklch(63% 0.025 80);
  --line: oklch(81% 0.04 88);
  --line-strong: oklch(72% 0.05 84);
  --accent: oklch(56% 0.085 72);
  --accent-soft: oklch(89% 0.07 88);
  --accent-quiet: oklch(79% 0.06 84);
  background:
    radial-gradient(circle at 16% 8%, rgb(255 248 196 / 48%), transparent 28%),
    radial-gradient(circle at 82% 22%, rgb(218 188 116 / 16%), transparent 34%),
    var(--canvas);
  color: var(--ink);
}
```

The gradients represent gentle uneven paper illumination, not decorative color effects. Keep their opacity low enough that text contrast remains stable.

- [ ] **Step 4: Add scoped paper surfaces and modern controls**

Add scoped rules for the toolbar, reader, docks, cards, and toggle state:

```css
.workbench[data-paper-theme="warm"] .toolbar {
  background: color-mix(in oklch, var(--surface-2) 92%, var(--surface));
  border-bottom-color: var(--line);
}

.workbench[data-paper-theme="warm"] .reader-pane,
.workbench[data-paper-theme="warm"] .bible-column,
.workbench[data-paper-theme="warm"] .resource-dock,
.workbench[data-paper-theme="warm"] .resource-card:not(.resource-card--video) {
  background-color: color-mix(in oklch, var(--surface) 94%, transparent);
}

.workbench[data-paper-theme="warm"] .toolbar-button--paper[aria-pressed="true"] {
  background: var(--accent-soft);
  border-color: var(--accent-quiet);
  color: var(--ink);
}

.workbench[data-paper-theme="warm"] .verse-button[aria-current="true"] {
  background: color-mix(in oklch, var(--accent-soft) 78%, var(--surface));
  border-color: color-mix(in oklch, var(--accent) 44%, var(--line));
  box-shadow:
    inset 0 0 0 1px color-mix(in oklch, var(--accent-quiet) 58%, transparent),
    0 4px 14px rgb(92 68 27 / 8%);
}
```

Do not add a thick colored side stripe. The selected verse uses a complete boundary and surface tint.

- [ ] **Step 5: Add book typography only to reading content**

Add:

```css
.workbench[data-paper-theme="warm"] .bible-column__header h2,
.workbench[data-paper-theme="warm"] .reader-pane__masthead h1,
.workbench[data-paper-theme="warm"] .verse-text,
.workbench[data-paper-theme="warm"] .resource-card__header h3,
.workbench[data-paper-theme="warm"] .resource-card__body {
  font-family: "Songti SC", STSong, "Source Han Serif SC", "Noto Serif CJK SC", serif;
}

.workbench[data-paper-theme="warm"] .bible-column--kjv .verse-text {
  font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
  letter-spacing: 0.005em;
}
```

Do not change `.toolbar`, button, input, badge, count, or status typography; they must remain system sans.

- [ ] **Step 6: Blend only explicitly marked archival images**

Add:

```css
.workbench[data-paper-theme="warm"] [data-paper-blend="true"] {
  background: transparent;
  filter: sepia(0.16) saturate(0.72) contrast(1.05);
  mix-blend-mode: multiply;
}

.workbench[data-paper-theme="warm"] .image-lightbox__canvas {
  background: color-mix(in oklch, var(--surface) 88%, var(--canvas));
}
```

There must be no global `.resource-card--image img` filter and no filter outside the warm-theme scope.

- [ ] **Step 7: Add restrained transitions and reduced-motion handling**

Add 160ms color/background/border transitions to the workbench, toolbar, reader, docks, cards, and verse buttons. Do not animate dimensions or layout properties. Add:

```css
@media (prefers-reduced-motion: reduce) {
  .workbench,
  .workbench .toolbar,
  .workbench .reader-pane,
  .workbench .resource-dock,
  .workbench .resource-card,
  .workbench .verse-button {
    transition-duration: 0.01ms;
  }
}
```

- [ ] **Step 8: Run the CSS contract and theme tests**

Run:

```bash
npx vitest run src/components/Workbench.test.tsx -t "paper theme|modern warm paper|archival monochrome" --reporter=dot
```

Expected: all new tests PASS.

---

### Task 4: Verify the Real Demo, Critique It, and Tighten the First Pass

**Files:**
- Review: `src/components/Workbench.tsx`
- Review: `src/components/Workbench.test.tsx`
- Review: `src/styles.css`
- Review against: the backup folder created in Task 1

**Interfaces:**
- Consumes: all Task 1–3 behavior and styles.
- Produces: verified browser evidence for default theme, warm theme, selected verse, archival image blend, preserved color-image behavior, and laptop-width layout.

- [ ] **Step 1: Run focused and full automated verification**

Run:

```bash
npx vitest run src/components/Workbench.test.tsx --reporter=dot
npm run build
```

Expected: the component suite passes and the TypeScript/Vite build exits 0.

If the focused suite exposes an unrelated pre-existing failure, record the exact failure and run the smallest tests that cover the Demo rather than changing unrelated code.

- [ ] **Step 2: Start or reuse the real OHB development server**

Run from `/Users/simon/OHB/one-holy-bible`:

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

Expected: Vite serves the current worktree at `http://127.0.0.1:5174/`.

- [ ] **Step 3: Verify the default theme in the Codex in-app browser**

Open `http://127.0.0.1:5174/` in the Codex in-app browser and verify:

- URL is `http://127.0.0.1:5174/` and title is `One Holy Bible`.
- Root has `data-paper-theme="default"` before the first toggle when storage is cleared.
- Existing layout, selected `Gen.1.1`, toolbar, left dock, center reader, and right dock match the pre-Demo screenshot.
- Browser console has no new warning or error caused by the Demo.

- [ ] **Step 4: Verify the warm theme and state preservation**

Click the uniquely identified `开启纸张模式` button and verify:

- Root changes to `data-paper-theme="warm"`.
- Button changes to `关闭纸张模式` and `aria-pressed="true"`.
- `Gen.1.1` remains selected.
- Current scroll position and dock widths do not reset.
- Chinese scripture uses the Song/Ming serif stack; KJV uses the book-serif stack; toolbar remains system sans.
- Measured text/background contrast is at least 4.5:1 for normal scripture and card text.

- [ ] **Step 5: Verify archival image blending and color preservation**

Use the right-dock media navigation to reach a known `cmc-01` or `ohb-genesis-codex-v2` image card. Verify its computed style has `mix-blend-mode: multiply` and the expected scoped filter only while paper mode is on.

Switch paper mode off and verify the same image returns to `mix-blend-mode: normal` and `filter: none`.

If a color image is visible in the current chapter, verify it has no `data-paper-blend` attribute and no filter in either theme. If none is available without changing application data, rely on the Task 2 classifier test and report that browser color-image sampling was unavailable in the current chapter.

- [ ] **Step 6: Verify desktop and small-laptop widths**

Inspect at:

- Desktop wide: approximately `1440 × 900`.
- Small laptop: approximately `1180 × 760`.

At both widths verify no toolbar overlap, cropped toggle label, unreadable columns, broken dock handles, or horizontal page overflow. Preserve the existing responsive structure; only adjust the new toggle or theme-specific spacing if needed.

- [ ] **Step 7: Perform the required critique-and-fix pass**

Compare the live warm theme against the approved B probe and review:

- Paper is warm but not lemon-yellow.
- Central scripture remains the visual anchor.
- Side docks recede without becoming illegible.
- Selected verse reads as soft paper light, not a modern high-saturation alert.
- Black-and-white imagery looks printed into the paper rather than laid on a white rectangle.
- Controls remain crisp and familiar.

Patch only defects found in this comparison, rerun the relevant focused tests, and repeat the same browser state that exposed each defect.

- [ ] **Step 8: Audit the exact Demo delta against the backup**

Resolve the newest preflight folder created by Task 1, then compare all three files:

```bash
backup_dir="$(find /Users/simon/备份/codex -maxdepth 1 -type d -name 'ohb-natural-paper-demo-preflight-*' -print | sort | tail -1)"
test -n "$backup_dir"
diff -u "$backup_dir/src/components/Workbench.tsx" src/components/Workbench.tsx || true
diff -u "$backup_dir/src/components/Workbench.test.tsx" src/components/Workbench.test.tsx || true
diff -u "$backup_dir/src/styles.css" src/styles.css || true
```

Expected: differences are limited to theme state/toggle, explicit archival-image markers, tests for those behaviors, and scoped warm-paper CSS. No resource data, layout model, search behavior, card editing, public data, or unrelated files are changed by this Demo.

- [ ] **Step 9: Leave the Demo uncommitted and report the handoff honestly**

Because the three target files contained unrelated user changes before this plan, do not create a source commit that would mix ownership. Report:

- Code implemented.
- Focused tests and build status.
- Real default and warm-theme browser verification status.
- Exact backup directory, backup reason, and original file paths.
- Any browser-only limitation, especially color-image sampling.
- That deployment, GitHub sync, and public-repo changes were not performed.
