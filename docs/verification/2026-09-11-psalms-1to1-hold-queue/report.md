# 诗篇 1:1 复核与剩余 OCR 台账分源判定

- 复核日期：2026-09-11
- 基线：`cursor/ohb-card-quality-hold-queue-4582`（约翰 leftover 已闭合；创世记隔离泄漏已清）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`（公开 v0.1.0 经文卡包）
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：隔离包 ∩ 公开包仍为 ∅。下一高价值公开面是诗篇。已从公开诗篇撤下 15 张无法复原的研修本卡，并最小修补 17 张高置信引号/OCR 串；剩余 146 张 OCR 因本快照无卷级台账，整类继续 hold、本轮不改。

## 1. 范围与方法

只依据本仓库快照，不假设 Mac 本地 `Resources/` 或 Edit API 仍可访问。

对照路径：

1. 约翰台账：`card候选清单.jsonl`、`资源审计台账.jsonl`（只覆盖约翰 1 张 OCR）。
2. 全卷无解释隔离：`no-explain-isolation-20260731/card候选清单.jsonl`（18,397；CMC 18,387 + 研修本 10，后者已在创世记轮撤出公开包）。
3. 公开包：`public/data/books/*.json`、`public/data/manifest.json`。
4. 代码路径：`scripts/generatePublicBibleData.mjs`、`src/data/genesisPublicCardAudit.test.ts`、`src/data/johnGospelPublicCardAudit.test.ts`。

判定口径与约翰 / 创世记 1:1 相同：

- **keep**：锚点合法、正文可读、不应再改。
- **fix**：已确认的映射/正文质量问题，且能在仓库内安全修补。
- **hold**：证据不足、无解释、OCR/启导本未审定，或损坏到无法在无源 PDF 条件下可靠复原。

### 为何选诗篇，而不是出埃及记 / 马太 / 耶利米

隔离 ∩ 公开在创世记轮之后已经是空集，所以本轮不能再靠「同文重叠撤卡」扩面，只能选下一张仍有隔离合同 + 公开阅读面 + OCR 子集的卷。

| 卷 | 公开卡 | 公开 OCR | 隔离 CMC | 卷级台账 |
| --- | ---: | ---: | ---: | --- |
| 耶利米 | 672 | 0 | 1,006 | 无 |
| 路加 | 558 | 0 | 144 | 无 |
| 马太 | 453 | 0 | 143 | 无 |
| **诗篇** | **446** | **10** | **1,610** | 无 |
| 出埃及记 | 215 | 6 | 716 | 无 |

诗篇不是公开卡最多的未审卷（耶利米 672、路加 558 更大），但在用户点名的出埃及记 / 诗篇 / 马太里，它同时满足：

1. 隔离包里最大的 CMC hold 队列（1,610，且公开包 0，合同已守住）。
2. 仍有 10 张公开 OCR，可对照本快照仅有的两份台账做「有无证据」判定。
3. 公开研修本 436 张，足够做与约翰相同的中截 / 表倾倒 / 和修引号 1:1。

出埃及记公开面较小；马太公开研修本更多，但隔离 CMC 只有 143、无 OCR。二者列为下一轮候选，本轮不扩面。

## 2. 隔离合同（全卷复核）

隔离包 18,397 张全部带 `no-explanation-scripture-only` + `quarantined-from-reader`。

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同**。创世记轮已清；本轮复扫 66 卷，无回潮。 |
| 隔离 CMC `cmc-ps-*` | 1,610 | **hold / ledger-only**。公开诗篇 0 张 CMC。抽样仍是经文残句，不抬进公开包。 |
| 隔离 CMC `cmc-exod-*` / `cmc-matt-*` | 716 / 143 | **hold / ledger-only**。公开包本来就没有这些 CMC。 |
| 隔离研修本 10 张 | 10 | 已在创世记轮撤下；本轮确认未回潮。 |

本快照没有诗篇 / 出埃及记 / 马太专包，因此隔离 CMC 只能保持「台账 hold，不进 v0.1.0 公开文字卡」。

## 3. 诗篇公开包 1:1

复核前：446 = 研修本 436 + OCR 10。复核后：431 = 研修本 421 + OCR 10。

| 源 | 复核前 | 复核后 | 判定 |
| --- | ---: | ---: | --- |
| 研修本 verse / 导论 | 436 | 421 | 主体 **keep**；15 **hold**；17 **fix** |
| OCR 图转文 | 10 | 10 | **hold-as-class / 本轮不改**。约翰台账与隔离包均无这些 ID。 |
| CMC 综合解读 | 0 | 0 | 隔离 1,610 张继续 hold |

公开锚点全部落在合法 `Ps.章.节`。未见跨卷锚。

### 3.1 已 hold（移出公开包）

这 15 张都是研修本公开卡。正文中截、表倾倒或希伯来转写垃圾，无源 PDF 不能最小复原：

| ID | 锚点 | 问题 | 判定 |
| --- | --- | --- | --- |
| `study-bible-ps-1-6-p009-n015` | `Ps.1.6` | 收尾「他必须不仅仅是血」中截 | **hold** |
| `study-bible-ps-5-3-p011-n037` | `Ps.5.3` | 「我告」中截；「解粹」「敬皮人」「營醒」「四店」 | **hold** |
| `study-bible-ps-11-3-p016-n103` | `Ps.11.3` | 「（参赛」后整段缺失 | **hold** |
| `study-bible-ps-12-3-p017-n071` | `Ps.12.3` | 「与利」后整段缺失 | **hold** |
| `study-bible-ps-15-5-p019-n095-2-2-2-2` | `Ps.15.5` | 「他的行为超，上帝的百姓应该行事」中截 | **hold** |
| `study-bible-ps-17-14-p021-n105` | `Ps.17.14` | 「形成鲜明对」中截 | **hold** |
| `study-bible-ps-19-7-p023-n171` | `Ps.19.7` | 「獎盔：或作可箱」「见"旅言」 | **hold** |
| `study-bible-ps-31-10-p033-n254` | `Ps.31.10` | 「必要成」中截 | **hold** |
| `study-bible-ps-54-3-p054-n359` | `Ps.54.3` | 希伯来转写倾倒（`iT'口.zdym`）；「心骄气傲的」后串章 | **hold** |
| `study-bible-ps-90-10-p093-n595` | `Ps.90.10` | 「少数人则长」中截 | **hold** |
| `study-bible-ps-103-7-p106-n484` | `Ps.103.7` | 收尾停在「；赛」 | **hold** |
| `study-bible-ps-103-19-p106-n486` | `Ps.103.19` | 「这是他们的荣」中截 | **hold** |
| `study-bible-ps-112-1-p120-n806` | `Ps.112.1` | 「敬皮的楷模」；「敬畏耶和华，这一句」中截 | **hold** |
| `study-bible-ps-119-27-p127-n880` | `Ps.119.27` | 圣约用语表倾倒（`Mitswot`、`mishpatim`） | **hold** |
| `study-bible-ps-145-1-p149-n751` | `Ps.145.1` | 「在145:2、21重复出」中截 | **hold** |

不作文内补全。补「血肉之躯 / 对比 / 荣耀」会在无 PDF 条件下伪造研修本原文。

### 3.2 已 fix（写入公开包）

只做约翰同口径的高置信修补：闭合和修/经文引号，以及上下文唯一可还原的 OCR 串。不改释义，不补缺失段落。

| ID | 问题 | 判定 |
| --- | --- | --- |
| `study-bible-ps-19-9-p023-n174` | `（《和修》"敬畏耶和华"` 缺 `）` | **fix** |
| `study-bible-ps-45-1-p047-n210` | `敏捷文士的手笔` 引号未闭 | **fix** |
| `study-bible-ps-74-14-p074-n487` | `力威亚探》`；`旧日约`；`径物` | **fix**：闭引号；旧日约→旧约；径物→怪物 |
| `study-bible-ps-78-59-p080-n351` | `"全然弃绝）` 缺 `"` | **fix** |
| `study-bible-ps-79-5-p081-n523` | 和修引号；`连合/专靠`；`惯恨` | **fix**：闭引号；惯恨→愤恨 |
| `study-bible-ps-80-1-p082-n364-2-2-2-2` | `"复兴）使你的脸发光` | **fix** |
| `study-bible-ps-93-5-p097-n431` | `"奸恶的统治者）` 缺 `"` | **fix** |
| `study-bible-ps-97-11-p101-n456` | `"散播亮光》` | **fix** |
| `study-bible-ps-103-6-p106-n483` | `"受欺压的人"` 缺 `）` | **fix** |
| `study-bible-ps-111-1-p119-n563` | `"会众》` | **fix** |
| `study-bible-ps-111-10-p120-n573-2-2-2-2` | `"见识"；` 未闭 | **fix** |
| `study-bible-ps-115-11-p123-n586` | `旧日约` | **fix**：→旧约。`敬畏耶和华8:43` 缺书卷名，不补造 |
| `study-bible-ps-116-10-p124-n596` | `"尽管我说）` 缺 `"` | **fix** |
| `study-bible-ps-122-4-p134-n665` | `"法度"` 缺 `）` | **fix** |
| `study-bible-ps-125-3-p135-n667` | 和修引号；`大工的宝座` | **fix**：闭引号；大工→大卫 |
| `study-bible-ps-138-2-p143-n716` | `超乎一切》`；收尾引号 | **fix** |
| `study-bible-ps-138-8-p143-n712` | 和修引号与开篇陈述括号 | **fix** |

其余公开研修本卡：诗篇锚点合法，短交叉引用或完整注释可读。PDF 点号连接（如 `9:9.10:18`）仍普遍存在，但不改变释义，**本轮不批量改写**。

## 4. 剩余 OCR：只在有台账证据处分源

公开包现有 OCR 146 张（创世记轮报告写 145，是当时对约翰已撤 + 本轮 3 张已撤后的约数；本快照实数为 146，含创世记已 keep 的 1 张）。

本快照里能对照 OCR 的台账只有两处：

| 台账 | OCR 覆盖 | 与剩余公开 OCR 的交集 |
| --- | --- | ---: |
| 约翰福音 `card候选清单` / `资源审计台账` | 仅 `image-text-43-约翰福音-codex-pdf-p019-img004` | **0**（该卡已在约翰轮撤下，本轮确认未回潮） |
| 无解释隔离包 | 0 张 `image-text-*` | **0** |

因此：**剩余 146 张公开 OCR 在本快照没有卷级台账行。** 按任务口径「只在有台账证据处分源，否则记录为何 hold」，它们整类 **hold-as-class / 本轮不改**。不根据正文里的希伯来转写噪音整包撤 OCR，也不改生成器。

诗篇 10 张公开 OCR 同样没有台账行，故留在公开包并记入本类，而不是当作已审定 keep：

| ID | 公开锚点 | 台账 | 本轮 |
| --- | --- | --- | --- |
| `image-text-19-诗篇-codex-pdf-p014-img007` | `Ps.3.1` | 无 | hold-as-class |
| `image-text-19-诗篇-codex-pdf-p150-img067` | `Ps.46.1` | 无 | hold-as-class |
| `image-text-19-诗篇-codex-pdf-p343-img137` | `Ps.105.35` | 无 | hold-as-class |
| `image-text-19-诗篇-codex-pdf-p424-img184` | `Ps.122.6` | 无 | hold-as-class |
| `image-text-19-诗篇-codex-pdf-p493-img216` | `Ps.145.8` | 无 | hold-as-class |
| `image-text-19-诗篇-codex-pdf-p494-img217` | `Ps.146.4` | 无 | hold-as-class |
| `image-text-19-诗篇-codex-pdf-p499-img220` | `Ps.147.11` | 无 | hold-as-class |
| `image-text-19-诗篇-codex-pdf-p501-img221` | `Ps.148.1` | 无 | hold-as-class |
| `image-text-19-诗篇-codex-pdf-p506-img225` | `Ps.149.1` | 无 | hold-as-class |
| `image-text-19-诗篇-codex-pdf-p509-img227` | `Ps.150.1` | 无 | hold-as-class |

其余 136 张按卷计：箴言 33、雅歌 11、历代志上 8、出埃及记 / 利未记 / 申命记 / 约伯记 各 6、约书亚记 / 以斯帖记 / 撒迦利亚书 各 5，以及更小的分散卷。它们与诗篇 10 张同一合同：无台账则不在本轮撤、不在本轮改。

创世记轮已确认损坏并撤下的 3 张（`二十—` + 转写垃圾：申命记 / 士师记 / 箴言）继续不回潮。

## 5. 已落地的仓库修改

1. `public/data/books/Ps.json`：删除 15 张 hold 研修本卡；修补 17 张确认损坏卡。446→431。
2. `public/data/manifest.json`：更新 Ps 的 `bytes` / `sha256` / `textCardCount`。公开文字卡 10,439→10,424。
3. `src/data/psalmsPublicCardAudit.test.ts`：锁住诗篇构成、隔离 CMC 不得回潮、已知中截/垃圾串不得回潮、约翰 OCR 继续不在公开包。
4. 本报告。

未做：

- 不重写台账 JSONL。
- 不把诗篇 / 出埃及记 / 马太隔离 CMC 抬进公开包。
- 不伪造缺失的工作台 v4 投影。
- 不批量改写其余 146 张无台账 OCR，也不改 `generatePublicBibleData.mjs` 的通用过滤策略。
- 不在本轮展开耶利米 / 路加 / 马太 / 出埃及记的研修本 1:1（见第 1 节选卷理由）。

## 6. 1:1 总判

诗篇公开包：

| 去向 | 张数 |
| --- | ---: |
| 公开保留研修本（keep / fix） | 421（含 17 处 fix） |
| 公开保留诗篇 OCR（无台账，整类 hold） | 10 |
| 从公开包撤下的损坏研修本 | 15 |
| **合计（复核前公开诗篇）** | **446** |

隔离与跨卷 OCR：

| 去向 | 张数 |
| --- | ---: |
| 诗篇隔离 CMC | 1,610 hold / ledger-only |
| 出埃及记 / 马太隔离 CMC | 716 / 143 hold / ledger-only |
| 隔离 ∩ 公开 | 0（合同保持） |
| 剩余公开 OCR | 146 hold-as-class（台账交集 0） |

公开包与隔离合同可以收束为：

> v0.1.0 公开文字卡仍不得包含无解释隔离包中的卡。诗篇公开面只保留可读的研修本单节/短注，减去 15 张已确认中截或表倾倒卡；17 张只做引号与高置信 OCR 串修补。诗篇隔离 CMC 与全部无台账 OCR 继续不进入新的公开审定。

## 7. 验证

已跑：见本轮后续测试记录。计划命令：

- `vitest run src/data/psalmsPublicCardAudit.test.ts src/data/genesisPublicCardAudit.test.ts src/data/johnGospelPublicCardAudit.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`
- `node scripts/validatePublicRepository.mjs`

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地 `App.tsx` 不走 `loadPublicBook("Ps")`，因此无法在本环境用阅读页点开这些公开卡。对照与修补都落在公开数据包和台账 JSONL。
