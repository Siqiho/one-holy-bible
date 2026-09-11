# Design QA — OHB 现代暖纸 UI

## Visual truth and comparison setup

- Source visual truth: `/var/folders/g_/cx_qfcqn1nd45brx4p137xnm0000gn/T/codex-clipboard-2e4ec5b2-bb2a-4987-9cc5-11b41177b7b8.png`
- Implementation URL: `http://127.0.0.1:5174/`
- Final implementation capture: `.superpowers/sdd/paper-demo-warm-1440x900-final.png`
- Full-view comparison: `.superpowers/sdd/paper-demo-comparison-final.png`
- Small-laptop capture: `.superpowers/sdd/paper-demo-warm-1180x760-final.png`
- State: Genesis 1, `Gen.1.1` selected, warm paper enabled.

The source is a concept direction rather than the current product's exact data/layout state. The comparison therefore judges the approved visual language—warm natural paper, ink hierarchy, serif reading surface, restrained brass selection, and printed grayscale imagery—while preserving OHB's existing three-column workbench, resource data, and controls.

## Pass 1 findings

| Priority | Surface | Finding | Correction |
| --- | --- | --- | --- |
| P1 | Image quality | Family-level blending altered blue and color assets. | Replaced family matching with a conservative exact-suffix allowlist for two confirmed grayscale assets. |
| P2 | Colors/tokens | Canvas read as uniformly lemon-yellow and the selected verse was too saturated. | Raised lightness, reduced chroma and illumination, and softened the selected-verse token mix. |
| P2 | Spacing/layout | The new 96px label worsened toolbar crowding at 1180px. | Kept the icon and accessible name but hid only the new label at `max-width: 1280px`, producing a 36px button. |
| P1 | Accessibility | The inherited warm focus ring was too close to the paper surface; the first repair was also covered by selected-verse state shadow. | Added a high-contrast warm-only halo/ring pair, then raised its enabled-control specificity and placed it after state shadows; verified selected verse, pressed paper toggle, and search input with keyboard focus. |

## Final surface review

### Typography

Passed. Chinese scripture and reading prose use a Song/Ming serif stack; KJV resolves to the book-serif stack; toolbar controls remain system sans. Hierarchy stays legible and the center scripture remains the anchor.

### Spacing and layout

Passed. Existing three-column structure and dock widths remain unchanged at 1440px. At 1180px the new control collapses without horizontal overflow or introducing a new crop/overlap. Existing product-level responsive hiding is unchanged.

### Colors and tokens

Passed. Final palette is light ivory rather than lemon yellow, with warm gray-brown ink and restrained brass accents. Normal text contrast contract is at least 4.5:1; actual muted metadata contract is 5.23:1. Selected scripture reads as a quiet paper-light state rather than an alert.

Keyboard focus also passed: the dedicated warm ring has 5.96:1–7.13:1 contrast across the four warm paper surfaces and remained visibly applied to selected/pressed controls in the real browser cascade.

### Image quality

Passed. Confirmed grayscale scans blend with `multiply` and a scoped mild sepia filter only in warm mode. Sampled blue Hebrew and color Early Earth images remain unfiltered and normal-blend. No image asset was stretched, regenerated, or replaced.

### Copy and content

Passed. Existing Bible text, card content, labels, search behavior, and resource mappings are unchanged. The only new visible copy is `纸张模式`, with matching dynamic accessible labels.

## Comparison history

- Before correction: `.superpowers/sdd/paper-demo-warm-1440x900-v1.png`, `.superpowers/sdd/paper-demo-warm-1180x760-v1.png`, `.superpowers/sdd/paper-demo-warm-media-1440x900-v1.png`.
- After correction: `.superpowers/sdd/paper-demo-warm-1440x900-final.png`, `.superpowers/sdd/paper-demo-warm-1180x760-final.png`.
- Combined source/final evidence: `.superpowers/sdd/paper-demo-comparison-final.png`.
- Focused image comparison used computed-style evidence on one confirmed grayscale asset and two non-grayscale assets because the defect was filtering/classification rather than crop or geometry.

## Intentional constraints / follow-up

- The concept image's dual-translation default, narrower resource library, and Dore engraving are not introduced in this Demo; doing so would change layout/data scope rather than paper styling.
- A formal production rollout, persisted user preference design, complete font asset strategy, or public sharing pass requires separate approval after the Demo is accepted.

## Final result

`passed`

No actionable P0, P1, or P2 findings remain for the approved Demo scope.

---

## Production rollout QA — 2026-07-17

### Visual truth and real targets

- Approved visual truth: `/var/folders/g_/cx_qfcqn1nd45brx4p137xnm0000gn/T/codex-clipboard-3e9245f9-77e7-4dc7-942d-5d572d6b4f49.png`
- Reader: `http://127.0.0.1:5174/` — `One Holy Bible`
- Card workbench: `http://127.0.0.1:5179/` — `OHB Source Locator Workbench`
- Reader captures: `.superpowers/sdd/warm-paper-reader-1440x900.png`, `.superpowers/sdd/warm-paper-reader-1180x760.png`
- Card workbench capture: `.superpowers/sdd/warm-paper-card-workbench-wide.png`
- Same-screen comparison: `.superpowers/sdd/warm-paper-production-comparison.png`

The approved Demo visual language is now the permanent production UI on both workbenches. The former paper-mode button, conditional theme attribute, theme state, and theme storage path are absent.

### Production review

- Typography: passed. Scripture and card reading bodies use the approved Song/Ming serif stack; controls, metadata, filters, and ledger information remain system sans.
- Layout: passed. Reader dock geometry is unchanged and has no horizontal page or toolbar overflow at 1440×900 or 1180×760. The card workbench keeps its real four-column grid, scroll regions, and resize handles.
- Color and hierarchy: passed. Both workbenches use the same 15 warm-paper tokens. Reader text contrast remains at least WCAG AA 4.5:1; the previously measured muted metadata contract is 5.23:1.
- Keyboard focus: passed on the real pages. Selected verse, toolbar button, search input, selected result, normal button, input, textarea, anchor control, link, and resize handle all resolve to the 2px `--focus-halo` plus 5px `--focus-ring` above state shadows.
- Images and PDF: passed. Reader `p011` alone receives the confirmed archival blend in the sampled set; blue `p014` and color `p018` remain `filter: none` / `mix-blend-mode: normal`. Card image and the real PDF iframe also report `filter: none` / `mix-blend-mode: normal`.
- Semantic states: passed. Low, medium, and high risk states remain visually distinct; danger and synchronization colors retain their semantic roles on the warm surfaces.
- Interaction: passed. Real card data and counts loaded from `/api/cards`; selecting results, opening/closing card edit, focusing title/body/anchor controls, and opening the source PDF did not reset the workbench.
- Console: passed. No reader or card-workbench warning/error entries were present during the production QA path.

### Production correction wave

The code-review gate caught and closed three P1-quality gaps before browser sign-off: resize handles were added to the final double-focus rule, ledger text was restored to sans, and the image/PDF regression test was corrected so it must match the target rules before asserting no filter. No browser-discovered P0, P1, or P2 defect remained after the same-screen comparison.

### Intentional P3 constraints

- The UI keeps the existing application density, component geometry, real data, and behaviors; this rollout does not redesign information architecture.
- Only two explicitly allowlisted reader scans may blend into the paper. Color images, evidence images, and PDF pages remain pixel-accurate.
- Existing baseline TypeScript debt and three unrelated reader tests remain outside this visual rollout.

## Final production result

`passed`

Reader and card workbench use the approved permanent warm-paper UI. No actionable P0, P1, or P2 findings remain.
