# 66 卷后第十轮：残余 OCR / 隔离 CMC 台账 / 第九轮禁串加厚

- 复核日期：2026-09-12
- 基线：`cursor/ohb-residual-holds-ninth-pass-94c2`（PR #39 顶端；第九轮残余 hold 清单已钉）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 创世记图像：本快照**没有** `src/assets/resources/genesis/images/`
- 结论：隔离 ∩ 公开仍为 ∅。第十轮不新抬隔离 CMC，不改六源标识，不假设 Mac `Resources/`。公开研修本 **9,089**、公开文字卡 **10,096** 不变。前八轮已禁残串继续为空；第十轮又从公开研修本四字段清掉 **150** 张仍留包内的高置信 OCR / 多余闭引号 / 和修书名号倾倒 / 节号书名号 / CJK 引号 / 缺闭引号 gloss / 交叉字段脏拷（`将水远` / `9里就成为` / `太老们` / `在汤` / `助于《见` / `性行力` / `崇拜行力` / `已经酒去` / `罪摩` / `可僧的` / `谤读` / `扶行` / `一万他他连得` / `（徒行传讲道集》` / `"更尊贵""、` / `"长老、"监督"` / `（《和修》"他同胞》` / `（《和修》"有话说""）` / `（《和修》"祸哉）` / `〝` / `〞` 等），并把第九轮核心禁串（`约瀚` / `希伯来¥经` / `《创，世记》` / `（*离散` / `*无礼〞` / `情词迫场` / `加人` / `落人` / `因禁` / `子官` / `收劃` / `残人自肥`）再钉进第十轮禁表。

## 1. 范围与方法

判定口径仍是马太方法：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒 / 中截尾句。
- **hold**：中截 / 表倾倒 / 乱码到无源 PDF 不能复原。

本轮不再展开未审卷，也不重审 347 张已撤研修本 hold。只做跨卷第十过：

1. 再扫公开研修本四字段，抓住第九轮漏掉的水/永、太/长、汤/场、于/手、力/为、酒/洒、摩/孽、僧/憎、读/渎、扶/执、多余闭引号、和修书名号倾倒、节号误用《、以及 summary/searchText 脏拷。
2. 隔离 CMC 台账完整性：18,387 张 ledger-only CMC 的排序哈希、65 卷分册计数、哨兵 ID 全部重钉；确认无一出现在公开包。
3. 加厚公开包回归：跨卷禁止第九轮同类 + 本轮新抓到的将水远/太老们/性行力/已经酒去/和修》closer / 〝〞。
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

## 3. 已 fix（公开研修本 150 张，不撤卡）

只改 `study-bible-*` 的 `title` / `body` / `summary` / `searchText`。不改经文，不改 OCR 卡。字段级记录见 `tenth-pass-fixes.json`（399 行）。

| 串 | 还原 | 例 |
| --- | --- | --- |
| `将水远` / `9里就成为` | 将永远 / 哪里就成为 | 约 1:51（同卡 `个像人子的` 不补） |
| `太老们` / `在汤` | 长老们 / 在场 | 徒 21:18 |
| `助于《见12:12注）` | 助手（见12:12注） | 徒 13:5（不改 `有助于` / `求助于`） |
| `性行力` / `崇拜行力` | 性行为 / 崇拜行为 | 创 19:5；何导论 |
| `已经酒去` | 已经洒去 | 徒 22:16（与第四轮 `酒水礼→洒水礼` 同类） |
| `一万他他连得` / `他他所有的家人` | 一万他连得 / 他所有的家人 | 太 18:24；徒 16:33 |
| `（徒行传讲道集》` | （《使徒行传讲道集》 | 徒 16:33（屈梭多模讲道集书名） |
| `罪摩` / `可僧的` / `谤读` / `扶行` | 罪孽 / 可憎的 / 谤渎 / 执行 | 约壹 1:9 searchText 按正文抄；太 24:34；提前 1:20 |
| `"更尊贵""、` / `所说的话""，` / `"有心帮助"".` | 删多余闭引号 | 来导论；太导论；诗 144:14 |
| `"蛀虫""朽烂〞` / `"长老、"监督"` / `"规矩'` | 脏引号 | 何 14:8；徒 20:17；撒上 30:25 |
| `（《和修》"他同胞》` / `意为"低地》` / `"偏待人》` 等 | `（《和修》"…"）` / `"…"` | 和修 extra-book-closer 与 `"gloss》` 错闭 |
| `（《和修》"祸哉）` / `（《和修》"施舍）` 等 | `（《和修》"…"）` | 和修 gloss 缺闭引号；已闭的 curly `”）` 不叠 ASCII |
| `（《和修》"有话说""）` | `（《和修》"有话说"）` | 弗 5:14 多余闭引号 |
| `（《和修》至圣所》` / `（《致该犹书"）` | `（《和修》"至圣所"）` / `（《致该犹书》）` | 但 9:24；徒 18:4 |
| `《新约）` / `《〈圣经）概述》` / `《民14:18）` | 《新约》 / 《〈圣经〉概述》 / （民14:18） | 出 17:6；林后 1:20；约壹 1:9 |
| `〝` / `〞` | ASCII `"` | 跨卷闭合引号；不补中截词 |

未改：

- `有助于`、`求助于`、`河水远远`、`水存在于海绵`、`犹太老师`、`因徒劳`、`因犯罪`、`dia加人名属格`、`堕落人性`、`出人意料`、`浩瀚宇宙`、`释放人自由`、`《次经，马加比传上》`：keep。
- `个像人子的`、`耶稣己的看法`、`我们是在面`、`（《和庭"`：hold。
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
- 太 15:2 `那时的人经》`、徒 4:13 `（*放胆》`：表轴 / 中截书名号，hold。
- 太 10:23 `（《和修》-人子就要来临）`：破折号是否等于引号不唯一，hold。
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

新增 `src/data/residualHoldsTenthPass.test.ts`：

- 第二 / 三 / 四 / 五 / 六 / 七 / 八 / 九轮禁串仍空；第十轮扩表跨四字段为空。
- 第九轮核心类（约瀚 / 希伯来¥经 / 《创，世记》 / 开引号星号 / 加人 / 落人 / 因禁 / 子官 / 收劃 / 残人自肥）单独再钉。
- 隔离 CMC 18,387 的哈希、65 卷分册、哨兵 ID 与公开包不相交。
- 公开 CMC 858 全是 `cmc-gen-*`。
- 150 张第十轮修补清单与公开包 1:1，卡数不变。
- 66 份卷测全部保持四字段，并写入本轮新禁串；不补造 v4 / 创世记图像。

## 6. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts src/data/residualHoldsInventory.test.ts src/data/residualHoldsThirdPass.test.ts src/data/residualHoldsFourthPass.test.ts src/data/residualHoldsFifthPass.test.ts src/data/residualHoldsSixthPass.test.ts src/data/residualHoldsSeventhPass.test.ts src/data/residualHoldsEighthPass.test.ts src/data/residualHoldsNinthPass.test.ts src/data/residualHoldsTenthPass.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts scripts/generatePublicBibleData.test.mjs scripts/validatePublicRepository.test.mjs`：见 `validate.txt`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、31,102 CUV/KJV、10,096 文字卡、0 unsafe
- `node scripts/validatePublicRepository.mjs`：通过

明细见 `validate.txt`。

全量 `vitest run` / GitHub `verify` 的失败面仍是缺创世记图像、缺工作台 v4、缺综合解读生成 JSON / Doré 缩图，以及本快照 Node 22 跑 `.mts` / runner 无 `rg`。不读本轮公开包修补，不补造真源。明细见 `full-vitest-blockers.md`。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地阅读页不走 `loadPublicBook`。对照与修补都落在公开数据包和台账 JSONL。
