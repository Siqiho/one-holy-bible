# Bible Encyclopedia Ingestion Verification

Date: 2026-08-01

## Scope

- Source PDF: `/Users/simon/OHB/圣经百科辞典.pdf`
- Approved scope: the 11 user-selected encyclopedia categories.
- Development target: `/Users/simon/OHB/one-holy-bible`
- Public repository publishing was not requested and was not performed.

## OCR Evidence

- Queue ledger: 975 rows, 812 unique base PDF pages, 163 duplicate rows.
- Continuation/boundary coverage: 261 additional pages.
- Final Apple Vision profile: `ocr-cache-columns-v3`, 320 DPI, explicit left/right column labels.
- Manifest: 1073 requested, 1073 succeeded, 0 failed.
- Cache audit: 1073 JSON files, 82,391 OCR rows, 0 missing/invalid column labels, 0 cross-column boxes wider than 0.62 page width.
- Nine mid-page alphabet dividers were detected and ordered as independent horizontal two-column bands. The page-641 `爬虫` regression was rechecked against the rendered source page and in the Reader.

## Entry And Anchor Evidence

- Raw selected inventory: 1653 entries.
- Eligible after explicit category exclusions/corrections: 1641 entries.
- Structurally accepted candidates: 1274 entries.
- Missing/QA inventory ledger: 367 entries in `/Users/simon/OHB/tmp/baike-production/inventory-missing.json`.
- Trustworthy canonical anchors: 1013 entries.
- No trustworthy anchor: 261 entries retained in `/Users/simon/OHB/tmp/baike-production/anchors-qa.json`.
- Rejected low-confidence/invalid reference fragments: 2.
- Reader payload: 1013 unique resource IDs and 10,424 verse links.

Final Reader category counts:

| Category | Imported |
| --- | ---: |
| 神名与三一（上帝/基督/圣灵） | 32 |
| 重要人名族名 | 324 |
| 重要地名 | 21 |
| 圣所圣物 + 主要节期礼仪 | 38 |
| 典故成语 + 格言 | 212 |
| 高频教义词 | 83 |
| 全部新旧约人名 | 363 |
| 全部新旧约地名 | 132 |
| 度量货币器物 | 80 |
| 常见动植物 | 52 |
| 犹太史/初期教会史 | 21 |

Category totals overlap intentionally because important people/places can also belong to the complete people/place sets.

## Automated Verification

- `python3 -m unittest -v test_run_ocr.py test_encyclopedia_pipeline.py`: 23 passed.
- `npm test -- --reporter=dot`: 33 files, 411 tests passed.
- `npm run build`: TypeScript checks and Vite production build passed.
- `git diff --check`: no whitespace errors in the tracked diff.
- Generated payload validation: 1013 resources, 1013 unique IDs, all 11 category counts nonzero, all primary anchors present in canonical verse lists.

## Reader Verification

- Runtime: Vite PID 18312, started 2026-08-01 16:57:56 CST.
- URL: `http://127.0.0.1:5182/`
- Surface: Codex in-app browser.
- The quick category bar displays only `注释 / 媒体 / 百科 / 笔记`; no `字典` label remains.
- At `Gen.1.1`, the Reader displayed 10 encyclopedia cards with source label `圣经百科辞典`.
- At `1Chr.2.25`, the Reader displayed `阿连` with the expected dictionary body and source label.
- The corrected `爬虫` card no longer contains the adjacent idol-entry text found during visual QA.
- Browser console error count after final reload: 0.

## Residual Limits

- This is OCR-derived semantic content, not a manually proofread transcription. Character-level OCR errors can remain in accepted bodies and titles.
- The 367 unmatched/structurally rejected inventory rows and 261 no-anchor entries are deliberately not imported. Their ledgers are the continuation point for later manual correction or targeted OCR, rather than silent data loss.
