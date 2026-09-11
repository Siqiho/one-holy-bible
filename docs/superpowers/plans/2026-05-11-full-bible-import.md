# Full Bible Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Genesis-only sample scripture data with full KJV and Chinese Union Version Bible content, and make the scripture reader browse all 66 books by book, chapter, and verse.

**Architecture:** Keep the existing `BibleVersion -> verses[]` model. Add canonical Bible book metadata, generated full-Bible data, and make `Workbench` derive its book picker, chapter picker, headers, and rendered verse list from the selected `VerseId`.

**Tech Stack:** Vite, React, TypeScript, Vitest, Poppler `pdftotext` for local PDF extraction.

---

### Task 1: Scripture Metadata and Full Data

**Files:**
- Create: `src/domain/bibleBooks.ts`
- Create: `src/data/bibleLibrary.ts`
- Modify: `src/data/sampleLibrary.ts`
- Modify: `src/App.tsx`
- Test: `src/data/sampleBible.test.ts`
- Test: `src/domain/verse.test.ts`
- Test: `src/domain/verseId.test.ts`

- [ ] Add 66-book metadata with canonical ids, Chinese names, English names, testament groups, chapter counts, and aliases.
- [ ] Parse the two local PDFs into `cuvBible` and `kjvBible` using the current `BibleVersion` shape.
- [ ] Preserve the existing `sampleResources` export.
- [ ] Export full versions through `sampleLibrary.ts` for compatibility or update imports to `bibleLibrary.ts`.
- [ ] Validate 66 books, 1,189 chapters, no duplicate verse ids, and known verses such as `Gen.1.1`, `John.3.16`, and `Rev.22.21`.
- [ ] Handle the observed KJV PDF omission of `Rev.22.21` with the standard KJV verse text and a generator note.

### Task 2: Data-Driven Reader Navigation

**Files:**
- Modify: `src/components/Workbench.tsx`
- Modify: `src/styles.css`
- Test: `src/components/Workbench.test.tsx`

- [ ] Derive available books from loaded versions and render Old Testament / New Testament sections in the book picker.
- [ ] Derive available chapters from the current book and render only valid chapter buttons.
- [ ] Render only verses from the current book and current chapter in each Bible column.
- [ ] Update toolbar, masthead, column headers, and left dock title from canonical book metadata.
- [ ] Keep search result selection opening the correct version module and synchronizing selected verse across visible Bible modules.
- [ ] Keep the picker scrollable within the desktop viewport.

### Task 3: Verification and Polish

**Files:**
- Modify as needed: `docs/verification/*.md`

- [ ] Run focused tests for data, verse ids, search, and Workbench navigation.
- [ ] Run the full test suite and build.
- [ ] Start the app locally, manually exercise Genesis, John, Revelation, KJV/CUV toggles, chapter picker, book picker, and search.
- [ ] Read the console/log output from the manual run and check for errors, suspicious warnings, incorrect selections, or missing observability.
- [ ] Write a verification note with commands, manual path, and log findings.
