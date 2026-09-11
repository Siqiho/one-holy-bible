# One Holy Bible GitHub Text-First Release Design

## Goal

Publish `Siqiho/one-holy-bible` as a public, runnable first-party project whose main experience is complete Bible reading plus explanatory text cards, while keeping the repository small enough to clone, review, test, and maintain.

## Approved Scope

The first public release will include:

- the React, TypeScript, Vite, and Tauri application framework;
- the current complete CUV and KJV reading experience;
- book and chapter navigation, synchronized reading, search, layout, and text-card interaction;
- explanatory text cards selected for the public dataset;
- the image-card interfaces and empty/error states needed to preserve the architecture;
- tests, generators, schemas, provenance manifests, and release documentation required to reproduce and verify the public build.

The first public release will not include:

- the approximately 3.2 GiB image library;
- BibleEveryone image files;
- images extracted from PDFs or publications;
- stale generated payload versions;
- local-only source ledgers, review state, debugging evidence, or absolute paths;
- build outputs, dependency folders, Tauri build caches, logs, or local editor state.

## Architecture

### 1. Book-scoped scripture and card data

Public runtime data will be split into 66 book packages. Each package will use the canonical book identifier already used by the application and will contain that book's scripture records and explanatory text-card records.

The public file layout will follow this responsibility boundary:

```text
public/data/
  manifest.json
  books/
    Gen.json
    Exod.json
    ...
    Rev.json
```

`manifest.json` will record the public data schema version, release version, available books, per-book URLs, byte sizes, SHA-256 values, scripture counts, and text-card counts. Each book JSON will be independently loadable and cacheable.

No runtime record may contain an absolute local path. Public provenance fields may contain stable source identifiers, human-readable source labels, document editions, page references, and license or permission references, but not `/Users/simon/...`, local API URLs, temporary directories, internal review notes, or unpublished source ledgers.

### 2. Lazy loading and cache behavior

The application will load the manifest at startup and load only the active book package. Switching to another book will fetch that package on demand. Previously loaded book packages will be cached in memory for the current session.

Loading states will be explicit:

- manifest loading;
- book loading;
- book available;
- book unavailable;
- malformed or incompatible data.

If a book package fails, the central reader will keep the previous valid book visible and show a recoverable error with a retry action. A single bad book must not prevent the rest of the application from starting.

### 3. Search behavior

Book-local search will operate immediately on the loaded book. Whole-Bible search will use a generated lightweight search index rather than eagerly loading all 66 full payloads. Search results will identify the target book and verse; selecting a result will load the necessary book package before navigating to the verse.

The search index will contain only the minimum searchable scripture fields needed for discovery. Explanatory cards will be searched within the active book for the first public release. Whole-library card search is outside the initial scope.

### 4. Text cards as the public study layer

Only explanatory text cards are part of the first public dataset. Public cards will retain their stable IDs, titles, bodies, verse coverage, book-introduction relationship, source label, and safe provenance metadata.

Image resources will be removed from the public manifest and public book payloads. Image-card rendering code may remain so future resource packages can be added without redesigning the domain model, but the first release must not produce broken image URLs or empty image placeholders in normal navigation.

### 5. Generation pipeline

A deterministic generator will transform the current private/local datasets into the public book packages and manifest. The generator will:

1. select scripture and explanatory text resources;
2. reject image resources from the public dataset;
3. remove local paths, local URLs, internal review state, and private debugging metadata;
4. validate verse and book identifiers;
5. split output by canonical book ID;
6. compute counts, sizes, and SHA-256 values;
7. fail if any forbidden field or absolute path survives;
8. write only the current public dataset, without retaining versioned duplicate outputs.

Generated public files will be committed only when they are required for a clean clone to run. Private inputs and raw extraction artifacts will remain outside Git.

## Repository and GitHub Structure

The public repository will use `main` as the default branch and release the first verified snapshot as `v0.1.0`.

The repository will contain:

- application source and tests;
- lockfiles and reproducible environment declarations;
- public book packages and manifest;
- the generator and validation scripts;
- GitHub Actions for install, type-check, test, public-data validation, and production build;
- a project README, code license, third-party notices, contributing guide, security policy, and asset/data provenance documentation.

GitHub-recognized community files are an approved exception to the Simon Document Naming Rule and may use their required standard names, including `README.md`, `LICENSE`, `CONTRIBUTING.md`, and `SECURITY.md`. Internal design, plan, audit, and verification documents will continue to include `` in their names.

Large image resources will not be added to ordinary Git, Git LFS, or the first release. A later independently approved design may publish licensed image packages through GitHub Releases or object storage.

## Rights and Provenance

The repository will distinguish project code from content data:

- the chosen code license covers only original project code and project-owned documentation;
- scripture editions and explanatory-card sources will be listed in third-party notices;
- each public data source will record its edition, owner or publisher when known, source role, and the permission or legal basis relied upon for redistribution;
- no statement will imply that the project code license relicenses third-party scripture or commentary content.

The user has approved publishing the scripture framework and explanatory text cards as the first public content scope. The release process will preserve that authorization decision in the repository's provenance documentation while keeping source-specific notices intact.

## Error Handling and Observability

The public application will emit structured development logs for the release-critical path:

- manifest load start/success/failure;
- book package load start/success/failure;
- schema or hash mismatch;
- search-index load and cross-book navigation;
- explanatory-card count and image-resource rejection during generation.

Logs must avoid scripture bodies, card bodies, local paths, tokens, and personal data. Production logging will be minimal and limited to actionable load failures.

## Testing and Release Gates

The release is eligible for upload only when all gates pass:

1. generator unit tests prove 66 book outputs, stable IDs, image exclusion, safe metadata, and deterministic manifests;
2. schema tests reject absolute paths, local URLs, image resources, missing book packages, and count/hash mismatches;
3. application tests cover startup, initial book load, book switching, retry after failure, verse navigation, whole-Bible scripture search, and explanatory text-card display;
4. the existing StrictMode logging test is stable in the full suite, not merely in isolated reruns;
5. TypeScript checking and the production build pass;
6. a clean clone can install, test, build, and run without access to `/Users/simon/OHB/Resources`, `/Users/simon/OHB/Edit`, or local APIs;
7. the built output does not contain the excluded image library, absolute local paths, or private review metadata;
8. manual use covers one main path and at least one failure or boundary path;
9. Codex reads and analyzes the logs produced by the tests and manual run before declaring completion;
10. the Git worktree is clean and the exact pushed commit matches the verified commit.

## Manual Verification Scenarios

Main path:

1. launch the clean public build;
2. open Genesis and read synchronized CUV/KJV verses;
3. open an explanatory text card associated with a verse;
4. search for a verse in another book;
5. navigate to the result and confirm that the target book loads on demand;
6. return to the previous book and confirm cached navigation remains correct.

Failure or boundary path:

1. make one book payload unavailable in the verification environment;
2. attempt to open that book;
3. confirm that the previous valid content remains visible, the error is understandable, and retry succeeds after restoring the payload;
4. inspect logs for correct ordering, missing telemetry, unexpected errors, and leaked local information.

## Release Deliverables

- public GitHub repository `Siqiho/one-holy-bible`;
- default branch `main`;
- tag and GitHub release `v0.1.0`;
- complete text-first application source;
- 66 validated book packages and one manifest;
- public scripture search index;
- explanatory text-card dataset;
- README and community health files;
- code and third-party content notices;
- CI results and a final verification report whose filename includes ``.

## Explicit Non-Goals

- publishing the 3.2 GiB image collection;
- publishing image cards as content in `v0.1.0`;
- whole-library explanatory-card search;
- hosting or production web deployment;
- signed or notarized macOS distribution;
- automatic resource downloading or updating;
- refactoring unrelated application behavior.
