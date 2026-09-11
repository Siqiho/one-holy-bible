# Stage 1 UI acceptance — 2026-09-09

Target: existing `http://127.0.0.1:1420/`, title `One Holy Bible`, Codex in-app browser. Vite PID 82698, started 2026-09-02 10:42:22. Fresh reload consumed current Workbench source; `runtime-identity.json` records exact source-map `sourcesContent` match to disk SHA-256.

Observed on the completed source hash `da7a9470842976a816e8ffcfe012aeae193fe5a4a1a8de7ba05337e32605aa4c`:

- DK-03/ST-03: disabled add-library button and English study-desk eyebrow absent. Resource-library selector, chapter heading and navigation remain.
- CD-07: query `ctb-stage1-no-match-20260909` gives four right-dock “没有匹配的卡片。” empty messages, zero old generic empty messages. Middle current-verse cards remain 34; left organized stack remains zero with its existing explanation. Clear restores 101 right-dock articles, 34 middle articles, empty query, and zero filtered-empty messages.
- TB-10: submit “光” with Enter returns 429 results. Change draft to “起初”: header “待搜索” once, body “输入已改变，点击搜索更新结果。” once, old standalone duplicate absent. Clear closes search results.
- DF-01: book and chapter dialog each open, receive Escape from a button inside, close, and restore focus to respectively `选择书卷 创世记` / `选择章节 第 1 章`. Reopen each and click the unobstructed left “资源库” text: dialog closes and chapter heading remains `创世记 Genesis 1`.
- Logs: transient `Plus is not defined` errors were captured at 07:22:32–07:22:36 UTC during intermediate source edits before button/import removal completed. No warnings/errors after fresh candidate validation (07:26 UTC onward). Current source has neither the import nor JSX use.

Interaction correction: initial attempts to click search controls or chapter heading while a picker overlapped them did not hit the intended element. One selected chapter 11. These attempts were not accepted as outside-close evidence. Returned to chapter 1 through the chapter picker, repeated both outside-close checks against the unobstructed left “资源库” text, and confirmed chapter stayed 1. Search checks were completed with pickers closed.

Final browser state: search fields empty, all dialogs closed, Reader mode restored at Genesis 1, viewport override reset. No card edit/delete/save/sync/reset was invoked. No server restart or deployment.

Preserved unfiltered empty-copy behavior is covered by the targeted component test; real-page validation used the existing populated chapter rather than altering resource data.
