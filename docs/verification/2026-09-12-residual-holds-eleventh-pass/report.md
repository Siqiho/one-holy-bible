# 66 卷后第十一轮：残余 OCR / 隔离 CMC 台账 / 第十轮禁串加厚

- 复核日期：2026-09-12
- 基线：`cursor/ohb-residual-holds-tenth-pass-bf14`（PR #41 顶端；第十轮残余 hold 清单已钉）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 创世记图像：本快照**没有** `src/assets/resources/genesis/images/`
- 结论：隔离 ∩ 公开仍为 ∅。第十一轮不新抬隔离 CMC，不改六源标识，不假设 Mac `Resources/`。公开研修本 **9,089**、公开文字卡 **10,096** 不变。前九轮已禁残串继续为空；第十一轮又从公开研修本四字段清掉 **17** 张仍留包内的高置信 OCR / 多余书名号闭符 / 和修缺闭括号 / 交叉字段脏拷（`无宰` / `道责` / `员性` / `膳眼` / `良普` / `《徒行传》` / `得罪们` / `腊原文` / `使用腊文）` / `主人体，公是` / `《创世前几章` / `以色列记》人` / `（教养…的人》` / `"现在"》` / `"多罗买的儿子"》` / `拣选了我们》` / `因行为称（` 等），并把第十轮核心禁串（`将水远` / `太老们` / `性行力` / `已经酒去` / `他同胞》` / `一万他他连得` / `〝` / `〞`）再钉进第十一轮禁表。

## 1. 范围与方法

判定口径仍是马太方法：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒 / 中截尾句。
- **hold**：中截 / 表倾倒 / 乱码到无源 PDF 不能复原。

本轮不再展开未审卷，也不重审 347 张已撤研修本 hold。只做跨卷第十一过：

1. 再扫公开研修本四字段，抓住第十轮漏掉的宰/辜、道/谴、员/灵、膳/瞎、普/善、缺「希」的腊原文、缺「使」的《徒行传》、书名号当闭括号、和修缺闭括号、以及 summary/searchText 脏拷。
2. 隔离 CMC 台账完整性：18,387 张 ledger-only CMC 的排序哈希、65 卷分册计数、哨兵 ID 全部重钉；确认无一出现在公开包。
3. 加厚公开包回归：跨卷禁止第十轮同类 + 本轮新抓到的无宰/道责/员性/膳眼/良普/《徒行传》/腊原文/主人体。
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

## 3. 已 fix（公开研修本 17 张，不撤卡）

只改 `study-bible-*` 的 `title` / `body` / `summary` / `searchText`。不改经文，不改 OCR 卡。字段级记录见 `eleventh-pass-fixes.json`（66 行）。

| 串 | 还原 | 例 |
| --- | --- | --- |
| `无宰受刑` / `道责作假见证` | 无辜受刑 / 谴责作假见证 | 出 20:16 |
| `门徒员性` | 门徒灵性 | 可 7:33 |
| `生来膳眼` / `满有良普` | 生来瞎眼 / 满有良善 | 约 2:11；创 1:31 |
| `整卷《徒行传》` | 整卷《使徒行传》 | 徒 1:5（不改已是《使徒行传》的卡） |
| `得罪们的主` | 得罪他们的主 | 创 40:1 |
| `这个词（腊原文` / `这里的腊原文` / `使用腊文）` | 希腊原文 / （希腊文） | 林前 8:1 summary；雅 2:21 searchText；可导论 |
| `故事的主人体，公是` | 故事的主人公，就是 | 可导论 |
| `《创世前几章` / `以色列记》人` | 《创世记》前几章 / 以色列人 | 出导论 |
| `（教养…的人》` / `"现在"》` / `"多罗买的儿子"》` / `拣选了我们》` | `）` 收成闭括号 | 王下 10:5；约 7:8 / 1:45；来 3:14 |
| `（《和修》"第一个"神迹` / `是"我的良人）。` | 补 `）` / 闭引号 | 约 2:11；歌 1:13 |
| `因行为称（` | 因行为称义"（ | 雅 2:21 summary/searchText 按正文抄 |
| `（被看作义".而是…宣告为义。` | 脏引号闭合 | 林前 6:11 |

未改：

- `膳长` / `王膳`、`满有良善` / `普世`、`拐带人` / `带人进入`、`慈愛`、`「牧人」`、`犹太老师`、`dia加人名属格`：keep。
- `个像人子的`、`耶稣己的看法`、`我们是在面`、`（《和庭"`、`那时的人经》`：继续 hold。
- `懞`（路 6:29 / 19:30；诗 12:8）：无唯一还原，hold。
- `参了、12节`、林前 12:18 `另参了、11、28节`：数字不唯一，hold。
- `美好行。`、`如个谈或小组查经`、`与他一起到处，搜集`：中截，hold。
- 徒 20:28 / 耶 24:7 / 约 14:12 乱码倾倒：hold。
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

新增 `src/data/residualHoldsEleventhPass.test.ts`：

- 第二 / 三 / 四 / 五 / 六 / 七 / 八 / 九 / 十轮禁串仍空；第十一轮扩表跨四字段为空。
- 第十轮核心类（将水远 / 太老们 / 性行力 / 已经酒去 / 和修》closer / 他他 / 〝〞）单独再钉。
- 隔离 CMC 18,387 的哈希、65 卷分册、哨兵 ID 与公开包不相交。
- 公开 CMC 858 全是 `cmc-gen-*`。
- 17 张第十一轮修补清单与公开包 1:1，卡数不变。
- 66 份卷测全部保持四字段，并写入本轮新禁串；不补造 v4 / 创世记图像。

## 6. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts src/data/residualHoldsInventory.test.ts src/data/residualHoldsThirdPass.test.ts src/data/residualHoldsFourthPass.test.ts src/data/residualHoldsFifthPass.test.ts src/data/residualHoldsSixthPass.test.ts src/data/residualHoldsSeventhPass.test.ts src/data/residualHoldsEighthPass.test.ts src/data/residualHoldsNinthPass.test.ts src/data/residualHoldsTenthPass.test.ts src/data/residualHoldsEleventhPass.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts scripts/generatePublicBibleData.test.mjs scripts/validatePublicRepository.test.mjs`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`
- `node scripts/validatePublicRepository.mjs`

明细见 `validate.txt`。

全量 `vitest run` / GitHub `verify` 的失败面仍是缺创世记图像、缺工作台 v4、缺综合解读生成 JSON / Doré 缩图，以及本快照 Node 22 跑 `.mts` / runner 无 `rg`。不读本轮公开包修补，不补造真源。明细见 `full-vitest-blockers.md`。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地阅读页不走 `loadPublicBook`。对照与修补都落在公开数据包和台账 JSONL。
