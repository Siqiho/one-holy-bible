# Genesis Card Original Text Verse Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Genesis image card visible text rely on original-document snippets, remove confidence labels from reader-facing copy, and correct high-evidence verse relationships.

**Architecture:** Keep trace data in `debugMeta`, but generate reader-facing `body` from clean source evidence. Use `genesisResourcePlacements.ts` only for verse anchoring and audit metadata. Tests protect visible copy format, source traceability, and known verse corrections.

**Tech Stack:** TypeScript, React data fixtures, Vitest, Vite.

---

### Task 1: Protect Reader-Facing Copy Rules

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/sampleBible.test.ts`

- [ ] **Step 1: Write failing assertions**

Add tests that every Genesis image card visible body has exactly these sections:

```text
摘要
关联经文
依据
```

Also assert visible card text and generated search text do not contain `置信度`, `confidence`, source paths, PDF names, PNG names, hashes, or machine evidence tokens.

- [ ] **Step 2: Add regression coverage for the sheep card**

Add a specific assertion for `genesis-cmc-01-p222-img125-720x498`:

```ts
expect(sheep.verses).toEqual(["Gen.22.13"]);
expect(sheep.body).toContain("以色列最常见的肥尾羊 Awassi sheep，角很容易被树枝卡住");
expect(sheep.body).toContain("关联经文：Gen.22.13");
expect(sheep.body).not.toContain("Gen.22.14");
expect(sheep.body).not.toContain("置信度");
```

- [ ] **Step 3: Add high-evidence verse correction table**

Add table-driven assertions for the second-pass semantic audit's A-class corrections. Do not patch B-class rows that are better kept as-is, and leave C-class rows for manual image/source review.

```ts
[
  ["genesis-cmc-01-p093-img049-720x540", ["Gen.6.14"]],
  ["genesis-cmc-01-p157-img091-580x487", ["Gen.13.4"]],
  ["genesis-cmc-01-p161-img094-713x967", ["Gen.13.18"]],
  ["genesis-cmc-01-p186-img108-720x437", ["Gen.18.1"]],
  ["genesis-cmc-01-p222-img125-720x498", ["Gen.22.13"]],
  ["genesis-cmc-01-p361-img197-334x314", ["Gen.41.42"]],
  ["genesis-cmc-01-p361-img198-224x367", ["Gen.41.42"]],
  ["genesis-cmc-01-p364-img201-312x208", ["Gen.41.48", "Gen.41.49"]],
]
```

- [ ] **Step 4: Run the focused test and confirm RED**

Run:

```bash
npm test -- src/data/sampleBible.test.ts
```

Expected: fail on current four-line body format, the sheep verse, and A-class audited verse corrections.

### Task 2: Generate Body From Source Evidence

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/genesisResources.ts`

- [ ] **Step 1: Prefer source evidence for default reader copy**

Change default copy generation so non-manual cards use `sourceMeta.sourceEvidenceSnippet` first, fall back to `sourceMeta.sourceTextSnippet`, then fall back to `placement.evidence`.

- [ ] **Step 2: Clean source snippets before display**

Normalize OCR spacing, remove machine tokens, remove page/path/hash/file references, remove leading `上图：` for summary title extraction, and stop the display evidence at the first complete image-description sentence where possible.

- [ ] **Step 3: Remove confidence from visible body**

Change `readerBody()` to emit only:

```text
摘要：...
关联经文：...
依据：...
```

Keep `debugMeta.confidence` unchanged for auditability.

- [ ] **Step 4: Run focused tests and fix only the required failures**

Run:

```bash
npm test -- src/data/sampleBible.test.ts
```

Expected: visible copy tests pass after placement corrections land.

### Task 3: Correct High-Evidence Verse Relationships

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/genesisResourcePlacements.ts`

- [ ] **Step 1: Patch audited verse ranges**

Update only the A-class high-evidence mismatch rows listed in Task 1. Keep `confidence` and raw `evidence` available for debug audit unless the visible copy rule requires otherwise.

- [ ] **Step 2: Run focused tests**

Run:

```bash
npm test -- src/data/sampleBible.test.ts
```

Expected: all Genesis data tests pass.

### Task 4: Verify End To End

**Files:**
- Test: `/Users/simon/OHB/one-holy-bible/src/data/sampleBible.test.ts`
- Test: `/Users/simon/OHB/one-holy-bible/src/domain/types.test.ts`

- [ ] **Step 1: Run data and domain tests**

```bash
npm test -- src/data/sampleBible.test.ts src/domain/types.test.ts
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test
```

- [ ] **Step 3: Run production build**

```bash
npm run build
```

- [ ] **Step 4: Manual browser verification**

Start Vite on an available port, open the app, search/open the Genesis 22:13 sheep card, and verify visible card text has no confidence label and points to `Gen.22.13`.

- [ ] **Step 5: Inspect logs and outputs**

Review terminal/browser logs from the manual run for errors, warnings, failed asset loads, or missing observability signals.
