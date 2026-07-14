# One Holy Bible v0.1.0 public release verification

Date: 2026-07-14 (Asia/Shanghai)

Verified source commit: `639e38ba67f766e2ac89f7de6008023ecf09042d`

## Scope

This release candidate contains the public text-first application, its automated tests, 66 book-scoped data packages, the whole-Bible scripture search index, required web and Tauri configuration, standard repository documents, and CI. It intentionally excludes the private source-import pipeline, local source exports, image libraries, internal plans, personal paths, local services, build output, and task scratch files.

The original working tree and its local-only resources were not deleted or rewritten. A preflight backup was created in the user's external Codex backup area; its exact local path is recorded in the private task report rather than in this public repository.

## Automated verification

The following commands were run from an isolated release worktree:

```bash
npm ci
npm run validate:public-data
npm test
npx tsc --noEmit
npx tsc -p tsconfig.node.json --noEmit
npm run build
npm audit --omit=dev
```

Results:

- Public data: 66 books; 31,102 CUV verses; 31,102 KJV verses; 11,124 explanatory text cards; 62,204 search entries; 0 image cards; 0 unsafe matches.
- Repository hygiene: 142 source-commit files; 54,935,407 bytes; 0 files over 50 MiB; 0 forbidden matches.
- Tests: 14 files and 207 tests passed.
- Type checks: application and Node/Vite configuration passed.
- Production build: passed; 73 files, including exactly 66 book packages; 59,888 KiB total; no private resource directory.
- Production dependency audit: 0 vulnerabilities.
- Full development dependency audit: 2 low and 2 high advisories remain in build/test tooling; no production advisory was reported.

The hygiene test and command reject forbidden tracked directories, personal local paths, known local-only service addresses, private payload/field names, high-confidence credential patterns, and individual files larger than 50 MiB. The public-data validator also reconciles each manifest count, byte size, SHA-256 digest, scripture coordinate, text-card schema, and search-index entry.

## Main and failure paths

Before candidate assembly, the same text-first runtime path was manually exercised through these flows:

- Genesis startup loaded CUV, KJV, and explanatory cards.
- Book navigation lazily loaded Exodus.
- Whole-Bible search selected John 3:16 and loaded John before selecting the result.
- A forced book-load failure retained the previously valid book and exposed a scoped retry action.
- A failed cross-book search followed by ordinary navigation did not replay the stale search target.

The observed structured events covered manifest, book, and search-index success; book-load failure; retry; selected-book changes; and search-result navigation. Logs carried counts and identifiers rather than scripture/card bodies or local paths. Final clean-candidate browser exercise and hosted CI are release-publishing gates and are recorded separately after publication.

## Remaining limitations

- v0.1.0 is intentionally text-first. The local image library is not distributed.
- The source-import and regeneration pipeline is maintained outside this public repository; the checked-in packages are independently validated here.
- A full macOS desktop bundle requires Xcode. The web build and Tauri metadata are included and verified independently.
- Scripture and explanatory-card reuse terms are governed by their source rights and notices, not by the MIT license for project-owned code.
