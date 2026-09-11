# No-Explanation Commentary Card Quarantine Implementation Plan

> **For Simon:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task by task.

**Goal:** Find every reader-visible commentary card whose body contains scripture/quoted scripture only, move it into Edit's `temporarily_unsynced` lane, set its risk to `high`, and prevent the stable CMC source from reintroducing it after refresh.

**Architecture:** Keep card state in `Resources`, not in ad-hoc reader-local deletion state. Generate one versioned, additive quarantine ledger under `Resources`; Edit loads that ledger last and shadows matching current cards by ID. Project sync emits excluded-ID tombstones for all non-reader-facing workbench cards. Reader initial load and refresh apply those tombstones to canonical stable resources before overlaying the current workbench projection.

**Tech Stack:** TypeScript, Node/tsx, Vitest, React/Vite, JSONL Resources ledgers.

---

## Global constraints

- Candidate classification is high precision and body-based. A card qualifies only when its effective body is normalized scripture text, a whole quoted body, or a sequence of quoted verses separated only by verse markers. Quoted terms plus prose (for example `「以诺」字义是…`) and scripture followed by explanation must not qualify.
- The three named regressions must qualify: `cmc-lam-1-2`, `cmc-1chr-1-10`, and `cmc-mal-1-7`. `cmc-1chr-1-16` and explanation-bearing fixtures must remain reader-facing.
- The current audited snapshot is 17,879 stable CMC candidates plus 518 active Edit candidates, with no cross-source ID overlap: 18,397 unique quarantine cards.
- Every quarantine row must expose `syncStatus=temporarily_unsynced`, `riskLevel=high`, preserve title/body/navigation/source evidence, and remain recoverable in Edit.
- Do not rewrite existing per-book truth ledgers. The quarantine run is additive, versioned, written through a hidden temporary directory, validated, then atomically renamed.
- Backups go only under a new `/Users/simon/备份/codex/<run>/` directory with `README.md`, reason, timestamp, and every affected original absolute path.
- Project sync is a separate stage. A Resources commit remains valid if projection fails; generated reader projection must be recoverable and must never trigger public publication.
- Preserve the dirty worktree and modify only the files named by this plan plus generated development data produced by the verified migration/sync commands.

## Task 1: Lock the classifier contract with failing tests

**Files:**

- Create: `/Users/simon/OHB/Edit/shared/noExplanationCommentary.ts`
- Create: `/Users/simon/OHB/Edit/test/noExplanationCommentary.test.ts`

**Steps:**

1. Add table-driven tests for normalized scripture equality, `祢/你`, `祂/他`, `著/着`, nested Chinese quotes, ASCII quote-only fragments, wrapped lines, and quote sequences separated by verse markers.
2. Add negative fixtures for `「以诺」字义是「奉献给」`, a verse followed by bullet explanation, a verse followed by plain prose, and `cmc-1chr-1-16`.
3. Add real fixtures for the three screenshot cards and multi-verse quote-only bodies.
4. Run the focused test and observe failure because the classifier does not exist.
5. Implement the smallest pure classifier returning `candidate`, `reasons`, normalized length, and matched verse IDs.
6. Re-run the focused test and record the exact passing count.

## Task 2: Add an atomic, dry-run-first quarantine migration

**Files:**

- Create: `/Users/simon/OHB/Edit/scripts/quarantine-no-explanation-commentary.ts`
- Create: `/Users/simon/OHB/Edit/test/quarantineNoExplanationCommentary.test.ts`
- Modify: `/Users/simon/OHB/Edit/server/ledger.ts`
- Modify: `/Users/simon/OHB/Edit/test/ledger.test.ts`

**Steps:**

1. Add failing tests proving dry run performs no Resources writes, generated rows are high-risk/temporarily-unsynced, duplicate IDs fail, and repeated apply with the same run ID is idempotent.
2. Add failing ledger tests proving a latest `无解释卡片隔离_*` run is loaded after normal per-book ledgers, new IDs are added, existing IDs are shadowed without duplicate cards, row-level `book_folder` is honored, and absence of a quarantine run preserves the existing ID set.
3. Implement the migration CLI. It loads the stable CMC payload, canonical CUV, current base Edit cards without quarantine, and review overlays; classifies effective bodies; emits card, placement, temporarily-unsynced, manifest, audit, summary, and report files.
4. Implement full preflight assertions: source IDs unique, candidate IDs unique, verse IDs valid, stable/current ID overlap explicitly resolved, PDFs stay under `/Users/simon/OHB/文档`, all emitted JSONL reopens, and all card/placement/status ID sets agree.
5. Implement hidden temporary run creation followed by directory rename. Default is dry run; only `--apply` may write Resources.
6. Extend `loadCards` with optional quarantine loading and `includeQuarantine:false` for migration baselines.
7. Re-run focused tests, then run a live dry run and assert 17,879 stable + 518 active Edit = 18,397 unique candidates, including all three screenshot IDs and excluding the negative fixtures.

## Task 3: Project exclusion tombstones and reader merge semantics

**Files:**

- Modify: `/Users/simon/OHB/one-holy-bible/scripts/syncWorkbenchResources.mjs`
- Modify: `/Users/simon/OHB/one-holy-bible/scripts/syncWorkbenchResources.test.mjs`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/workbenchSyncedResources.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/workbenchSyncedResources.test.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/resources.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/resources.test.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/App.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/App.test.tsx`

**Steps:**

1. Add failing sync tests requiring sorted unique `metadata.excludedResourceIds`, exact equality with exclusion counts, and no overlap with selected resources.
2. Add failing payload-validation tests for duplicate tombstones, selected/tombstone overlap, and count mismatch.
3. Add failing resource/App tests proving a stable card is absent when tombstoned during both initial load and manual workbench refresh, while the canonical stable list remains available for later restoration.
4. Implement tombstone emission and validation.
5. Implement a single pure stable-plus-workbench merge helper and use it for initial load and refresh.
6. Re-run focused tests and the existing development-data suite.

## Task 4: Backup and apply Resources migration

**Files/data:**

- Create: `/Users/simon/备份/codex/no-explanation-card-quarantine-<timestamp>/README.md`
- Create: `/Users/simon/OHB/Resources/无解释卡片隔离_<timestamp>/...`
- Generate: `/Users/simon/OHB/tmp/no-explanation-card-quarantine-<timestamp>.json`

**Steps:**

1. Record live API summary, process identities, source hashes, generated projection hashes, and candidate manifest.
2. Back up the current development workbench projection, review overlay state, and any prior latest quarantine run; record original paths and reason in the backup README.
3. Run the migration with explicit `--apply`, then reopen every output file and verify counts/IDs/status/risk/source mappings.
4. Start the changed Edit API on an isolated verification port, assert expected total/status/risk deltas, then switch the actual Edit runtime to the new server code.
5. Re-run the same apply command with the same run ID and assert no duplicated rows or count growth.

## Task 5: Rebuild development projection and complete verification

**Files/data:**

- Generate: `/Users/simon/OHB/one-holy-bible/src/data/generated/workbenchSyncedResources-v4.json`

**Steps:**

1. Run Edit and one-holy-bible focused tests, full builds, and `npm run check:dev-data`.
2. Run project sync from the current Edit API. Validate selected + excluded = total, excluded IDs are unique, and every quarantine ID is tombstoned and absent from selected resources.
3. Assert effective reader merge has zero quarantine residuals, while Edit has zero missing quarantine IDs and zero wrong-lane/wrong-risk rows.
4. Verify disk and Vite-served JSON hashes/metadata and process start times so the current 1420/5179/5127 surfaces are using this run's code/data.
5. Using the Codex in-app browser, hard-reload 1420 and confirm the three screenshot cards no longer appear at their verses; hard-reload 5179, filter `未同步` + `high`, and confirm all three are present with source evidence.
6. Inspect relevant console/API logs for errors, verify no temporary files/directories remain, and document the backup/rollback path and any residual risk.
