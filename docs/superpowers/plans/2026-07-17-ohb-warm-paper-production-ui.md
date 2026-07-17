# One Holy Bible 现代暖纸正式 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已确认的现代暖纸 Demo UI 变成 5174 阅读台与 5179 卡片工作台的永久默认外观，并移除所有“纸张模式”开关与主题状态。

**Architecture:** 阅读台沿用已通过 QA 的 warm token、字体、选中态、焦点环和精确灰阶图片标记，但把条件主题 CSS 提升为 `.workbench` 默认规则并删除 theme state。卡片工作台不引入共享运行时依赖，只在现有 `styles.css` 中映射同一组视觉 token、纸面层级、字体与焦点合同；两个独立服务通过规格、CSS 合同测试和浏览器对照保持一致。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、Testing Library、CSS/OKLCH、Codex 内置浏览器。

## Global Constraints

- 唯一视觉真值：`/var/folders/g_/cx_qfcqn1nd45brx4p137xnm0000gn/T/codex-clipboard-3e9245f9-77e7-4dc7-942d-5d572d6b4f49.png`。
- 5174 与 5179 都不保留“纸张模式”按钮、主题切换、主题 storage 或旧主题回退入口。
- 不改变布局模型、资源/卡片/PDF 数据、API、搜索、编辑、同步、审核、经文导航或拖拽调宽行为。
- 彩色图、证据图片和 PDF 页面保持 `filter: none`、`mix-blend-mode: normal`；只保留阅读台两个已人工确认灰阶资源的精确 allowlist。
- 不下载字体、不增加依赖、不建立跨项目 CSS import、不生成装饰资产。
- 所有正常正文达到 WCAG AA 4.5:1；键盘焦点外环与纸面至少 3:1，且不能被 selected/active 状态阴影覆盖。
- 备份必须创建在 `/Users/simon/备份/codex/<new-subfolder>`，并包含 README、备份原因、全部原始绝对路径和时间。
- 浏览器验证只使用 Codex 内置浏览器；必须验证当前代码对应的真实 5174/5179 进程。
- 不部署、不发布、不同步公有 GitHub 仓库。
- 阅读台三个目标文件和 Edit 工作区存在任务前内容；除本设计/计划文档外，不创建会混入用户改动的 source commit。

---

### Task 1: 建立双工作台精确基线与统一备份

**Files:**
- Back up: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- Back up: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`
- Back up: `/Users/simon/OHB/one-holy-bible/src/styles.css`
- Back up: `/Users/simon/OHB/Edit/src/styles.css`
- Back up: `/Users/simon/OHB/Edit/test/App.test.tsx`
- Create: `$backup_dir/README.md` after Step 1 resolves the timestamped absolute directory
- Create: `/Users/simon/OHB/one-holy-bible/.superpowers/sdd/warm-paper-production-baseline.md`

**Interfaces:**
- Consumes: 已批准规格 `docs/superpowers/specs/2026-07-17-ohb-warm-paper-production-ui-design.md` 和当前两个工作台文件。
- Produces: `backup_dir` 的不可混淆基线、两边任务前测试/build 状态和进程身份，供 Task 2–5 精确归因。

- [ ] **Step 1: 创建新的专属备份目录并复制五个目标文件**

Run:

```bash
stamp="$(date '+%Y%m%d_%H%M%S')"
backup_time="$(date '+%Y-%m-%d %H:%M:%S %Z')"
backup_dir="/Users/simon/备份/codex/ohb-warm-paper-production-$stamp"
mkdir -p "$backup_dir/one-holy-bible/src/components" "$backup_dir/one-holy-bible/src" "$backup_dir/Edit/src" "$backup_dir/Edit/test"
cp /Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx "$backup_dir/one-holy-bible/src/components/Workbench.tsx"
cp /Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx "$backup_dir/one-holy-bible/src/components/Workbench.test.tsx"
cp /Users/simon/OHB/one-holy-bible/src/styles.css "$backup_dir/one-holy-bible/src/styles.css"
cp /Users/simon/OHB/Edit/src/styles.css "$backup_dir/Edit/src/styles.css"
cp /Users/simon/OHB/Edit/test/App.test.tsx "$backup_dir/Edit/test/App.test.tsx"
```

Expected: 新目录只包含本轮五个精确源文件的副本。

- [ ] **Step 2: 用 apply_patch 写入备份 README**

Create `$backup_dir/README.md` with:

```markdown
# OHB 现代暖纸正式 UI 修改前备份

- 备份原因：把已确认 Demo UI 正式同步到阅读台与卡片工作台前，保存五个目标文件的精确修改前状态。
- 原文件：`/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- 原文件：`/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`
- 原文件：`/Users/simon/OHB/one-holy-bible/src/styles.css`
- 原文件：`/Users/simon/OHB/Edit/src/styles.css`
- 原文件：`/Users/simon/OHB/Edit/test/App.test.tsx`
- 备份时间：把 Step 1 已解析的 `backup_time` 原样写入，例如 `2026-07-17 14:00:00 CST`；README 中不得保留变量名或示例时间。
```

Expected: README 同时记录原因、全部绝对路径和 CST 时间。

- [ ] **Step 3: 校验备份与原文件逐字节一致**

Run:

```bash
shasum -a 256 \
  /Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx \
  "$backup_dir/one-holy-bible/src/components/Workbench.tsx" \
  /Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx \
  "$backup_dir/one-holy-bible/src/components/Workbench.test.tsx" \
  /Users/simon/OHB/one-holy-bible/src/styles.css \
  "$backup_dir/one-holy-bible/src/styles.css" \
  /Users/simon/OHB/Edit/src/styles.css \
  "$backup_dir/Edit/src/styles.css" \
  /Users/simon/OHB/Edit/test/App.test.tsx \
  "$backup_dir/Edit/test/App.test.tsx"
```

Expected: 每个原文件与对应副本 hash 成对一致。

- [ ] **Step 4: 记录任务前自动验证基线**

Run from `/Users/simon/OHB/one-holy-bible`:

```bash
npx vitest run src/components/Workbench.test.tsx --reporter=dot --silent
npm run build
npx vite build
```

Run from `/Users/simon/OHB/Edit`:

```bash
npx vitest run test/App.test.tsx --reporter=dot --silent
npm run build
```

Expected: 把退出码、通过/失败数量、完整失败名称和构建错误写入 baseline；不得因为任务前失败而修改非本轮逻辑。

- [ ] **Step 5: 记录当前运行面身份与健康状态**

Run:

```bash
lsof -nP -iTCP:5174 -sTCP:LISTEN
lsof -nP -iTCP:5179 -sTCP:LISTEN
lsof -nP -iTCP:5127 -sTCP:LISTEN
curl -sS -I http://127.0.0.1:5174/
curl -sS -I http://127.0.0.1:5179/
curl -sS http://127.0.0.1:5127/api/cards -o /dev/null -w '%{http_code}\n'
```

Expected: baseline 记录 PID、端口、CWD/命令和 HTTP 状态；若端口没有运行，明确记录为空而不是启动旧服务替代。

- [ ] **Step 6: 写基线报告，不提交源文件**

Create `.superpowers/sdd/warm-paper-production-baseline.md`，包含 `backup_dir`、hash 校验、两边测试/build、PID/端口和已知债务。仅报告事实，不执行 `git add` 或 source commit。

---

### Task 2: 把阅读台 Demo 暖纸主题正式化为唯一默认 UI

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/styles.css`
- Create: `/Users/simon/OHB/one-holy-bible/.superpowers/sdd/warm-paper-reader-report.md`

**Interfaces:**
- Consumes: Task 1 备份；现有 `shouldBlendImageWithPaper(resource)` 精确 allowlist；已通过 QA 的 warm token 与焦点合同。
- Produces: 无主题 state、无按钮、无 theme storage、始终为现代暖纸视觉的 `Workbench`。

- [ ] **Step 1: 先把主题切换测试改成永久暖纸合同**

Replace the two theme-toggle tests with a test equivalent to:

```tsx
it("uses the production warm-paper UI without a theme mode or storage writes", () => {
  const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
  localStorage.setItem("one-holy-bible-paper-theme", "default");
  setItemSpy.mockClear();

  renderWorkbench();

  const workbench = screen.getByRole("main");
  expect(workbench).not.toHaveAttribute("data-paper-theme");
  expect(screen.queryByRole("button", { name: /纸张模式/ })).not.toBeInTheDocument();
  expect(screen.queryByText("纸张模式")).not.toBeInTheDocument();
  expect(setItemSpy).not.toHaveBeenCalledWith("one-holy-bible-paper-theme", expect.anything());
});
```

Also change CSS contract constants from:

```ts
const warmPaperRoot = '.workbench[data-paper-theme="warm"]';
```

to:

```ts
const productionPaperRoot = ".workbench";
```

and assert that production CSS contains no `data-paper-theme`, `.toolbar-button--paper`, or `Modern warm paper demo` selector/comment.

- [ ] **Step 2: 运行新合同并确认 RED**

Run:

```bash
npx vitest run src/components/Workbench.test.tsx -t "production warm-paper UI|modern warm paper|high-contrast focus ring|cascade|archival monochrome" --reporter=dot
```

Expected: FAIL because the current root still has `data-paper-theme`, the button still exists, storage helpers still run, and CSS remains warm-scoped.

- [ ] **Step 3: 删除 Workbench 主题模式运行时代码**

Remove from `Workbench.tsx`:

```ts
export const paperThemeStorageKey = "one-holy-bible-paper-theme";
type PaperTheme = "default" | "warm";
function storedPaperTheme(): PaperTheme { /* existing body */ }
function persistPaperTheme(theme: PaperTheme) { /* existing body */ }
```

Remove the `paperTheme` state, `isWarmPaperTheme`, toggle handler and the entire `toolbar-button--paper` button. Change:

```tsx
<main className="workbench" data-paper-theme={paperTheme}>
```

to:

```tsx
<main className="workbench">
```

Remove `SunMedium` from the Lucide import only if no other use remains. Do not change any neighboring toolbar button or layout state.

- [ ] **Step 4: 把已验证 warm CSS 提升为生产默认**

In `styles.css`:

1. Delete the responsive `.toolbar-button--paper` label/min-width rule.
2. Rename `/* Modern warm paper demo */` to `/* Modern warm paper production UI */`.
3. Change every `.workbench[data-paper-theme="warm"]` prefix in that section and its reduced-motion block to `.workbench`.
4. Delete the now-unused pressed paper button rule.
5. Keep exact production defaults:

```css
.workbench {
  --canvas: oklch(94% 0.03 94);
  --surface: oklch(98% 0.022 96);
  --surface-2: oklch(96% 0.026 94);
  --surface-3: oklch(92% 0.028 91);
  --ink: oklch(31% 0.035 75);
  --ink-soft: oklch(42% 0.032 75);
  --muted: oklch(51% 0.028 76);
  --faint: oklch(63% 0.025 80);
  --line: oklch(81% 0.04 88);
  --line-strong: oklch(72% 0.05 84);
  --accent: oklch(56% 0.07 72);
  --accent-soft: oklch(95% 0.038 88);
  --accent-quiet: oklch(82% 0.046 84);
  --focus-ring: oklch(45% 0.075 72);
  --focus-halo: oklch(99% 0.012 96);
}
```

6. Keep `.workbench [data-paper-blend="true"]` and the two exact gray asset suffixes; do not add any family-level image filter.

- [ ] **Step 5: 运行阅读台 GREEN 与回归验证**

Run:

```bash
npx vitest run src/components/Workbench.test.tsx -t "production warm-paper UI|exact monochrome|only allowlisted|opens a dismissible enlarged preview|modern warm paper|high-contrast focus ring|cascade|AA warm-paper|visible warm-paper|warm-paper reduced-motion" --reporter=dot --silent
npx vitest run src/components/Workbench.test.tsx --reporter=dot --silent
npx vite build
git diff --check -- src/components/Workbench.tsx src/components/Workbench.test.tsx src/styles.css
```

Expected: production paper contracts pass; full-suite outcome matches Task 1 except for new passing contracts; Vite build exits 0; whitespace check clean.

- [ ] **Step 6: 精确审计阅读台差异并写报告**

Run:

```bash
diff -u "$backup_dir/one-holy-bible/src/components/Workbench.tsx" src/components/Workbench.tsx || true
diff -u "$backup_dir/one-holy-bible/src/components/Workbench.test.tsx" src/components/Workbench.test.tsx || true
diff -u "$backup_dir/one-holy-bible/src/styles.css" src/styles.css || true
```

Expected: only theme mode removal, permanent CSS promotion, adjusted tests and retained image marker logic differ. Write `.superpowers/sdd/warm-paper-reader-report.md`; do not commit source files.

---

### Task 3: 把同一现代暖纸设计语言同步到 5179 卡片工作台

**Files:**
- Modify: `/Users/simon/OHB/Edit/test/App.test.tsx`
- Modify: `/Users/simon/OHB/Edit/src/styles.css`
- Create: `/Users/simon/OHB/one-holy-bible/.superpowers/sdd/warm-paper-card-workbench-report.md`

**Interfaces:**
- Consumes: Task 1 Edit baseline；Task 2 最终 token、字体、焦点和层级角色。
- Produces: 无主题状态、图片/PDF 原色保护、四栏布局不变的正式暖纸卡片工作台。

- [ ] **Step 1: 在 Edit 测试中增加生产暖纸 CSS 合同**

Append to `describe("layout CSS")`:

```ts
it("uses the shared production warm-paper tokens and paper hierarchy", () => {
  const css = readFileSync("src/styles.css", "utf8");
  const root = css.match(/^:root \{(?<body>[\s\S]*?)^\}/m)?.groups?.body ?? "";

  expect(root).toContain("--canvas: oklch(94% 0.03 94)");
  expect(root).toContain("--surface: oklch(98% 0.022 96)");
  expect(root).toContain("--ink: oklch(31% 0.035 75)");
  expect(root).toContain("--focus-ring: oklch(45% 0.075 72)");
  expect(css).toContain(".sidebar,");
  expect(css).toContain(".queuePanel,");
  expect(css).toContain(".reviewPanel,");
  expect(css).toContain(".previewPanel");
  expect(css).not.toContain("linear-gradient(90deg, rgb(121 92 43 / 0.035) 1px");
});

it("keeps warm-paper focus visible above selected states", () => {
  const css = readFileSync("src/styles.css", "utf8");
  const focusIndex = css.lastIndexOf('.appShell button:focus-visible:not(:disabled)');
  const selectedIndex = css.lastIndexOf(".queueItem.isSelected");

  expect(focusIndex).toBeGreaterThan(selectedIndex);
  expect(css.slice(focusIndex, focusIndex + 900)).toContain("0 0 0 2px var(--focus-halo)");
  expect(css.slice(focusIndex, focusIndex + 900)).toContain("0 0 0 5px var(--focus-ring)");
});

it("does not filter card images, evidence images, or PDF pages", () => {
  const css = readFileSync("src/styles.css", "utf8");

  for (const selector of [".ohbPreviewImage img", ".pdfPageImage", ".pdfFrame"]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rule = css.match(new RegExp(`${escaped}\\s*\\{(?<body>[\\s\\S]*?)\\}`))?.groups?.body ?? "";
    expect(rule).not.toMatch(/filter\s*:/);
    expect(rule).not.toMatch(/mix-blend-mode\s*:/);
  }
  expect(css).not.toMatch(/(?:img|iframe)\s*\{[^}]*filter\s*:/s);
});
```

- [ ] **Step 2: 运行 Edit 新合同并确认 RED**

Run from `/Users/simon/OHB/Edit`:

```bash
npx vitest run test/App.test.tsx -t "shared production warm-paper|warm-paper focus|does not filter card images" --reporter=dot
```

Expected: token、双环和纸面层级合同失败；图片保护合同应通过或准确暴露既有滤镜。

- [ ] **Step 3: 替换 Edit 正式 token 与画布背景**

In `src/styles.css`, replace root paper roles with Task 2 exact values and add:

```css
--focus-ring: oklch(45% 0.075 72);
--focus-halo: oklch(99% 0.012 96);
```

Replace the visible 28px grid on `body` with:

```css
body {
  background: var(--canvas);
  margin: 0;
  min-height: 100vh;
}
```

Keep `.appShell` structure unchanged, but use the same low-opacity two-radial warm illumination as the reader:

```css
.appShell {
  background:
    radial-gradient(circle at 16% 8%, rgb(255 248 196 / 24%), transparent 28%),
    radial-gradient(circle at 82% 22%, rgb(218 188 116 / 7%), transparent 34%),
    var(--canvas);
}
```

- [ ] **Step 4: 映射四栏表面、卡片与字体层级**

Keep all existing grid/padding/overflow declarations. Update only backgrounds, borders, shadows and reading fonts so the final rules include:

```css
.sidebar,
.queuePanel,
.previewPanel {
  background: linear-gradient(180deg, color-mix(in oklch, var(--surface-2) 88%, var(--canvas)), var(--surface-2));
}

.reviewPanel {
  background: linear-gradient(180deg, color-mix(in oklch, var(--surface) 98%, var(--canvas)), var(--surface));
}

.queueItem,
.sourceBlock,
.reviewDrawer,
.ohbCardPreview {
  border-color: var(--line);
}

.queueCopy strong,
.ohbPreviewBody h3,
.ohbPreviewText,
.locatorEvidence,
.ledgerPreview {
  font-family: "Songti SC", STSong, "Source Han Serif SC", "Noto Serif CJK SC", serif;
}

button,
input,
textarea,
select,
.metadata,
.muted,
.kindPill,
.matchPill,
.pdfFrameHeader {
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}
```

Preserve `.riskNote--low|medium|high`, danger controls, notices and sync progress as semantic colors mixed against the new `--surface`.

- [ ] **Step 5: 增加最后级高对比焦点保障，不改变图片像素**

Append after selected/active component rules:

```css
.appShell button:focus-visible:not(:disabled),
.appShell input:focus-visible:not(:disabled),
.appShell textarea:focus-visible:not(:disabled),
.appShell select:focus-visible:not(:disabled),
.appShell a:focus-visible {
  box-shadow:
    0 0 0 2px var(--focus-halo),
    0 0 0 5px var(--focus-ring);
  outline: none;
}
```

Do not add `filter` or `mix-blend-mode` to `.ohbPreviewImage img`, `.pdfPageImage`, `.pdfFrame`, generic `img`, or `iframe`.

- [ ] **Step 6: 运行 Edit GREEN、完整测试与构建**

Run from `/Users/simon/OHB/Edit`:

```bash
npx vitest run test/App.test.tsx -t "shared production warm-paper|warm-paper focus|does not filter card images" --reporter=dot --silent
npx vitest run test/App.test.tsx --reporter=dot --silent
npm run build
git diff --no-index --check "$backup_dir/Edit/src/styles.css" src/styles.css
git diff --no-index --check "$backup_dir/Edit/test/App.test.tsx" test/App.test.tsx
```

Expected: three new contracts pass; full App suite and build are no worse than Task 1 baseline; diff whitespace clean.

- [ ] **Step 7: 精确审计 Edit 差异并写报告**

Run:

```bash
diff -u "$backup_dir/Edit/src/styles.css" src/styles.css || true
diff -u "$backup_dir/Edit/test/App.test.tsx" test/App.test.tsx || true
```

Expected: only token/background/border/shadow/font/focus CSS and corresponding tests differ；`App.tsx`、API、data、server、package files remain byte-identical. Write `.superpowers/sdd/warm-paper-card-workbench-report.md`; do not create a source commit.

---

### Task 4: 在两个真实工作台完成浏览器设计 QA 与缺陷修复

**Files:**
- Review: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- Review: `/Users/simon/OHB/one-holy-bible/src/styles.css`
- Review: `/Users/simon/OHB/Edit/src/styles.css`
- Modify: only the nearest file above when a browser P0/P1/P2 is proven
- Modify: `/Users/simon/OHB/one-holy-bible/design-qa.md`
- Create: `/Users/simon/OHB/one-holy-bible/.superpowers/sdd/warm-paper-production-browser-report.md`

**Interfaces:**
- Consumes: Task 2 reader UI、Task 3 card workbench UI、视觉真值截图和 Task 1 PID baseline。
- Produces: 两个端口的当前进程证据、同屏截图、交互/焦点/图片保护证据和 `design-qa.md final result: passed`。

- [ ] **Step 1: 确认或重启当前代码对应的真实服务**

For 5174, ensure Vite runs from `/Users/simon/OHB/one-holy-bible`:

```bash
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

For 5179/5127, ensure `npm run dev` runs from `/Users/simon/OHB/Edit`:

```bash
npm run dev
```

Expected: record new/current PID, start time, command and CWD; never use 1420 or a stale bundle as proof.

- [ ] **Step 2: 验证 5174 阅读台正式 UI**

Use Codex in-app browser at `http://127.0.0.1:5174/` and verify:

- URL/title load；root has no `data-paper-theme`。
- no button/text accessible name contains `纸张模式`。
- `Gen.1.1` remains selected；toolbar order and dock widths remain stable。
- Chinese/KJV font families match the spec；normal text contrast ≥ 4.5:1。
- selected verse、toolbar button、search input keyboard focus show 2px halo + 5px ring。
- confirmed gray `p011` uses multiply/mild filter；blue `p014` and color `p018` remain normal/no filter。
- 1440×900 and 1180×760 have no horizontal page overflow or new toolbar clipping。
- console error/warn/warning has no new production-paper issue。

- [ ] **Step 3: 验证 5179 卡片工作台正式 UI 与主路径**

Use Codex in-app browser at `http://127.0.0.1:5179/` and verify:

- four-column layout, total/image/text/sync stats and selected result load from real `/api/cards`。
- sidebar/results/PDF dock recede，review/card surface remains the visual anchor。
- select a result, open card edit, focus title/body/anchor controls, close drawer, open PDF preview；no behavior reset。
- queue selected item、normal button、input、textarea、select、link keyboard focus show the double ring above state shadows。
- `.ohbPreviewImage img` and `.pdfPageImage`/`.pdfFrame` report `filter: none` and `mix-blend-mode: normal`。
- low/medium/high risk and danger/sync states remain distinguishable on warm surfaces。
- current viewport has no horizontal page overflow, clipped primary actions or broken resize handles。
- console error/warn/warning has no new production-paper issue。

- [ ] **Step 4: 建立同屏视觉对照并做一次批评修复波**

Capture:

```text
.superpowers/sdd/warm-paper-reader-1440x900.png
.superpowers/sdd/warm-paper-reader-1180x760.png
.superpowers/sdd/warm-paper-card-workbench-wide.png
.superpowers/sdd/warm-paper-production-comparison.png
```

The comparison must include the user truth image, final reader and final card workbench. Review typography, spacing/layout, colors/tokens, image/PDF quality, copy/content and interactive states. Fix every P0/P1/P2 with a failing test first; repeat the exact viewport/state that exposed it.

- [ ] **Step 5: 更新 blocking design QA**

Update `design-qa.md` with:

```markdown
## Final production result

`passed`

Reader and card workbench use the approved permanent warm-paper UI. No actionable P0, P1, or P2 findings remain.
```

Also record source truth path, all screenshots, pre/post findings, contrast/focus evidence, image/PDF protection and intentional P3 constraints.

- [ ] **Step 6: 写浏览器报告并保留两个用户可试用页面**

Create `.superpowers/sdd/warm-paper-production-browser-report.md` with URL/title/PID, viewport, interactions, computed styles, console, screenshots and residual limitations. Finalize both in-app tabs as deliverables only after all browser work is complete.

---

### Task 5: 完成双工作台精确复审与交付门槛

**Files:**
- Review: all Task 1–4 target files and reports
- Create: `/Users/simon/OHB/one-holy-bible/.superpowers/sdd/warm-paper-production-final-review.md`
- Modify: `/Users/simon/OHB/one-holy-bible/.superpowers/sdd/progress.md`

**Interfaces:**
- Consumes: backup diffs、automatic verification、browser report、design QA and final screenshots。
- Produces: independent `APPROVED` verdict, clean scope audit and honest handoff。

- [ ] **Step 1: 重跑最终最小充分自动验证**

Run reader:

```bash
npx vitest run src/components/Workbench.test.tsx -t "production warm-paper UI|exact monochrome|only allowlisted|high-contrast focus ring|cascade|AA warm-paper|visible warm-paper|warm-paper reduced-motion" --reporter=dot --silent
npx vite build
```

Run Edit:

```bash
npx vitest run test/App.test.tsx -t "shared production warm-paper|warm-paper focus|does not filter card images" --reporter=dot --silent
npm run build
```

Expected: targeted suites and both Vite builds pass; any full-suite baseline debt remains explicitly classified.

- [ ] **Step 2: 审计所有实际文件相对备份的精确差异**

Run all five `diff -u` comparisons from Tasks 2–3 plus:

```bash
git diff --check -- src/components/Workbench.tsx src/components/Workbench.test.tsx src/styles.css
```

Expected: no API/data/layout behavior expansion, no theme mode remnants, no image/PDF global filter, no accidental unrelated file modification.

- [ ] **Step 3: 由独立 reviewer 检查规格、实现、测试与视觉证据**

Reviewer must return one verdict in `.superpowers/sdd/warm-paper-production-final-review.md`:

```markdown
## Verdict

APPROVED

- Critical: 0
- Important: 0
- Minor: 0
```

If any finding exists, dispatch one scoped fix wave, rerun affected automated/browser evidence, then re-review before completion.

- [ ] **Step 4: 更新进度并交付**

Mark all tasks complete in `.superpowers/sdd/progress.md` only after final review is APPROVED. Report:

- 5174 and 5179 clickable local URLs first。
- code implemented vs tests/build vs real browser verification。
- exact backup directory、backup reason and all five original absolute paths。
- pre-existing failures/type debt separately。
- no deployment、GitHub sync or public-repo modification。
- source changes intentionally left uncommitted because of existing user-owned work and non-git Edit workspace。
