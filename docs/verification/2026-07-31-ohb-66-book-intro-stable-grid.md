# OHB-66 Book Intro StableGrid Verification

Date: 2026-07-31

## Target

- Formal reader URL: `http://127.0.0.1:1420/`
- Listener observed before browser handoff: `node` PID `25829`, `127.0.0.1:1420 (LISTEN)`
- Launch command observed in process table: `tmux new-session ... npm run dev -- --host 127.0.0.1 --port 1420 ...`
- Browser verification status: PASS in the Codex in-app browser.

## Automated checks

- `npx vitest run src/components/Workbench.test.tsx --testNamePattern "scopes book-intro StableGrid CSS"`: PASS after red test first failed on missing `/* Book intro StableGrid canvas */`.
- `npx vitest run src/domain/bookIntroView.test.ts src/components/Workbench.test.tsx`: PASS, 2 files / 132 tests.
- `npm run build`: PASS (`tsc`, `tsc -p tsconfig.node.json --noEmit`, `vite build`); Vite reported existing large-chunk warnings only.
- Final whole-feature read-only review: `Ready to merge? Yes`; no Critical or Important findings. Its only documentation Minor was fixed and the scoped re-review returned `Approved`.

## CSS contract verified automatically

- Intro stylesheet block is marked by `/* Book intro StableGrid canvas */`.
- `.book-intro-canvas` declares `container: book-intro-canvas / inline-size`.
- Container queries use `@container book-intro-canvas`.
- New intro block contains no `.prototype-` selector.
- New intro rules are rooted at `.book-intro-canvas` or `.book-intro-stable-grid`.
- The intro block does not redefine unscoped `.workbench-grid`, `.resource-dock`, or `.resource-card`.
- Reduced motion is scoped to `.book-intro-canvas *`.

## Codex in-app browser results

- Verified the formal reader at `http://127.0.0.1:1420/`; title was `One Holy Bible`. The prototype route was not used for acceptance.
- `Luke → 序` rendered one middle region named `路加福音书卷序` with 9 real cards:
  - `书卷背景`: 4
  - `核心信息`: 3
  - `阅读结构`: 2
- The existing left resource library / organized-card dock and right resource dock remained present and visually unchanged. Their existing empty states stayed unchanged, as required by the narrowed scope.
- Shared-volume cases:
  - `2Sam → 序`: 8 cards marked `上下卷共用导论 · 撒母耳记上`, plus the native `撒母耳记下 导论：大纲` card.
  - `2Kgs → 序`: 6 cards marked `上下卷共用导论 · 列王记上`, plus the native `列王纪下 导论：大纲` card.
  - `2Chr → 序`: 9 shared `历代志上` combined-introduction cards, distributed 4 / 3 / 2 across the three lanes.
- Representative non-empty browser samples:
  - `Gen`: 10 cards (1 / 7 / 2)
  - `Ps`: 7 cards (2 / 3 / 2)
  - `Matt`: 9 cards (4 / 3 / 2)
  - `Phlm`: 9 cards (4 / 3 / 2)
  - `Rev`: 12 cards (4 / 6 / 2)
- Responsive measurements:
  - viewport `1800 × 1000`: intro canvas 1162 px; three columns measured about 301 / 418 / 335 px; no page or canvas horizontal overflow.
  - viewport `1400 × 900`: intro canvas 762 px; two columns measured about 287 / 389 px and the structure lane spanned the next row; no horizontal overflow.
  - narrow viewport checks around `982–1030 × 900`: intro canvas 438 px; one column measured about 384–387 px; card/header scroll width equalled client width, titles and actions remained visible, action buttons stayed 24 × 24 px, and page horizontal overflow was 0.
- Interaction checks:
  - collapsed `路加福音 导论：主题`; the button changed to `展开…` and the card body was removed.
  - reopened the card, opened its copy menu, selected `复制正文`, and observed `已复制：正文`.
  - switched from `Luke → 序` to chapter 1; the intro region disappeared and the original `中间工作区` returned.
- Runtime console check: no warning or error entries were captured during this browser pass.
- The temporary viewport override was reset. The formal `Luke → 序` tab was left open as the user-facing deliverable.

## Scope and diff notes

- Full-plan delivery files:
  - `src/domain/bookIntroView.ts`
  - `src/domain/bookIntroView.test.ts`
  - `src/components/Workbench.tsx`
  - `src/components/Workbench.test.tsx`
  - `src/styles.css`
  - `docs/superpowers/plans/2026-07-31-ohb-66-book-intro-stable-grid.md`
  - `docs/verification/2026-07-31-ohb-66-book-intro-stable-grid.md`
- Task 3's scoped styling and verification subset was limited to:
  - `src/styles.css`: appended the scoped book-intro StableGrid block only.
  - `src/components/Workbench.test.tsx`: added the CSS scope contract test; also made the existing jump-bar `scrollIntoView` assertion wait for its `requestAnimationFrame` callback so the required full-file run is stable.
  - `docs/verification/2026-07-31-ohb-66-book-intro-stable-grid.md`: recorded the automated and Codex in-app browser verification evidence, scope notes, and residual risk.
- Compared against `/Users/simon/备份/codex/20260731-002712-ohb-66-book-intro-stable-grid/`:
  - `src/components/Workbench.tsx`: differs from the backup but was already modified before this Task 3 implementation; this task did not edit it.
- `public/data/**`, `src/data/generated/**`, `prototypes/**`, and `src/prototypes/**` were not edited by this task. Current `git status` already contained dirty public JSON/generated/prototype-related files before this implementation; they are outside the Task 3 edit set.

## Residual risk

- Formal study-introduction bodies are intentionally shown in full, so books with long introductions require substantial vertical scrolling. This is a content-density tradeoff, not missing coverage; collapse controls remain available on every card.
- The repository has substantial pre-existing dirty work outside this task, so final review must distinguish this plan's files from unrelated prior data and prototype changes.
