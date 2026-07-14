# One Holy Bible

One Holy Bible is a local-first Bible study workbench built with React, TypeScript, Vite, and Tauri. It pairs synchronized Chinese Union Version (CUV) and King James Version (KJV) reading with verse-linked explanatory text cards.

## `v0.1.0` scope

This first public release is deliberately text-first: all 66 Bible books, CUV and KJV Scripture, and selected explanatory text cards are included. Books are packaged separately and loaded on demand. The large image library and all image-card payloads are excluded.

Screenshots will be added only after a public-release image is reviewed for content rights and accidental local information. The repository intentionally ships no screenshot placeholder image.

## Features

- synchronized CUV/KJV reading and verse highlighting;
- navigation across all 66 canonical books;
- lazy loading with cached return navigation and retry on load failure;
- whole-Bible Scripture search with cross-book navigation;
- verse-linked explanatory `commentary` and `note` cards;
- movable study modules in the reading workbench;
- deterministic public-data generation and integrity validation.

## Architecture

The browser UI loads `public/data/manifest.json`, then requests only the selected book package from `public/data/books`. The whole-Bible search index contains minimal Scripture fields; explanatory cards remain in their book package. Runtime schemas, URL checks, package hashes, and generator validation keep public data fail-closed.

Tauri provides the desktop shell. The web application can also run directly with Vite for development and review.

## Prerequisites

- Node.js 24 (see `.node-version`)
- npm, using the checked-in lockfile
- optional: the current Tauri prerequisites and Rust toolchain for desktop packaging

## Install and run

```bash
git clone https://github.com/Siqiho/one-holy-bible.git
cd one-holy-bible
npm ci
npm run dev
```

Vite prints the local development URL after startup.

## Validate and build

The checked-in public packages can be validated without private source inputs:

```bash
npm run validate:public-data
npm test
npx tsc --noEmit
npm run build
```

Maintainers can regenerate `public/data` by passing separately maintained source datasets explicitly on the command line:

```bash
npm run generate:public-data -- --bible path/to/bible.json --resources path/to/resources.json --output public/data --release-version 0.1.0
```

The source-import pipeline is intentionally kept outside this public repository. Contributors can use the checked-in, book-scoped packages and run `npm run validate:public-data` to verify their schemas, hashes, counts, and release hygiene.

## Tauri status

The web build and development server are the primary verified `v0.1.0` paths. Tauri configuration is included, but platform desktop bundles require the relevant OS toolchain and have not all been produced or signed. Run the desktop development shell only after installing Tauri's platform prerequisites:

```bash
npm run tauri dev
```

## Data rights

The MIT license covers project-owned source code and documentation only. It does not relicense the bundled CUV, KJV, or explanatory-card datasets. Publication scope, provenance policy, jurisdiction cautions, and excluded resources are documented in [`DATA_SOURCES.md`](DATA_SOURCES.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Repository structure

```text
src/                  React application, domain logic, and tests
public/data/          generated public manifest, search index, and 66 book packages
scripts/              public-data generation and repository validation
src-tauri/            Tauri desktop-shell configuration
.github/workflows/    continuous integration
```

## Contributing and security

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before proposing code or data changes. Report vulnerabilities, sensitive-data exposure, or content-rights concerns using the private process in [`SECURITY.md`](SECURITY.md).

## License

Project-owned code and documentation are available under the [MIT License](LICENSE). Dataset rights remain separate as described above.
