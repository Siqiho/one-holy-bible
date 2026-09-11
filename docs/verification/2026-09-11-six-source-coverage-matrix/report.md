# 信息源覆盖矩阵（六类全库口径对账）

- 复核日期：2026-09-11
- 对照快照：`cursor/ohb-matthew-1to1-hold-queue-1c17`（约翰 / 创世记 / 诗篇 / 耶利米 / 路加 / 使徒行传 / 马太已审）
- 用户硬要求：OHB 卡片审核除按书卷 1:1 外，必须覆盖全部信息源并核对数量口径
- 应用对照面：`public/data/books/*.json`（公开 v0.1.0，10,339 张文字卡）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/card候选清单.jsonl`（18,397）
- 约翰卷级台账：`local-audit-pack/john-gospel-20260909/`（card 1,533 + 1 孤儿）
- 创世记稳定注释：`src/data/generated/genesisCommentaryResources.json`（1,625）
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：六类源的标识都能在仓库内定位。与用户全库数 1:1 对齐的只有《圣经信息系列》8。其余五类都是 Edit/Resources 真源缺口，不是漏审，也不按全库数补造公开卡。没有任何一类在本快照里多算超过用户全库数。

## 1. 标识字段

优先用 `id` / `commentary_key` 前缀；冲突时再看 `source`、`debugMeta.sourceLabel` / `debugMeta.sourceStream`、台账 `source_stream`。

| 用户源 | `id` / `commentary_key` | 公开包 `source` | `debugMeta` / 台账 `source_stream` |
| --- | --- | --- | --- |
| 《综合解读》 | `cmc-*` | `圣经综合解读·创世记`（仅创世记 858） | 主流 `cmc-comprehensive-commentary`；隔离创世记 508 张把中文源名写进了 `source_stream` |
| 《圣经研修本》 | 公开 / 约翰 / 隔离：`study-bible-*`；创世记稳定注释：`study-note-*` | `圣经研修本 {卷}-v3` | 约翰台账 `study-bible-commentary-v3`；隔离 10 张用中文研修本卷名；创世记稳定注释 `study-bible-notes` |
| 《圣经启导本》 | `qidaben-*` | 公开包无 | `qidaben-commentary-pilot` |
| 《OCR 转文字》 | `image-text-*` | `image-text-ocr-conversion` 83 + `visible-image-text-ocr-conversion` 63 | 约翰台账 `image-text-ocr-conversion` |
| 《圣经的故事》 | `hurlbut-*` | 公开包无 | `hurlbut-bible-story-zh-2013` |
| 《圣经信息系列》 | `message-*` | `圣经信息系列·创世记1-11章` | `message-genesis-1-11-supplemental` |

公开包现计 10,339 = 研修本 9,332 + CMC 858 + OCR 146 + 信息系列 3。没有启导本，没有故事卡。隔离 ∩ 公开 = ∅。马太本轮又从公开研修本撤下 23 张。六源标识口径不变，不改写映射。

## 2. 数量对账

| 用户源 | 用户全库 | 公开包 | 隔离包 | 约翰 card 台账 | 创世记稳定注释 | 本快照可见并集 | 对账 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 综合解读 | 29,476 | 858 | 18,387 | 765（156 与隔离重合） | 866（858 已在公开包，1 与隔离重合） | **19,861** | **缺口** 9,615 |
| 圣经研修本 | 16,270 | 9,332 | 10 | 495（409 已在公开包） | 751（`study-note-*`，另一套本地编码） | **9,428**（只计 `study-bible-*`）；若加 `study-note-*` 则 10,179 | **缺口** |
| 圣经启导本 | 9,521 | 0 | 0 | 267 + 1 孤儿 | 0 | **268** | **缺口** 9,253 |
| OCR 转文字 | 254 | 146 | 0 | 1（已撤出公开包） | 0 | **147** | **缺口** 107 |
| 圣经的故事 | 98 | 0 | 0 | 5 | 0 | **5** | **缺口** 93 |
| 圣经信息系列 | 8 | 3 | 0 | 0 | **8**（含公开 3） | **8** | **一致** |

并集去重口径：公开 ∪ 隔离 ∪ 约翰 card ∪ 创世记稳定注释，按 `id` / `commentary_key`。研修本两行编码不强制合并，因为 `study-note-*` 不是公开 `study-bible-*` 的 1:1 投影。

### 2.1 综合解读缺口说明

隔离包首行元数据带 CMC 抽取器 `totalResources=28,686`（`byBook` 65 卷，**没有创世记**）。创世记稳定注释另有 866。两者不能直接相加成用户 29,476：28,686 + 866 = 29,552，反而比用户数多 76，只能当作另一版抽取口径，不能当多算，也不能当补齐。

本快照能 1:1 点名的综合解读只有：公开已解释创世记 858、隔离无解释 18,387、约翰台账独有 609、创世记稳定注释独有 7。

### 2.2 没有多算

六类源在任一可见面上的计数都不超过用户全库数。信息系列若把公开 3 与稳定注释 8 相加会假性多算；正确口径是稳定注释 8 包含已 keep 的 3 张。

## 3. 已审六卷的 keep / hold / fix 是否覆盖该类

| 源 | 约翰 | 创世记 | 诗篇 | 耶利米 | 路加 | 本类是否已被策略覆盖 |
| --- | --- | --- | --- | --- | --- | --- |
| 综合解读 | 156 hold（隔离）+ 609 ledger-only；公开 0 | 858 keep（有解释）；506 hold 撤出公开 | 1,610 hold / ledger-only；公开 0 | 1,006 hold / ledger-only；公开 0 | 144 hold / ledger-only；使徒行传 543 / 马太 143 hold / ledger-only；公开 0 | **是**。有解释才 keep；无解释一律 hold / ledger-only，不抬进公开包 |
| 研修本 | 公开 409 keep/fix；82 宽范围 hold；4 损坏 hold | 272 keep；1 fix | 421 keep/fix；15 hold | 658 keep/fix；14 hold | 531 keep/fix；27 hold；使徒行传 462 keep/fix、21 hold；马太 430 keep/fix、23 hold | **是**。已审卷按 1:1 做 keep/fix/hold；未审卷仍在公开包，等待后续书卷轮 |
| 启导本 | 267+1 全部 hold | 沿用约翰 leftover hold | 沿用 | 沿用 | 沿用；路加公开 0，无路加启导本台账 | **是**。整类 hold，公开包 0 |
| OCR | 1 hold（已撤） | 1 keep（`image-text-01-创世记-codex-pdf-p102-img057`）；另 3 张跨卷损坏 hold | 10 hold-as-class（无台账） | 本卷 0；跨卷继续 hold-as-class | 本卷 0；跨卷 145 张无台账继续 hold-as-class | **是**。有卷级台账才分源；无台账则整类 hold-as-class。公开 146 = 1 keep + 145 hold-as-class |
| 圣经的故事 | 5 hold | 沿用 | 沿用 | 沿用 | 沿用；路加公开 0 | **是**。整类 hold，公开包 0 |
| 信息系列 | 0 | 3 keep（公开）/ 8 在稳定注释 | 0 | 0 | 0 | **是**。用户 8 张全部落在创世记稳定注释；3 张已 keep 进公开包 |

路加本轮只触及研修本公开面 + 路加隔离 CMC。其余四类在路加上的公开交集为 0，策略是沿用既有 hold，不新抬、不新改。

未审公开研修本仍在包内，它们的 keep/fix/hold 要等后续书卷轮，不在本矩阵里假装已经 1:1 审完。马太已在路加 / 使徒行传之后收束（430 keep/fix，23 hold）。下一卷建议：**以赛亚**（公开研修本 475，隔离 CMC 947，公开 OCR 0）。备选马可（260 / 隔离 280）。六源映射口径不变。

## 4. 对账收束

> 用户六类全库数是 Edit/Resources 真源口径。本快照能 1:1 对上的只有：信息系列 8（创世记稳定注释）、约翰台账五类子集、隔离 CMC 18,387、公开已发布子集。缺口不是漏审，而是本仓库没有其余卷的专包 / 工作台 v4 / 全库 CMC 投影。没有台账证据的源继续 hold，不按用户全库数补造公开卡。

书卷级 1:1 报告：

- `docs/verification/2026-09-12-john-gospel-1to1-review/report.md`
- `docs/verification/2026-09-11-genesis-1to1-hold-queue/report.md`
- `docs/verification/2026-09-11-psalms-1to1-hold-queue/report.md`
- `docs/verification/2026-09-11-jeremiah-1to1-hold-queue/report.md`
- `docs/verification/2026-09-11-luke-1to1-hold-queue/report.md`
- `docs/verification/2026-09-11-acts-1to1-hold-queue/report.md`
- `docs/verification/2026-09-11-matthew-1to1-hold-queue/report.md`
