# One Holy Bible Design Context

## Scene

A reader is studying on a Mac in a quiet room, switching between scripture and notes for long stretches. The app should feel like a refined local desk: warm paper, calm ink, deliberate controls, and enough contrast to support concentrated reading.

## Color Strategy

Restrained product palette. Use tinted neutrals and one low-chroma accent for selected scripture and primary state.

- Canvas: warm off-paper, not pure white.
- Reading surface: slightly lighter paper tone.
- Text: softened near-black with warm tint.
- Muted labels: cool gray-brown.
- Accent: subdued ochre or brass for selected verse and active focus.
- Secondary cool accent: muted blue-gray only for search/focus support.

Use OKLCH in CSS where possible. Avoid full black, full white, high-chroma blue-purple, gradient text, glassmorphism, and side-stripe accent borders.

## Typography

Use native/system UI fonts for controls. Scripture can remain in the same family but needs larger size, generous line-height, and clear verse-number treatment. Chinese and English columns should be comfortable for long reading, with no fluid viewport-scaled text.

## Layout

Reader-first page with a quiet left spine and a right margin:

- Center folio: chapter title, optional Doré plate, then bilingual verse rows.
- Right margin: verse-linked cards that expand in place; thumbnail strip and a draggable split when a card is open.
- Left spine: collapsed by default; expands to book, chapter, and verse pickers.
- Workbench remains a secondary desk for docks, search, and card editing.

Avoid nested cards. Cards are allowed for individual resource items only.

## Components

- Toolbar buttons: compact icon/text controls with clear hover, active, and focus states.
- Search: input with icon and floating results menu.
- Verse buttons: full-width text buttons that read like scripture rows, not form controls.
- Resource cards: small document snippets with subtle borders, quiet headings, and distinct media placeholders.
- Empty states: brief, calm, and useful.

## Motion

Use short 150-200 ms transitions for hover, focus, selected states, and popover appearance only. No decorative page-load animation.
