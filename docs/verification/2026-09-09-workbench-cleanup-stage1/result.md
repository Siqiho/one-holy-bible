# Workbench cleanup stage 1 result

Scope: only `src/components/Workbench.tsx` and `src/components/Workbench.test.tsx`. Reader, styles, data, deps, and the other 49 inventory items were not changed.

## Items

1. **DK-03** — Removed the always-disabled “添加资源库” button. Dropped the unused `Plus` import. Source picker and left-dock collapse remain.
2. **ST-03** — Removed the `{book} study desk` eyebrow. Chapter title, prev/next chapter, and masthead resize remain.
3. **TB-10** — Pending (unsubmitted) scripture search now uses header status `待搜索`. The body still has exactly one “输入已改变，点击搜索更新结果。” Submit, scope, version, and clear are unchanged.
4. **CD-07** — `isCardSearchActive` is passed into the right-dock empty-state component. Non-empty card search with no matches shows “没有匹配的卡片。” Unfiltered empty still shows “当前经节还没有资源。” Center verse cards and left organize are unchanged. Existing clear-search control remains; no extra clear entry.
5. **DF-01 (partial)** — Book and chapter pickers listen for Escape only while open, close, and restore focus to the matching trigger. Outside-pointer close is unchanged. Settings, search, editor, and lightbox listeners were not touched.

## Tests observed

Command (exit 0):

```
npx vitest run src/components/Workbench.test.tsx src/App.test.tsx src/components/ReaderView.test.tsx --reporter=dot
```

Result: 3 files, 162 passed, 35.34s.

Targeted new/updated cases also passed in an earlier filtered run (7 passed).

```
npx tsc --noEmit
```

Result: `tsc_exit:0` (no diagnostics).

## Limits

- Browser main-path check is for Codex on the existing 1420 surface; this session did not open a browser or start/stop services.
- DF-01 covers only book/chapter navigation Esc. Lightbox and search-panel close were out of scope.
- Unfiltered empty-copy test asserts preserved current wording; it was already green before the code change.
