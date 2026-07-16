# One Holy Bible

One Holy Bible is a local-first Bible study workbench built with React, TypeScript, Vite, and Tauri. It pairs synchronized Chinese Union Version (CUV) and King James Version (KJV) reading with verse-linked explanatory text and image cards.

## `v0.2.0` scope

This public release includes all 66 Bible books, CUV and KJV Scripture, 10,963 verse-linked explanatory text cards, and 2,705 image cards. Books are packaged separately and loaded on demand. Image-card binaries are kept in the separate public [one-holy-bible-assets repository](https://github.com/Siqiho/one-holy-bible-assets) and referenced through immutable HTTPS URLs in the checked-in asset manifest.

The code repository intentionally does not duplicate the 2,515 unique PNG binaries. Each image descriptor records its SHA-256, byte size, MIME type, and dimensions so release validators and downstream consumers can verify the association without importing the development workbench.

## Features

- synchronized CUV/KJV reading and verse highlighting;
- navigation across all 66 canonical books;
- lazy loading with cached return navigation and retry on load failure;
- whole-Bible Scripture search with cross-book navigation;
- verse-linked explanatory `commentary` and `note` cards;
- verse-linked read-only image cards with remote preview and integrity metadata;
- movable study modules in the reading workbench;
- deterministic public-data packaging and integrity validation.

## Architecture

The browser UI loads `public/data/manifest.json`, then requests only the selected book package from `public/data/books`. Each book payload contains `textCards` and `imageCards`; image cards carry an `asset` descriptor rather than embedding binary data. The whole-Bible search index contains minimal Scripture fields, while the asset manifest maps image-card hashes to fixed public URLs. Runtime schemas, URL checks, package hashes, asset descriptors, and release validation keep public data fail-closed.

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
npm run validate:public-repository
npm run validate:public-release
npm test
npx tsc --noEmit
npx tsc -p tsconfig.node.json --noEmit
npm run build
npm audit --omit=dev
```

The source-import and release-preparation pipeline is intentionally kept outside this public repository. This checkout is a read-only public snapshot: contributors should update the checked-in book packages, image manifest, and public runtime only through the approved independent release workflow.

## Tauri status

The web build and development server are the primary verified `v0.2.0` paths. Tauri configuration is included, but platform desktop bundles require the relevant OS toolchain and have not all been produced or signed. Run the desktop development shell only after installing Tauri's platform prerequisites:

```bash
npm run tauri dev
```

## Data rights

The MIT license covers project-owned source code and documentation only. It does not relicense the CUV, KJV, explanatory-card datasets, or image source material. Publication scope, provenance policy, jurisdiction cautions, and excluded resources are documented in [`DATA_SOURCES.md`](DATA_SOURCES.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). The external image repository has its own provenance and rights review.

## Repository structure

```text
src/                  React application, public runtime, and domain logic
public/data/          public manifest, asset manifest, search index, and 66 book packages
scripts/              public-data, repository, and release validation
src-tauri/            Tauri desktop-shell configuration
.github/workflows/    continuous integration
```

## Contributing and security

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before proposing code or data changes. Report vulnerabilities, sensitive-data exposure, or content-rights concerns using the private process in [`SECURITY.md`](SECURITY.md).

Project maintainers should follow the Chinese [`GitHub 更新与发布指南`](docs/GitHub更新与发布指南【codex】.md) to preserve the separation between development, public application, and public asset repositories.

## License

Project-owned code and documentation are available under the [MIT License](LICENSE). Dataset rights remain separate as described above.
