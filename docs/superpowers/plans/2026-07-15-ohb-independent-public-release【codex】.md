# OHB Independent Public Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-way, fail-closed release pipeline that exports a committed OHB development snapshot plus locked content inputs into the physically separate GitHub public repository without touching in-progress development changes.

**Architecture:** The development repository owns shared code, the public entrypoint template, public schema generation, and release orchestration. `release:prepare` builds a complete candidate in a new temporary directory, validates it, and writes a signed-by-hash receipt; `release:publish` may update only the independent clean GitHub clone after revalidating that receipt. Large image files remain outside Git and are represented by content-addressed public asset descriptors.

**Tech Stack:** Node.js 24 ESM, React 19, TypeScript 5.8, Vite 7, Vitest 4, Git CLI.

## Global Constraints

- Development repository: `/Users/simon/OHB/one-holy-bible`.
- GitHub repository: `/Users/simon/OHB/one-holy-bible-github` with `origin=https://github.com/Siqiho/one-holy-bible.git`.
- Backups created by Codex must live in a new child directory under `/Users/simon/备份/codex` with a `README【codex】.md` describing reason, absolute original paths, and time.
- New or modified documentation filenames must contain `【codex】`; standard generated GitHub filenames such as `README.md`, `LICENSE`, `SECURITY.md`, and `PUBLIC_RELEASE.json` are emitted artifacts, not edited source documents.
- No development file may be exported from an uncommitted working-tree version. Code is read with `git show <sourceCommit>:<path>`.
- Content inputs outside Git are locked by path, size, modification time, and SHA256 before generation and checked again afterwards.
- Image assets never enter ordinary Git history.
- Preview mode may use a loopback asset URL, but a publishable candidate must use HTTPS and must contain no loopback host or private path.
- The first implementation stops before remote push; pushing requires a publishable asset base URL and a fresh explicit GitHub synchronization request.
- Do not reset, stash, clean, or broadly stage the dirty development working tree.

---

### Task 1: Preflight backup and release-path inventory

**Files:**
- Backup: `/Users/simon/备份/codex/ohb-independent-release-<timestamp>/`
- Read: `/Users/simon/OHB/one-holy-bible/package.json`
- Read: `/Users/simon/OHB/one-holy-bible-github/package.json`
- Create: `/Users/simon/OHB/one-holy-bible/release/public-file-map.json`
- Test: `/Users/simon/OHB/one-holy-bible/scripts/release/publicFileMap.test.mjs`

**Interfaces:**
- Consumes: the two repository roots and the approved design document.
- Produces: a versioned allowlist mapping with `source`, `target`, and `owner` fields.

- [ ] **Step 1: Back up every existing file that later tasks will modify**

The backup README must list all original absolute paths. Copy only targeted files, not the 8.4GB repository.

- [ ] **Step 2: Write the failing allowlist contract test**

```js
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("public release file map", () => {
  it("contains only relative, unique, explicitly owned paths", async () => {
    const map = JSON.parse(await readFile(new URL("../../release/public-file-map.json", import.meta.url)));
    expect(map.schemaVersion).toBe(1);
    expect(new Set(map.files.map((entry) => entry.target)).size).toBe(map.files.length);
    for (const entry of map.files) {
      expect(entry.source).not.toMatch(/^(?:\/|\.\.)/);
      expect(entry.target).not.toMatch(/^(?:\/|\.\.)/);
      expect(["shared", "public-template"]).toContain(entry.owner);
    }
  });
});
```

- [ ] **Step 3: Run the contract test and verify RED**

Run: `npx vitest run scripts/release/publicFileMap.test.mjs`

Expected: FAIL because `release/public-file-map.json` does not exist.

- [ ] **Step 4: Create the minimal allowlist**

The initial map explicitly includes public-safe shared runtime files under `src/components`, `src/domain`, and `src/lib`, plus public-owned entry/config/template files. It must not include `src/development`, `src/data/generated`, `public/resources`, `Edit`, `Resources`, or any wildcard that can cross those roots.

- [ ] **Step 5: Run the contract test and verify GREEN**

Run: `npx vitest run scripts/release/publicFileMap.test.mjs`

Expected: 1 test file passing.

- [ ] **Step 6: Commit only Task 1 files**

```bash
git add release/public-file-map.json scripts/release/publicFileMap.test.mjs
git commit -m "chore: define public release file boundary"
```

### Task 2: Public schema v2 and safe image-card sanitizer

**Files:**
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/publicDataV2.mjs`
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/publicDataV2.test.mjs`

**Interfaces:**
- Consumes: `{ bible, resourcePayload, releaseVersion, assetBaseUrl, mode, repositoryRoot }`.
- Produces: `buildPublicDataV2(options) -> { manifest, books, searchIndex, assetManifest, releaseStats }`.
- Produces: `sanitizePublicImageCard(resource, context) -> PublicImageCard`.

- [ ] **Step 1: Write failing sanitizer tests**

```js
it("converts a local image card into a safe content-addressed descriptor", async () => {
  const result = await sanitizePublicImageCard(imageFixture, {
    repositoryRoot: fixtureRoot,
    assetBaseUrl: "https://assets.example.test/ohb/",
  });
  expect(result).toMatchObject({
    type: "image",
    asset: { url: expect.stringMatching(/^https:\/\/assets\.example\.test\/ohb\/[a-f0-9]{64}\.png$/) },
  });
  expect(JSON.stringify(result)).not.toMatch(/Users|sourceWorkbench|sourceAssetPath|storedAbsolutePath/);
});

it("rejects a missing or out-of-root image asset", async () => {
  await expect(sanitizePublicImageCard(missingImageFixture, context)).rejects.toThrow(/image asset/i);
});
```

- [ ] **Step 2: Run sanitizer tests and verify RED**

Run: `npx vitest run scripts/release/publicDataV2.test.mjs`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement exact public types in plain ESM**

The implementation must:

- accept only `commentary`, `note`, and `image`;
- preserve only the design-approved fields;
- resolve `/resources/...` under the declared development `public` root;
- compute SHA256 and byte length from the actual image;
- read PNG width/height from the IHDR header and reject unsupported or malformed files;
- emit `asset.url`, never `assetPath`;
- fail on unknown card fields only after extracting the explicit allowlist, never spread raw metadata.

- [ ] **Step 4: Add 66-book packaging tests**

```js
it("packages text and image cards by canonical book", async () => {
  const output = await buildPublicDataV2(fixtureOptions);
  expect(output.manifest.schemaVersion).toBe(2);
  expect(output.books.Gen.textCards).toHaveLength(1);
  expect(output.books.Gen.imageCards).toHaveLength(1);
  expect(output.releaseStats.bookCount).toBe(66);
});
```

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npx vitest run scripts/release/publicDataV2.test.mjs`

Expected: all schema v2 tests pass.

- [ ] **Step 6: Commit Task 2**

```bash
git add scripts/release/publicDataV2.mjs scripts/release/publicDataV2.test.mjs
git commit -m "feat: generate safe public image card data"
```

### Task 3: Content input locking and release manifest

**Files:**
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/inputLock.mjs`
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/inputLock.test.mjs`
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/publicReleaseManifest.mjs`
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/publicReleaseManifest.test.mjs`

**Interfaces:**
- Produces: `lockInput(path) -> { absolutePath, bytes, mtimeMs, sha256 }`.
- Produces: `verifyInputLock(lock) -> Promise<void>`.
- Produces: `createPublicReleaseManifest({ version, sourceCommit, inputLocks, stats, assetManifest })`.

- [ ] **Step 1: Write failure-first lock tests**

```js
it("detects content changed after locking", async () => {
  const lock = await lockInput(file);
  await writeFile(file, "changed");
  await expect(verifyInputLock(lock)).rejects.toThrow(/changed after release preparation started/i);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npx vitest run scripts/release/inputLock.test.mjs scripts/release/publicReleaseManifest.test.mjs`

- [ ] **Step 3: Implement streaming SHA256 locks and deterministic manifest output**

`PUBLIC_RELEASE.json` must contain the exact schema from the approved design and serialize keys deterministically. `sourceCommit` must match `/^[a-f0-9]{40}$/`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npx vitest run scripts/release/inputLock.test.mjs scripts/release/publicReleaseManifest.test.mjs`

- [ ] **Step 5: Commit Task 3**

```bash
git add scripts/release/inputLock.mjs scripts/release/inputLock.test.mjs scripts/release/publicReleaseManifest.mjs scripts/release/publicReleaseManifest.test.mjs
git commit -m "feat: lock public release inputs"
```

### Task 4: Public runtime template with image-card support

**Files:**
- Create: `/Users/simon/OHB/one-holy-bible/release/public-template/src/public/publicData.ts`
- Create: `/Users/simon/OHB/one-holy-bible/release/public-template/src/public/publicBibleData.ts`
- Create: `/Users/simon/OHB/one-holy-bible/release/public-template/src/public/PublicApp.tsx`
- Create: `/Users/simon/OHB/one-holy-bible/release/public-template/src/public/publicData.test.ts`
- Create: `/Users/simon/OHB/one-holy-bible/release/public-template/src/public/PublicApp.test.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/release/public-file-map.json`

**Interfaces:**
- Consumes: schema v2 `manifest.json`, `books/<bookId>.json`, `search-index.json`.
- Produces: `PublicApp` that passes `[...textCards, ...imageCards]` to `Workbench`.

- [ ] **Step 1: Write failing public runtime contract tests**

```ts
it("accepts safe image descriptors and rejects local asset paths", () => {
  expect(validatePublicBookPayload(validBookWithImage).imageCards).toHaveLength(1);
  expect(() => validatePublicBookPayload(bookWithAssetPath)).toThrow(/forbidden field/i);
});

it("renders public text and image cards without workbench mutation callbacks", async () => {
  render(<PublicApp />);
  const props = await latestWorkbenchProps();
  expect(props.resources.map((item) => item.type)).toEqual(expect.arrayContaining(["commentary", "image"]));
  expect(props.onRefreshResources).toBeUndefined();
  expect(props.onUnsyncResource).toBeUndefined();
  expect(props.onUpdateWorkbenchResource).toBeUndefined();
});
```

- [ ] **Step 2: Run template tests through a minimal template Vitest config and verify RED**

Run: `npx vitest run release/public-template/src/public/*.test.ts*`

- [ ] **Step 3: Implement the schema v2 validator, loader, and public entrypoint**

The adapter maps `imageCard.asset.url` to the existing UI's runtime `assetPath` only in memory. It must not serialize that compatibility field back into public JSON.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npx vitest run release/public-template/src/public/*.test.ts*`

- [ ] **Step 5: Commit Task 4**

```bash
git add release/public-template release/public-file-map.json
git commit -m "feat: add read-only public image runtime"
```

### Task 5: Atomic `release:prepare` staging pipeline

**Files:**
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/gitSnapshot.mjs`
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/gitSnapshot.test.mjs`
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/prepareGitHubRelease.mjs`
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/prepareGitHubRelease.test.mjs`
- Modify: `/Users/simon/OHB/one-holy-bible/package.json`

**Interfaces:**
- Produces: `readCommittedFile({ repositoryRoot, sourceCommit, path })` using `git show`.
- Produces: `prepareGitHubRelease(options) -> { candidatePath, receiptPath, stats, diffSummary }`.

- [ ] **Step 1: Write a failing committed-snapshot test**

```js
it("exports the committed bytes and ignores dirty working-tree bytes", async () => {
  const committed = await readCommittedFile({ repositoryRoot, sourceCommit: "HEAD", path: "src/example.ts" });
  expect(committed.toString()).toBe("committed\n");
});
```

- [ ] **Step 2: Write a failing atomic preparation test**

```js
it("leaves both repositories unchanged when validation fails", async () => {
  const before = await directoryDigest(publicRepo);
  await expect(prepareGitHubRelease(invalidOptions)).rejects.toThrow(/unsafe public data/i);
  expect(await directoryDigest(publicRepo)).toBe(before);
});
```

- [ ] **Step 3: Run tests and verify RED**

Run: `npx vitest run scripts/release/gitSnapshot.test.mjs scripts/release/prepareGitHubRelease.test.mjs`

- [ ] **Step 4: Implement staging under the system temporary directory**

Preparation must:

- validate repository roots and the exact GitHub origin;
- read all mapped code/template files from the selected commit;
- lock content inputs;
- generate v2 public data and asset manifest;
- generate `PUBLIC_RELEASE.json` and a receipt outside both repositories;
- scan for forbidden private strings and paths;
- run candidate tests, typecheck, and build through child processes;
- compare candidate files with the GitHub clone;
- remove incomplete candidate directories after failure.

- [ ] **Step 5: Add package scripts**

```json
{
  "release:prepare": "node scripts/release/prepareGitHubRelease.mjs",
  "release:verify": "node scripts/release/verifyPreparedRelease.mjs"
}
```

- [ ] **Step 6: Run tests and verify GREEN**

Run: `npx vitest run scripts/release/gitSnapshot.test.mjs scripts/release/prepareGitHubRelease.test.mjs`

- [ ] **Step 7: Commit Task 5**

```bash
git add scripts/release package.json
git commit -m "feat: prepare public releases atomically"
```

### Task 6: Publish guard and independent GitHub clone updater

**Files:**
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/publishGitHubRelease.mjs`
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/publishGitHubRelease.test.mjs`
- Create: `/Users/simon/OHB/one-holy-bible/scripts/release/verifyPreparedRelease.mjs`
- Modify: `/Users/simon/OHB/one-holy-bible/package.json`

**Interfaces:**
- Produces: `verifyPreparedRelease(receiptPath)`.
- Produces: `publishGitHubRelease({ receiptPath, targetRepository, commit, push })`.

- [ ] **Step 1: Write publish refusal tests**

```js
it.each([
  ["dirty target", { dirty: true }],
  ["wrong origin", { origin: "https://github.com/example/wrong.git" }],
  ["preview asset URL", { mode: "preview" }],
  ["stale target head", { mutateHead: true }],
])("refuses %s", async (_name, fixtureOptions) => {
  await expect(publishGitHubRelease(await fixture(fixtureOptions))).rejects.toThrow();
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npx vitest run scripts/release/publishGitHubRelease.test.mjs`

- [ ] **Step 3: Implement managed-file synchronization**

The updater must copy only files recorded in the prepared receipt, delete only files recorded as previously managed, preserve `.git`, and rerun validation after copying. `push` defaults to `false`; `--push` is rejected unless the receipt mode is `publish` and every asset URL is HTTPS.

- [ ] **Step 4: Add scripts**

```json
{
  "release:publish": "node scripts/release/publishGitHubRelease.mjs"
}
```

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npx vitest run scripts/release/publishGitHubRelease.test.mjs`

- [ ] **Step 6: Commit Task 6**

```bash
git add scripts/release package.json
git commit -m "feat: guard independent GitHub publication"
```

### Task 7: Full local preview release rehearsal

**Files:**
- Generated temporary candidate under the system temporary directory
- Generated local asset directory under the same temporary release root
- Modify only if defects are found: Task 2-6 implementation files

**Interfaces:**
- Consumes: committed release implementation, full Bible input, workbench resource input, local image files.
- Produces: a schema v2 preview candidate and verification logs; does not update GitHub clone.

- [ ] **Step 1: Run all release unit tests**

Run: `npx vitest run scripts/release release/public-template/src/public`

Expected: zero failures.

- [ ] **Step 2: Run `release:prepare` in preview mode**

```bash
npm run release:prepare -- \
  --version 0.2.0-preview.1 \
  --source HEAD \
  --mode preview \
  --asset-base-url http://127.0.0.1:5180/assets/ \
  --bible src/data/generated/bibleLibrary.json \
  --resources 'src/data/generated/workbenchSyncedResources【codex-v4】.json' \
  --github-repository /Users/simon/OHB/one-holy-bible-github
```

Expected: candidate succeeds, GitHub clone HEAD and status remain unchanged, and receipt says `publishable: false`.

- [ ] **Step 3: Serve candidate and local assets on dedicated ports**

Run the candidate web app and asset directory without changing either repository.

- [ ] **Step 4: Manually verify development and candidate public paths**

Development path: complete images, workbench refresh/edit/reader-return controls.

Public path: 66-book navigation, explanatory card, image card, image zoom, no refresh/edit/reader-return integration.

- [ ] **Step 5: Exercise a failure path**

Block one book JSON or image request, verify visible retry/fallback behavior, restore it, and confirm recovery.

- [ ] **Step 6: Analyze logs and traces**

Check browser console, network requests, preparation logs, test logs, and build output for private paths, unexpected local API calls, missing assets, duplicate initialization, or performance regression.

- [ ] **Step 7: Clean all temporary servers and candidate directories**

No `.playwright-cli`, staging directories, or temporary reports may remain in either repository.

### Task 8: Final documentation and handoff

**Files:**
- Create: `/Users/simon/OHB/one-holy-bible/docs/verification/2026-07-15-ohb-independent-public-release-verification【codex】.md`
- Modify: `/Users/simon/OHB/one-holy-bible/docs/superpowers/plans/2026-07-15-ohb-independent-public-release【codex】.md`

**Interfaces:**
- Consumes: actual test/build/manual verification evidence.
- Produces: exact commands, counts, known limitations, next action for formal asset storage.

- [ ] **Step 1: Record evidence without placeholders**

Document actual exit codes, test counts, generated card counts, candidate size, image count, largest asset, log findings, and proof that the GitHub clone did not change.

- [ ] **Step 2: Mark only genuinely completed plan checkboxes**

Any unavailable formal asset-storage or remote-push step remains explicitly outside this implementation batch.

- [ ] **Step 3: Run final verification commands**

```bash
npm test
npm run build
git diff --check
git -C /Users/simon/OHB/one-holy-bible-github status --short --branch
git -C /Users/simon/OHB/one-holy-bible-github rev-parse HEAD
```

- [ ] **Step 4: Commit only implementation and verification documents**

Use small commits per task; do not stage pre-existing unrelated development changes.
