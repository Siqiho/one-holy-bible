# Genesis Card Source Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the existing 244 Genesis image cards so each card can be traced back to source document, page, extracted image, and nearby source text without leaking machine metadata into reader-facing copy.

**Architecture:** Keep the existing generated-card structure in `genesisResources.ts`. Generate a separate source-evidence metadata file from the optimized `extract-document-images` skill output, then merge that metadata into each card's `debugMeta`, `summary`, and `searchText`.

**Tech Stack:** TypeScript, Vite, Vitest, Poppler via `/Users/simon/.codex/skills/extract-document-images`.

---

### Task 1: Source Evidence Manifest

**Files:**
- Read: `/Users/simon/OHB/文档/CMC-01_副本.pdf`
- Read: `/Users/simon/OHB/文档/圣经研修本_按卷分割可选文字-v3_20260507_2316/01_创世记-v3.pdf`
- Create: `/Users/simon/OHB/Resources/01_创世记/文档图片内容提取_*`

- [ ] Run the optimized skill on the CMC and Genesis v3 PDFs.
- [ ] Confirm CMC output keeps 232 images and Genesis v3 output keeps 12 images / removes 72 full-page text scans.
- [ ] Confirm each manifest row includes `source_pdf_path`, `source_pdf_sha256`, `page`, `image_num`, `stored_relative_path`, `text_source`, and `evidence_snippet`.

### Task 2: Generated Card Source Metadata

**Files:**
- Create: `/Users/simon/OHB/one-holy-bible/src/data/genesisResourceSourceMeta.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/domain/resources.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/genesisResources.ts`

- [ ] Generate a filename-keyed source metadata map for all 244 Genesis image resources.
- [ ] Add optional resource fields `summary` and `searchText`.
- [ ] Extend `StudyResourceDebugMeta` with source PDF path/hash, manifest path, page text snippet, evidence type/snippet, stored source path, and removed path when present.
- [ ] Merge source metadata into `debugMeta` while preserving current `fileName`, `sourceFolder`, `sourcePackage`, `folderLabel`, `page`, `confidence`, and `evidence`.
- [ ] Use reader-safe text only in visible `title/body`; keep raw file paths and hash values out of reader copy.

### Task 3: Tests And Guardrails

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/sampleBible.test.ts`

- [ ] Assert `genesisResources` still has 244 items: 232 CMC and 12 Genesis v2/v3 crop-backed resources.
- [ ] Assert every Genesis image card has `summary`, `searchText`, `debugMeta.sourcePdfPath`, `debugMeta.sourcePdfSha256`, `debugMeta.sourceTextSnippet`, and `debugMeta.sourceManifestPath`.
- [ ] Assert visible reader copy still excludes filenames, paths, source package names, machine evidence tokens, `.png`, and `.pdf`.
- [ ] Assert representative CMC and Genesis v3 cards point to the expected source PDF path and SHA-256.

### Task 4: Verification

**Commands:**
- `npm test -- --runInBand`
- `npm run build`
- Manual resource inspection script that samples at least one CMC card, one Genesis v3 cropped card, and one low-confidence card.

- [ ] Run the full test suite and read the output.
- [ ] Build the app and read the output.
- [ ] Inspect generated source metadata counts and sample records.
- [ ] If running the dev app is practical, open the local UI and check at least one visible card still renders image/title/body normally.
