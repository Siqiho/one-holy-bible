# 66 卷后第三轮：残余 OCR / 隔离 CMC 台账 / 公开包回归加厚

- 复核日期：2026-09-12
- 基线：`cursor/ohb-residual-holds-second-pass-fa57`（PR #32 顶端；第二轮残余 hold 清单已钉）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 创世记图像：本快照**没有** `src/assets/resources/genesis/images/`
- 结论：隔离 ∩ 公开仍为 ∅。第三轮不新抬隔离 CMC，不改六源标识，不假设 Mac `Resources/`。公开研修本 **9,089**、公开文字卡 **10,096** 不变。第二轮已禁残串继续为空；第三轮又从公开研修本清掉 29 张仍留包内的高置信 OCR / 表尾（试採 / 约輸 / 掌捆 / 差遭 / 差遺 / 迎玛列 / 迎勒底 / 迎得 / 别迎摩 / 指资 / 《《圣经 / `15］S本书`）。

## 1. 范围与方法

判定口径仍是马太方法：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒 / 中截尾句。
- **hold**：中截 / 表倾倒 / 乱码到无源 PDF 不能复原。

本轮不再展开未审卷，也不重审 347 张已撤研修本 hold。只做跨卷第三过：

1. 扩大残余 OCR / 中截禁串：在第二轮清单之外，扫公开研修本四字段（`title` / `body` / `summary` / `searchText`），抓住卷测只查 title+body 时漏掉的 summary/searchText 残串。
2. 隔离 CMC 台账完整性：18,387 张 ledger-only CMC 的排序哈希、65 卷分册计数、哨兵 ID 全部钉死；确认无一出现在公开包。
3. 加厚公开包回归：跨卷禁止 `旧日约` / `迎南` / `服待` / `自已` / `诚命` / `吩附` / `进人` / `陷人` 类，以及第三轮新抓到的同族 OCR 与表轴倾倒。
4. 记录全量 `vitest` 已知阻断（缺创世记图像 / 工作台 v4 / 本快照 Node 22），不补造夹具。
5. 盘点下一轮必须靠 Mac Resources / 源 PDF 才能动的公开卡债务。

## 2. 隔离 CMC 台账

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同** |
| 隔离 CMC | 18,387 | **hold / ledger-only**；排序 SHA-256 `fa086c106e0fe8f96facdc00e0946233b524a28e25d02c8a13ff8cb74643c257` |
| 隔离创世记 CMC | 508 | 含 `cmc-gen-1-3`；公开创世记 CMC 858 与此不相交 |
| 公开 CMC | 858 | 全部 `cmc-gen-*`；排序 SHA-256 `57faabdbe9c8ced51267e6b1142581e1e5475c08e6392f8d2451f93bb87377f6` |
| 隔离研修本 | 10 | 继续 hold，未回潮 |
| 约翰 leftover OCR | 1 | 未回潮 |

哨兵（均在隔离、均不在公开）：`cmc-matt-1-9`、`cmc-luke-1-37`、`cmc-john-4-1`、`cmc-acts-1-1`、`cmc-ps-1-5`、`cmc-isa-1-2`、`cmc-gen-1-3`、`cmc-rom-1-9`、`cmc-mark-1-23`。

分册计数见 `isolation-cmc-ledger.json`。不抬隔离 CMC，不改六源映射。

## 3. 已 fix（公开研修本 29 张，不撤卡）

只改 `study-bible-*` 的 `title` / `body` / `summary` / `searchText`。不改经文，不改 OCR 卡。字段级记录见 `third-pass-fixes.json`（84 行）。

| 串 | 还原 | 例 |
| --- | --- | --- |
| `试採` | 试探 | 出 17:2 |
| `约輸` | 约翰 | 约 1:23 |
| `掌捆` | 掌掴 | 约 18:22（马太已列此类） |
| `指资` | 指责 | 约 18:22 |
| `差遭` / `差遺` | 差遣 | 约一 / 约翰 / 耶利米 / 路加；约一 5:18 只在 summary/searchText |
| `迎玛列` | 迦玛列 | 徒 5:36（迎/迦 同类） |
| `迎勒底` | 迦勒底 | 但 3:12、创 11:28 |
| `位于迎得的北疆` | 位于迦得的北疆 | 摩 6:13 |
| `别迎摩` | 别迦摩 | 徒 17:23 |
| `《《圣经〉概述》` | `《〈圣经〉概述》` | 提前 / 林后 / 弗 / 路 / 约 / 罗 |
| `］15］S本书2:454:34/［林后8:14.36` | 删表尾 | 徒 4:28（同类于第二轮 `15］e本书32:28`） |

未改：

- `Iesous`：希腊文转写，keep。
- `形成鲜明对比`：完整汉语，keep。
- 可读年表里的 `主后30`：不是轴倾倒，keep。
- `参了、12节`、`受差遣的遭者自己`：中截，无 PDF 不补造。

## 4. 六源口径

不改标识字段，也不按用户全库数补造卡。

| 源 | 用户全库 | 公开（本轮后） | 对账 |
| --- | ---: | ---: | --- |
| 综合解读 | 29,476 | 858 | 缺口；隔离 18,387 ledger-only |
| 研修本 | 16,270 | **9,089** | 缺口；本轮 0 张撤 / 0 张救回 |
| 启导本 | 9,521 | 0 | 整类 hold |
| OCR | 254 | 146 | 1 keep + 145 hold-as-class |
| 圣经的故事 | 98 | 0 | 整类 hold |
| 信息系列 | 8 | 3 | 稳定注释 8 一致 |

## 5. 审计覆盖

新增 `src/data/residualHoldsThirdPass.test.ts`：

- 第二轮禁串仍空；第三轮扩表（试採 / 差遭 / 迎玛列 / 《《圣经 / 表轴正则等）跨四字段为空。
- 隔离 CMC 18,387 的哈希、65 卷分册、哨兵 ID 与公开包不相交。
- 公开 CMC 858 全是 `cmc-gen-*`。
- 29 张第三轮修补清单与公开包 1:1，卡数不变。
- 66 份卷测仍在；不补造 v4 / 创世记图像。

## 6. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts src/data/residualHoldsInventory.test.ts src/data/residualHoldsThirdPass.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts scripts/generatePublicBibleData.test.mjs scripts/validatePublicRepository.test.mjs`：72/72 通过（276 tests）。
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、公开文字卡 10,096、无不安全串。
- `node scripts/validatePublicRepository.mjs`：通过。
- 原始输出见同目录 `validate.txt`。

`vitest run` 全量：103 files / 419 tests，89 / 403 通过，14 files / 16 tests 失败。失败面是缺创世记图像、缺工作台 v4、缺综合解读生成 JSON / Doré 缩图，以及本快照 Node 22 跑 `.mts`；不读本轮公开包修补，不补造真源。GitHub `verify` 上 `validate:public-data` 已绿，全量 `npm test` 仍红，与 PR #32 同一类缺口。明细见 `full-vitest-blockers.md`。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地阅读页不走 `loadPublicBook`。对照与修补都落在公开数据包和台账 JSONL。
