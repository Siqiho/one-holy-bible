# OHB Intro Card Verse Mapping Implementation Plan

> **Execution note:** Follow this plan task by task with test-first changes, parallel book review only after the shared candidate mapping is generated, and verification-before-completion before reporting success.

**Goal:** Review all 3,032 cards currently assigned to a Bible-book introduction and give every card one validated primary verse in the same book, then make Edit and the OHB workbench persist and use those mappings without leaving the cards in `bookIntro`.

**Architecture:** Keep a durable, auditable mapping registry at the Resources root rather than editing one timestamped ledger run. Edit loads the registry after loading the latest card ledgers and replaces introduction navigation with an exact one-verse navigation target. The OHB sync pipeline consumes the mapped Edit API output and emits a new versioned generated payload with verse navigation only. A candidate generator combines explicit references, source-page context, and local Bible-text similarity; every candidate is then reviewed by book before it is accepted.

**Tech stack:** TypeScript, Node.js/tsx, Vitest, React Testing Library, Vite, JSON/JSONL resource ledgers.

**Approved design:** `docs/superpowers/specs/2026-07-14-ohb-intro-card-verse-mapping.md`

---

## Task 1: Freeze the baseline and create one compliant backup

**Files:**

- Read: `/Users/simon/OHB/Resources/**/无图经文注释卡片台账_20260714_025725/*.jsonl`
- Read: `/Users/simon/OHB/Resources/**/文档图片内容提取_*/*.jsonl`
- Back up before modification: `/Users/simon/OHB/Edit/server/ledger.ts`
- Back up before modification: `/Users/simon/OHB/Edit/shared/commentarySyncClassification.ts`
- Back up before modification: `/Users/simon/OHB/one-holy-bible/scripts/syncWorkbenchResources.mjs`
- Back up before modification: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- Create: `/Users/simon/备份/codex/ohb-intro-card-verse-mapping-<timestamp>/README.md`

**Step 1: Capture baseline counts**

Run a read-only `loadCards` report and save the terminal evidence for:

- total workbench cards;
- `bookIntro` cards by kind;
- formal study-intro versus residual unanchored commentary;
- count by book;
- current anchored count;
- current sync-status distribution.

Expected baseline: 3,032 target cards, 2,429 images, 603 commentary, 66 books, 0 anchored targets.

**Step 2: Check for user changes in touched files**

Run `git status --short` and `git diff -- <files>`. Preserve all unrelated changes and incorporate overlapping user edits rather than replacing them.

**Step 3: Create one batch backup**

Create a new timestamped subdirectory under `/Users/simon/备份/codex`, copy each existing file that will be modified, and add `README.md` listing the backup reason, every original absolute path, and the timestamp.

**Step 4: Verify the backup**

Compare sizes and SHA-256 hashes between each source and backup copy before any implementation edit.

## Task 2: Define and validate the durable mapping registry

**Files:**

- Create: `/Users/simon/OHB/Edit/server/introCardVerseMappings.ts`
- Create: `/Users/simon/OHB/Edit/test/introCardVerseMappings.test.ts`
- Create later from reviewed data: `/Users/simon/OHB/Resources/序章卡经文映射.json`

**Step 1: Write failing schema tests**

Cover:

- valid mapping rows load successfully;
- duplicate `cardId` fails;
- missing card IDs fail in strict validation;
- unknown card IDs fail;
- invalid verse IDs fail;
- cross-book mappings fail;
- a registry with anything other than exactly one primary anchor per row fails;
- missing reason, method, confidence, or review status fails.

**Step 2: Run the focused test and confirm failure**

Run `npm test -- --run test/introCardVerseMappings.test.ts` from `/Users/simon/OHB/Edit`.

**Step 3: Implement the minimal loader and validators**

Define mapping row types, load the Resources-root JSON file, validate uniqueness and required fields, validate target verses against the locally loaded Bible verse index, and expose an indexed mapping lookup.

**Step 4: Run the focused test and confirm pass**

Run the same focused test, then `npm test -- --run test/ledger.test.ts` to catch integration regressions early.

## Task 3: Build the candidate mapping generator

**Files:**

- Create: `/Users/simon/OHB/Edit/scripts/generate-intro-card-verse-mappings.mjs`
- Create: `/Users/simon/OHB/Edit/test/introCardVerseMappingGenerator.test.ts`
- Read: local CUV/KJV Bible data used by `/Users/simon/OHB/one-holy-bible`
- Create: `/Users/simon/OHB/Resources/序章卡经文映射候选.json`
- Create: `/Users/simon/OHB/Resources/序章卡经文映射候选审计.json`

**Step 1: Write failing candidate-generation tests**

Fixtures must cover:

- verse in card ID/title wins over incidental body cross-references;
- Chinese chapter/verse notation normalizes correctly;
- same-book references are accepted and cross-book references are candidate evidence only;
- image cards use same-page anchored commentary when title/evidence agrees;
- page proximity alone cannot override contradictory title evidence;
- semantic fallback returns ranked same-book candidates;
- author/title/time/outline cards receive a book-level candidate with an explicit reason;
- every candidate includes method, confidence, evidence, and alternatives.

**Step 2: Confirm focused failure**

Run `npm test -- --run test/introCardVerseMappingGenerator.test.ts`.

**Step 3: Implement explicit-reference extraction**

Parse OSIS-style IDs, Arabic chapter/verse notation, and common Chinese chapter/verse notation. Rank title and ID evidence above body and evidence-snippet references.

**Step 4: Implement source-page context**

Index already anchored cards by source PDF and page. Score same-page and adjacent-page anchors, requiring agreement with the image title, evidence snippet, or surrounding card order.

**Step 5: Implement local semantic fallback**

Build a same-book verse index from local Bible text. Rank verses using normalized Chinese tokens, named entities, repeated key terms, and book-level title rules. Keep the top alternatives for review.

**Step 6: Emit candidates and structured telemetry**

Write the versioned candidate and audit documents with `` filenames. Log totals by book, kind, method, confidence, ambiguity, and missing evidence.

**Step 7: Verify generator output**

Require exactly 3,032 unique candidates across 66 books, zero invalid verse IDs, and zero cross-book primary candidates.

## Task 4: Review all 66 books in parallel and adjudicate every card

**Files:**

- Read: `/Users/simon/OHB/Resources/序章卡经文映射候选.json`
- Create: `/Users/simon/OHB/Resources/序章卡经文映射复核-旧约上.json`
- Create: `/Users/simon/OHB/Resources/序章卡经文映射复核-旧约下.json`
- Create: `/Users/simon/OHB/Resources/序章卡经文映射复核-新约.json`

**Step 1: Partition books without overlap**

- Reviewer A: Genesis through Song of Songs (books 1–22).
- Reviewer B: Isaiah through Acts (books 23–44).
- Reviewer C: Romans through Revelation (books 45–66).

Each reviewer receives the approved design, the candidate rows for only its assigned books, the local Bible text, and a strict instruction not to edit shared source files.

**Step 2: Review every assigned row**

For each card, inspect title, body/summary, evidence snippet, source page, candidate alternatives, and target verse text. Accept or replace the primary anchor and write a concise judgment reason. Do not leave algorithm-only `low` decisions unexamined.

**Step 3: Run per-partition validation**

Each partition must have unique IDs, valid same-book verses, a review status of `reviewed`, and a count matching its input partition.

**Step 4: Reconcile reviewer findings**

The coordinator checks suspicious concentrations, repeated fallback-to-first-verse patterns, ambiguous outlines, and conflicts between explicit references and semantic choices. Send follow-up review tasks for any unresolved cluster.

## Task 5: Merge reviewed mappings and enforce full-data invariants

**Files:**

- Create: `/Users/simon/OHB/Edit/scripts/merge-intro-card-verse-mappings.mjs`
- Create: `/Users/simon/OHB/Edit/test/mergeIntroCardVerseMappings.test.ts`
- Create: `/Users/simon/OHB/Resources/序章卡经文映射.json`
- Create: `/Users/simon/OHB/Resources/序章卡经文映射审计.json`

**Step 1: Write failing merge tests**

Reject overlapping partitions, missing target IDs, extra IDs, invalid verses, cross-book verses, and any row not marked reviewed.

**Step 2: Implement the deterministic merge**

Sort by canonical book order and source/card order. Preserve candidate method plus final reviewer reason. Emit aggregate statistics and a stable content hash.

**Step 3: Validate the final registry**

Assert:

- exactly 3,032 rows;
- exactly 3,032 unique card IDs;
- 66 books represented;
- every source target appears once;
- every primary anchor exists in the local Bible data;
- every primary anchor belongs to the source book;
- every row is reviewed.

**Step 4: Inspect distribution anomalies**

Report per-book and per-chapter counts, top repeated anchors, confidence distribution, and mapping methods. Review outliers before accepting the registry.

## Task 6: Apply mappings in Edit without mutating timestamped ledgers

**Files:**

- Modify: `/Users/simon/OHB/Edit/server/ledger.ts`
- Modify: `/Users/simon/OHB/Edit/server/http.ts`
- Modify: `/Users/simon/OHB/Edit/server/logger.ts` if existing fields are insufficient
- Modify: `/Users/simon/OHB/Edit/test/ledger.test.ts`
- Modify: `/Users/simon/OHB/Edit/test/api.test.ts`

**Step 1: Write failing ledger tests**

Cover mapped image and commentary cards. Expect:

- `primaryAnchor` equals the reviewed verse;
- `coverageRanges` is one exact verse;
- `verses` contains exactly that verse;
- `bookIntro` is absent;
- `navigationPrimaryAnchors` contains the verse and no `book-intro:*` entry;
- non-target cards are unchanged.

**Step 2: Implement mapping application after ledger load**

Load and validate the registry once per card-cache build. Apply it to all target cards after image/text rows are normalized, then build the final StudyResource draft from the mapped navigation.

**Step 3: Add mapping telemetry**

On card-cache load, log registry path/hash, target count, applied count, missing count, invalid count, by-kind counts, and duration.

**Step 4: Run focused Edit tests**

Run the mapping, ledger, API, and commentary-classification tests.

## Task 7: Make mapped intro commentary syncable

**Files:**

- Modify: `/Users/simon/OHB/Edit/shared/commentarySyncClassification.ts`
- Modify: `/Users/simon/OHB/Edit/test/commentarySyncClassification.test.ts`

**Step 1: Write failing classification tests**

An `intro`-named commentary card with no verse remains temporarily unsynced. The same card with an exact one-verse range and no active `bookIntro` becomes syncable even if its historical ID or risk flags contain `intro`.

**Step 2: Implement mapped-navigation precedence**

Treat an exact validated mapping as current navigation truth. Historical ID/risk metadata may remain as provenance but cannot override the mapped verse.

**Step 3: Run focused and full Edit tests**

Run `npm test`, then `npm run build` from `/Users/simon/OHB/Edit`.

## Task 8: Make OHB sync and workbench navigation verse-first

**Files:**

- Modify: `/Users/simon/OHB/one-holy-bible/scripts/syncWorkbenchResources.mjs`
- Modify: `/Users/simon/OHB/one-holy-bible/scripts/syncWorkbenchResources.test.mjs`
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/workbenchSyncedResources.ts`
- Create: `/Users/simon/OHB/one-holy-bible/src/data/generated/workbenchSyncedResources-v4.json`

**Step 1: Write failing sync tests**

When a resource has a valid verse anchor, normalized output must omit `bookIntro` and strip `book-intro:*` navigation anchors. Mapped commentary must no longer be excluded as temporarily unsynced.

**Step 2: Implement verse-first normalization**

Give validated `primaryAnchor`/`verses` precedence and emit `bookIntro` only for truly unanchored resources.

**Step 3: Write failing Workbench scope tests**

A defensive fixture containing both a verse and stale `bookIntro` must organize and navigate by the verse. A genuinely unanchored introduction resource continues to use the intro surface.

**Step 4: Implement defensive verse-first scope selection**

Use the first valid verse before `bookIntro` when determining organized-card scope. Preserve existing intro behavior for resources with no verse.

**Step 5: Generate a new versioned payload**

Do not overwrite `workbenchSyncedResources-v3.json`. Generate `workbenchSyncedResources-v4.json` and update the loader import.

**Step 6: Validate payload invariants**

Verify all 3,032 target IDs are present with verse anchors and none contains `bookIntro` or `book-intro:*`. Verify no unrelated resource IDs disappeared unexpectedly.

## Task 9: Run the complete automated verification suite

**Files:**

- Create: `/Users/simon/OHB/one-holy-bible/docs/verification/2026-07-14-ohb-intro-card-verse-mapping.md`

**Step 1: Edit verification**

Run:

- `npm test`
- `npm run build`

from `/Users/simon/OHB/Edit`.

**Step 2: OHB verification**

Run the focused sync/Workbench tests, then the full test suite, lint if configured, and `npm run build` from `/Users/simon/OHB/one-holy-bible`.

**Step 3: Re-run full-data audits**

Record target count, present count, verse validity, same-book validity, remaining `bookIntro`, missing/extra IDs, and payload delta.

**Step 4: Document exact results**

Write commands, exit codes, counts, and any accepted warnings into the versioned verification document.

## Task 10: Perform manual end-to-end use and analyze telemetry

**Files:**

- Read: `/Users/simon/OHB/Edit/state/*log**`
- Read: browser console/server logs produced during the run
- Update: `/Users/simon/OHB/one-holy-bible/docs/verification/2026-07-14-ohb-intro-card-verse-mapping.md`

**Step 1: Start the approved local surfaces**

Start Edit on its configured 5179/5127 endpoints and the latest OHB Vite surface on `127.0.0.1:5174`. Use the Codex in-app Browser for OHB verification.

**Step 2: Exercise the main path**

Open mapped cards covering:

- Old Testament commentary intro;
- New Testament commentary intro;
- explicit-reference image;
- source-page-context image;
- book-wide theme/outline;
- one-chapter book.

For each, confirm it appears at the reviewed verse, navigates to that verse, and no longer appears in the introduction.

**Step 3: Exercise a failure path**

Use a temporary test fixture or validation command with an unknown card ID, invalid verse, or cross-book mapping. Confirm processing stops with a clear structured error and does not partially write the final registry/payload.

**Step 4: Read and analyze logs**

Inspect cache-load, mapping, sync, browser-console, server, and validation logs. Check for errors, unexpected sequencing, missing telemetry, severe duration increases, duplicate work, and suspicious count deltas.

**Step 5: Final repository hygiene**

Remove temporary fixtures and scratch outputs. Confirm only intended code, `` documents/data, reviewed mappings, and the new v4 payload remain.

**Step 6: Report completion only after the full closure**

Report the backup reason and original paths, 3,032-card audit result, automated test/build results, manual scenarios, and log-analysis conclusion. If any closure step is blocked, report the exact missing step and residual risk instead of declaring completion.
