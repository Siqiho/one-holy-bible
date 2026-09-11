# 创世记 1:1 复核与约翰 hold 队列分源判定

- 复核日期：2026-09-11
- 基线：`cursor/john-gospel-1to1-review-4102`（约翰福音 1:1 已闭合）
- 台账包：`local-audit-pack/john-gospel-20260909/`
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`（公开 v0.1.0 经文卡包）
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：约翰 leftover 已按 CMC / 启导本 / OCR 给出 keep/fix/hold；下一高价值卷是创世记公开包。已从公开面包撤下 519 张确认的无解释/OCR 损坏卡，并最小修补 1 张创世记研修本卡。

## 1. 范围与方法

只依据本仓库快照，不假设 Mac 本地 `Resources/` 或 Edit API 仍可访问。

对照路径：

1. 约翰台账：`card候选清单.jsonl`、`placement候选清单.jsonl`、`暂不同步清单.jsonl`、`README-held-1to1-repair.md`。
2. 全卷无解释隔离：`no-explain-isolation-20260731/card候选清单.jsonl`（18,397）。
3. 公开包：`public/data/books/*.json`、`public/data/manifest.json`。
4. 创世记稳定注释：`src/data/generated/genesisCommentaryResources.json`（只读对照，不把 `/Users` 元数据写入公开包）。
5. 代码路径：`src/data/genesisCommentaryResources.test.ts`、`scripts/generatePublicBibleData.mjs`、`src/lib/backlinks.ts`。

判定口径与约翰 1:1 相同：

- **keep**：锚点合法、正文可读、不应再改。
- **fix**：已确认的映射/正文质量问题，且能在仓库内安全修补。
- **hold**：证据不足、无解释、OCR/启导本未审定，或损坏到无法在无源 PDF 条件下可靠复原。

选择创世记而不是路加/马太：本地台账包没有下一卷专包；公开文字卡最多的是创世记（原 1,640），且隔离包与公开包在创世记上有 506 张同文重叠。这是约翰 leftover 之后最高价值的 1:1 面。

## 2. 约翰 leftover：CMC / 启导本 / OCR hold 队列

约翰公开包本轮不改（维持 409）。台账 1,533 + 1 孤儿的去向保持闭合，下面把原先整包 hold 拆成可执行的子队列。

### 2.1 CMC 综合解读（765）

| 子队列 | 张数 | 证据 | 判定 |
| --- | ---: | --- | --- |
| 无解释隔离 | 156 | 与隔离包约翰卡 1:1；`no-explanation-scripture-only` + `quarantined-from-reader`；公开包 0 | **hold** |
| 台账 `syncable` | 609 | 本快照无 CMC/工作台投影，也不是 v0.1.0 公开文字卡范围 | **keep-as-ledger-only**（不抬进公开包） |

抽样 `cmc-john-4-43`、`cmc-john-6-48` 仍只有经文引句。不改台账，不伪造投影。

### 2.2 启导本（267 + 1 孤儿）

`README-held-1to1-repair.md`：35 目标、23 已原地修补、12 未修。card 行 210 `syncable` / 57 `temporarily_unsynced`，但 app/暂不同步清单同时 hold（`matt-to-acts optimize`）。以更严清单为准，**全部不进公开包**。

互斥子队列：

| 子队列 | 张数 | 例 | 判定 |
| --- | ---: | --- | --- |
| `needs-ocr-repair` / `weak-ocr-candidate` | 10 | `qidaben-john-3-8` 只剩「“风”字在希腊文与希伯来文中都与“圣灵”同属一个」；`4-10`「耶稣」后中截；`5-1`「重点在讲耶稣的事工是不」 | **hold**。无源 PDF，不能补全。 |
| `group15-residual`（不含上列） | 6 | `1-10`、`1-28`、`12-3` 可读但未过公开审定；`1-21` 收尾截断；`5-43` 串入 6:4 逾越节残片 | **hold**。可读者也不抬；串章者尤其不能修。 |
| `held-1to1-repaired`（不含上列） | 21 | 台账已标修补，公开包仍 0 | **hold**。修补在 Edit 真源，本快照不抬 syncable。 |
| `group15-hc-repair`（不含上列） | 3 | `14-1`、`18-40`、`19-7` | **hold**。高置信台账修补 ≠ 公开审定。 |
| 其余启导本 | 227 | OCR 候选 + 试验源 | **hold** |
| 孤儿 `qidaben-john-15-18-p1496-n001` | 1 | 只有 placement/audit；`pdf-audit-soft-deleted`、`group15-soft-delete-garbage` | **hold**，不要补回 card 清单 |

**本轮对启导本无 fix。** 12 张未修目标全部落在 `needs-ocr-repair` / residual 串章，不能在无 PDF 条件下最小复原。

### 2.3 约翰 OCR（1）

`image-text-43-约翰福音-codex-pdf-p019-img004`：上一轮已 **hold / 移出公开包**。本轮确认未回潮。

### 2.4 其余约翰 hold（不变）

- 82 张宽范围研修本：**hold**
- 5 张 Hurlbut：**hold**
- 9 张公开导论：继续 **keep**（台账仍写 `temporarily_unsynced`，属历史漂移，不撤）

## 3. 创世记公开包 1:1

复核前：1,640 = CMC 1,364 + 研修本 272 + OCR 1 + 信息系列 3。

| 源 | 复核前 | 复核后 | 判定 |
| --- | ---: | ---: | --- |
| CMC 综合解读（有解释） | 858 | 858 | **keep**。与 `genesisCommentaryResources.json` 正文一致，如 `cmc-gen-1-1`。 |
| CMC 无解释隔离泄漏 | 506 | 0 | **hold / 移出公开包**。与隔离包同文；`genesisCommentaryResources.test.ts` 已禁止「只重复经文的 CMC」进入稳定注释。 |
| 研修本 verse/导论 | 272 | 272 | 主体 **keep**；1 张 **fix** |
| OCR 图转文 | 1 | 1 | **keep**。`image-text-01-创世记-codex-pdf-p102-img057` 挂 `Gen.8.1`，讲方舟与活物得记念，正文可读。 |
| 圣经信息系列 | 3 | 3 | **keep**。长篇补充释经，锚在 `Gen.4.1` / `5.1` / `10.1`。 |

隔离包创世记 CMC 508 张：506 张曾在公开包且正文与隔离包完全相同（短经文引句，如 `cmc-gen-1-3` =「神说：「要有光」，就有了光。」）；2 张本来就没进公开包（`cmc-gen-24-29-30`、`cmc-gen-43-19`），继续 **hold**。

`cmc-gen-1-3` 在稳定注释文件里另有 588 字完整解读，但公开包里的是隔离残句。本轮按隔离合同撤下公开残句，**不**把带 `/Users/simon/...` 的 debugMeta 拷进公开包。完整解读仍在本地 App 的 `genesisCommentaryResources.json`。

103 张偏短但**不在**隔离包的 CMC（如 `cmc-gen-5-18` 解释「以诺」字义）是有注释的短卡，**keep**。

研修本 272 张锚点全部合法。唯一高置信损坏：

| ID | 问题 | 判定 |
| --- | --- | --- |
| `study-bible-gen-14-18-p033-n114` | 麦基洗德段完整可读；随后希伯来神名表倾倒（`E/Elyon`、`E/Ro1`、`E/Shadday`），收尾「这些名字强调上帝的不」中截；`更尊贵《来5:5-10` 括号不配 | **fix**：保留麦基洗德段，删神名残表，闭合为「更尊贵（来5:5-10,6:20-7:17）。」 |

## 4. 隔离包对其余公开卷的泄漏

隔离包 18,397 张全部带 `no-explanation-scripture-only` + `quarantined-from-reader`。除创世记 CMC 外，公开包还泄漏了 10 张研修本「只引经文」卡：

| 卷 | ID | 公开正文 | 判定 |
| --- | --- | --- | --- |
| 1Thess | `study-bible-1thess-2-19-p007-n029` 等 5 张 | 如 `"我们主耶稣来的时候，你们在他面前"` | **hold / 移出** |
| 1Tim | `study-bible-1tim-6-6-p008-n054` | `"敬虔加上知足的心便是大利"` | **hold / 移出** |
| Acts | `study-bible-acts-13-49-p019-n138` | `于是主的道传遍了那一带地方。` | **hold / 移出** |
| Col | `study-bible-col-2-3-p008-n039-2-2` | `所积蓄的一切智慧知识，都在他里面藏着` | **hold / 移出** |
| Phil | `study-bible-phil-1-27-p008-n039`、`phil-2-25` | 短引句 | **hold / 移出** |

撤下后：隔离包 ∩ 公开包 = ∅。

## 5. 跨卷 OCR 高置信损坏

公开包仍有 149−1（约翰已撤）−3（本轮撤）= 145 张 OCR 卡。**不**改生成器、不整包撤 OCR。只撤本轮能独立确认损坏的 3 张：

| ID | 锚点 | 问题 | 判定 |
| --- | --- | --- | --- |
| `image-text-05-申命记-codex-pdf-p028-img012` | `Deut.3.6` | `民二十—3`；`尽都毁灭口`；希伯来转写倾倒 | **hold** |
| `image-text-07-士师记-codex-pdf-p003-img001` | `Judg.17.6` | `二十—25`（士 21:25）；`D"9I/ Shofetim`、`7"n/Tanakh` | **hold** |
| `image-text-20-箴言-codex-pdf-p155-img063` | `Prov.19.24` | `申二十—18`；`79!/ya-sar’` | **hold** |

`二十—` 在这三处都能读成「二十一」，但同卡还有无法安全复原的转写垃圾，故整卡 hold，不作文内替换。

其余 OCR（箴言 33、诗篇 10、雅歌 11 等）继续 **hold-as-class / 本轮不改**，等有卷级台账再 1:1。

## 6. 已落地的仓库修改

1. `public/data/books/Gen.json`：删除 506 张隔离 CMC；修补 `study-bible-gen-14-18-p033-n114`。1,640→1,134。
2. `public/data/books/{1Thess,1Tim,Acts,Col,Phil}.json`：删除 10 张隔离研修本短引句。
3. `public/data/books/{Deut,Judg,Prov}.json`：删除 3 张损坏 OCR。
4. `public/data/manifest.json`：更新上述 9 卷的 `bytes` / `sha256` / `textCardCount`。公开文字卡 10,958→10,439。
5. `src/data/genesisPublicCardAudit.test.ts`：锁住创世记构成、隔离包不得回潮、已知损坏串不得回潮、约翰 leftover 源继续不在公开包。
6. 本报告。

未做：

- 不重写台账 JSONL。
- 不把启导本 / 约翰 CMC / Hurlbut 抬进公开包。
- 不伪造缺失的工作台 v4 投影。
- 不把 `genesisCommentaryResources.json` 的本地路径元数据写入公开包。
- 不批量改写其余 145 张 OCR，也不改 `generatePublicBibleData.mjs` 的通用过滤策略。

## 7. 1:1 总判

创世记公开包：

| 去向 | 张数 |
| --- | ---: |
| 公开保留 CMC（有解释） | 858 |
| 公开保留研修本 | 272（含 1 处 fix） |
| 公开保留信息系列 | 3 |
| 公开保留创世记 OCR | 1 |
| 从公开包撤下的隔离 CMC | 506 |
| **合计（复核前公开创世记）** | **1,640** |

约翰 leftover 与跨卷隔离：

| 去向 | 张数 |
| --- | ---: |
| 约翰 CMC 隔离 / syncable | 156 hold + 609 ledger-only |
| 约翰启导本 card + 孤儿 | 267 + 1 全部 hold |
| 约翰 OCR | 1 hold（已在上轮撤下） |
| 跨卷隔离研修本短引句 | 10 hold / 本轮撤下 |
| 跨卷确认损坏 OCR | 3 hold / 本轮撤下 |

公开包与隔离合同可以收束为：

> v0.1.0 公开文字卡不得包含无解释隔离包中的卡。创世记公开 CMC 只保留有解释的综合解读；研修本短引句与确认损坏的 OCR 同样不进入公开阅读面。约翰启导本 / CMC / 故事卡继续全部 hold。

## 8. 验证

已跑：

- `vitest run src/data/genesisPublicCardAudit.test.ts src/data/johnGospelPublicCardAudit.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`
- `node scripts/validatePublicRepository.mjs`

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地 `App.tsx` 不走 `loadPublicBook`，因此无法在本环境用阅读页点开这些公开卡。对照与修补都落在公开数据包和台账 JSONL。
