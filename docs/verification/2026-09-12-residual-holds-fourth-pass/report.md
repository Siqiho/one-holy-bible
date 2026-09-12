# 66 卷后第四轮：残余 OCR / 隔离 CMC 台账 / 公开包回归加厚

- 复核日期：2026-09-12
- 基线：`cursor/ohb-residual-holds-third-pass-796c`（PR #33 顶端；第三轮残余 hold 清单已钉）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 创世记图像：本快照**没有** `src/assets/resources/genesis/images/`
- 结论：隔离 ∩ 公开仍为 ∅。第四轮不新抬隔离 CMC，不改六源标识，不假设 Mac `Resources/`。公开研修本 **9,089**、公开文字卡 **10,096** 不变。前两轮已禁残串继续为空；第四轮又从公开研修本四字段清掉 112 张仍留包内的高置信 OCR / 表尾（迎百农 / 迎拿 / 边拿 / 迎萨 / 迎特 / 弥迎 / 舍已 / 爱人如已 / 人侵 / 误人歧途 / 霞惊 / `39a本书` / `10002000英尺` 等），并把 66 份卷测全部扩到 title+body+summary+searchText。

## 1. 范围与方法

判定口径仍是马太方法：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒 / 中截尾句。
- **hold**：中截 / 表倾倒 / 乱码到无源 PDF 不能复原。

本轮不再展开未审卷，也不重审 347 张已撤研修本 hold。只做跨卷第四过：

1. 扩大残余 OCR / 中截禁串：在第三轮清单之外，再扫公开研修本四字段，抓住卷测只查 title+body 时漏掉的 summary/searchText 残串。
2. 隔离 CMC 台账完整性：18,387 张 ledger-only CMC 的排序哈希、65 卷分册计数、哨兵 ID 全部钉死；确认无一出现在公开包。
3. 加厚公开包回归：跨卷禁止第三轮同类 + 本轮新抓到的迎/迦、已/己、人/入、表轴倾倒。
4. 记录全量 `vitest` 已知阻断（缺创世记图像 / 工作台 v4 / 本快照 Node 22 / `rg`），不补造夹具。
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

## 3. 已 fix（公开研修本 112 张，不撤卡）

只改 `study-bible-*` 的 `title` / `body` / `summary` / `searchText`。不改经文，不改 OCR 卡。字段级记录见 `fourth-pass-fixes.json`（269 行）。

大量残串只在 summary/searchText：正文早已干净，卷测只扫 title+body 时漏掉。本轮按同卡正文对齐，不补造新句。

| 串 | 还原 | 例 |
| --- | --- | --- |
| `迎百农` | 迦百农 | 可 1:21 / 2:1；太 5:1 / 13:54 |
| `迎拿` / `边拿` | 迦拿 | 约 2:1 / 2:12 |
| `迎萨` | 迦萨 | 耶 47:2 |
| `迎特` | 迦特 | 诗篇导论（亚吉 / 抓住大卫） |
| `弥迎` | 弥迦 | 耶 26:18-19 |
| `舍已` / `固执已见` / `爱人如已` / `占为已有` | 己 | 可 8:34；太 11:16 / 22:39；出 22:9 |
| `人侵` | 入侵 | 创 / 耶 / 结 / 赛 / 哈 |
| `误人歧途` / `初人教` | 误入 / 初入 | 约一 1:8；提前 3:6 |
| `霞惊` / `慢子` / `宜告了` / `彰昆` | 震惊 / 幔子 / 宣告 / 彰显 | 约 3:16 / 14:6；太 27:50 |
| `《《旧约〉` / `《<圣经〉概述》` / `《《和修》` | 书名括号 | 何 / 结 / 耶 / 路 / 雅 |
| `39a本书` / `10002000英尺` / `］V见徒` | 删表尾 | 太 15:32；路 19:30；罗 8:7 |

未改：

- `Iesous`：希腊文转写，keep。
- `形成鲜明对比`：完整汉语，keep。
- 可读年表里的 `主后30`：不是轴倾倒，keep。
- `参了、12节`、`受差遣的遭者自己`、`路加懞只提到`、耶 26:19「审判官。坐在，时」：中截，无 PDF 不补造。

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

新增 `src/data/residualHoldsFourthPass.test.ts`：

- 第二 / 三轮禁串仍空；第四轮扩表跨四字段为空。
- 隔离 CMC 18,387 的哈希、65 卷分册、哨兵 ID 与公开包不相交。
- 公开 CMC 858 全是 `cmc-gen-*`。
- 112 张第四轮修补清单与公开包 1:1，卡数不变。
- 66 份卷测全部改为四字段；不补造 v4 / 创世记图像。

## 6. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts src/data/residualHoldsInventory.test.ts src/data/residualHoldsThirdPass.test.ts src/data/residualHoldsFourthPass.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts scripts/generatePublicBibleData.test.mjs scripts/validatePublicRepository.test.mjs`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、公开文字卡 10,096、无不安全串。
- `node scripts/validatePublicRepository.mjs`：通过。
- 原始输出见同目录 `validate.txt`。

全量 `vitest run` / GitHub `verify` 的失败面仍是缺创世记图像、缺工作台 v4、缺综合解读生成 JSON / Doré 缩图，以及本快照 Node 22 跑 `.mts` / runner 无 `rg`。不读本轮公开包修补，不补造真源。明细见 `full-vitest-blockers.md`。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地阅读页不走 `loadPublicBook`。对照与修补都落在公开数据包和台账 JSONL。
