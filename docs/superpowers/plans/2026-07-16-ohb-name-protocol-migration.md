# OHB Name Protocol Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the exact Codex marker from OHB file and directory names, normalize versioned Codex markers to `-vN`, and keep every runtime, data, review, build, and publication path working.

**Architecture:** A tested migration utility produces a deterministic old-to-new mapping, refuses unresolved collisions, rewrites textual path references atomically, and renames nested paths deepest-first. The one conflicting unversioned generated resource is preserved as `workbenchSyncedResources-legacy.json`; stable card/resource IDs containing bare ASCII `codex` remain unchanged.

**Tech Stack:** Node.js 24, Vitest, TypeScript, Vite, Git, JSON/JSONL resource ledgers, macOS APFS.

## Global Constraints

- The exact Codex marker becomes an empty string in names and local textual path references.
- A versioned Codex marker becomes `-vN`; do not leave full-width brackets around the version.
- Preserve bare ASCII `codex` inside stable resource IDs and card keys.
- Preserve both the existing untagged generated resource and the former exact-tagged historical resource; the latter becomes `workbenchSyncedResources-legacy.json`.
- Back up every changed or moved object under a new `/Users/simon/备份/codex` child directory before applying changes.
- Do not overwrite an existing target and do not follow symbolic links.
- Keep the public GitHub repository physically separate from the development repository.

---

### Task 1: Deterministic migration mapper

**Files:**
- Create: `scripts/migrateCodexNames.mjs`
- Create: `scripts/migrateCodexNames.test.mjs`

**Interfaces:**
- Produces: `normalizeCodexBasename(name: string): string`, `rewriteCodexReferences(text: string): string`, and a CLI supporting `--root`, `--dry-run`, `--apply`, and `--report`.
- Collision exception: the former exact-tagged `workbenchSyncedResources` JSON maps to `workbenchSyncedResources-legacy.json`.

- [ ] Write tests proving exact-marker removal, version normalization, legacy collision mapping, nested-directory ordering, stable-ID preservation, and unresolved-collision rejection.
- [ ] Run `npx vitest run scripts/migrateCodexNames.test.mjs` and confirm the tests fail because the migration module does not exist.
- [ ] Implement the minimal mapper and dry-run report.
- [ ] Run the focused test and confirm all cases pass.

### Task 2: Backup and dry-run gate

**Files:**
- Create: `/Users/simon/备份/codex/<timestamp>-ohb-name-protocol-migration/README.md`
- Create: `/Users/simon/备份/codex/<timestamp>-ohb-name-protocol-migration/affected-paths-before.txt`
- Create: `/Users/simon/备份/codex/<timestamp>-ohb-name-protocol-migration/backup.tar`
- Create: `/Users/simon/备份/codex/<timestamp>-ohb-name-protocol-migration/migration-dry-run.json`

**Interfaces:**
- Consumes: migration mapper dry-run output.
- Produces: restorable archive, checksums, original path inventory, and a zero-unresolved-collision gate.

- [ ] Generate the complete affected-path inventory, including tagged names and text files containing tagged path references.
- [ ] Archive the minimal topmost affected path set plus Git exclude files without dereferencing links.
- [ ] Write README with reason, all original roots, timestamp, mapping rules, and restore command.
- [ ] Run dry-run and require zero unresolved collisions and zero missing sources.

### Task 3: Apply filesystem and textual-reference migration

**Files:**
- Modify: all UTF-8 text files under `/Users/simon/OHB` containing `` or `【codex-vN】`, excluding `.git` objects, dependency caches, and generated build caches.
- Rename: all files/directories whose basename contains `` or `【codex-vN】`.

**Interfaces:**
- Consumes: dry-run mapping.
- Produces: marker-free basenames and marker-free tagged path references.

- [ ] Rewrite the exceptional generated-resource basename before generic substitutions.
- [ ] Rewrite version tags to `-vN`, then remove exact markers, using atomic temporary files.
- [ ] Rename matching paths deepest-first and refuse overwrites.
- [ ] Emit an applied mapping report and compare applied counts with dry-run counts.

### Task 4: Runtime, build, and Git integration

**Files:**
- Modify: `package.json`, `.gitignore`, `scripts/*.mjs`, `src/**/*.ts`, `src/**/*.tsx` as selected by the textual migration.
- Modify: `/Users/simon/OHB/Edit/server/**/*.ts`, `/Users/simon/OHB/Edit/scripts/*`, `/Users/simon/OHB/Edit/test/**/*` as selected by the textual migration.
- Modify: `/Users/simon/OHB/one-holy-bible-github/.git/info/exclude` if its local ignored guide path changes.

**Interfaces:**
- Produces: `workbenchSyncedResources-v4.json` as the active generated-resource contract and marker-free Edit ledger/state filenames.

- [ ] Verify all producer and consumer paths agree on `workbenchSyncedResources-v4.json`.
- [ ] Verify Edit latest-run prefixes, card/placement/sync manifests, review state, logs, PDF cache, and intro mapping names agree.
- [ ] Verify `.gitignore` still exposes the active v4 generated resource and public-repo local exclusions still match their renamed file.
- [ ] Run focused migration, Edit ledger/review, and workbench-resource tests.

### Task 5: Complete verification

**Files:**
- Verify only; do not create repository artifacts beyond normal ignored build output.

**Interfaces:**
- Consumes: migrated workspace.
- Produces: evidence for data integrity, builds, and real UI behavior.

- [ ] Require zero basenames containing `` or `【codex-vN】` and zero text references containing either tag outside the backup.
- [ ] Validate all 66 book folders still expose latest image/text runs, required manifests, and resolvable stored/PDF paths.
- [ ] Run the complete Edit test/build suite.
- [ ] Run the development repository tests, data checks, public-data generation/validation, and builds.
- [ ] Run the public GitHub repository tests, validation, and build.
- [ ] Start the actual Edit API/UI and main application on dedicated ports, then verify the card count, review state, one image/PDF source path, and one main reader path in Codex's in-app Browser.
- [ ] Review Git status/diff in each repository/worktree and confirm no unrelated files were changed.
