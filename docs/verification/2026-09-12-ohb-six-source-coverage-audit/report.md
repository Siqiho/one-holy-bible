# OHB 六源覆盖审计（源维度，非整卷 1:1）

- 审计日期：2026-09-12
- 基线：`cursor/ohb-jeremiah-1to1-hold-queue-a460`（约翰 / 创世记 / 诗篇 / 耶利米公开 1:1 已闭合）
- 用户 UI 真源（六标签合计 **55,627**）：

  | UI 标签 | 张数 |
  | --- | ---: |
  | 《综合解读》 | 29,476 |
  | 《圣经研修本》 | 16,270 |
  | 《圣经启导本》 | 9,521 |
  | 《OCR 转文字》 | 254 |
  | 《圣经的故事》 | 98 |
  | 《圣经信息系列》 | 8 |

- 对照面：`public/data/books/*.json`、`local-audit-pack/no-explain-isolation-20260731/`、`local-audit-pack/john-gospel-20260909/`、`src/data/generated/genesisCommentaryResources.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`（`.gitignore` 例外声明了该文件，但未打包）
- 结论：**六标签都能对上仓库字段；公开包 10,410 张零未分类。** 计数/接线没有高置信错误，本轮不改公开包或台账。UI 大数对不上的主因是：本快照只有公开包 + 两份台账 + 创世记稳定注释，看不到本地工作台全库存。唯一整源对齐的是《圣经信息系列》= 8。

## 1. 六标签 → 仓库字段

`Workbench.tsx` 的 `displayableSourceName()` / `commentaryLibraryIdFromLabel()` 是 UI 胶囊与左坞书库的映射点。OCR 判定**先于**综合解读，因此「综合解读·图注」不会算进 CMC。

| UI 标签 | 左坞书库 | `source` / `debugMeta.sourceLabel` | `source_stream` / `debugMeta.sourceStream` | ID 前缀 | 公开包现状 |
| --- | --- | --- | --- | --- | --- |
| 《综合解读》 | `zonghe` | `圣经综合解读·{卷名}` | `cmc-comprehensive-commentary`（创世记隔离行误写成中文标签，见 §2.1） | `cmc-` | 858，全部创世记有解释 CMC |
| 《圣经研修本》 | `yanxiu` | `圣经研修本 {nn}_{卷名}-v3` | `study-bible-commentary-v3` / `study-bible-notes` | `study-bible-` | 9,403 |
| 《圣经启导本》 | **无**（不在 `commentaryLibraryCatalog`） | 台账 `source` 常为 null；`searchText` 尾为 `圣经启导本`；标题含「启导本注释」 | `qidaben-commentary-pilot` | `qidaben-` | 0 |
| 《OCR 转文字》 | 无库（unscoped，各书库都可见） | `image-text-ocr-conversion`（83）/ `visible-image-text-ocr-conversion`（63） | `image-text-ocr-conversion` | `image-text-` | 146 |
| 《圣经的故事》 | **无** | 台账 `source` 常为 null；`searchText` 尾为 `圣经的故事`；标题含「圣经的故事」 | `hurlbut-bible-story-zh-2013` | `hurlbut-` | 0 |
| 《圣经信息系列》 | `xinxi` | `圣经信息系列·创世记1-11章` | `message-genesis-1-11-supplemental` | `message-` | 3 / 8 |

第七个左坞书库 **《研读本圣经》**（`yandu`）在本快照公开包、隔离包、约翰台账、创世记稳定注释中均为 **0**。用户六标签没有它，与仓库库存一致，不是漏计。

接线备注（只报告，不改）：

1. `displayableSourceName()` 没有「启导本 / 圣经的故事」显式分支。本地 UI 能显示这两个标签，说明工作台真源带 `source`/`sourceLabel`；本快照约翰台账这两源的 `source`/`sourceLabel` 为 null，标签只活在 `title` / `searchText`。没有 v4 投影，不能证明公开路径会标错，因此不改 `Workbench.tsx`。
2. 隔离包 508 张创世记 CMC 的 `source_stream` 写成了 `圣经综合解读·创世记`，而不是 `cmc-comprehensive-commentary`。按 `cmc-` ID 仍能正确归入综合解读。历史台账漂移，不重写 508 行。

## 2. 各源计数与对账

### 2.0 快照能看见的集合

| 集合 | 张数 | 六源分解 |
| --- | ---: | --- |
| 公开 `public/data` | **10,410** | 研修本 9,403 + 综合解读 858 + OCR 146 + 信息系列 3 |
| 无解释隔离 | **18,397** | 综合解读 18,387 + 研修本 10 |
| 约翰 `card候选清单` | **1,533** | 综合解读 765 + 研修本 495 + 启导本 267 + 故事 5 + OCR 1 |
| 约翰 placement 孤儿 | **1** | 启导本 `qidaben-john-15-18-p1496-n001` |
| 创世记稳定注释 | **1,625** | 综合解读 866 + 研修本笔记 751 + 信息系列 8 |
| 四集合去重并集 | **30,539** | 综合解读 19,861 + 研修本 10,250 + 启导本 268 + OCR 147 + 信息系列 8 + 故事 5 |
| 隔离 ∩ 公开 | **0** | 约翰 / 创世记 / 诗篇 / 耶利米合同仍在 |

创世记稳定注释的 751 张 `study-note-gen-*` 与公开包 272 张 `study-bible-gen-*` **不是同一套 ID**。并集把它们分开计，所以研修本并集 10,250 = 公开 9,403 + 隔离 10 + 约翰未公开 86 + 创世记 `study-note-*` 751。

### 2.1 《综合解读》29,476

| 证据 | 张数 | 含义 |
| --- | ---: | --- |
| 隔离行自带 extractor `totalResources` / `byBook` 合计 | **28,686** | 65 卷 CMC（**不含创世记**） |
| 其中隔离无解释 | 17,879 | `source_stream=cmc-comprehensive-commentary` |
| 65 卷有解释余量 | 10,807 | extractor − 65 卷隔离 |
| 创世记稳定 CMC | 866 | 公开 858 + 未进公开 8 |
| 创世记隔离无解释 | 508 | stream 误标为中文标签 |
| 约翰台账 CMC | 765 | 与 extractor `John:765` 1:1；156 隔离 + 609 syncable |
| 公开 CMC | 858 | 只留创世记有解释 |
| 快照去重 CMC | 19,861 | 公开 858 + 隔离 18,387 + 约翰有解释 609 + 创世记稳定多出的 7～8 |

**对账：** UI 29,476 − extractor 28,686 = **+790**。这 790 只能解释成「工作台里的创世记综合解读」：extractor 元数据漏了 Gen。790 比创世记稳定 866 少 76、比公开 858 少 68。没有 v4 不能钉死这 68～76 张是被工作台滤掉、还是与隔离 508 有重叠。

若把 28,686 + 866 + 508 硬加，会得到 30,060（比 UI 多 584）。多出的部分是「extractor 有解释但未进本快照台账」与「创世记三套 CMC ID 不完全可加」的重叠噪音，**不能**据此改 UI 或公开包。

缺失的主体是 65 卷有解释 CMC：10,807 − 约翰已入台账 609 = **10,198** 张只活在本地工作台 / 未打包卷级台账。最大余量：路加 ~992、马太 ~928、诗篇 ~837、出埃及 ~494、使徒行传 ~460。

### 2.2 《圣经研修本》16,270

| 集合 | 张数 |
| --- | ---: |
| 公开 | 9,403 |
| 隔离（短引句，创世记轮已撤出公开包） | 10 |
| 约翰台账 | 495（公开 409 = 400 verse + 9 导论；未公开 86） |
| 创世记稳定 `study-bible-notes` | 751（另一套 ID） |
| 快照去重 | 10,250 |
| UI − 快照去重 | **6,020** |

公开 9,403 / 16,270 = **57.8%**，是六个大源里公开覆盖最高的。6,020 张缺失没有卷级台账，不能按卷拆。已 1:1 的公开研修本：约翰 409、创世记 272、诗篇 421、耶利米 658，合计 **1,760**。其余公开 **7,643** 尚未按卷 1:1。

### 2.3 《圣经启导本》9,521

快照只看见约翰：`qidaben-commentary-pilot` 267 + placement 孤儿 1 = **268**。公开 0，隔离 0。

UI − 268 = **9,253（97.2%）缺失**。约翰轮已整类 hold，本轮不抬。按 9,521 / 66 ≈ 144 张/卷，密度说得通，但除约翰外没有任何台账可对。

### 2.4 《OCR 转文字》254

| 集合 | 张数 | 政策 |
| --- | ---: | --- |
| 公开 | 146 | 除创世记 1 张 keep 外，整类 hold-as-class |
| 约翰台账 | 1 | 已从公开包撤下 |
| 隔离 | 0 | |
| 快照去重 | 147 | |
| UI − 快照 | **107** | 含创世记轮撤下的 3 张（申 / 士 / 箴），其余无台账 |

公开 146 的 `source` 只有两种，都能被现有 OCR 规则吃进《OCR 转文字》：`image-text-ocr-conversion` 83、`visible-image-text-ocr-conversion` 63。箴言 33、雅歌 11、诗篇 10 是公开 OCR 最多的未审卷。

### 2.5 《圣经的故事》98

约翰台账 `hurlbut-bible-story-zh-2013` **5** 张，全部 `temporarily_unsynced`，公开 0。UI − 5 = **93（94.9%）缺失**。Hurlbut 2013 中文子集 98 张作为工作台全库存是合理量级，但本快照没有其他卷的故事台账。

### 2.6 《圣经信息系列》8

**唯一整源对齐。** `genesisCommentaryResources.json` 的 `message-genesis-1-11-supplemental` = 8 = UI。公开 3：

- `message-gen-4-1-26-jealousy-gratitude`（公开）
- `message-gen-5-1-8-22-eye-of-storm`（公开）
- `message-gen-10-1-11-31-hope-strength`（公开）
- 其余 5 张留在稳定注释，未进 v0.1.0（含超长 `message-gen-2-4-3-24-expelled-from-eden`）

缺失 = 0。不改。

## 3. 覆盖矩阵

分母是用户 UI 张数。**公开** = 在 `public/data`。**快照 hold** = 在隔离 / 约翰 hold / 稳定注释且不在公开包。**缺失** = UI − 快照能指认的唯一 ID。

| 源 | UI | 公开 | 公开% | 快照 hold | hold% | 缺失 | 缺失% | 已审公开面 | 剩余风险 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 综合解读 | 29,476 | 858 | 2.9% | 19,003 | 64.5% | 9,615 | 32.6% | 创世记有解释 CMC keep；其余 CMC 隔离或不进公开包 | 65 卷有解释 CMC 无卷级台账；隔离 18,387 继续 ledger-only |
| 圣经研修本 | 16,270 | 9,403 | 57.8% | 847 | 5.2% | 6,020 | 37.0% | 约翰 / 创世记 / 诗篇 / 耶利米 1,760 张 | 公开未审 7,643；最大卷：路加 558、使徒行传 483、以赛亚 475、马太 453 |
| 圣经启导本 | 9,521 | 0 | 0% | 268 | 2.8% | 9,253 | 97.2% | 约翰整类 hold | 除约翰外无台账；试验源 + OCR 残片，无 PDF 不抬 |
| OCR 转文字 | 254 | 146 | 57.5% | 1 | 0.4% | 107 | 42.1% | 创世记 1 keep；约翰 1 hold；诗篇 10 整类不改 | 公开 145 张无卷级台账，继续 hold-as-class |
| 圣经的故事 | 98 | 0 | 0% | 5 | 5.1% | 93 | 94.9% | 约翰 5 hold | 其余 93 无台账 |
| 圣经信息系列 | 8 | 3 | 37.5% | 5 | 62.5% | 0 | 0% | 创世记 3 keep | 5 张稳定长篇未进公开包；无跨卷余量 |

已完成 1:1 的**卷**（不是源）：

| 卷 | 公开现状 | 源维度结论 |
| --- | --- | --- |
| 约翰 | 409 研修本 | CMC / 启导本 / 故事 / OCR 全部 hold |
| 创世记 | 1,134 = CMC 858 + 研修本 272 + OCR 1 + 信息 3 | 隔离泄漏已清；信息系列 8 张库存闭合 |
| 诗篇 | 431 = 研修本 421 + OCR 10 | OCR 整类 hold，本轮不改 |
| 耶利米 | 658 研修本 | 公开 OCR 0；隔离 CMC 1,006 ledger-only |

公开研修本未审卷（按公开张数，前十）：路加 558、使徒行传 483、以赛亚 475、马太 453、马可 260、申命记 244、罗马书 230、出埃及记 209、箴言 199、以西结 186。下一高价值公开面仍是**路加**（与耶利米轮结论一致）。

## 4. 本轮是否改代码

**不改。** 公开包前缀与 `source` 1:1（`cmc-` 858、`study-bible-` 9,403、`image-text-` 146、`message-` 3），没有第七源、没有未分类卡、隔离 ∩ 公开仍为 ∅。UI 与快照的差额都能用「缺工作台 v4 / 缺 65 卷级台账」解释，不能在无真源条件下补库存或改接线。

## 5. 验证

已跑（本快照可执行）：

- `vitest run src/data/sixSourceCoverageAudit.test.ts` 及约翰 / 创世记 / 诗篇 / 耶利米公开审计 + `publicData` / `publicBibleData`：**7 files / 59 tests 通过**。
- `npm run validate:public-data`：66 卷、公开文字卡 **10,410**、无不安全串。
- 锁计数：UI 六源合计 55,627；公开分源 9,403 / 858 / 0 / 146 / 0 / 3；隔离 18,397；约翰 1,533；信息系列 8=8；隔离 ∩ 公开 = ∅。

整仓 `npm test` 仍会因缺本地资源失败（与前几轮相同，**不是本轮引入**）：

- 无 `workbenchSyncedResources-v4.json`
- 无 `src/assets/resources/genesis/images/cmc-01`
- 无 `public/resources/dore/`
- 无 `comprehensiveCommentaryResources.json`

本报告只依据仓库快照。未读取 Mac `Resources/`，未假设 Edit API 可用，未把 `/Users` 路径写入公开包。
