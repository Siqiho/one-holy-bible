# 利未记 1:1 复核与隔离 CMC 台账分源判定

- 复核日期：2026-09-12
- 基线：同跑提多书 / 帖撒罗尼迦后书 hold-queue
- 台账包：`local-audit-pack/john-gospel-20260909/`
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：隔离 ∩ 公开仍为 ∅。帖撒罗尼迦后书收束后继续利未记（公开研修本 30，隔离 CMC 622，公开 OCR 6）。无整卡 unrestorable hold；已最小修补 19 张高置信引号 / OCR / 表倾倒 / 中截尾句。隔离 CMC 622 张继续 ledger-only。本卷 6 张公开 OCR 无卷级台账，继续 hold-as-class，不撤不改。六源映射口径不改。

## 1. 范围与方法

判定口径与提多书 / 哈该书 / 马太相同：keep / fix / hold。不改六源标识，不抬隔离 CMC，不补造无 PDF 原文。不假设 Mac 本地 `Resources/` 仍可访问。

选利未记：犹大书已把它列为较大未审短面（研修本 30 / OCR 6），足以复核「无台账则 hold-as-class」合同。

## 2. 隔离合同

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同** |
| 隔离 CMC `cmc-lev-*` | 622 | **hold / ledger-only**。抽样仍是经文残句（`cmc-lev-1-1` =「耶和华从会幕中呼叫摩西，对他说：」），不抬进公开包 |
| 帖撒罗尼迦后书隔离 CMC | 0 | 继续无行 |
| 约翰 leftover OCR | 1 | 未回潮 |

## 3. 利未记公开包 1:1

复核前：36 = 研修本 30 + OCR 6。复核后：36 = 研修本 30 + OCR 6。

| 源 | 复核前 | 复核后 | 判定 |
| --- | ---: | --- | --- |
| 研修本 verse / 导论 | 30 | 30 | 主体 **keep**；0 **hold**；19 **fix** |
| OCR | 6 | 6 | **hold-as-class / 本轮不改**。无卷级台账，不撤不改；跨卷继续 1 keep + 145 hold-as-class（本卷 6 张计入这 145） |
| CMC | 0 | 0 | 隔离 622 继续 hold |

公开锚点全部落在合法 `Lev.章.节`。导论保留 7 张；关键主题交错已按卡内残片唯一重排，救恩历史重接《〈圣经〉概述》，不整卡撤下。

### 3.1 已 hold（0）

本卷没有无源就不能复原的整卡。18:20「都会使人」中截、关键主题第 3–4 条交错都落在完整段落后或可用卡内残片唯一重排。

本卷 6 张公开 OCR 无台账行，故留在公开包并记入 hold-as-class：

| ID | 公开锚点 | 台账 | 本轮 |
| --- | --- | --- | --- |
| `image-text-03-利未记-codex-pdf-p005-img004` | `Lev.1.1` | 无 | hold-as-class |
| `image-text-03-利未记-codex-pdf-p026-img012` | `Lev.5.7` | 无 | hold-as-class |
| `image-text-03-利未记-codex-pdf-p031-img015` | `Lev.6.25` | 无 | hold-as-class |
| `image-text-03-利未记-codex-pdf-p100-img044` | `Lev.16.13` | 无 | hold-as-class |
| `image-text-03-利未记-codex-pdf-p130-img063` | `Lev.19.19` | 无 | hold-as-class |
| `image-text-03-利未记-codex-pdf-p158-img073` | `Lev.3.5` | 无 | hold-as-class |

### 3.2 已 fix（19）

#### 删表倾倒 / 中截尾句（2）

| ID | 问题 | 判定 |
| --- | --- | --- |
| `study-bible-lev-18-20-p024-n115` | 「但所有罪都会使人」中截 | **fix**：留到「使自己与她不洁净）」 |
| `study-bible-lev-intro-p003-n004` | 「出常吩咐他们要40:34 / 完全的5.」交错 | **fix**：按卡内残片重接 5 条主题 |

#### 高置信 OCR / 闭引号（节选）

| 串 | 还原 | 例 |
| --- | --- | --- |
| `受商` / `齊油` / `迎南人` | 受膏 / 膏油 / 迦南人 | `4-3`、`8-30`、`18-21` |
| `利未意的事` / `邻含` / `營告` | 《利未记》要注意的事 / 邻舍 / 警告 | `13-3`、`19-17`、`19-18` |
| `避行` / `旧日约` / `wayvigra` | 遵行 / 旧约 / wayiqra | `18-5`、目的、作者 |
| `耶和华晓开始` / `《（圣和` | 耶和华晓谕摩西说 / 《〈圣经〉概述》和 | 文学特征、救恩历史 |
| 闭和修引号 | 吃任何的血 / 有血从体内流出 | `17-10`、`15-2` |

和修引号只在译词已经完整时闭合。本卷无整卡 unrestorable hold。13:3 标题中截已按导论小标题补全。

其余公开研修本卡：利未记锚点合法。PDF 点号连接不批量改写。

本卷 6 张 `image-text-03-利未记-*` 无卷级台账，继续 **hold-as-class**。卡片含希伯来转写噪声（`Wayiqra` / `TP!I` / `n792`），但按诗篇 / 马太 OCR 合同：无台账则不在本轮撤、不在本轮改。

## 4. 六源口径

本卷不减少公开研修本。彼得后书撤 1 张后公开研修本 **9,089**；公开文字卡 **10,096**。隔离 622 继续 ledger-only。公开 OCR 146 不变。标识映射不改写。

## 5. 下一卷

同跑已续展彼得后书。66 卷公开包均已有卷级 1:1 审计测试。

## 6. 验证

已跑 `vitest` 公开卡审计、`generatePublicBibleData --validate-only`（10,096 文字卡）与 `validatePublicRepository`。原始输出见同目录 `validate.txt`。未做浏览器点选：本快照没有工作台 v4，本地阅读页不走 `loadPublicBook("Lev")`。
