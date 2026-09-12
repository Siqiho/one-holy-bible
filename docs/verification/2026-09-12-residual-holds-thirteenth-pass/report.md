# 66 卷后第十三轮：残余 OCR / 隔离 CMC 台账 / 第十二轮禁串加厚

- 复核日期：2026-09-12
- 基线：`cursor/ohb-residual-holds-twelfth-pass-77c3`（PR #44 顶端；第十二轮残余 hold 清单已钉）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 创世记图像：本快照**没有** `src/assets/resources/genesis/images/`
- 结论：隔离 ∩ 公开仍为 ∅。第十三轮不新抬隔离 CMC，不改六源标识，不假设 Mac `Resources/`。公开研修本 **9,089**、公开文字卡 **10,096** 不变。前十一轮已禁残串继续为空；第十三轮又从公开研修本四字段清掉 **46** 张仍留包内的高置信 OCR / 节号 `：.` / 和修缺闭括号 / 交叉字段脏拷（`排尼基` / `后餅` / `干万人` / `干代` / `审判的目子` / `宜认的信仰` / `诗赛43:3` / `后1:17.19:10.22:8` / `21：.4` / `太11：.27` / `徒14：.18:4` / 26 张和修缺 `）` 等），并把第十二轮核心禁串（`五句节` / `圣吴` / `察乡` / `坐船刦` / `才民` / `骆驼果要` / `提后3！1` / `约14.：27` / `22」39` / `的的` / `旧知` / `知说话` / `后12`）再钉进第十三轮禁表。

## 1. 范围与方法

判定口径仍是马太方法：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒 / 中截尾句。
- **hold**：中截 / 表倾倒 / 乱码到无源 PDF 不能复原。

本轮不再展开未审卷，也不重审 347 张已撤研修本 hold。只做跨卷第十三过：

1. 再扫公开研修本四字段，抓住第十二轮漏掉的排/腓、餅/裔、干/千、目/日、宜/宣、诗赛叠书名、`后` 当 `启`、节号 `：.`（第十二轮只清了 `.：`）、以及和修闭引号后缺 `）`。
2. 隔离 CMC 台账完整性：18,387 张 ledger-only CMC 的排序哈希、65 卷分册计数、哨兵 ID 全部重钉；确认无一出现在公开包。
3. 加厚公开包回归：跨卷禁止第十二轮同类 + 本轮新抓到的排尼基/后餅/干万人/干代/目子/宜认/诗赛/后1:17/节号 `：.`。
4. 记录全量 `vitest` 已知阻断（缺创世记图像 / 工作台 v4 / 本快照 Node 22 / `rg`），不补造夹具。
5. 盘点交叉字段脏拷：只按正文抄高置信残串（弗 2:13 `徒14：.18:4` → `徒14:1，18:4`），不整段重写 summary。

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

## 3. 已 fix（公开研修本 46 张，不撤卡）

只改 `study-bible-*` 的 `title` / `body` / `summary` / `searchText`。不改经文，不改 OCR 卡。字段级记录见 `thirteenth-pass-fixes.json`（116 行：8 张唯一 OCR + 13 张节号 `：.` + 1 张交叉字段脏拷 + 26 张和修闭括号；有重叠）。

| 串 | 还原 | 例 |
| --- | --- | --- |
| `排尼基` | 腓尼基 | 徒 21:3 |
| `后餅` | 后裔 | 徒 17:26 |
| `干万人` / `干代` | 千万人 / 千代 | 耶 32:18；诗 105:8 |
| `审判的目子` | 审判的日子 | 耶 47:4 |
| `宜认的信仰` | 宣认的信仰 | 提前 1:18 |
| `诗赛43:3` | 赛43:3 | 约 6:69 |
| `后1:17.19:10.22:8` | 启1:17.19:10.22:8 | 约 18:5 |
| `21：.4` / `太11：.27` / `林前11：.9` / `31：.9` / `51：.64` / `1：.4` 等 | 节号 `：.` → `:` | 徒 21:3；徒 4:12；创 2:18 等 13 张 |
| `徒14：.18:4` | 徒14:1，18:4 | 弗 2:13 searchText 按正文抄 |
| 26 张和修缺 `）` | 按已闭引号 + 后文接续正文补 `）` | 帖前 2:16；提前 6:20；撒下 12:8 等 |

未改：

- `腓尼基` / `千万人` / `千代` / `后裔` / `审判的目的` / `宣认` / `彼后1:17` / `赛43:3` / `纷纷乱乱`：keep。
- `个像人子的`、`耶稣己的看法`、`我们是在面`、`（《和庭"`、`那时的人经》`：继续 hold。
- `懞`（路 6:29 / 19:30；诗 12:8）：无唯一还原，hold。
- `口才（1.：2:3-4`：`.：` 与后文表轴缠在一起，继续 hold。
- `（《和修》"一人指人类` / `"会堂主会堂` / `"乱成一人` / `上触了礁"`：gloss 中截，hold。
- `在恒审判` / `那督的人得`：永恒/最后、信基督不唯一，hold。
- 徒 20:28 / 耶 24:7 / 约 14:12 乱码倾倒：hold。
- 雅 2:5「拣选 / 选举」：两词合法，不按正文改写。

第十二轮曾把 `代下1:2,5：.2` 标为 hold。本轮按同一 `：.` → `:` 类处理为 `代下1:2,5:2`，与同卡 `6:3,7:8-10` 会众清单一致，不再 hold。

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

新增 `src/data/residualHoldsThirteenthPass.test.ts`：

- 第二 / 三 / 四 / 五 / 六 / 七 / 八 / 九 / 十 / 十一 / 十二轮禁串仍空；第十三轮扩表跨四字段为空。
- 第十二轮核心类（五句节 / 圣吴 / 察乡 / 坐船刦 / 才民 / 骆驼果要 / 节号 `.：` / `」` / 的的 / 旧知）单独再钉。
- 隔离 CMC 18,387 的哈希、65 卷分册、哨兵 ID 与公开包不相交。
- 公开 CMC 858 全是 `cmc-gen-*`。
- 46 张第十三轮修补清单与公开包 1:1，卡数不变。
- 66 份卷测全部保持四字段，并写入本轮新禁串；不补造 v4 / 创世记图像。

## 6. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts src/data/residualHoldsInventory.test.ts src/data/residualHoldsThirdPass.test.ts src/data/residualHoldsFourthPass.test.ts src/data/residualHoldsFifthPass.test.ts src/data/residualHoldsSixthPass.test.ts src/data/residualHoldsSeventhPass.test.ts src/data/residualHoldsEighthPass.test.ts src/data/residualHoldsNinthPass.test.ts src/data/residualHoldsTenthPass.test.ts src/data/residualHoldsEleventhPass.test.ts src/data/residualHoldsTwelfthPass.test.ts src/data/residualHoldsThirteenthPass.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts scripts/generatePublicBibleData.test.mjs scripts/validatePublicRepository.test.mjs`：见 `validate.txt`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、31,102 CUV/KJV、10,096 文字卡、0 unsafe
- `node scripts/validatePublicRepository.mjs`：8 required files, Node 24

全量 `vitest run` / GitHub `verify` 的失败面仍是缺创世记图像、缺工作台 v4、缺综合解读生成 JSON / Doré 缩图，以及本快照 Node 22 跑 `.mts` / runner 无 `rg`。不读本轮公开包修补，不补造真源。明细见 `full-vitest-blockers.md`。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地阅读页不走 `loadPublicBook`。对照与修补都落在公开数据包和台账 JSONL。
