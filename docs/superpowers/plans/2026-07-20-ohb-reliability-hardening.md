# OHB Reliability Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task by task. Use `superpowers:test-driven-development` for every behavior change and `superpowers:verification-before-completion` before reporting a phase complete.

**Goal:** Restore a trustworthy Reader/Edit delivery baseline, then add original-text scripture offsets, recoverable multi-ledger batch operations, explicit projection state, a canonical source catalog, and detail-derived quality gates without changing OHB's one-way publication boundary.

**Architecture:** PDFs remain read-only inputs and Resources remain the ledger source of truth. Edit commits Resources through a logged recoverable batch coordinator, optionally requests one separate Reader projection, and never publishes. Reader and Edit derive eligibility/projection/publication state from existing ledgers and explicit snapshot/manifest evidence.

**Tech Stack:** Node.js 24, TypeScript, React, Vite, Vitest, JSONL Resources ledgers, local Edit HTTP API.

## Global constraints

- Development repository: `/Users/simon/OHB/one-holy-bible`.
- Edit application: `/Users/simon/OHB/Edit` on UI `127.0.0.1:5179` and API `127.0.0.1:5127`.
- Resources source of truth: `/Users/simon/OHB/Resources`.
- PDFs under `/Users/simon/OHB/文档` are read-only.
- Public repository `/Users/simon/OHB/one-holy-bible-github` is out of scope until a separate publication request.
- Preserve all existing dirty-worktree changes; never reset, clean, stash, broadly stage, or commit them.
- Any Codex backup must use a fresh child directory under `/Users/simon/备份/codex` with a complete `README.md`.
- Unit and integration tests use temporary fixture directories. Do not write real Resources or request real `/api/sync` without fresh explicit approval.
- Complete and verify one phase before expanding scope to the next phase.

---

## Phase 1: Build and test baseline

### Task 1: Capture the current failure baseline

**Read:**
- `/Users/simon/OHB/one-holy-bible/package.json`
- `/Users/simon/OHB/Edit/package.json`
- Compiler/test files named by the fresh command output.

**Commands:**

```bash
cd /Users/simon/OHB/one-holy-bible && npm run build
cd /Users/simon/OHB/one-holy-bible && npm test -- --reporter=dot
cd /Users/simon/OHB/Edit && npm run build
cd /Users/simon/OHB/Edit && npm test -- --reporter=dot
```

- [ ] Record Node/npm versions and command exit codes.
- [ ] Record every compiler diagnostic and failing test name without editing code.
- [ ] Group failures by shared root cause; do not treat downstream snapshots as independent defects.
- [ ] Establish a scoped target-file list from compiler/test stacks before the first code edit.

### Task 2: Repair Reader build/test root causes

**Likely files; narrow to fresh evidence before editing:**
- `/Users/simon/OHB/one-holy-bible/src/App.tsx`
- `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`
- `/Users/simon/OHB/one-holy-bible/src/data/loadBibleLibrary.ts`
- `/Users/simon/OHB/one-holy-bible/src/data/loadBibleLibrary.test.ts`
- Any additional Reader file explicitly named by the fresh compiler/test output.

- [ ] For each behavioral failure, run the single failing test and confirm RED.
- [ ] Make the smallest root-cause correction; do not refactor unrelated code.
- [ ] Re-run the single test and confirm GREEN.
- [ ] Run the directly related test file.
- [ ] Run `npm run build`.
- [ ] Run the full Reader test suite only after targeted checks pass.

### Task 3: Repair Edit build/test root causes

**Likely files; narrow to fresh evidence before editing:**
- `/Users/simon/OHB/Edit/src/App.tsx`
- `/Users/simon/OHB/Edit/server/http.ts`
- `/Users/simon/OHB/Edit/server/ledger.ts`
- `/Users/simon/OHB/Edit/server/resourceWriter.ts`
- `/Users/simon/OHB/Edit/test/App.test.tsx`
- `/Users/simon/OHB/Edit/test/api.test.ts`
- `/Users/simon/OHB/Edit/test/ledger.test.ts`
- `/Users/simon/OHB/Edit/test/resourceWriter.test.ts`
- Any additional Edit file explicitly named by the fresh compiler/test output.

- [ ] For each behavioral failure, run the single failing test and confirm RED.
- [ ] Make the smallest root-cause correction without writing real Resources.
- [ ] Re-run the single test and confirm GREEN.
- [ ] Run the directly related test file.
- [ ] Run `npm run build`.
- [ ] Run the full Edit test suite only after targeted checks pass.

### Task 4: Verify Phase 1

- [ ] Inspect only the files changed during this phase and separate them from pre-existing dirty changes.
- [ ] Re-run fresh Reader and Edit builds.
- [ ] Re-run both full test suites.
- [ ] If the fixes affect visible UI behavior, start the actual current Reader/Edit code and verify the relevant path in the Codex in-app browser; confirm URLs and page identity.
- [ ] Report separately: code fixed, automatic checks passed, real UI verified, and anything not verified.

**Phase 1 exit gate:** both builds pass; all current related failures are resolved or explicitly proved unrelated/pre-existing; no Resources, public repository, or publication state was changed.

---

## Phase 2: Original offsets and recoverable batch operations

### Task 5: Add original-text offset normalization with TDD

**Files:**
- Create: `/Users/simon/OHB/one-holy-bible/src/domain/normalizedTextOffsets.ts`
- Create: `/Users/simon/OHB/one-holy-bible/src/domain/normalizedTextOffsets.test.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/domain/scriptureRef.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/domain/scriptureRef.test.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/ScriptureLinkedText.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/ScriptureLinkedText.test.tsx`

- [ ] Write failing tests for `创1：.1`, CRLF, multiple blank lines, length-changing OCR punctuation, a later reference after a changed span, and multi-reference source order.
- [ ] Assert `source.slice(ref.start, ref.end)` equals the exact original citation text.
- [ ] Implement a single normalizer returning `normalizedText` plus original start/end maps.
- [ ] Map every parser hit back before returning it; UI continues to receive only original coordinates.
- [ ] Remove paragraph-separator reconstruction assumptions from UI where original offsets make them unnecessary.
- [ ] Run focused domain/component tests, Reader build, then the relevant Reader regression suite.

### Task 6: Build the recoverable batch coordinator with fault injection

**Files:**
- Create: `/Users/simon/OHB/Edit/server/batchResourceTransaction.ts`
- Create: `/Users/simon/OHB/Edit/test/batchResourceTransaction.test.ts`
- Modify: `/Users/simon/OHB/Edit/server/resourceWriter.ts`
- Modify: `/Users/simon/OHB/Edit/test/resourceWriter.test.ts`

**Core interface:**

```ts
executeResourceBatch(options): Promise<{
  operationId: string;
  itemResults: BatchItemResult[];
  resourcesStatus: "failed_preflight" | "resources_committed" | "resources_rolled_back" | "recovery_failed";
  projectionStatus: "not_requested" | "projection_requested" | "projected" | "projection_retry_pending";
}>;
```

- [ ] Write failing tests proving invalid input causes zero writes.
- [ ] Prove multi-ledger success creates one operation backup and one log.
- [ ] Inject failure after the Nth rename and prove every replaced file is restored and hash-verified.
- [ ] Prove recovery failure returns an explicit manual recovery path and forbids projection.
- [ ] Generate and validate all temporary JSONL files before the first replacement.
- [ ] Implement per-file atomic rename and durable replaced-file logging.
- [ ] Run tests only against temporary fixture directories.

### Task 7: Expose separate Resources and projection stages

**Files:**
- Modify: `/Users/simon/OHB/Edit/server/http.ts`
- Modify: `/Users/simon/OHB/Edit/server/projectSync.ts`
- Modify: `/Users/simon/OHB/Edit/src/App.tsx`
- Modify: `/Users/simon/OHB/Edit/test/api.test.ts`
- Modify: `/Users/simon/OHB/Edit/test/App.test.tsx`

- [ ] Write failing API/UI tests for explicit `projectAfterCommit` opt-in.
- [ ] Prove a batch affecting Reader calls project sync exactly once.
- [ ] Prove projection failure retains `resources_committed` and returns `projection_retry_pending`.
- [ ] Add an independent retry action that cannot rewrite the ledger or publish.
- [ ] Preserve the current Edit lane/filter after soft delete, including the 未同步 lane behavior.
- [ ] Assert no public release endpoint or command is reachable from this flow.

**Phase 2 exit gate:** all offset and batch fault-injection tests pass; Reader/Edit builds pass; no real ledger mutation or real projection has occurred unless separately authorized and verified.

---

## Phase 3: Derived state, source catalog, and quality gates

### Task 8: Implement derived delivery state

**Files:**
- Create: `/Users/simon/OHB/one-holy-bible/src/domain/resourceDeliveryState.ts`
- Create: `/Users/simon/OHB/one-holy-bible/src/domain/resourceDeliveryState.test.ts`
- Modify the minimal Reader/Edit adapters identified by usage search.

- [ ] Test `eligible` derivation from current `syncStatus`, with soft delete overriding eligibility.
- [ ] Test `projected` against a named snapshot ID/hash and timestamp.
- [ ] Test `published = unknown` when no valid public manifest evidence exists.
- [ ] Keep status derived; do not persist three booleans on cards.

### Task 9: Add a canonical data-only source catalog

**Files:**
- Create: `/Users/simon/OHB/one-holy-bible/src/domain/sourceCatalog.ts`
- Create: `/Users/simon/OHB/one-holy-bible/src/domain/sourceCatalog.test.ts`
- Modify Reader source-library assembly discovered by symbol search.
- Modify Edit read-only source-label/suggestion adapter discovered by symbol search.

- [ ] Define only `sourceStream`, `displayName`, `libraryGroup`, `resourceKind`, and optional order.
- [ ] Test that Reader exposes only sources actually present in the current snapshot.
- [ ] Test that a registered but absent source produces no empty library button.
- [ ] Test that Edit suggestions retain current total-lane/filter scope.
- [ ] Do not add runtime plugin loading or catalog mutation from Edit.

### Task 10: Derive every quality summary from details

**Files:**
- Create a small report aggregation module next to the current quality script selected during implementation.
- Add its focused test file next to that script/module.
- Modify only the quality reports that currently duplicate totals.

- [ ] Write failing assertions for group sum, `pass + fail + skipped`, report ID membership, and one input snapshot per run.
- [ ] Make detail rows the only accepted aggregation input.
- [ ] Fail closed on stale or mixed snapshots.
- [ ] Add representative semantic sampling where report structure alone cannot prove content correctness.

**Phase 3 exit gate:** state/catalog/report tests pass; UI shows snapshot context; builds pass; related browser paths are verified in the Codex in-app browser.

---

## Phase 4: Modularization and Edit version control

### Task 11: Split large modules without changing behavior

**Files selected only after coverage is green:**
- `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- `/Users/simon/OHB/Edit/src/App.tsx`
- `/Users/simon/OHB/Edit/scripts/locate_pdf_text.py`
- `/Users/simon/OHB/Edit/scripts/locate_text_normalize.py`

- [ ] Characterize existing behavior with tests before moving code.
- [ ] Extract one responsibility at a time and run focused tests after each extraction.
- [ ] Do not combine extraction with new business behavior.

### Task 12: Back up and initialize Edit Git history

**Requires fresh explicit confirmation before execution.**

- [ ] Inventory Edit source files and generated/local-only artifacts.
- [ ] Create a fresh scoped backup under `/Users/simon/备份/codex` with `README.md`.
- [ ] Review `.gitignore` for `node_modules`, build output, logs, caches, local review state, temporary files, and backups.
- [ ] Initialize Git only after the user approves the exact tracked-file inventory.
- [ ] Do not add remote, push, or couple Edit history to either Reader repository.

**Phase 4 exit gate:** extracted behavior is unchanged and covered; Edit version-control scope is user-approved, backed up, and contains no local data or generated artifacts.

---

## Final verification matrix

| Claim | Required evidence |
|---|---|
| Code implemented | Scoped diff and focused tests |
| Automatic checks passed | Fresh command output from both projects |
| Reader/Edit behavior verified | Correct current process/build and Codex in-app browser path |
| Resources transaction verified | Temporary fixtures plus injected failure/recovery evidence |
| Real Resources safe | Separate approved run, backup, hashes, reopened files, and residue check |
| Reader projection current | Explicit sync result plus snapshot version/time |
| Public status known | Explicit public manifest evidence; otherwise `unknown` |
| Full phase complete | Every phase exit gate satisfied |

