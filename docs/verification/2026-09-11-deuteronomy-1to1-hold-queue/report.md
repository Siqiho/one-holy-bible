# 申命记 1:1 复核与隔离 CMC 台账分源判定

- 复核日期：2026-09-11
- 基线：`cursor/ohb-isaiah-1to1-hold-queue-8a93`（约翰 / 创世记 / 诗篇 / 耶利米 / 路加 / 使徒行传 / 马太 / 以赛亚 / 马可已闭合）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：隔离 ∩ 公开仍为 ∅。马可已闭合后，下一高价值公开面按用户优先卷比较：申命记公开研修本 244，罗马书 230，箴言 199。已从公开申命记撤下 11 张无法复原的研修本卡，并最小修补 50 张高置信引号 / OCR / 表倾倒。隔离 CMC 684 张继续 ledger-only。本卷 6 张公开 OCR 无卷级台账，继续 hold-as-class，不新抬。六源映射口径不改。

## 1. 范围与方法

只依据本仓库快照，不假设 Mac 本地 `Resources/` 或 Edit API 仍可访问。

判定口径与约翰 / 创世记 / 诗篇 / 耶利米 / 路加 / 使徒行传 / 马太 / 以赛亚 / 马可 1:1 相同：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒 / 中截尾句。
- **hold**：中截 / 表倾倒 / 乱码到无源 PDF 不能复原。

### 为何选申命记

用户本轮优先罗马书 / 申命记 / 箴言中公开研修本最多的一卷。三卷都没有卷级台账：

| 卷 | 公开研修本 | 公开 OCR | 隔离 CMC | 卷级台账 |
| --- | ---: | ---: | ---: | --- |
| **申命记** | **244** | **6** | **684** | 无 |
| 罗马书 | 230 | 1 | 113 | 无 |
| 箴言 | 199 | 33 | 673 | 无 |

选申命记是因为：

1. 它是优先三卷里最大的未审公开研修本面（244 > 罗马 230 > 箴言 199）。
2. 隔离 CMC 684 足以复核「ledger-only、不抬进公开包」合同。
3. 罗马书（230 / 隔离 113）为本跑提前收束后的第二卷。

撒母耳记上公开研修本 273 更大，但不在本轮优先三卷内，不展开。

## 2. 隔离合同

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同** |
| 隔离 CMC `cmc-deut-*` | 684 | **hold / ledger-only**。抽样仍是经文残句，不抬进公开包 |
| 马可隔离 CMC | 280 | 继续 hold |
| 以赛亚隔离 CMC | 947 | 继续 hold |
| 约翰 leftover OCR | 1 | 未回潮 |

## 3. 申命记公开包 1:1

复核前：250 = 研修本 244 + OCR 6。复核后：239 = 研修本 233 + OCR 6。

| 源 | 复核前 | 复核后 | 判定 |
| --- | ---: | ---: | --- |
| 研修本 verse / 导论 | 244 | 233 | 主体 **keep**；11 **hold**；50 **fix** |
| OCR | 6 | 6 | 无卷级台账，**hold-as-class**，不新抬、不新改 |
| CMC | 0 | 0 | 隔离 684 继续 hold |

公开锚点全部落在合法 `Deut.章.节`。导论保留 7 张（原 9，撤下条约结构表倾倒卡与写作目的/背景搅乱卡）。

### 3.1 已 hold（11）

正文中截、主题/年表倾倒、和修引号吞掉后文，或乱码到无源 PDF 不能最小复原：

| ID | 锚点 | 问题 |
| --- | --- | --- |
| `study-bible-deut-1-6-p006-n012` | `Deut.1.6` | 「他与时候」无法复原 |
| `study-bible-deut-5-11-p015-n088` | `Deut.5.11` | 「归给上帝（就像」中截 |
| `study-bible-deut-9-7-p020-n133` | `Deut.9.7` | 「坐驗奈：想製以聲烈人野雙熱」乱码 |
| `study-bible-deut-12-15-p024-n179` | `Deut.12.15` | 「最黃奶除：？在氣處德」乱码 |
| `study-bible-deut-19-13-p031-n282` | `Deut.19.13` | 「那里的恶……除掉"」中截 |
| `study-bible-deut-21-1-p032-n318` | `Deut.21.1` | 「应许之地被玷」中截 |
| `study-bible-deut-23-17-p035-n265` | `Deut.23.17` | 和修「神庙娼妓」吞掉后文 +「严格禁止」中截 |
| `study-bible-deut-26-12-p037-n352` | `Deut.26.12` | 和修引号吞掉后文 +「见本书21:18-21」中截 |
| `study-bible-deut-29-18-p042-n309` | `Deut.29.18` | 「以算祖众包勞灭準」乱码 |
| `study-bible-deut-intro-p001-n003` | `Deut.1.5` | 「右表概括了古代条约的结构」表倾倒 |
| `study-bible-deut-intro-p002-n005` | `Deut.6.1` | 写作目的/伦理段搅乱 +「上帝百的福祉」无法复原 |

不作文内补全。补「时候 / 玷污 / 禁止」会在无 PDF 条件下伪造研修本原文。

### 3.2 已 fix（50）

只做和修闭引号、上下文唯一 OCR、以及「保留完整段落、删表倾倒 / 中截尾句」。不补缺失段落。

#### 删表倾倒 / 中截尾句（2）

| ID | 问题 | 判定 |
| --- | --- | --- |
| `study-bible-deut-29-29-p042-n402` | 尾垃圾 `规改邊有隻準間金業器` | **fix**：保留到「见30:11-14）。」 |
| `study-bible-deut-intro-p003-n007` | `《《圣概述》` 乱书名 | **fix**：删尾句 |

#### 高置信 OCR / 闭引号（节选）

| 串 | 还原 | 例 |
| --- | --- | --- |
| `旧日约` | 旧约 | 导论作者 |
| `迎南` | 迦南 | `deut-6-4`、`deut-7-5`、`deut-8-14`、`deut-12-4`、`deut-27-9` |
| `盼咐` / `盼附` | 吩咐 | `deut-13-8`、`deut-15-12` |
| `诚命` | 诫命 | `deut-1-2`、`deut-5-18`、`deut-5-21` |
| `进人` | 进入 | `deut-8-7`、`deut-27-9` |
| `陷人` | 陷入 | `deut-7-1` |
| `重蹈辙` | 重蹈覆辙 | 导论主题 |
| `避守` | 遵守 | `deut-4-1` |
| `睹示` | 暗示 | `deut-5-19` |
| `觖乏` | 缺乏 | `deut-6-16` |
| `术柜` | 木柜 | `deut-10-11` |
| `注祥` | 注释 | `deut-10-22` |
| `援受` | 接受 | `deut-27-15` |
| `迎得` | 迦得 | `deut-33-21` |
| `亚打` / `亚扣` | 亚扪 | `deut-2-5` |
| `初熟士产` | 初熟土产 | `deut-26-2` |
| `重中` | 重申 | `deut-27-9` |
| `第了节` | 第2节 | `deut-8-7` |
| `路48` | 路4:8 | `deut-6-13` |
| `干早` | 干旱 | `deut-1-7` |

和修引号只在译词已经完整时闭合，例如 `低地`、`亚舍拉`、`宝贵的子民`、`邻舍`、`心里还庆幸`、`使你的心受割礼`。被和修引号吞掉后文、分界不唯一的卡（如 `deut-23-17`、`deut-26-12`）**hold**，不伪造闭引号后的原文。

其余公开研修本卡：申命记锚点合法，短交叉引用或完整注释可读。PDF 点号连接仍普遍存在，但不改变释义，**本轮不批量改写**。

## 4. 六源口径

不改标识字段，也不按用户全库数补造卡。本轮只减少公开研修本 11 张：

| 源 | 用户全库 | 公开（本轮后） | 对账 |
| --- | ---: | ---: | --- |
| 综合解读 | 29,476 | 858 | 缺口；申命记隔离 684 ledger-only |
| 研修本 | 16,270 | **9,287** | 缺口；本卷 233 keep/fix + 11 hold |
| 启导本 | 9,521 | 0 | 整类 hold |
| OCR | 254 | 146 | 1 keep + 145 hold-as-class；本卷 6 张无台账继续 hold-as-class |
| 圣经的故事 | 98 | 0 | 整类 hold |
| 信息系列 | 8 | 3 | 稳定注释 8 一致 |

完整矩阵仍见 `docs/verification/2026-09-11-six-source-coverage-matrix/report.md`。标识映射不改写。

## 5. 下一卷

申命记提前收束后，本跑已按优先卷展开**罗马书**（公开 230→214，隔离 CMC 113 ledger-only）。见 `docs/verification/2026-09-11-romans-1to1-hold-queue/report.md`。

## 6. 验证

已跑：

- `vitest run src/data/deuteronomyPublicCardAudit.test.ts src/data/romansPublicCardAudit.test.ts src/data/isaiahPublicCardAudit.test.ts src/data/markPublicCardAudit.test.ts src/data/matthewPublicCardAudit.test.ts src/data/lukePublicCardAudit.test.ts src/data/actsPublicCardAudit.test.ts src/data/jeremiahPublicCardAudit.test.ts src/data/psalmsPublicCardAudit.test.ts src/data/genesisPublicCardAudit.test.ts src/data/johnGospelPublicCardAudit.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`
- `node scripts/validatePublicRepository.mjs`

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地 `App.tsx` 不走 `loadPublicBook("Deut")`，因此无法在本环境用阅读页点开这些公开卡。对照与修补都落在公开数据包和台账 JSONL。

GitHub `verify` 全量仍会因本快照缺创世记资源 / v4 / `rg` 失败；失败面不读申命记公开包，不补造真源。
