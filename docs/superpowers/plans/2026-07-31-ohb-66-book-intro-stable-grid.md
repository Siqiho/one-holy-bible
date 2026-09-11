# OHB 66 卷书卷序静态格栅 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 当用户从章节面板选择任意一卷书的“序”时，只在中间阅读区域显示第一版“静态格栅”风格的三栏导论，并保证 66 卷都有内容。

**Architecture:** 从现有 `StudyResource[]` 建立只读的书卷导论投影，不回写 `bookIntro`，也不改变卡片的 `primaryAnchor`、`verses` 或同步状态。`Workbench` 仅在 `selectedIntroBook !== null` 时绕过原来的空白双译本／当前卡片组合，在同一个 `reader-pane` 中渲染专用静态格栅；普通章节继续使用当前模块布局。

**Tech Stack:** React 19、TypeScript 5.8、Vitest 4、Testing Library、原生 CSS、现有 `ResourceCard` 和 OHB 设计令牌。

## Global Constraints

- 只修改“序”模式的中间阅读区域；左侧资源库、左侧整理卡片、右侧资源栏及普通章节布局和样式保持原样。
- 不修改 `public/data/books/*.json`、`src/data/generated/*`、同步脚本或任何卡片的持久化锚点。
- 不从 `src/prototypes/` 导入组件、样式或 Luke 假数据；只把 StableGrid 的布局契约翻译为正式代码。
- 所有新增 CSS 必须以 `.book-intro-canvas` 或 `.book-intro-stable-grid` 为作用域根。
- 当前工作树已有大量用户改动；不得 stage、commit、覆盖或整理无关差异。
- 现有文件的任务前备份位于 `/Users/simon/备份/codex/20260731-002712-ohb-66-book-intro-stable-grid/`。

---

### Task 1: 66 卷导论只读投影

**Files:**

- Create: `src/domain/bookIntroView.ts`
- Create: `src/domain/bookIntroView.test.ts`

**Interfaces:**

- Consumes: `StudyResource` from `src/domain/resources.ts`, `bibleBooks`, `bookTitle`, `englishBookTitle` from `src/domain/bibleBooks.ts`, `parseVerseId` from `src/domain/verse.ts`.
- Produces:

```ts
export type BookIntroLaneId = "context" | "message" | "structure";

export interface BookIntroViewItem {
  resource: StudyResource;
  sharedFromBookId?: string;
}

export interface BookIntroLane {
  id: BookIntroLaneId;
  eyebrow: string;
  title: string;
  description: string;
  items: BookIntroViewItem[];
}

export interface BookIntroViewModel {
  bookId: string;
  chineseTitle: string;
  englishTitle: string;
  totalCount: number;
  lanes: BookIntroLane[];
}

export function buildBookIntroView(resources: StudyResource[], bookId: string): BookIntroViewModel;
```

- [ ] **Step 1: Write failing tests for selection, classification and stable ordering**

Create focused fixtures with IDs such as `study-bible-luke-intro-p001-n001`, valid anchors, page metadata and titles ending in `作者`, `主题`, `文学特征`, and assert the lane IDs are exactly `context`, `message`, `structure`. Add duplicate IDs in the input and assert they appear once. Add shuffled input and assert page/ID ordering is stable.

```ts
const view = buildBookIntroView(shuffledResources, "Luke");
expect(view.lanes.map((lane) => lane.id)).toEqual(["context", "message", "structure"]);
expect(view.lanes[0].items.map(({ resource }) => resource.id)).toEqual([
  "study-bible-luke-intro-p001-n001",
  "study-bible-luke-intro-p002-n004",
]);
expect(view.totalCount).toBe(new Set(view.lanes.flatMap((lane) => lane.items.map(({ resource }) => resource.id))).size);
```

- [ ] **Step 2: Run the focused test and confirm the missing module failure**

Run: `npx vitest run src/domain/bookIntroView.test.ts`

Expected: FAIL because `./bookIntroView` does not exist.

- [ ] **Step 3: Implement formal-intro selection and lane classification**

Use the exact predicate and precedence below:

```ts
const FORMAL_INTRO_ID = /^study-bible-[a-z0-9]+-intro-/i;
const CONTEXT_PATTERN = /作者|书名|写作时间|大事年表|年表|写作目的|缘起|背景|文本/;
const STRUCTURE_PATTERN = /文学特征|大纲|结构/;

function classifyIntroTitle(title: string): BookIntroLaneId {
  if (STRUCTURE_PATTERN.test(title)) return "structure";
  if (CONTEXT_PATTERN.test(title)) return "context";
  return "message";
}
```

Resolve the resource book only from valid `primaryAnchor` followed by `verses`; ignore a formal-looking card whose resolved book differs from the requested source book. Sort by `debugMeta.page ?? Number.MAX_SAFE_INTEGER`, then parsed `pNNN`, then `nNNN`, then `id`.

- [ ] **Step 4: Add paired-volume projection tests and implementation**

Use this exact map:

```ts
const SHARED_INTRO_SOURCE: Readonly<Record<string, string>> = {
  "2Sam": "1Sam",
  "2Kgs": "1Kgs",
  "2Chr": "1Chr",
};
```

For `2Sam` and `2Kgs`, include the requested book's own formal cards and borrow only non-structure cards from the mapped first volume. For `2Chr`, whose source intro is a combined Chronicles introduction, borrow all `1Chr` formal cards. Mark every borrowed projection item with `sharedFromBookId`, dedupe by resource ID, and never mutate or clone the resource object.

```ts
expect(buildBookIntroView(resources, "2Sam").lanes.find((lane) => lane.id === "structure")?.items)
  .toEqual([expect.objectContaining({ resource: expect.objectContaining({ id: "study-bible-2sam-intro-p001-n001" }) })]);
expect(buildBookIntroView(resources, "2Chr").lanes.flatMap((lane) => lane.items))
  .toEqual(expect.arrayContaining([expect.objectContaining({ sharedFromBookId: "1Chr" })]));
```

- [ ] **Step 5: Add the real-data 66-book coverage test**

Import `resources` from `src/data/generated/workbenchSyncedResources-v4.json` using the same typed JSON pattern already used by the repository. Iterate `bibleBooks` and assert every view has `totalCount > 0`, exactly three lanes, and no duplicate resource ID inside one view.

```ts
for (const book of bibleBooks) {
  const view = buildBookIntroView(generatedResources, book.id);
  expect(view.totalCount, book.id).toBeGreaterThan(0);
  expect(view.lanes, book.id).toHaveLength(3);
  const ids = view.lanes.flatMap((lane) => lane.items.map(({ resource }) => resource.id));
  expect(new Set(ids).size, book.id).toBe(ids.length);
}
```

- [ ] **Step 6: Run Task 1 tests**

Run: `npx vitest run src/domain/bookIntroView.test.ts`

Expected: PASS.

### Task 2: Workbench 中间区专用静态格栅

**Files:**

- Modify: `src/components/Workbench.tsx`
- Modify: `src/components/Workbench.test.tsx`

**Interfaces:**

- Consumes: `buildBookIntroView(resources, bookId)` and `BookIntroViewModel` from Task 1; existing internal `ResourceCard` and all existing resource handlers.
- Produces: internal `BookIntroStableGrid` component and a `selectedIntroBook`-only render branch inside `reader-pane`.

- [ ] **Step 1: Write the failing Workbench intro-grid test**

Render `Workbench` with three formal Luke resources whose titles classify into three lanes and `initialIntroBook="Luke"`. Assert the middle region contains exactly these accessible labels and that the two side docks still exist:

```ts
expect(screen.getByRole("region", { name: "路加福音书卷序" })).toBeInTheDocument();
expect(screen.getByRole("region", { name: "书卷背景" })).toBeInTheDocument();
expect(screen.getByRole("region", { name: "核心信息" })).toBeInTheDocument();
expect(screen.getByRole("region", { name: "阅读结构" })).toBeInTheDocument();
expect(screen.getByRole("complementary", { name: "左侧资料栏" })).toBeInTheDocument();
expect(screen.getByRole("complementary", { name: "右侧资料栏" })).toBeInTheDocument();
```

Also assert the old intro placeholder text `路加福音导论` does not render as a bare `book-intro-panel`, and `data-testid="center-module"` is absent while intro mode is active.

- [ ] **Step 2: Run the focused Workbench test and confirm failure**

Run the exact new test by name with `npx vitest run src/components/Workbench.test.tsx -t "renders the stable grid only in the middle reading area for book intros"`.

Expected: FAIL because the dedicated region does not exist.

- [ ] **Step 3: Add `BookIntroStableGrid` using the existing `ResourceCard`**

Inside `Workbench.tsx`, after `CurrentVerseCardList`, add an internal component that:

- owns only a `Set<string>` of collapsed resource IDs;
- renders `<section className="book-intro-canvas" role="region" aria-label={`${view.chineseTitle}书卷序`}>`;
- renders `.book-intro-stable-grid` containing the three lanes in model order;
- assigns `.book-intro-lane--context`, `.book-intro-lane--message`, `.book-intro-lane--structure`;
- renders shared items with visible text `上下卷共用导论 · ${bookTitle(sharedFromBookId)}`;
- passes the original `resource` object to `ResourceCard` with `centerVariant`, `currentVerseVariant`, `savedVariant`, `draggable={false}`, original source anchor, existing edit/delete/navigate/open/copy/unsync/update handlers, and the existing collapse button pattern.

The component must not accept or render `ResourceDock`, `visibleCenterModules` or prototype fixtures.

- [ ] **Step 4: Compute the view from visible, unfiltered resources**

Immediately after `visibleResources` is computed, add:

```ts
const bookIntroView = useMemo(
  () => selectedIntroBook ? buildBookIntroView(visibleResources, selectedIntroBook) : null,
  [selectedIntroBook, visibleResources],
);
```

Do not use `libraryFilteredResources`, `filteredCurrentResources` or `cardSearchQuery`; those continue to drive the unchanged side docks.

- [ ] **Step 5: Replace only the reader content branch in intro mode**

Keep the existing `reader-pane__masthead`. Inside the existing `center-workspace` location, use this branch shape:

```tsx
{selectedIntroBook && bookIntroView ? (
  <BookIntroStableGrid view={bookIntroView} {...existingResourceHandlers} />
) : (
  <div
    aria-label="中间工作区"
    className={`reader-columns center-workspace center-workspace--${visibleCenterModules.length}`}
    role="region"
    /* existing style and children unchanged */
  >
    {/* existing visibleCenterModules branch copied without semantic changes */}
  </div>
)}
```

The `ResourceDock` instances, resize handles and their props must remain byte-for-byte outside this branch except for formatting required by TypeScript.

- [ ] **Step 6: Add mode-switch and shared-source tests**

From `initialIntroBook="Luke"`, click the chapter picker and chapter `1`; assert the intro region disappears and the original visible center module(s) return. Add a `2Sam` fixture set with borrowed `1Sam` background plus native `2Sam` outline; assert the shared label is visible and the navigation button still targets the original `1Sam.*` anchor.

- [ ] **Step 7: Run Task 2 tests**

Run: `npx vitest run src/domain/bookIntroView.test.ts src/components/Workbench.test.tsx`

Expected: PASS.

### Task 3: Intro-only StableGrid styling and standard verification

**Files:**

- Modify: `src/styles.css`
- Modify: `src/components/Workbench.test.tsx`
- Create: `docs/verification/2026-07-31-ohb-66-book-intro-stable-grid.md`

**Interfaces:**

- Consumes: `.book-intro-canvas`, `.book-intro-stable-grid`, `.book-intro-lane--context|message|structure` from Task 2.
- Produces: intro-only responsive layout contract; no production API changes.

- [ ] **Step 1: Add a failing CSS scope contract test**

Read `src/styles.css` in the test and assert it contains `.book-intro-canvas` plus `@container book-intro-canvas` rules, and contains no `.prototype-` selector in the production stylesheet. Assert the new intro block does not redefine `.workbench-grid`, `.resource-dock`, or an unscoped `.resource-card` selector.

- [ ] **Step 2: Add the scoped intro canvas styles**

Use this structural contract:

```css
.book-intro-canvas {
  container: book-intro-canvas / inline-size;
  min-height: 0;
  min-width: 0;
  overflow: auto;
}

.book-intro-stable-grid {
  display: grid;
  grid-template-columns: minmax(210px, 0.9fr) minmax(280px, 1.25fr) minmax(220px, 1fr);
}

@container book-intro-canvas (max-width: 860px) {
  .book-intro-stable-grid { grid-template-columns: minmax(210px, 0.85fr) minmax(0, 1.15fr); }
  .book-intro-lane--structure { grid-column: 1 / -1; }
}

@container book-intro-canvas (max-width: 560px) {
  .book-intro-stable-grid { grid-template-columns: minmax(0, 1fr); }
  .book-intro-lane--message { grid-row: 1; }
  .book-intro-lane--context { grid-row: 2; }
  .book-intro-lane--structure { grid-column: auto; grid-row: 3; }
}
```

Translate the prototype's warm paper, thin rule, rounded count badge, middle-lane priority and generous spacing with existing `--surface`, `--surface-2`, `--line`, `--ink`, `--muted`, `--accent-soft` tokens. Scope every ResourceCard adjustment under `.book-intro-canvas`; card headers wrap at narrow sizes rather than hiding title, source or actions.

- [ ] **Step 3: Add reduced-motion and typography rules**

Within `@media (prefers-reduced-motion: reduce)`, disable transitions only for `.book-intro-canvas *`. Ensure the existing `data-reading-font` inherited font works; do not add a new font import. Warm/default theme differences must derive from existing variables.

- [ ] **Step 4: Run automated checks**

Run:

```bash
npx vitest run src/domain/bookIntroView.test.ts src/components/Workbench.test.tsx
npm run build
```

Expected: both commands PASS.

- [ ] **Step 5: Verify the real target in the Codex in-app browser**

Use the running formal reader at `http://127.0.0.1:1420/`, not the `/prototypes/reader-card-system/` route. Verify:

- `Luke → 序`: center shows all three lanes; left and right docks retain their original UI.
- `2Sam → 序`, `2Kgs → 序`, `2Chr → 序`: shared labels and native/combined outline policy are correct.
- `Gen`, `Ps`, `Matt`, `Phlm`, `Rev`: non-empty representative coverage.
- center widths approximately 1200, 800, 390 px: three/two/one columns, no horizontal overflow or crushed controls.
- switching from `序` to `1`: static grid disappears and original center modules return.
- one locate action, one collapse action and one copy action work.

- [ ] **Step 6: Record verification and inspect the task-only diff**

Write `docs/verification/2026-07-31-ohb-66-book-intro-stable-grid.md` with the URL, port/process identity, automated command results, checked books, checked widths, visible outcomes and any residual risk. Compare existing files against `/Users/simon/备份/codex/20260731-002712-ohb-66-book-intro-stable-grid/` and assert no public JSON, generated resource, side-dock contract or prototype file was changed by this plan.
