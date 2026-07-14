# Data sources and scope

## Public `v0.1.0` dataset

The project maintainer approved the following text-first content for public distribution in this repository:

- the project's complete 66-book CUV dataset;
- the project's complete 66-book KJV dataset;
- selected verse-linked explanatory text cards.

The generated runtime packages live in `public/data`. Scripture is split into one JSON package per canonical Bible book and loaded on demand. A lightweight whole-Bible Scripture index supports cross-book search. Explanatory cards are searched within the active book.

The generator accepts only `commentary` and `note` cards, removes local paths and internal synchronization metadata, and rejects image cards. Validation checks the manifest, hashes, schemas, verse counts, search-index reconciliation, and unsafe strings.

## Provenance

The release data is generated from the project's maintained source datasets. Public explanatory cards retain a safe subset of provenance when available, such as a source label, page number or range, and canonical verse coverage. These fields identify source context; they do not grant a license.

This repository does not claim that all source texts are public domain in every jurisdiction. Publication approval from the project maintainer records the repository's release scope, but it is not a sublicense for downstream use. Review [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) before redistributing data.

## Deliberately excluded

The `v0.1.0` public dataset excludes the project's image library, image-card payloads, private source files, local filesystem paths, local service addresses, synchronization internals, and review-state metadata.

To validate the checked-in public packages:

```bash
npm run validate:public-data
```
