# OHB Resource Card Copy Polish Design

## Goal

Genesis image cards should read like study material, not build artifacts. The card should describe what the image shows, why it belongs with the selected Genesis passage, and how confident the placement is. File names, local paths, source folders, and machine evidence labels must not appear in the visible card text.

## Scope

This pass changes static resource presentation and card-level copy actions. It does not add persistent user editing or a resource override store. The hover icon can include an edit affordance, but this version only needs reliable copy options.

## Data Design

`StudyResource` keeps the existing public fields and adds optional debug metadata for engineering-only details. `genesisResources.ts` moves file/page/path/source-package details into that metadata and stops placing them in `title`, `source`, or `body`.

Visible image card body format:

```text
摘要：...
关联经文：Gen.2.10-Gen.2.14
依据：...
置信度：低
```

For most images, `genesisResourcePlacements.evidence` can be transformed into a cleaner evidence sentence. For reviewed images, `genesisResourcePlacements.ts` can carry optional display fields:

- `displayTitle`
- `summary`
- `displayEvidence`
- `displayConfidence`

The first manually polished examples are:

- Ancient Mesopotamia map, `p048_img032_720x525`
- Bucket orchid pollination, `p033_img023_720x404`
- Genesis 2:17-25 page, `p014_img013_1888x2777`
- Jacob route map, `p397_img217_720x891`
- Joseph and Judah route map, `p420_img231_692x901`

## UI Design

Every expanded resource card gets a compact action area in the header. It appears on hover or keyboard focus, using lucide icons. The menu offers:

- Copy title
- Copy body
- Copy Markdown

The action buttons must stop pointer/click propagation so they do not trigger card dragging or double-click-to-open behavior. Copy success should be surfaced through the existing workbench status live region.

## Testing

Data tests should assert that visible Genesis image titles/bodies do not expose file names, `src/assets`, `CMC-01_副本`, `physical_chapter_only`, `ocr_page_ref`, or source package strings. They should also assert the curated summaries for the key sample images.

Workbench tests should assert that the copy menu is accessible, writes the expected text to `navigator.clipboard.writeText`, and does not open or drag the card when clicked.

## Verification

Run focused tests first, then full `npm test`, `npm run build -- --outDir /tmp/ohb-build-after-resource-card-polish --emptyOutDir`, in-app Browser manual checks on the screenshot cases, and browser/dev-server log review.
