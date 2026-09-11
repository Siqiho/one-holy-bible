# One Holy Bible GitHub Text-First Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a clean, public `Siqiho/one-holy-bible` `v0.1.0` whose runnable core contains complete CUV/KJV reading and explanatory text cards split into 66 lazily loaded book packages.

**Architecture:** A deterministic Node generator filters the current private/local payloads into a public schema, strips private metadata and image resources, and writes one manifest plus 66 book JSON files and a lightweight scripture search index. The React app loads the manifest, active book, and cross-book search index through a cache-aware data service; GitHub Actions and clean-clone verification gate the exact commit before it is pushed and tagged.

**Tech Stack:** React 19, TypeScript 5.8, Vite 7, Vitest 4, Node.js 24, npm 11, Tauri 2, GitHub Actions, GitHub CLI.

## Global Constraints

- The public content scope is scripture plus explanatory text cards; image files and image-card payloads are excluded from `v0.1.0`.
- Runtime data is split into exactly 66 canonical book packages and loaded on demand.
- No public artifact may contain `/Users/simon/...`, local API URLs, internal review state, private ledgers, or stale versioned payloads.
- Standard GitHub files may use required names such as `README.md`, `LICENSE`, `CONTRIBUTING.md`, and `SECURITY.md`; all internal Codex documents must contain ``.
- Backups created by Codex must live in a new subfolder of `/Users/simon/备份/codex` with a `README.md` that records reason, absolute source paths, and time.
- Do not stage or overwrite unrelated user changes; every commit must name exact files.
- Do not declare completion until tests, build, clean-clone run, manual main/failure paths, and produced logs have been inspected.

---

### Task 1: Create the pre-implementation backup and public-data contracts

**Files:**
- Create: `/Users/simon/备份/codex/ohb-github-text-first-preflight-20260714_125403/README.md`
- Backup: `/Users/simon/OHB/one-holy-bible/src/App.tsx`
- Backup: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- Backup: `/Users/simon/OHB/one-holy-bible/src/data/loadBibleLibrary.ts`
- Backup: `/Users/simon/OHB/one-holy-bible/src/data/workbenchSyncedResources.ts`
- Backup: `/Users/simon/OHB/one-holy-bible/src/data/generated/bibleLibrary.json`
- Backup: `/Users/simon/OHB/one-holy-bible/src/data/generated/workbenchSyncedResources-v4.json`
- Create: `src/data/publicData.ts`
- Create: `src/data/publicData.test.ts`

**Interfaces:**
- Produces: `PublicBookManifestEntry`, `PublicDataManifest`, `PublicBookPayload`, `PublicScriptureSearchEntry`, `validatePublicManifest()`, and `validatePublicBookPayload()`.
- Consumes: existing `BibleVerse`, `BibleVersion`, `StudyResource`, and canonical IDs from `src/domain/bibleBooks.ts`.

- [ ] **Step 1: Create the backup folder and manifest**

Create `/Users/simon/备份/codex/ohb-github-text-first-preflight-20260714_125403/files/`, reproduce each source path below that `files` directory, and copy the six sources with `cp -p`. Write `README.md` with:

```markdown
# OHB GitHub text-first release preflight backup

- Backup reason: Preserve the current working application and private source payloads before restructuring public runtime data for the first GitHub release.
- Backup time: 2026-07-14T12:54:03+08:00
- Original paths:
  - /Users/simon/OHB/one-holy-bible/src/App.tsx
  - /Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx
  - /Users/simon/OHB/one-holy-bible/src/data/loadBibleLibrary.ts
  - /Users/simon/OHB/one-holy-bible/src/data/workbenchSyncedResources.ts
  - /Users/simon/OHB/one-holy-bible/src/data/generated/bibleLibrary.json
  - /Users/simon/OHB/one-holy-bible/src/data/generated/workbenchSyncedResources-v4.json
```

Verify every listed source has a corresponding backup and compare sizes with `stat -f '%z %N'`.

- [ ] **Step 2: Write failing public-data validation tests**

Create `src/data/publicData.test.ts` with fixtures asserting:

```ts
import { describe, expect, it } from "vitest";
import { validatePublicBookPayload, validatePublicManifest } from "./publicData";

describe("public data contracts", () => {
  it("accepts a safe manifest and one text-only book payload", () => {
    expect(validatePublicManifest({
      schemaVersion: 1,
      releaseVersion: "0.1.0",
      searchIndexUrl: "/data/search-index.json",
      books: [{ id: "Gen", url: "/data/books/Gen.json", bytes: 123, sha256: "a".repeat(64), cuvVerseCount: 1, kjvVerseCount: 1, textCardCount: 1 }],
    }).books[0].id).toBe("Gen");
    expect(validatePublicBookPayload({
      schemaVersion: 1,
      bookId: "Gen",
      cuvVerses: [{ id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "起初" }],
      kjvVerses: [{ id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "In the beginning" }],
      textCards: [{ id: "card-1", type: "commentary", title: "创世记一章", body: "解释", verses: ["Gen.1.1"] }],
    }).textCards).toHaveLength(1);
  });

  it.each([
    ["absolute path", "/Users/simon/OHB/file.pdf"],
    ["local URL", "http://127.0.0.1:5179/api/card"],
  ])("rejects %s metadata", (_label, unsafe) => {
    expect(() => validatePublicBookPayload({
      schemaVersion: 1,
      bookId: "Gen",
      cuvVerses: [],
      kjvVerses: [],
      textCards: [{ id: "card-1", type: "commentary", title: "x", body: "y", verses: ["Gen.1.1"], debugMeta: { sourcePdfPath: unsafe } }],
    })).toThrow(/unsafe public data/i);
  });

  it("rejects image resources", () => {
    expect(() => validatePublicBookPayload({ schemaVersion: 1, bookId: "Gen", cuvVerses: [], kjvVerses: [], textCards: [{ id: "image-1", type: "image", title: "x", body: "", verses: ["Gen.1.1"], assetPath: "/image.jpg" }] })).toThrow(/image/i);
  });
});
```

- [ ] **Step 3: Run the contract tests and verify failure**

Run: `npx vitest run src/data/publicData.test.ts`

Expected: FAIL because `src/data/publicData.ts` does not exist.

- [ ] **Step 4: Implement the contracts and validators**

Create `src/data/publicData.ts` with exported interfaces matching the fixtures. Implement recursive unsafe-string detection for `/Users/`, `file://`, `127.0.0.1`, `localhost`, and source API fields. Require commentary/note card types only, canonical book IDs, 64-character lowercase hex hashes, and verse IDs that belong to the payload book.

- [ ] **Step 5: Run the focused tests**

Run: `npx vitest run src/data/publicData.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit only the contracts**

```bash
git add src/data/publicData.ts src/data/publicData.test.ts
git commit -m "feat: define safe public Bible data contracts"
```

---

### Task 2: Generate 66 deterministic public book packages

**Files:**
- Create: `scripts/generatePublicBibleData.mjs`
- Create: `scripts/generatePublicBibleData.test.mjs`
- Create: `public/data/manifest.json`
- Create: `public/data/search-index.json`
- Create: `public/data/books/*.json`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: `src/data/generated/bibleLibrary.json`, `src/data/generated/workbenchSyncedResources-v4.json`, and `BIBLE_BOOKS` order.
- Produces: exactly 66 `PublicBookPayload` JSON files, `PublicDataManifest`, and `PublicScriptureSearchEntry[]`.

- [ ] **Step 1: Write generator tests using temporary fixtures**

The test must call the generator with `--bible`, `--resources`, and `--output` paths under a temporary directory. Assert:

```js
expect(manifest.books).toHaveLength(66);
expect(genesis.textCards.every((card) => card.type !== "image")).toBe(true);
expect(JSON.stringify(genesis)).not.toMatch(/\/Users\/|127\.0\.0\.1|localhost/);
expect(manifest.books.find((book) => book.id === "Gen").textCardCount).toBe(1);
expect(await sha256(genesisBytes)).toBe(manifest.books.find((book) => book.id === "Gen").sha256);
```

Run: `npx vitest run scripts/generatePublicBibleData.test.mjs`

Expected: FAIL because the generator does not exist.

- [ ] **Step 2: Implement the generator**

The CLI must accept:

```text
node scripts/generatePublicBibleData.mjs \
  --bible src/data/generated/bibleLibrary.json \
  --resources src/data/generated/workbenchSyncedResources-v4.json \
  --output public/data \
  --release-version 0.1.0
```

Use Node built-ins only. Filter resources to `commentary` and `note`; remove `debugMeta` keys containing absolute paths, local API values, review state, sync internals, evidence snippets, or unpublished ledger references. Preserve safe source labels, page/pageRange, stable anchors, coverage ranges, summaries, and bodies. Assign cards to their `bookIntro`, primary anchor book, or first verse book; fail when no canonical book can be determined.

Write JSON through stable key ordering and a trailing newline. Remove the previous output directory before generation so stale books cannot survive. Compute SHA-256 from the exact bytes written.

- [ ] **Step 3: Add scripts and ignore private resources**

Add:

```json
"generate:public-data": "node scripts/generatePublicBibleData.mjs --bible src/data/generated/bibleLibrary.json --resources src/data/generated/workbenchSyncedResources-v4.json --output public/data --release-version 0.1.0",
"validate:public-data": "node scripts/generatePublicBibleData.mjs --validate-only public/data"
```

Add ignore rules for `public/resources/`, `src/assets/resources/`, and private/stale generated workbench payloads, while explicitly retaining the inputs needed only until the public generator is verified. The final repository task will remove private inputs from tracking scope after public outputs pass.

- [ ] **Step 4: Run generator tests and generate real output**

Run:

```bash
npx vitest run scripts/generatePublicBibleData.test.mjs
npm run generate:public-data
npm run validate:public-data
```

Expected: tests PASS; validation reports 66 books, zero image cards, zero unsafe paths, and counts matching the manifest.

- [ ] **Step 5: Inspect output size and forbidden strings**

Run:

```bash
find public/data/books -type f | wc -l
du -sh public/data
rg -n '/Users/|127\.0\.0\.1|localhost|sourceApiBase|sourceWorkbenchPath|needs_review' public/data
```

Expected: 66 files; no `rg` matches; no single file approaches 50 MiB.

- [ ] **Step 6: Commit generator and public data**

```bash
git add .gitignore package.json package-lock.json scripts/generatePublicBibleData.mjs scripts/generatePublicBibleData.test.mjs public/data
git commit -m "feat: generate book-scoped public Bible data"
```

---

### Task 3: Implement cached manifest and book loading

**Files:**
- Create: `src/data/publicBibleData.ts`
- Create: `src/data/publicBibleData.test.ts`
- Modify: `src/data/loadBibleLibrary.ts`

**Interfaces:**
- Produces: `loadPublicManifest()`, `loadPublicBook(bookId)`, `loadPublicSearchIndex()`, `resetPublicDataCache()`, and `PublicBookLoadError`.
- Consumes: validators from `src/data/publicData.ts` and URLs rooted at `/data/`.

- [ ] **Step 1: Write failing loader tests**

Test injected fetch behavior:

```ts
it("deduplicates concurrent loads and retries after a failure", async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(jsonResponse(validManifest))
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(jsonResponse(validGenesis));
  await loadPublicManifest({ fetcher });
  await expect(loadPublicBook("Gen", { fetcher })).rejects.toThrow("offline");
  const [first, second] = await Promise.all([loadPublicBook("Gen", { fetcher }), loadPublicBook("Gen", { fetcher })]);
  expect(first).toBe(second);
});
```

Also test unknown books, non-OK responses, schema failures, and cache reset.

Run: `npx vitest run src/data/publicBibleData.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement the loader and cache**

Use module-level manifest/search promises and a `Map<string, Promise<PublicBookPayload>>` for books. Delete a rejected book promise from the map. Emit development-only structured events:

```ts
console.info("[public-data] book load succeeded", { bookId, textCardCount, cuvVerseCount, kjvVerseCount, durationMs });
```

Never log card bodies, verse bodies, local paths, or full payloads.

- [ ] **Step 3: Convert `loadBibleLibrary.ts` to a compatibility adapter**

Remove imports of private generated JSON. Export a helper that converts a loaded `PublicBookPayload` into two `BibleVersion` values for the active book. Keep only API surfaces still needed by callers during App migration.

- [ ] **Step 4: Run focused tests and type-check**

Run:

```bash
npx vitest run src/data/publicData.test.ts src/data/publicBibleData.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit the loader**

```bash
git add src/data/publicBibleData.ts src/data/publicBibleData.test.ts src/data/loadBibleLibrary.ts
git commit -m "feat: load public Bible books on demand"
```

---

### Task 4: Connect the application to the text-first public data flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/components/Workbench.tsx`
- Modify: `src/components/Workbench.test.tsx`
- Modify: `src/lib/bibleSearch.ts`
- Modify: `src/lib/bibleSearch.test.ts`

**Interfaces:**
- Consumes: `loadPublicManifest()`, `loadPublicBook()`, and `loadPublicSearchIndex()`.
- Produces: an App state machine with `activeBookId`, the current book versions/resources, loading/error/retry state, and a cross-book result navigation callback.

- [ ] **Step 1: Add failing App tests for startup, switching, and retry**

Mock the public loader and assert:

```ts
it("keeps the previous book visible when the next book fails and retries it", async () => {
  render(<App />);
  expect(await screen.findByText("创世记")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "出埃及记" }));
  expect(await screen.findByText("出埃及记加载失败")).toBeInTheDocument();
  expect(screen.getByText("创世记")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "重试加载出埃及记" }));
  expect(await screen.findByText("Exodus fixture")).toBeInTheDocument();
});
```

Add a StrictMode test that waits for the structured success event and asserts one logical event, independent of effect remount timing.

- [ ] **Step 2: Add failing Workbench tests for text-only resources**

Assert that commentary cards render, image-card sections do not appear without image resources, and book selection calls `onRequestBook(bookId)` before changing content.

- [ ] **Step 3: Refactor App into the public book state machine**

Remove startup calls to `loadBibleEveryoneImageResources()` and `loadWorkbenchSyncedResourcePayload()`. Load manifest and Genesis, then pass current versions and text cards to Workbench. Preserve previous valid state while loading a different book. Provide a retry button scoped to the failed book.

Disable or remove local Source Locator mutation controls from the public runtime path. Keep domain code only when it is not reachable from the public UI.

- [ ] **Step 4: Adapt Workbench book navigation and search**

Add props:

```ts
activeBookId: string;
isBookLoading?: boolean;
onRequestBook?: (bookId: string) => Promise<void> | void;
onRequestSearchResult?: (result: WorkbenchSearchResult) => Promise<void> | void;
wholeBibleSearchIndex?: PublicScriptureSearchEntry[];
```

Use the active book payload for reading and cards. Use the lightweight index for whole-Bible search; when a result targets another book, await `onRequestBook()` and then select the verse.

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
npx vitest run src/App.test.tsx src/components/Workbench.test.tsx src/lib/bibleSearch.test.ts
npm test
npx tsc --noEmit
```

Expected: all tests PASS, including the formerly flaky StrictMode event test.

- [ ] **Step 6: Commit the application integration**

```bash
git add src/App.tsx src/App.test.tsx src/components/Workbench.tsx src/components/Workbench.test.tsx src/lib/bibleSearch.ts src/lib/bibleSearch.test.ts
git commit -m "feat: run OHB from lazy text-first book data"
```

---

### Task 5: Make the repository public-ready

**Files:**
- Modify: `README.md`
- Create: `LICENSE`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `DATA_SOURCES.md`
- Create: `.github/workflows/ci.yml`
- Create: `.node-version`
- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`

**Interfaces:**
- Produces: GitHub-rendered project metadata and CI commands that exactly match local release gates.
- Consumes: the public generator and application commands from Tasks 2-4.

- [ ] **Step 1: Write CI and metadata validation expectations**

Create a small Node validation command in the existing generator or a dedicated test asserting the required standard files exist, `package.json` names the repository, and no README command references local-only paths.

- [ ] **Step 2: Replace the outdated README and add public documentation**

README sections must include: purpose, current `v0.1.0` scope, screenshot placeholder policy without adding an image, features, architecture, prerequisites, `npm ci`, `npm run generate:public-data`, `npm test`, `npm run build`, `npm run dev`, Tauri limitations, data rights, repository structure, contributing, and security links.

Use `LICENSE` for project-owned code only. `THIRD_PARTY_NOTICES.md` and `DATA_SOURCES.md` must explicitly separate code licensing from CUV, KJV, and explanatory-card content rights and record the user's approved public-content scope without asserting unsupported sublicensing.

- [ ] **Step 3: Add environment and package metadata**

Pin Node `24` in `.node-version`; add `engines.node` compatible with Vite 7; add `repository`, `bugs`, `homepage`, author `Siqiho`, and a code-license identifier. Replace placeholder Tauri author/description values and keep the application version at `0.1.0`.

- [ ] **Step 4: Add GitHub Actions**

`.github/workflows/ci.yml` must run on push and pull request:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version-file: .node-version
    cache: npm
- run: npm ci
- run: npm run validate:public-data
- run: npm test
- run: npx tsc --noEmit
- run: npm run build
```

- [ ] **Step 5: Validate documentation, CI YAML, tests, and build**

Run:

```bash
npm run validate:public-data
npm test
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all PASS; build does not copy `public/resources`.

- [ ] **Step 6: Commit public repository metadata**

```bash
git add README.md LICENSE THIRD_PARTY_NOTICES.md CONTRIBUTING.md SECURITY.md DATA_SOURCES.md .github/workflows/ci.yml .node-version package.json package-lock.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "docs: prepare One Holy Bible for public release"
```

---

### Task 6: Remove private artifacts and create the release candidate history

**Files:**
- Modify: `.gitignore`
- Remove from public scope: private generated JSON, local source integrations, stale docs with personal paths, and all image folders.
- Create: `docs/verification/2026-07-14-github-text-first-release-verification.md`
- Create: `docs/releases/2026-07-14-v0.1.0-release-notes.md`

**Interfaces:**
- Produces: a clean release-candidate commit whose tracked tree contains only public-safe files.
- Consumes: every release gate from the approved design.

- [ ] **Step 1: Inventory exact tracked and candidate files**

Run `git status --porcelain=v1 --untracked-files=all`, `git ls-files`, and a size-sorted candidate list. Classify each current file as public source, public generated data, internal documentation, private source data, image asset, build output, or unrelated user file.

- [ ] **Step 2: Add release hygiene tests**

Add a script or test that fails on tracked files containing `/Users/simon`, `127.0.0.1:5127`, `127.0.0.1:5179`, `sourceWorkbenchPath`, private payload filenames, image-library paths, files over 50 MiB, or forbidden directories.

- [ ] **Step 3: Preserve unrelated user files and stage only public release files**

Do not delete local private inputs; ignore them or leave them untracked. Remove obsolete tracked verification documents containing personal paths from the public branch and rewrite the three old commits only if the forbidden data remains reachable in history. Verify with `git log --all -S '/Users/simon' --name-only` and `git rev-list --objects --all`.

- [ ] **Step 4: Run full security and size scans**

Run high-confidence secret patterns without printing secret values, absolute-path scans, `git fsck --full --strict`, `git count-objects -vH`, and a largest-blob report. Expected: no private path in current tree or public refs; no blob over 50 MiB; no high-confidence credential match.

- [ ] **Step 5: Write the verification document**

Record commands, pass/fail counts, build size, public-data counts, clean-clone result, manual paths, observability events, remaining limitations, backup path, and exact commit SHA. The filename must contain ``.

- [ ] **Step 6: Commit the release candidate**

```bash
git add -- .gitignore .github .node-version README.md LICENSE THIRD_PARTY_NOTICES.md CONTRIBUTING.md SECURITY.md DATA_SOURCES.md package.json package-lock.json public/data scripts/generatePublicBibleData.mjs scripts/generatePublicBibleData.test.mjs src src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src src-tauri/tauri.conf.json 'docs/verification/2026-07-14-github-text-first-release-verification.md' 'docs/releases/2026-07-14-v0.1.0-release-notes.md'
git commit -m "chore: finalize v0.1.0 public release candidate"
```

---

### Task 7: Verify the exact commit, create GitHub repository, and publish v0.1.0

**Files:**
- No source changes after the verified release-candidate commit except a verification-document amendment that triggers a complete re-verification.
- External state: public GitHub repository `Siqiho/one-holy-bible`, `main`, tag `v0.1.0`, GitHub Release.

**Interfaces:**
- Consumes: the exact release-candidate SHA and GitHub CLI authentication.
- Produces: a public cloneable repository and release URL.

- [ ] **Step 1: Verify from a clean clone candidate**

Create a temporary clone/archive outside the working tree. Run:

```bash
npm ci
npm run validate:public-data
npm test
npx tsc --noEmit
npm run build
```

Start `npm run dev -- --host 127.0.0.1 --port 5174` from the clean copy.

- [ ] **Step 2: Manually exercise the main path**

In the Codex in-app browser, verify Genesis CUV/KJV, one explanatory text card, cross-book scripture search, lazy navigation to the target book, and cached return navigation. Capture the structured log events produced by the run.

- [ ] **Step 3: Manually exercise a failure path**

Temporarily make one book payload unavailable only in the clean verification copy. Confirm previous content remains visible, the error and retry control appear, and recovery succeeds after restoring the file. Read the resulting logs for error ordering, duplicate success events, missing telemetry, unsafe data, and unexpected exceptions.

- [ ] **Step 4: Create the public repository and push**

Confirm `gh auth status` and that `Siqiho/one-holy-bible` does not exist. Rename the verified branch to `main`, then run:

```bash
gh repo create Siqiho/one-holy-bible --public --source=. --remote=origin --description "Local-first desktop Bible study workbench with CUV/KJV reading and verse-linked explanatory cards"
git push -u origin main
```

- [ ] **Step 5: Wait for and inspect GitHub Actions**

Use `gh run list`, wait for the exact pushed SHA, and inspect failed logs if any. Do not tag until CI succeeds.

- [ ] **Step 6: Tag and publish release**

```bash
git tag -a v0.1.0 -m "One Holy Bible v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 --repo Siqiho/one-holy-bible --title "One Holy Bible v0.1.0" --notes-file 'docs/releases/2026-07-14-v0.1.0-release-notes.md'
```

The release notes must state the text-first scope, 66-book lazy loading, explanatory cards, excluded image library, rights notices, install/test commands, and known limitations.

- [ ] **Step 7: Final remote verification**

Clone the public repository into a new temporary directory, verify the default branch and tag, rerun public-data validation, check the README rendering and release URL, and confirm no large/private files are present. Report the repository URL, release URL, exact SHA, test/build results, manual paths, log analysis, backup reason, and original backup paths.
