# OHB Reader Return / 回流待复核 Verification

## Date
2026-07-14

## Implementation summary
- New `syncStatus: reader_returned` for OHB reader deletes only
- Edit UI tile「高风险」→「回流/待复核」
- 161 former high-risk cards migrated to `temporarily_unsynced` (未同步)
- Sync script excludes `temporarily_unsynced` and `reader_returned`
- OHB delete copy: 删除并退回待复核

## Automated tests
- Edit: 15 files, **175/175** passed
- OHB focused: **131/131** passed (`workbenchSyncedResources`, `Workbench`, `App`, `syncWorkbenchResources`)

## Live Edit API summary (post-migration)
| Metric | Value |
|---|---|
| total | 20769 |
| not_ready (images) | 2709 |
| syncable | 10963 |
| temporarily_unsynced (未同步) | **7097** (= 6936 + 161) |
| reader_returned (回流/待复核) | **0** (no deletes yet) |
| high-risk cards | 161, all `temporarily_unsynced` |
| OHB selected resources (v4) | **13672** |

## Payload
`workbenchSyncedResources-v4.json` regenerated:
- generatedAt: 2026-07-14T11:21:36.969Z
- selected total 13672, excluded temporarily_unsynced 7097

## Manual smoke checklist
1. [x] Stats: 未同步 7097, 回流/待复核 0, 已同步 13672
2. [ ] OHB delete a workbench card → appears only under 回流/待复核 (user should confirm in UI)
3. [ ] 恢复同步 on 1:1 card returns it to OHB
4. [ ] OHB edit stays under 已编辑, not 回流
