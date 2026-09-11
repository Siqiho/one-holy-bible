# 路加福音 1:1 复核与隔离 CMC 台账分源判定

- 复核日期：2026-09-11
- 基线：`cursor/ohb-jeremiah-1to1-hold-queue-a460`（约翰 / 创世记 / 诗篇 / 耶利米已闭合）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`（公开 v0.1.0 经文卡包）
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：隔离包 ∩ 公开包仍为 ∅。下一高价值公开面是路加福音。已从公开路加撤下 27 张无法复原的研修本卡，并最小修补 81 张高置信引号/OCR/表倾倒串；隔离 CMC 144 张继续 ledger-only。本快照无路加卷级台账，公开 OCR 为 0，故本轮不做 OCR 分源。六类信息源已对账：用户全库数只有信息系列 8 能在本快照对齐；其余是 Edit 真源缺口，不补造公开卡。

## 1. 范围与方法

只依据本仓库快照，不假设 Mac 本地 `Resources/` 或 Edit API 仍可访问。

对照路径：

1. 约翰台账：`card候选清单.jsonl`、`资源审计台账.jsonl`（只覆盖约翰 1 张 OCR）。
2. 全卷无解释隔离：`no-explain-isolation-20260731/card候选清单.jsonl`（18,397；CMC 18,387 + 研修本 10，后者已在创世记轮撤出公开包）。
3. 公开包：`public/data/books/*.json`、`public/data/manifest.json`。
4. 代码路径：`scripts/generatePublicBibleData.mjs`、既有约翰 / 创世记 / 诗篇 / 耶利米公开审计测试。
5. 路加第 1 章原型：`src/prototypes/reader-card-system/lukeChapterOne.ts` 只读对照。它是阅读原型，不是卷级公开卡台账，不能当作 1:1 真源。

判定口径与约翰 / 创世记 / 诗篇 / 耶利米 1:1 相同：

- **keep**：锚点合法、正文可读、不应再改。
- **fix**：已确认的映射/正文质量问题，且能在仓库内安全修补。
- **hold**：证据不足、无解释、OCR/启导本未审定，或损坏到无法在无源 PDF 条件下可靠复原。

### 为何选路加，而不是以赛亚 / 马太

耶利米轮之后，隔离 ∩ 公开已经是空集，所以本轮仍只能选下一张仍有隔离合同 + 最大公开阅读面的未审卷。

| 卷 | 公开卡 | 公开 OCR | 隔离 CMC | 卷级台账 |
| --- | ---: | ---: | ---: | --- |
| **路加** | **558** | **0** | **144** | 无 |
| 以赛亚 | 475 | 0 | 947 | 无 |
| 马太 | 453 | 0 | 143 | 无 |

两边都没有卷级台账，也都没有公开 OCR，因此 OCR 合同相同：无台账则不撤、不改。选路加是因为：

1. 耶利米报告已把它列为下一轮候选。
2. 它是剩余未审卷里最大的公开研修本面（558 > 以赛亚 475）。
3. 隔离 CMC 足以复核「ledger-only、不抬进公开包」合同。
4. `lukeChapterOne.ts` 不能替代卷级台账。

以赛亚列为下一轮候选，本轮不扩面。

## 2. 隔离合同（全卷复核）

隔离包 18,397 张全部带 `no-explanation-scripture-only` + `quarantined-from-reader`。

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同**。创世记 / 诗篇 / 耶利米轮已清；本轮复扫 66 卷，无回潮。 |
| 隔离 CMC `cmc-luke-*` | 144 | **hold / ledger-only**。公开路加 0 张 CMC。抽样 `cmc-luke-1-37` =「因为，出于神的话，没有一句不带能力的。」，`cmc-luke-1-40` =「进了撒迦利亚的家，问伊利莎白安。」，仍是经文残句，不抬进公开包。 |
| 隔离 CMC `cmc-isa-*` | 947 | **hold / ledger-only**。公开以赛亚本来就没有这些 CMC。 |
| 约翰 leftover OCR | 1 | 已在约翰轮撤下；本轮确认未回潮。 |

本快照没有路加 / 以赛亚专包，因此隔离 CMC 只能保持「台账 hold，不进 v0.1.0 公开文字卡」。

## 3. 路加公开包 1:1

复核前：558 = 研修本 558 + OCR 0 + CMC 0。复核后：531 = 研修本 531。

| 源 | 复核前 | 复核后 | 判定 |
| --- | ---: | ---: | --- |
| 研修本 verse / 导论 | 558 | 531 | 主体 **keep**；27 **hold**；81 **fix** |
| OCR 图转文 | 0 | 0 | 本卷无公开 OCR；剩余跨卷 OCR 继续整类 hold |
| CMC 综合解读 | 0 | 0 | 隔离 144 张继续 hold |

公开锚点全部落在合法 `Luke.章.节`。未见跨卷锚。8 张导论保留（原 9 张，撤下 1 张关键主题卡），挂在既有归位经文上（`Luke.1.1` / `Luke.19.10` 等）。

### 3.1 已 hold（移出公开包）

这 27 张都是研修本公开卡。正文中截、表倾倒或结构损坏，无源 PDF 不能最小复原：

| ID | 锚点 | 问题 | 判定 |
| --- | --- | --- | --- |
| `study-bible-luke-1-48-p011-n040` | `Luke.1.48` | 收尾「使人想到路」中截 | **hold** |
| `study-bible-luke-2-11-p016-n055` | `Luke.2.11` | 「就是主上帝自」中截 | **hold** |
| `study-bible-luke-2-21-p016-n071` | `Luke.2.21` | 「或"上帝拯」中截 | **hold** |
| `study-bible-luke-3-8-p018-n083` | `Luke.3.8` | 「对上帝及其呼召的回」中截 | **hold** |
| `study-bible-luke-4-23-p022-n136` | `Luke.4.23` | 「关于耶稣洞悉人」中截 | **hold** |
| `study-bible-luke-4-34-p023-n144` | `Luke.4.34` | 「他带着圣」中截 | **hold** |
| `study-bible-luke-7-47-p031-n196` | `Luke.7.47` | 「"耶稣是谁"的意义」中截 | **hold** |
| `study-bible-luke-9-14-p036-n321` | `Luke.9.14` | 「约有五干，见约6:10-1」中截 | **hold** |
| `study-bible-luke-9-44-p036-n238` | `Luke.9.44` | 受难预言表倾倒，无完整注释段 | **hold** |
| `study-bible-luke-10-28-p041-n307` | `Luke.10.28` | 收尾「见可」中截 | **hold** |
| `study-bible-luke-15-7-p052-n529` | `Luke.15.7` | 「认为自的人」中截 | **hold** |
| `study-bible-luke-15-8-p052-n385` | `Luke.15.8` | 「10天的工」中截 | **hold** |
| `study-bible-luke-16-9-p053-n398` | `Luke.16.9` | 「强调将理论（3）」开篇损坏 + 尾垃圾 | **hold** |
| `study-bible-luke-16-13-p054-n404` | `Luke.16.13` | 「上帝国度的事工」中截 | **hold** |
| `study-bible-luke-16-24-p055-n558` | `Luke.16.24` | 「进行直」中截 | **hold** |
| `study-bible-luke-19-1-p060-n465` | `Luke.19.1` | 「先进的农业灌溉」中截 | **hold** |
| `study-bible-luke-19-46-p042-n325` | `Luke.19.46` | 「使他们有力」中截 | **hold** |
| `study-bible-luke-21-36-p042-n423` | `Luke.21.36` | 路 10 马大/马利亚串入路 21；`和46 修`；无法复原 | **hold** |
| `study-bible-luke-22-44-p042-n319` | `Luke.22.44` | 「经文 耶稣关于祷告的教导和劝勉人祷告」表头倾倒 | **hold** |
| `study-bible-luke-22-45-p069-n550` | `Luke.22.45` | 「门徒身心俱」中截 | **hold** |
| `study-bible-luke-23-2-p071-n566` | `Luke.23.2` | 「岁马政府」「三项控畢」「徒221」无法复原 | **hold** |
| `study-bible-luke-23-15-p072-n575` | `Luke.23.15` | 「耶稣是无」中截 | **hold** |
| `study-bible-luke-23-24-p072-n787` | `Luke.23.24` | 「满足了仇恨耶稣的人」中截 | **hold** |
| `study-bible-luke-23-46-p073-n808` | `Luke.23.46` | 收尾「见约」中截 | **hold** |
| `study-bible-luke-23-47-p074-n586` | `Luke.23.47` | 收尾「见路」中截 | **hold** |
| `study-bible-luke-24-6-p074-n822` | `Luke.24.6` | 「参9:22，44，18:32-」中截 | **hold** |
| `study-bible-luke-intro-p003-n008` | `Luke.19.10` | 关键主题第 3 点中截，并倾倒经文总表 | **hold** |

不作文内补全。补「自己 / 国度 / 工资」会在无 PDF 条件下伪造研修本原文。

### 3.2 已 fix（写入公开包）

只做约翰 / 诗篇 / 耶利米同口径的高置信修补：闭合和修/经文引号，上下文唯一可还原的 OCR 串，以及创世记同口径的「保留完整段落、删表倾倒」。不改释义，不补缺失段落。

#### 删表倾倒 / 尾垃圾 / 希腊乱码（7）

| ID | 问题 | 判定 |
| --- | --- | --- |
| `study-bible-luke-2-2-p013-n051` | `29eYRE` / `整雀特工` 希腊乱码 | **fix**：保留户口调查讨论，删乱码句 |
| `study-bible-luke-8-37-p034-n288` | 路/徒平行事工表倾倒 | **fix**：保留「他们的反应很可能是…」 |
| `study-bible-luke-9-10-p036-n317` | 受难预言表倾倒 | **fix**：只留「使徒 / 十二个门徒 / 门徒交替使用」完整句 |
| `study-bible-luke-19-17-p060-n639` | 尾垃圾 `19:30K［本书23:53］` | **fix**：删尾串 |
| `study-bible-luke-19-26-p061-n478` | 耶路撒冷地图倾倒 | **fix**：保留「加给他 夺过来，见可4:25注。」 |
| `study-bible-luke-intro-p002-n004` | `主前10年主后1年10 203040506070` 年表轴倾倒 | **fix**：保留大事年表，删轴 |
| `study-bible-luke-intro-p003-n007` | 收尾「这卷福人，音书…（路1」中截 | **fix**：保留完整文学特征段，删尾句 |

#### 高置信 OCR / 中词缺失（节选）

| 串 | 还原 | 例 |
| --- | --- | --- |
| `差遭` | 差遣 | `luke-2-14`、`luke-9-29` |
| `旧日约` | 旧约 | `luke-19-41` |
| `约輸` | 约翰 | `luke-9-28` |
| `陷人` | 陷入 | `luke-6-9`、`luke-22-40` |
| `得攀赦免` | 得蒙赦免 | `luke-5-30` |
| `服待` | 服侍 | `luke-2-49`、`luke-9-4`、`luke-22-27` |
| `自已` | 自己 | `luke-1-34` |
| `是好女` | 是妇女 | `luke-8-3` |
| `菜耀` | 荣耀 | `luke-9-26` |
| `天围` | 天国 | `luke-6-20` |
| `一眼泪` | 一切眼泪 | `luke-6-21` |
| `世引用` | 也引用 | `luke-4-17` |
| `意內` | 意即 | `luke-1-30` |
| `硬泥板力` | 硬泥板为 | `luke-5-19` |
| `胜重任` | 胜任重任 | `luke-1-19` |
| `但稣` | 但耶稣 | `luke-9-61` |
| `撒迎利亚` | 撒迦利亚 | `luke-23-56` |
| `尘士跺` / `大10:14` | 尘土跺 / 太10:14 | `luke-9-5` |
| `需医的人` | 需医治的人 | `luke-9-11` |
| `碰口无言` | 哑口无言 | `luke-6-10` |
| `甚至包与你` | 甚至包括与你 | `luke-10-33` |
| `可以理最大` | 可以理解为最大 | `luke-9-46` |
| `岁马人` | 罗马人 | `luke-13-33` |
| `诚命` / `邀守` | 诫命 / 遵守 | `luke-18-20`、`luke-18-22` |
| `客西马尼層` | 客西马尼园 | `luke-22-40` |
| `恳珠大如血点` | 恳切。汗珠大如血点 | `luke-22-44` |
| `犯畢` | 犯罪 | `luke-17-1` |
| `称土马` | 称"多马" | `luke-6-15` |

和修引号只在译词已经完整时闭合，例如 `（《和修》"登记户籍"` → `（《和修》"登记户籍"）`，或 `行囊》` / `将归还你们》` / `同样》` 明显是闭引号 OCR。被和修引号吞掉后文的卡，只在分界唯一时切开，例如 `奋锐党"（《和修》"激进党来自Zelotes` → `（《和修》"激进党"）来自Zelotes`，`七十（《和修》"七十二个门徒完成使命` → `七十（《和修》"七十二"）个门徒完成使命`。

其余公开研修本卡：路加锚点合法，短交叉引用或完整注释可读。PDF 点号连接（如 `4:43.8:1`）仍普遍存在，但不改变释义，**本轮不批量改写**。

## 4. OCR：本卷无公开 OCR，跨卷继续整类 hold

公开路加 OCR = 0。本快照能对照 OCR 的台账仍只有两处：

| 台账 | OCR 覆盖 | 与路加公开 OCR 的交集 |
| --- | ---: | ---: |
| 约翰福音 `card候选清单` / `资源审计台账` | 仅约翰 1 张 | **0** |
| 无解释隔离包 | 0 张 `image-text-*` | **0** |

因此本轮不对任何 OCR 做分源或正文改写。诗篇轮留下的公开 OCR 146 = 创世记 1 keep + 145 无台账 hold-as-class，本轮继续不改。

## 5. 已落地的仓库修改

1. `public/data/books/Luke.json`：删除 27 张 hold 研修本卡；修补 81 张确认损坏卡。558→531。
2. `public/data/manifest.json`：更新 Luke 的 `bytes` / `sha256` / `textCardCount`。公开文字卡 10,410→10,383。
3. `src/data/lukePublicCardAudit.test.ts`：锁住路加构成、隔离 CMC 不得回潮、六类源在公开/隔离/约翰台账的计数。
4. 本报告，以及独立矩阵 `docs/verification/2026-09-11-six-source-coverage-matrix/report.md`。

未做：

- 不重写台账 JSONL。
- 不把路加 / 以赛亚隔离 CMC 抬进公开包。
- 不伪造缺失的工作台 v4 投影。
- 不把 `lukeChapterOne.ts` 当作卷级台账。
- 不批量改写其余无台账 OCR，也不改 `generatePublicBibleData.mjs` 的通用过滤策略。
- 不在本轮展开以赛亚 / 马太的研修本 1:1（见第 1 节选卷理由）。

## 6. 1:1 总判

路加公开包：

| 去向 | 张数 |
| --- | ---: |
| 公开保留研修本（keep / fix） | 531（含 81 处 fix） |
| 从公开包撤下的损坏研修本 | 27 |
| **合计（复核前公开路加）** | **558** |

隔离与跨卷 OCR：

| 去向 | 张数 |
| --- | ---: |
| 路加隔离 CMC | 144 hold / ledger-only |
| 以赛亚隔离 CMC | 947 hold / ledger-only |
| 隔离 ∩ 公开 | 0（合同保持） |
| 剩余公开 OCR | 146 = 1 keep + 145 hold-as-class（台账交集 0；本卷 0） |

公开包与隔离合同可以收束为：

> v0.1.0 公开文字卡仍不得包含无解释隔离包中的卡。路加公开面只保留可读的研修本单节/短注，减去 27 张已确认中截或表倾倒卡；81 张只做引号、高置信 OCR 串与表倾倒裁剪。路加隔离 CMC 与全部无台账 OCR 继续不进入新的公开审定。

## 7. 信息源覆盖矩阵

完整标识、并集去重与 keep/hold/fix 覆盖见独立报告：

`docs/verification/2026-09-11-six-source-coverage-matrix/report.md`

用户给出的六类全库口径，与本快照能看见的标识字段对账。标识优先用 `id` 前缀，其次 `source` / `debugMeta.sourceLabel` / 台账 `source_stream`。

| 用户源 | 用户全库数 | 本快照标识 | 公开包 | 隔离包 | 约翰台账 | 创世记稳定注释 | 对账 |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| 综合解读 | 29,476 | `cmc-*`；`source_stream=cmc-comprehensive-commentary`；`sourceLabel` 含「综合解读」 | **858**（全在创世记，有解释） | **18,387** | **765**（156 与隔离重合） | **866** | **缺口**。本快照没有全库 CMC 投影；公开+隔离+约翰台账去重后远小于 29,476 |
| 圣经研修本 | 16,270 | `study-bible-*`；`source` 含「研修本」；约翰台账 `study-bible-commentary-v3` | **9,376** | **10**（创世记轮已撤出公开包） | **495** | **751**（创世记本地研读本，含未进公开包的） | **缺口**。公开研修本是 v0.1.0 已发布子集，不是全库 16,270 |
| 圣经启导本 | 9,521 | `qidaben-*`；`source_stream=qidaben-commentary-pilot` | **0** | **0** | **267+1 孤儿** | 0 | **缺口**。本快照只有约翰启导本台账；全部 hold，不进公开包 |
| OCR 转文字 | 254 | `image-text-*`；约翰台账 `image-text-ocr-conversion` | **146** | **0** | **1**（已撤出公开包） | 0 | **缺口**。公开 146 = 创世记 1 keep + 145 无台账 hold-as-class；约翰 1 张已 hold |
| 圣经的故事 | 98 | `hurlbut-*`；`source_stream=hurlbut-bible-story-zh-2013` | **0** | **0** | **5** | 0 | **缺口**。本快照只有约翰 5 张故事卡；全部 hold |
| 圣经信息系列 | 8 | `message-*`；`source` / `sourceLabel` 含「圣经信息系列」 | **3** | **0** | **0** | **8** | **一致（稳定注释）**。用户 8 = 创世记稳定注释 8；其中 3 张已在创世记轮 keep 进公开包 |

公开包现计 10,383 = 研修本 9,376 + CMC 858 + OCR 146 + 信息系列 3。没有启导本，没有故事卡。

### 已审五卷对六类源的策略

| 源 | 约翰 | 创世记 | 诗篇 | 耶利米 | 路加 |
| --- | --- | --- | --- | --- | --- |
| 综合解读 | 156 hold（隔离）+ 609 ledger-only；公开 0 | 858 keep（有解释）；506 hold 撤出公开 | 1,610 hold / ledger-only；公开 0 | 1,006 hold / ledger-only；公开 0 | **144 hold / ledger-only；公开 0** |
| 研修本 | 公开 409 keep/fix；82 宽范围 hold；4 损坏 hold | 272 keep；1 fix | 421 keep/fix；15 hold | 658 keep/fix；14 hold | **531 keep/fix；27 hold** |
| 启导本 | 267+1 全部 hold | 沿用约翰 leftover hold | 沿用 | 沿用 | **沿用；路加公开 0，本快照无路加启导本台账** |
| OCR | 1 hold（已撤） | 1 keep（可读）；跨卷 3 hold | 10 hold-as-class（无台账） | 本卷 0；跨卷继续 hold-as-class | **本卷 0；跨卷 145 hold-as-class（公开 146 含创世记 1 keep）** |
| 圣经的故事 | 5 hold | 沿用 | 沿用 | 沿用 | **沿用；路加公开 0** |
| 信息系列 | 0 | 3 keep（公开）/ 8 在稳定注释 | 0 | 0 | **0** |

路加本轮只触及研修本公开面 + 路加隔离 CMC。其余四类源在路加上的公开交集为 0，策略是沿用既有 hold，不新抬、不新改。

对账收束：

> 用户六类全库数是 Edit/Resources 真源口径。本快照能 1:1 对上的只有：信息系列 8（稳定注释）、约翰台账五类子集、隔离 CMC 18,387、公开已发布子集。缺口不是漏审，而是本仓库没有其余卷的专包/工作台 v4/全库 CMC 投影。没有台账证据的源继续 hold，不按用户全库数补造公开卡。

## 8. 验证

已跑：

- `vitest run src/data/lukePublicCardAudit.test.ts src/data/jeremiahPublicCardAudit.test.ts src/data/psalmsPublicCardAudit.test.ts src/data/genesisPublicCardAudit.test.ts src/data/johnGospelPublicCardAudit.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts`：60/60 通过。
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、公开文字卡 10,383、无不安全串。
- `node scripts/validatePublicRepository.mjs`：通过。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地 `App.tsx` 不走 `loadPublicBook("Luke")`，因此无法在本环境用阅读页点开这些公开卡。对照与修补都落在公开数据包和台账 JSONL。

GitHub `verify`（`npm test`）在本分支与基线 `cursor/ohb-jeremiah-1to1-hold-queue-a460` 同样失败，根因是本快照缺创世记资源目录、`comprehensiveCommentaryResources.json`、`workbenchSyncedResources-v4.json`，以及 CI 环境没有 `rg`。失败面不读 `public/data/books/Luke.json`。不补造这些真源，也不为了绿 CI 把隔离 CMC 抬进公开包。
