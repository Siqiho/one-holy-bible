# 俄巴底亚书 1:1 复核与隔离 CMC 台账分源判定

- 复核日期：2026-09-12
- 基线：`cursor/ohb-hag-jonah-nah-1to1-hold-queue-da2c`（哈该书 / 约拿书 / 那鸿书已闭合）
- 台账包：`local-audit-pack/john-gospel-20260909/`
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：隔离 ∩ 公开仍为 ∅。哈该书 / 约拿书 / 那鸿书收束后，本跑按指定下一卷展开俄巴底亚书（公开研修本 13，隔离 CMC 14，公开 OCR 0）。无整卡 unrestorable hold；已最小修补 7 张高置信引号 / OCR / 表倾倒 / 中截尾句。隔离 CMC 14 张继续 ledger-only。本卷无公开 OCR。六源映射口径不改。

## 1. 范围与方法

判定口径与哈该书 / 约拿书 / 那鸿书 / 马太相同：keep / fix / hold。不改六源标识，不抬隔离 CMC，不补造无 PDF 原文。不假设 Mac 本地 `Resources/` 仍可访问。

选俄巴底亚书：那鸿书报告已把它列为下一未审短卷研修本面（公开 13）。玛拉基书为本跑指定第二卷；同跑并续展其余最短未审卷。

## 2. 隔离合同

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同** |
| 隔离 CMC `cmc-obad-*` | 14 | **hold / ledger-only**。抽样仍是经文残句（`cmc-obad-1-2` =「我使你——以东在列国中为最小的，被人大大藐视。」，`cmc-obad-1-3` =「住在山穴中、居所在高处的啊，你因狂傲自欺，心里说：谁能将我拉下地去呢？」），不抬进公开包 |
| 那鸿书隔离 CMC | 31 | 继续 hold |
| 约翰 leftover OCR | 1 | 未回潮 |

## 3. 俄巴底亚书公开包 1:1

复核前：13 = 研修本 13。复核后：13 = 研修本 13。

| 源 | 复核前 | 复核后 | 判定 |
| --- | ---: | ---: | --- |
| 研修本 verse / 导论 | 13 | 13 | 主体 **keep**；0 **hold**；7 **fix** |
| OCR | 0 | 0 | 本卷无公开 OCR；跨卷继续 1 keep + 145 hold-as-class |
| CMC | 0 | 0 | 隔离 14 继续 hold |

公开锚点全部落在合法 `Obad.章.节`。导论保留 8 张；作者卡删「他世纪）亚哈的家宰」中截尾，关键主题重排交错节号，写作目的闭 21 节，不整卡撤下。

### 3.1 已 hold（0）

本卷没有无源就不能复原的整卡。作者卡中截、关键主题交错、15 节图表尾都落在完整段落后或可用卡内残片唯一重排，按马太口径删尾 / 重排保留。

### 3.2 已 fix（7）

只做和修闭引号、上下文唯一 OCR、以及「保留完整段落、删表倾倒 / 中截尾句」。不补缺失段落。

#### 删表倾倒 / 中截尾句（4）

| ID | 问题 | 判定 |
| --- | --- | --- |
| `study-bible-obad-15-p005-n014` | 「另见1356页图表」倾倒 | **fix**：留到见摩5:18-20注 |
| `study-bible-obad-intro-p001-n001` | 「他世纪）亚哈的家宰」中截 | **fix**：留名字释义完整段，删残尾 |
| `study-bible-obad-intro-p001-n004` | 「国度（21」中截 | **fix**：拈阄；敌对；21节 |
| `study-bible-obad-intro-p002-n005` | 第 2–5 条节号交错 | **fix**：重接 1-9 / 15 / 17-21 / 21 节 |

#### 高置信 OCR / 闭引号（节选）

| 串 | 还原 | 例 |
| --- | --- | --- |
| `所喝的是 '` / `（"你们"喝了` | 所喝的是"杯" / （"你们"）喝了 | `16` |
| `一些解救者），` / `统治.将要` | 一些解救者"）， / 统治将要 | `21` |
| `它福气` / `《〈旧约》` | 它的福气 / 《〈旧约〉 | 救恩历史 |

和修引号只在译词已经完整时闭合。本卷无整卡 unrestorable hold。

其余公开研修本卡：俄巴底亚书锚点合法，短交叉引用或完整注释可读。PDF 点号连接仍普遍存在，但不改变释义，**本轮不批量改写**。

## 4. 六源口径

本轮不减少公开研修本。与玛拉基书合计后，公开研修本仍计研修本面；犹大书另撤 2 张 unrestorable TOC 残卡后，公开研修本现计 **9,090**；公开文字卡 **10,097**。俄巴底亚书隔离 14 继续 ledger-only。公开 OCR 146 不变（1 keep + 145 hold-as-class）。标识映射不改写。

## 5. 下一卷

俄巴底亚书已在本跑收束。同跑已续展**玛拉基书**（公开研修本 20，公开 OCR 2 继续 hold-as-class），并继续最短未审卷约翰二书 / 约翰三书 / 腓利门书 / 犹大书。见同目录相邻报告。

## 6. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts scripts/generatePublicBibleData.test.mjs`
- `vitest run` 俄巴底亚书 / 玛拉基书及后续短卷 / `publicData` / `publicBibleData`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、公开文字卡 10,097、无不安全串。
- `node scripts/validatePublicRepository.mjs`：通过。
- 原始输出见同目录 `validate.txt`。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地 `App.tsx` 不走 `loadPublicBook("Obad")`，因此无法在本环境用阅读页点开这些公开卡。对照与修补都落在公开数据包和台账 JSONL。

GitHub `verify` 全量仍会因本快照缺创世记资源 / v4 / `rg` 失败；失败面不读俄巴底亚书公开包，不补造真源。
