# OHB Resource Card Copy Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Genesis image cards display reader-friendly descriptions and add card copy actions without exposing local filenames or paths.

**Architecture:** Add optional display metadata to Genesis placements, generate clean resource titles/bodies while moving engineering fields to debug metadata, and add a propagation-safe copy action menu inside `ResourceCard`.

**Tech Stack:** React 19, TypeScript, Vite 7, Vitest, Testing Library, lucide-react.

---

### Task 1: Clean Genesis Image Resource Text

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/domain/resources.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/genesisResourcePlacements.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/genesisResources.ts`
- Modify: `/Users/simon/OHB/one-holy-bible/src/data/sampleBible.test.ts`

- [ ] Add failing tests asserting Genesis image resources do not expose local filenames, `src/assets`, `CMC-01_副本`, source package names, or machine evidence labels in visible `title`, `source`, and `body`.
- [ ] Add expectations for polished sample titles and summaries for `p048_img032_720x525`, `p033_img023_720x404`, `p014_img013_1888x2777`, `p397_img217_720x891`, and `p420_img231_692x901`.
- [ ] Extend placement metadata with optional display fields.
- [ ] Generate visible title/body from display fields or fallback summary helpers.
- [ ] Preserve file/page/source details in optional `debugMeta` and do not render them in UI.
- [ ] Run `npm test -- src/data/sampleBible.test.ts`.

### Task 2: Add Resource Card Copy Actions

**Files:**
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`
- Modify: `/Users/simon/OHB/one-holy-bible/src/styles.css`

- [ ] Add failing tests for a hover/focus card action menu that copies title, body, and Markdown using `navigator.clipboard.writeText`.
- [ ] Assert clicking the copy action does not open the card in the center and does not start a drag overlay.
- [ ] Add `Copy` and `Pencil` or menu affordance from `lucide-react`.
- [ ] Stop pointer/click propagation on action controls.
- [ ] Surface copy success through the existing workbench status live region.
- [ ] Add CSS so actions appear on hover/focus, fit saved and center cards, and do not overlap title text.
- [ ] Run `npm test -- src/components/Workbench.test.tsx`.

### Task 3: Integration Verification

**Files:**
- No source changes unless verification exposes defects.

- [ ] Run `npm test`.
- [ ] Run `npm run build -- --outDir /tmp/ohb-build-after-resource-card-polish --emptyOutDir`.
- [ ] Run `git diff --check`.
- [ ] Use the in-app Browser at `http://127.0.0.1:5174/` to verify `Gen.2.10`, `Gen.1.22`, and a route-map card.
- [ ] Read browser console logs and dev-server output.
