# 哈该书 1:1 复核与隔离 CMC 台账分源判定

- 复核日期：2026-09-12
- 基线：`cursor/ohb-hab-ruth-1to1-hold-queue-0014`（哈巴谷书 / 路得记已闭合）
- 台账包：`local-audit-pack/john-gospel-20260909/`
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：隔离 ∩ 公开仍为 ∅。哈巴谷书 / 路得记收束后，本跑按指定下一卷展开哈该书（公开研修本 39，隔离 CMC 25，公开 OCR 1）。无整卡 unrestorable hold；已最小修补 19 张高置信引号 / OCR / 表倾倒 / 中截尾句。隔离 CMC 25 张继续 ledger-only。本卷 1 张公开 OCR 无卷级台账，继续 hold-as-class，不撤不改。六源映射口径不改。

## 1. 范围与方法

判定口径与哈巴谷书 / 路得记 / 马太相同：keep / fix / hold。不改六源标识，不抬隔离 CMC，不补造无 PDF 原文。不假设 Mac 本地 `Resources/` 仍可访问。

选哈该书：路得记报告已把它列为下一未审研修本大面（公开 39），且带 1 张公开 OCR，足以复核「无台账则 hold-as-class」合同。约拿书、那鸿书为本跑第二、三卷，同步收束。

## 2. 隔离合同

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同** |
| 隔离 CMC `cmc-hag-*` | 25 | **hold / ledger-only**。抽样仍是经文残句（`cmc-hag-1-1` =「大流士王第二年六月初一日，耶和华的话借先知哈该向犹大省长撒拉铁的儿子所罗巴伯和约撒答的儿子大祭司约书亚说：」，`cmc-hag-1-3` =「那时耶和华的话临到先知哈该说：」），不抬进公开包 |
| 哈巴谷书隔离 CMC | 43 | 继续 hold |
| 路得记隔离 CMC | 48 | 继续 hold |
| 约翰 leftover OCR | 1 | 未回潮 |

## 3. 哈该书公开包 1:1

复核前：40 = 研修本 39 + OCR 1。复核后：40 = 研修本 39 + OCR 1。

| 源 | 复核前 | 复核后 | 判定 |
| --- | ---: | ---: | --- |
| 研修本 verse / 导论 | 39 | 39 | 主体 **keep**；0 **hold**；19 **fix** |
| OCR | 1 | 1 | **hold-as-class / 本轮不改**。无卷级台账，不撤不改；跨卷继续 1 keep + 145 hold-as-class（本卷 1 张计入这 145） |
| CMC | 0 | 0 | 隔离 25 继续 hold |

公开锚点全部落在合法 `Hag.章.节`。导论保留 8 张；关键主题第 4 条中截尾已删并接第 5 条，写作目的补「可知」，救恩历史改《〈圣经〉概述》，不整卡撤下。

### 3.1 已 hold（0）

本卷没有无源就不能复原的整卡。1:1 约书亚谱系中截、2:7 新约视角乱码、关键主题第 4 条中截都落在完整段落后，按马太口径删尾保留。

本卷 1 张公开 OCR 无台账行，故留在公开包并记入 hold-as-class：

| ID | 公开锚点 | 台账 | 本轮 |
| --- | --- | --- | --- |
| `image-text-37-哈该书-codex-pdf-p005-img002` | `Hag.1.1` | 无 | hold-as-class |

### 3.2 已 fix（19）

只做和修闭引号、上下文唯一 OCR、以及「保留完整段落、删表倾倒 / 中截尾句」。不补缺失段落。

#### 删表倾倒 / 中截尾句（6）

| ID | 问题 | 判定 |
| --- | --- | --- |
| `study-bible-hag-1-1-p004-n011` | 「亚3:1.」约书亚谱系中截 | **fix**：留到所罗巴伯省长完整句 |
| `study-bible-hag-2-7-p005-n030` | 「再来明出来 / 城的股」乱码 | **fix**：留即时应验完整段，删新约视角残尾 |
| `study-bible-hag-2-9-p006-n025` | 「15-1节」中截 | **fix**：15-17节 |
| `study-bible-hag-2-16-p006-n026` | 「建工作」残词 | **fix**：闭和修引号；建殿工作 |
| `study-bible-hag-intro-p001-n005` | 第 4 条「1:5-7，5.复兴」中截 | **fix**：1-4 条后直接接第 5 条；衰微的大卫 / 现在他应许 |
| `study-bible-hag-intro-p003-n008` | 「11-2*」大纲倾倒 | **fix**：1:1-2* |

#### 高置信 OCR / 闭引号（节选）

| 串 | 还原 | 例 |
| --- | --- | --- |
| `撒迎利亚书` / `王耶22` / `正如从样` | 撒迦利亚书 / 耶22 / 正如这样 | `1-2`、`1-4`、`2-4` |
| `衣作物` / `聚扰` / `竞自相` / `确实次` | 农作物 / 聚拢 / 竟自相 / 确实再次 | `2-17`、`2-21`、`2-22`、`2-19` |
| `因此可的背景` / `《《圣经〉概述》` | 因此可知，背景 / 《〈圣经〉概述》 | 写作目的、救恩历史 |
| 闭和修引号 | 省察自己的行为 / 奔走 / 在那里 / 尸体 | `1-6`、`1-9`、`2-14` |

和修引号只在译词已经完整时闭合。本卷无整卡 unrestorable hold。

其余公开研修本卡：哈该书锚点合法，短交叉引用或完整注释可读。PDF 点号连接仍普遍存在，但不改变释义，**本轮不批量改写**。

本卷 1 张 `image-text-37-哈该书-*` 无卷级台账，继续 **hold-as-class**。卡片含希伯来转写噪声（`Khagai` / `7Uy nn`），但按诗篇 / 马太 OCR 合同：无台账则不在本轮撤、不在本轮改。

## 4. 六源口径

本轮不减少公开研修本。与约拿书 / 那鸿书合计后：公开研修本现计 **9,092**；公开文字卡 **10,099**。哈该书隔离 25 继续 ledger-only。公开 OCR 146 不变（1 keep + 145 hold-as-class）。标识映射不改写。

## 5. 下一卷

哈该书已在本跑收束。同跑已续展**约拿书**与**那鸿书**（各公开研修本 39 无整卡 hold，公开 OCR 1 继续 hold-as-class）。见 `docs/verification/2026-09-12-jonah-1to1-hold-queue/report.md` 与 `docs/verification/2026-09-12-nahum-1to1-hold-queue/report.md`。下一高价值未审研修本面可看**俄巴底亚书**（13）或**玛拉基书**（20 / OCR 2）。

## 6. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts scripts/generatePublicBibleData.test.mjs`
- `vitest run` 哈该书 / 约拿书 / 那鸿书及哈巴谷书 / 路得记 / `publicData` / `publicBibleData`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、公开文字卡 10,099、无不安全串。
- `node scripts/validatePublicRepository.mjs`：通过。
- 原始输出见同目录 `validate.txt`。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地 `App.tsx` 不走 `loadPublicBook("Hag")`，因此无法在本环境用阅读页点开这些公开卡。对照与修补都落在公开数据包和台账 JSONL。

GitHub `verify` 全量仍会因本快照缺创世记资源 / v4 / `rg` 失败；失败面不读哈该书公开包，不补造真源。
