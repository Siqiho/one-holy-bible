# Bible Encyclopedia Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` task by task. Keep generated OCR artifacts outside the app source tree until they pass the production contract.

**Goal:** Finish the selected 11-category Bible encyclopedia pipeline from Apple Vision OCR through validated Reader resources, and load the accepted entries into the Reader's unified 百科 module.

**Architecture:** Treat each PDF page as an independent OCR unit, rebuild the two-column reading order per page, and join text only across contiguous pages. Match headings to the approved inventory conservatively; ambiguous or unmatched entries go to a QA ledger. Resolve only canonical, verse-bound scripture references through the Reader's existing scripture contract, then emit a dedicated versioned encyclopedia payload and merge it with the Reader's stable resources at startup.

**Tech Stack:** macOS Vision/AppKit, Swift, Python 3 standard library, Node.js/TypeScript, React 19, Vitest, Vite.

## Global Constraints

- Use `/Users/simon/OHB/圣经百科辞典.pdf` as the only content source.
- Keep the existing experimental files under `/Users/simon/OHB/tmp/baike-classify` intact; write the corrected pipeline and outputs under `/Users/simon/OHB/tmp/baike-production`.
- Process the queue's 812 unique PDF pages once; the 975 queue rows contain 163 duplicate rows across 158 duplicated page groups.
- Never join non-contiguous pages, never force a unique-page fuzzy match, and never promote unmatched or ambiguous entries.
- Preserve the 11 approved user categories in `debugMeta.userParts`; the Reader-visible resource category remains 百科.
- Accept only valid canonical `VerseId` values. OCR-like citation fragments and relative references without an absolute book context stay in QA.
- Do not overwrite `workbenchSyncedResources-v4.json`, do not run the Edit sync script as an encyclopedia importer, and do not publish to `one-holy-bible-github`.
- Preserve unrelated changes in the dirty worktree. Do not create a commit unless the user explicitly asks.

---

### Task 1: Lock the corrected extraction contract

**Files:**
- Add: `/Users/simon/OHB/tmp/baike-production/encyclopedia_pipeline.py`
- Add: `/Users/simon/OHB/tmp/baike-production/test_encyclopedia_pipeline.py`

- [x] Test two-column OCR ordering, heading normalization, same-page splitting, and mid-page alphabet bands.
- [x] Test that adjacent pages may continue one entry but a page gap always starts a new run.
- [x] Test exact/normalized matching, constrained title recovery, and rejection of forced unique-page matches.
- [x] Test category exclusions for obvious historical-person and cross-section false positives.
- [x] Implement the page/run splitter and conservative inventory matcher until the tests pass.

### Task 2: Complete resumable Apple Vision OCR

**Files:**
- Add: `/Users/simon/OHB/tmp/baike-production/ocr-page.swift`
- Generate: `/Users/simon/OHB/tmp/baike-production/bin/ocr-page`
- Generate: `/Users/simon/OHB/tmp/baike-production/ocr-cache-columns-v3/body-*.json`
- Generate: `/Users/simon/OHB/tmp/baike-production/ocr-manifest-columns-v3.json`

- [x] Compile the Vision OCR helpers once instead of invoking the Swift interpreter per page.
- [x] Deduplicate A/B/C queue rows and OCR 812 target pages plus 261 continuation/boundary pages with bounded workers.
- [x] Keep every OCR profile in an isolated cache and reuse only schema-valid rows.
- [x] Retry failures and emit a manifest with requested, succeeded, failed, reused, and quality counts.
- [x] Require every requested page to be successful or explicitly present in the failure ledger; final result is 1073/1073 with zero failures.

### Task 3: Build and audit the 11-category entries

**Files:**
- Generate: `/Users/simon/OHB/tmp/baike-production/entries-candidate.json`
- Generate: `/Users/simon/OHB/tmp/baike-production/entries-qa.json`
- Generate: `/Users/simon/OHB/tmp/baike-production/inventory-missing.json`
- Generate: `/Users/simon/OHB/tmp/baike-production/category-report.json`

- [x] Split headings independently inside each contiguous OCR run and respect mid-page alphabet section bands.
- [x] Attach inventory metadata through exact, normalized, or exact-page mutual-unique title recovery only.
- [x] Merge same-inventory senses and preserve intentional important/full-set category overlap.
- [x] Quarantine unmatched, ambiguous, empty, structurally contaminated, or cross-section entries.
- [x] Produce per-category counts, missing-inventory coverage, and representative PDF-page samples.

### Task 4: Resolve canonical scripture anchors

**Files:**
- Add: `scripts/resolveBibleEncyclopediaAnchors.mts`
- Add: `scripts/resolveBibleEncyclopediaAnchors.test.mts`
- Generate: `/Users/simon/OHB/tmp/baike-production/entries-anchored.json`
- Generate: `/Users/simon/OHB/tmp/baike-production/anchors-qa.json`

- [x] Reuse `detectScriptureRefs` and the Bible verse inventory instead of a separate permissive regex parser.
- [x] Keep high-confidence absolute references, valid carried-book chains, and canonical dictionary chapter citations; reject illegal coordinates.
- [x] Set `verses` to unique canonical IDs and `primaryAnchor` to the first accepted citation.
- [x] Keep useful entries without a trustworthy anchor in QA; do not make them verse-visible by guessing.
- [x] Test OCR punctuation, line-wrapped book tokens, chapter ranges, traditional Chinese names, chains, and false positives.

### Task 5: Generate and load the production encyclopedia payload

**Files:**
- Add: `scripts/generateBibleEncyclopediaResources.mts`
- Add: `scripts/generateBibleEncyclopediaResources.test.mts`
- Add: `src/data/bibleEncyclopediaResources.ts`
- Add: `src/data/bibleEncyclopediaResources.test.ts`
- Generate: `src/data/generated/bibleEncyclopediaResources-v1.json`
- Modify: `src/App.tsx`

- [x] Emit a versioned `{ metadata, resources }` payload with `type: "link"`, source, 11-category metadata, PDF provenance, canonical anchors, and deterministic IDs.
- [x] Validate metadata totals, unique IDs, non-empty bodies, allowed categories, and every verse/primary anchor.
- [x] Add an isolated loader with the same cache/error style as existing stable resource loaders.
- [x] Merge accepted encyclopedia resources into `stableResources` and the Reader without touching the workbench payload.
- [x] Verify all imported cards route only to the unified 百科 module.

### Task 6: Verify completion on the real Reader

**Files:**
- Inspect all scoped files and generated reports above.
- Add: `docs/verification/2026-08-01-bible-encyclopedia-ingestion.md`

- [x] Run Python pipeline tests and focused Node/TypeScript tests.
- [x] Run the full project test suite and production build.
- [x] Check the scoped diff and generated payload integrity; no existing OCR/cache source was overwritten.
- [x] Start the current app and verify the actual Reader in the Codex in-app browser.
- [x] Navigate to representative anchored verses and confirm cards appear under 百科, with no 字典 module and no task-related console errors.
- [x] Record OCR coverage, accepted/QA counts, anchor coverage, tests, build, and browser evidence without presenting quarantined entries as imported.

## Final Result

- Apple Vision OCR: 1073/1073 selected and continuation pages, zero failures, 82,391 recognized rows.
- Inventory coverage: 1274 structurally accepted entries from 1641 eligible inventory rows; 367 remain in the missing/QA ledger.
- Reader import: 1013 entries with trustworthy canonical anchors; 261 no-anchor entries remain isolated.
- Reader category: one visible 百科 module for encyclopedia/dictionary resources; the legacy 字典 module is removed.
