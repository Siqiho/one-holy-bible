# 66 卷后第十四轮：残余 OCR / 隔离 CMC 台账 / 第十三轮禁串加厚

- 复核日期：2026-09-12
- 基线：`cursor/ohb-residual-holds-thirteenth-pass-32a5`（PR #45 顶端；第十三轮残余 hold 清单已钉）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 创世记图像：本快照**没有** `src/assets/resources/genesis/images/`
- 结论：隔离 ∩ 公开仍为 ∅。第十四轮不新抬隔离 CMC，不改六源标识，不假设 Mac `Resources/`。公开研修本 **9,089**、公开文字卡 **10,096** 不变。前十二轮已禁残串继续为空；第十四轮又从公开研修本四字段清掉 **31** 张仍留包内的高置信 OCR / 节号列表句号 / 和修缺闭括号 / 交叉字段脏拷（`宜称` / `宜讲` / `宜布` / `宜道` / `好儿里` / `儿个墓室` / `：后14:8` / `参后21:27` / `流人加利利` / `目已` / `膜责` / `壁宛` / `l0Culi` / `学米证实` / `西面人口` / `5:37。6:46` / 9 张和修缺 `）` / 7 张交叉字段脏拷等），并把第十三轮核心禁串（`排尼基` / `后餅` / `干万人` / `干代` / `目子` / `宜认` / `诗赛` / `后1:17` / 节号 `：.`）再钉进第十四轮禁表。

## 1. 范围与方法

判定口径仍是马太方法：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒 / 中截尾句。
- **hold**：中截 / 表倾倒 / 乱码到无源 PDF 不能复原。

本轮不再展开未审卷，也不重审 347 张已撤研修本 hold。只做跨卷第十四过：

1. 再扫公开研修本四字段，抓住第十三轮漏掉的宜/宣、儿/几、后/启（章号超出林后/彼后/帖后/提后）、人/入、目/自、膜/履、宛/龛、0/o、米/来，以及括号内节号列表把 `。` 当分隔、和修闭引号后缺 `）`、交叉字段脏拷。
2. 隔离 CMC 台账完整性：18,387 张 ledger-only CMC 的排序哈希、65 卷分册计数、哨兵 ID 全部重钉；确认无一出现在公开包。
3. 加厚公开包回归：跨卷禁止第十三轮同类 + 本轮新抓到的宜称/好儿里/儿个/后14/后21/流入/目已/膜责/壁宛/l0Culi。
4. 记录全量 `vitest` 已知阻断（缺创世记图像 / 工作台 v4 / 本快照 Node 22 / `rg`），不补造夹具。
5. 盘点交叉字段脏拷：只按正文抄高置信残串（耶 22:5 / 约 7:14 / 7:28 / 尼 13:31 / 箴 19:25 / 约壹 5:8 / 申 7:6 的和修缺 `）`），不整段重写 summary。

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

## 3. 已 fix（公开研修本 31 张，不撤卡）

只改 `study-bible-*` 的 `title` / `body` / `summary` / `searchText`。不改经文，不改 OCR 卡。字段级记录见 `fourteenth-pass-fixes.json`（83 行：12 张唯一 OCR + 3 张节号/句号 + 9 张和修缺闭括号 + 7 张交叉字段脏拷）。

| 串 | 还原 | 例 |
| --- | --- | --- |
| `宜称` / `宜讲` / `宜布` / `宜道` | 宣称 / 宣讲 / 宣布 / 宣道 | 伯 33:1；路 22:30；可 6:11；约 18:28；路 1:4 |
| `好儿里` / `儿个墓室` | 好几里 / 几个墓室 | 太 14:24；约 20:6 |
| `：后14:8` / `参后21:27` | 启14:8 / 启21:27 | 赛 13:1；加 5:5 |
| `流人加利利` / `西面人口` | 流入 / 入口 | 路 18:33；约 18:28 |
| `目已` / `膜责` | 自己 / 履责 | 出 9:34；林前 9:17 |
| `壁宛` / `l0Culi` / `学米证实` | 壁龛 / loculi / 来证实 | 约 20:6（同卡 arcosolia/壁龛对照） |
| `5:37。6:46` | `5:37.6:46` | 约 14:6 括号内节号列表 |
| `（《和修》"不法".见` / `关于"应许".见` | `，见` | 徒 4:28；来 8:6 |
| 9 张和修缺 `）` | 闭引号后接续正文补 `）` | 徒 15:7；拉 9:8；创 38:21；约 5:2 / 5:26 / 7:37 / 8:24 / 16:11；番 1:12 |
| 7 张交叉字段脏拷 | 按正文已闭和修抄 title/summary/searchText | 耶 22:5；约 7:14 / 7:28；尼 13:31；箴 19:25；约壹 5:8；申 7:6 |

未改：

- `宣称` / `宣讲` / `宣布` / `宣道` / `好几里` / `几个` / `启14:8` / `流入加利利海` / `流人血` / `自己的责任` / `履责` / `壁龛` / `loculi` / `西面入口`：keep。
- `太1：！`：节号不能唯一还原，hold。
- `口才（1.：2:3-4`、`懞`、`（《和庭"`、`在恒审判` / `那督的人得`：继续 hold。
- 出 9:34 `法老3］9本书…` 句中表轴、约 5:2 `柱廊廊`、约 5:26 `面有生命`、路 18:33 倾倒、约 20:6「这耶稣的坟墓福音书作者」：中截，hold。
- 雅 2:5「拣选 / 选举」：两词合法，不按正文改写。

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

新增 `src/data/residualHoldsFourteenthPass.test.ts`：

- 第二 / 三 / 四 / 五 / 六 / 七 / 八 / 九 / 十 / 十一 / 十二 / 十三轮禁串仍空；第十四轮扩表跨四字段为空。
- 第十三轮核心类（排尼基 / 后餅 / 干万人 / 目子 / 宜认 / 诗赛 / 后1:17 / 节号 `：.`）单独再钉。
- 隔离 CMC 18,387 的哈希、65 卷分册、哨兵 ID 与公开包不相交。
- 公开 CMC 858 全是 `cmc-gen-*`。
- 31 张第十四轮修补清单与公开包 1:1，卡数不变。
- 66 份卷测全部保持四字段，并写入本轮新禁串；不补造 v4 / 创世记图像。

## 6. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts src/data/residualHoldsInventory.test.ts src/data/residualHoldsThirdPass.test.ts src/data/residualHoldsFourthPass.test.ts src/data/residualHoldsFifthPass.test.ts src/data/residualHoldsSixthPass.test.ts src/data/residualHoldsSeventhPass.test.ts src/data/residualHoldsEighthPass.test.ts src/data/residualHoldsNinthPass.test.ts src/data/residualHoldsTenthPass.test.ts src/data/residualHoldsEleventhPass.test.ts src/data/residualHoldsTwelfthPass.test.ts src/data/residualHoldsThirteenthPass.test.ts src/data/residualHoldsFourteenthPass.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts scripts/generatePublicBibleData.test.mjs scripts/validatePublicRepository.test.mjs`：**83 files, 342 tests passed**
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、31,102 CUV/KJV、10,096 文字卡、0 unsafe
- `node scripts/validatePublicRepository.mjs`：8 required files, Node 24

全量 `vitest run` / GitHub `verify` 的失败面仍是缺创世记图像、缺工作台 v4、缺综合解读生成 JSON / Doré 缩图，以及本快照 Node 22 跑 `.mts` / runner 无 `rg`。不读本轮公开包修补，不补造真源。明细见 `full-vitest-blockers.md`。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地阅读页不走 `loadPublicBook`。对照与修补都落在公开数据包和台账 JSONL。
