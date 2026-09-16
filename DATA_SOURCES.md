# Data sources and scope

## Public `v0.3.0` dataset

The project maintainer approved the following content for public distribution in this release:

- the project's complete 66-book CUV dataset;
- the project's complete 66-book KJV dataset;
- 16,092 selected verse-linked explanatory `commentary` and `note` cards;
- 2,927 image-card placements with safe external asset descriptors;
- 178 Doré chapter artworks linked to canonical book/chapter coordinates.

The public runtime packages live in `public/data`. Scripture is split into one JSON package per canonical Bible book and loaded on demand. A lightweight whole-Bible Scripture index supports cross-book search. Text and image cards remain in their book package and are mapped to the read-only workbench at runtime.

Image cards do not embed binary content. Each `asset` descriptor contains a fixed HTTPS URL, SHA-256, byte count, MIME type, and pixel dimensions. The 2,735 PNG binaries are stored in the separate public [one-holy-bible-assets repository](https://github.com/Siqiho/one-holy-bible-assets) at the immutable commit `8d913d8a9648505bf71101705914da865a07da56`. Validation checks the schema-v2 manifest, package hashes, card counts, search-index reconciliation, asset-manifest and search-index digests, descriptor equality, URL policy, and unsafe strings.

The Doré artwork manifest is `public/data/dore-artwork.json`. It records each chapter, title, Scripture reference, immutable JPEG URL, hash, size, and dimensions; the release receipt records its digest.

## Provenance

The release data is generated from the project's maintained source datasets and the current selected resource projection. It does not include every resource in the editing workspace, and technical validation is not a fresh editorial review of every card. One source image refers to two books and is published as two book-scoped placements sharing the same binary. Exact input digests and the development commit are recorded in `PUBLIC_RELEASE.json`. Public explanatory cards retain a safe subset of provenance when available, such as a source label, page number or range, and canonical verse coverage. These fields identify source context; they do not grant a license.

This repository does not claim that all source texts are public domain in every jurisdiction. Publication approval from the project maintainer records the repository's release scope, but it is not a sublicense for downstream use. Review [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) before redistributing data.

## Deliberately excluded from this code repository

The code repository excludes private source files, local filesystem paths, local service addresses, synchronization internals, review-state metadata, source PDFs, and raw image binaries. Raw image binaries are intentionally hosted in the separate public asset repository; their source rights and attribution remain record-specific.

To validate the checked-in public packages:

```bash
npm run validate:public-data
npm run validate:public-repository
npm run validate:public-release
```
