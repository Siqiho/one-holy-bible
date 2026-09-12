# 66 卷后第九轮：残余 OCR / 隔离 CMC 台账 / 第八轮禁串加厚

- 复核日期：2026-09-12
- 基线：`cursor/ohb-residual-holds-eighth-pass-4747`（PR #38 顶端；第八轮残余 hold 清单已钉）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 创世记图像：本快照**没有** `src/assets/resources/genesis/images/`
- 结论：隔离 ∩ 公开仍为 ∅。第九轮不新抬隔离 CMC，不改六源标识，不假设 Mac `Resources/`。公开研修本 **9,089**、公开文字卡 **10,096** 不变。前七轮已禁残串继续为空；第九轮又从公开研修本四字段清掉 71 张仍留包内的高置信 OCR / 开引号星号 / 多余闭引号 / 年表脏引号 / 交叉字段脏拷（`约瀚` / `加人` / `落人` / `混人` / `深人` / `融人` / `带人歧途` / `有出人` / `因禁` / `子官` / `希伯来¥经` / `《创，世记》` / `和修"向他下跪》` / `（*离散` / `*无礼〞` / `情词迫场` / `年"）` / `11*天"` / `*新油之子` / `"败亡之人""` / `收劃` / `残人自肥` 等），并把第八轮核心禁串（`好诈` / `尼布撤拉旦` / `未后` / `因力` / `辨论` / `暂学家` / `萦福` / `劫活泼` / `王官` / `官殿` / `纳人罗马` / `水恒` / `糖物` / `负资` / table-prefix / `1"` / star-as-opener / gloss closers）再钉进第九轮禁表。

## 1. 范围与方法

判定口径仍是马太方法：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒 / 中截尾句。
- **hold**：中截 / 表倾倒 / 乱码到无源 PDF 不能复原。

本轮不再展开未审卷，也不重审 347 张已撤研修本 hold。只做跨卷第九过：

1. 再扫公开研修本四字段，抓住第八轮漏掉的人/入、瀚/翰、官/宫、因/囚、开引号星号、多余闭引号、以及 summary/searchText 脏拷。
2. 隔离 CMC 台账完整性：18,387 张 ledger-only CMC 的排序哈希、65 卷分册计数、哨兵 ID 全部重钉；确认无一出现在公开包。
3. 加厚公开包回归：跨卷禁止第八轮同类 + 本轮新抓到的约瀚/加人/落人/因禁/子官。
4. 记录全量 `vitest` 已知阻断（缺创世记图像 / 工作台 v4 / 本快照 Node 22 / `rg`），不补造夹具。
5. 盘点交叉字段脏拷：只按正文 / searchText 抄高置信残串，不整段重写 summary。

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

## 3. 已 fix（公开研修本 71 张，不撤卡）

只改 `study-bible-*` 的 `title` / `body` / `summary` / `searchText`。不改经文，不改 OCR 卡。字段级记录见 `ninth-pass-fixes.json`（195 行）。

| 串 | 还原 | 例 |
| --- | --- | --- |
| `约瀚` | 约翰 | 可 15:25《约翰福音》；约 3:29 施洗约翰；约壹 4:14 |
| `加人` | 加入 | 徒 2:41 / 16:10；赛 42:11；路 5:30；可 4:11；多导论（不改 `dia加人名属格`） |
| `落人` | 落入 | 约 18:28 落入罗马；何 3:2；犹 24（不改 `堕落人性`） |
| `混人` / `深人` / `融人` / `带人歧途` | 混入 / 深入 / 融入 / 带入歧途 | 出 32:6；路 6:7；可 12:16；箴 14:24 |
| `有出人` | 有出入 | 创 11:32（不改 `出人意料`） |
| `因禁` / `子官` | 囚禁 / 子宫 | 弗 6:9；耶 31:22 |
| `希伯来¥经` / `《创，世记》` | 希伯来圣经 / 《创世记》 | 箴 30:1；创世记导论 |
| `（《和修"向他下跪》` | `（《和修》"向他下跪"` | 太 9:18 |
| `（*离散；diaspora）` / `*无礼〞` / `11*天"` / `：*新油之子）` | 星号当开引号 | 徒 8:1；路 11:8；赛 24:18；亚 4:14 |
| `情词迫场` | 情词迫切 | 路 11:8（searchText 已是迫切） |
| `67年"）` / `52-57年"）` | 删年表脏引号 | 约 / 太导论；多导论 |
| `"败亡之人""` / `"切一个约""` / `"十二使徒""` | 删多余闭引号 | 林前 2:6 / 15:7；撒上 11:2（短 gloss 后 `""，` / `""。`） |
| `收劃` / `残人自肥` | 收割 / 损人自肥 | 雅 5:4 summary/searchText 按正文抄（不改同卡表轴 `*不可……起……誓`） |

未改：

- `dia加人名属格`、`堕落人性`、`出人意料`、`浩瀚宇宙`、`释放人自由`、`《次经，马加比传上》`、`非利士地`、`希伯来话`、`隐罗结`、`ViaDolorosa`、`《和修》注`、`征收人头税` / `纳人头税`、`悦纳人`、`救赎大工`、`着重`、`善事上常用`、`昆虫` / `昆兰` / `撤离`、`墻垣` / `墻壁`：keep。
- `美好计划`、`味道很不好细心栽培`：子串不是奸计 / 奸细。
- `懞`（路 6:29 / 19:30；诗 12:8）：无唯一还原，hold。
- `参了、12节`、`遭者自己`、赛 7:14 两侧中截、徒 22:28 倾倒：hold。
- 徒 14:2 `/23节；见本书9:2章`：表头后是徒 18 亚波罗材料，hold。
- 诗 41:13「其中首似乎」：有些 / 三首不唯一，hold。
- 林前 11:4「先了当时」、林前 11:29「吃喝自己的吃喝…）」：中截。
- 年表 / 大纲脚注星号（`年*`、`2:12*`）：不是闭合引号，不批量删。
- 林前 7:39 `意*愿意`、徒 3:18 表倾倒、徒 4:13 `（*放胆》`、约 19:14 `约"是：*`：中截，不补造。
- 雅 4:11 `*不可彼此批评`、雅 5:4 `*不可……起……誓`、徒 13:48 `*凡预定…`：表轴残句，hold。
- 约壹导论 `或某位""，`、路 9:60 `也表示""。`：空 gloss，hold。
- 太 12:27 `径异仪式`：驱邪 / 禁咒不唯一，hold。
- 代上导论 `'编年史""。`：嵌套单引号，hold。
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

新增 `src/data/residualHoldsNinthPass.test.ts`：

- 第二 / 三 / 四 / 五 / 六 / 七 / 八轮禁串仍空；第九轮扩表跨四字段为空。
- 第八轮核心类（好诈 / 尼布撤拉旦 / 未后 / 因力 / 辨论 / 暂学家 / 萦福 / 劫活泼 / 王官 / 官殿 / 纳人罗马 / 水恒 / 糖物 / 负资 / table-prefix / star-as-opener / gloss closers）单独再钉。
- 隔离 CMC 18,387 的哈希、65 卷分册、哨兵 ID 与公开包不相交。
- 公开 CMC 858 全是 `cmc-gen-*`。
- 71 张第九轮修补清单与公开包 1:1，卡数不变。
- 66 份卷测全部保持四字段，并写入本轮新禁串（含提前后 / 申 / 结 / 来 / 伯 / 尼 / 诗 / 罗的多余闭引号，以及雅各 `收劃` / `残人自肥`）；不补造 v4 / 创世记图像。

## 6. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts src/data/residualHoldsInventory.test.ts src/data/residualHoldsThirdPass.test.ts src/data/residualHoldsFourthPass.test.ts src/data/residualHoldsFifthPass.test.ts src/data/residualHoldsSixthPass.test.ts src/data/residualHoldsSeventhPass.test.ts src/data/residualHoldsEighthPass.test.ts src/data/residualHoldsNinthPass.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts scripts/generatePublicBibleData.test.mjs scripts/validatePublicRepository.test.mjs`：**78 files, 312 tests passed**
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、31,102 CUV/KJV、10,096 文字卡、0 unsafe
- `node scripts/validatePublicRepository.mjs`：通过

明细见 `validate.txt`。

全量 `vitest run` / GitHub `verify` 的失败面仍是缺创世记图像、缺工作台 v4、缺综合解读生成 JSON / Doré 缩图，以及本快照 Node 22 跑 `.mts` / runner 无 `rg`。不读本轮公开包修补，不补造真源。明细见 `full-vitest-blockers.md`。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地阅读页不走 `loadPublicBook`。对照与修补都落在公开数据包和台账 JSONL。
