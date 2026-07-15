# Data sources and scope

## Public `v0.2.0` dataset

The project maintainer approved the following content for public distribution in this release:

- the project's complete 66-book CUV dataset;
- the project's complete 66-book KJV dataset;
- 10,963 selected verse-linked explanatory `commentary` and `note` cards;
- 2,705 verse-linked image-card records with safe external asset descriptors.

The public runtime packages live in `public/data`. Scripture is split into one JSON package per canonical Bible book and loaded on demand. A lightweight whole-Bible Scripture index supports cross-book search. Text and image cards remain in their book package and are mapped to the read-only workbench at runtime.

Image cards do not embed binary content. Each `asset` descriptor contains a fixed HTTPS URL, SHA-256, byte count, MIME type, and pixel dimensions. The 2,515 PNG binaries are stored in the separate public [one-holy-bible-assets repository](https://github.com/Siqiho/one-holy-bible-assets) at the immutable commit `ad75722ffeb6355dfa77f6b42496f0dd1421a2b2`. Validation checks the schema-v2 manifest, package hashes, card counts, search-index reconciliation, asset-manifest digest, descriptor equality, URL policy, and unsafe strings.

## Provenance

The release data is generated from the project's maintained source datasets. Public explanatory cards retain a safe subset of provenance when available, such as a source label, page number or range, and canonical verse coverage. These fields identify source context; they do not grant a license.

This repository does not claim that all source texts are public domain in every jurisdiction. Publication approval from the project maintainer records the repository's release scope, but it is not a sublicense for downstream use. Review [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) before redistributing data.

## Deliberately excluded from this code repository

The code repository excludes private source files, local filesystem paths, local service addresses, synchronization internals, review-state metadata, source PDFs, and raw image binaries. Raw image binaries are intentionally hosted in the separate public asset repository; their source rights and attribution remain record-specific.

To validate the checked-in public packages:

```bash
npm run validate:public-data
npm run validate:public-repository
npm run validate:public-release
```
