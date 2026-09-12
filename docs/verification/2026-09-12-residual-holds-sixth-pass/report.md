# 66 卷后第六轮：残余 OCR / 隔离 CMC 台账 / 第五轮禁串加厚

- 复核日期：2026-09-12
- 基线：`cursor/ohb-residual-holds-fifth-pass-9fe9`（PR #35 顶端；第五轮残余 hold 清单已钉）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 创世记图像：本快照**没有** `src/assets/resources/genesis/images/`
- 结论：隔离 ∩ 公开仍为 ∅。第六轮不新抬隔离 CMC，不改六源标识，不假设 Mac `Resources/`。公开研修本 **9,089**、公开文字卡 **10,096** 不变。前四轮已禁残串继续为空；第六轮又从公开研修本四字段清掉 20 张仍留包内的高置信 OCR / 表尾 / 交叉字段脏拷（`仂敌` / `上常` / `完金` / `大工家` / `剧歌` / `人门` / `主前N一主前` / `［约8.47` / `188拿1:5` 等），并把第五轮核心禁串（`介人` / `宜告` / `藉者` / `官廷` / `宫延` / `后官` / `莱耀` / `故士` / `人狱` / `插人` / 表尾 / `主前N一主前` / `，，`）再钉进第六轮禁表。

## 1. 范围与方法

判定口径仍是马太方法：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒 / 中截尾句。
- **hold**：中截 / 表倾倒 / 乱码到无源 PDF 不能复原。

本轮不再展开未审卷，也不重审 347 张已撤研修本 hold。只做跨卷第六过：

1. 再扫公开研修本四字段，抓住第五轮漏掉的人/入、宫廷/荣耀邻类之外的唯一残串、日期一字线、以及 summary/searchText 脏拷。
2. 隔离 CMC 台账完整性：18,387 张 ledger-only CMC 的排序哈希、65 卷分册计数、哨兵 ID 全部重钉；确认无一出现在公开包。
3. 加厚公开包回归：跨卷禁止第五轮同类 + 本轮新抓到的仂敌/上常/完金/表轴倾倒。
4. 记录全量 `vitest` 已知阻断（缺创世记图像 / 工作台 v4 / 本快照 Node 22 / `rg`），不补造夹具。
5. 盘点交叉字段脏拷：只按正文抄高置信残串，不整段重写 summary。

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

## 3. 已 fix（公开研修本 20 张，不撤卡）

只改 `study-bible-*` 的 `title` / `body` / `summary` / `searchText`。不改经文，不改 OCR 卡。字段级记录见 `sixth-pass-fixes.json`（59 行）。

| 串 | 还原 | 例 |
| --- | --- | --- |
| `仂敌` / `大工家的王` | 仇敌 / 大卫家的王 | 诗 110:1 |
| `完金` / `上常` / `剧歌` | 完全 / 上帝 / 副歌 | 诗 41:13 |
| `人门规条` / `礼拜人门` | 入门 | 加 3:12；诗 25:22 |
| `这里意人必须` | 这里意即人必须 | 创 1:28 |
| `主前N一主前/主后` | `主前N—主前/主后` | 路 2:1；弥 6:15；民导论；箴导论 |
| `［约8.47…` / `节；本书1:20；［12,22节］` / `188拿1:5：［38节］` | 删表轴 | 约一 4:6；太 2:2；徒 27:7 |
| `13:19×［12节］` / 庙塔图注 | 按正文删脏拷 | 箴 12:18 summary；创 11:26 |
| `，：` / `：。` / `，；` / `，。` | 单标点 / 闭合引号 | 来导论；珥导论；可 7:19；诗 94 / 98 / 100 / 110 |

未改：

- `非利士地`、`希伯来话`、`隐罗结`、`ViaDolorosa`、`《和修》注`、`征收人头税`、`救赎大工`、`着重`：keep。
- `懞`（路 6:29 / 19:30；诗 12:8）：无唯一还原，hold。
- `参了、12节`、`遭者自己`、赛 7:14 两侧中截、徒 22:28 倾倒：hold。
- 徒 14:2 `/23节；见本书9:2章`：表头后是徒 18 亚波罗材料，hold。
- 诗 41:13「其中首似乎」：有些 / 三首不唯一，hold。
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

新增 `src/data/residualHoldsSixthPass.test.ts`：

- 第二 / 三 / 四 / 五轮禁串仍空；第六轮扩表跨四字段为空。
- 第五轮核心类（介人 / 宜告 / 藉者 / 官廷 / 宫延 / 后官 / 莱耀 / 故士 / 人狱 / 插人 / 表尾 / 主前N一主前 / ，，）单独再钉。
- 隔离 CMC 18,387 的哈希、65 卷分册、哨兵 ID 与公开包不相交。
- 公开 CMC 858 全是 `cmc-gen-*`。
- 20 张第六轮修补清单与公开包 1:1，卡数不变。
- 66 份卷测全部保持四字段，并写入本轮新禁串；不补造 v4 / 创世记图像。

## 6. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts src/data/residualHoldsInventory.test.ts src/data/residualHoldsThirdPass.test.ts src/data/residualHoldsFourthPass.test.ts src/data/residualHoldsFifthPass.test.ts src/data/residualHoldsSixthPass.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts scripts/generatePublicBibleData.test.mjs scripts/validatePublicRepository.test.mjs`：75/75 通过（294 tests）。
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、公开文字卡 10,096、无不安全串。
- `node scripts/validatePublicRepository.mjs`：通过。

全量 `vitest run` / GitHub `verify` 的失败面仍是缺创世记图像、缺工作台 v4、缺综合解读生成 JSON / Doré 缩图，以及本快照 Node 22 跑 `.mts` / runner 无 `rg`。不读本轮公开包修补，不补造真源。明细见 `full-vitest-blockers.md`。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地阅读页不走 `loadPublicBook`。对照与修补都落在公开数据包和台账 JSONL。
