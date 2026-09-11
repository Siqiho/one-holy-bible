# 雅歌 1:1 复核与隔离 CMC 台账分源判定

- 复核日期：2026-09-11
- 基线：`cursor/ohb-ezra-num-1to1-hold-queue-8350`（以斯拉记 / 民数记已闭合）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：隔离 ∩ 公开仍为 ∅。民数记收束后，下一高价值公开面是雅歌（公开研修本 80，隔离 CMC 66，公开 OCR 11）。已从公开雅歌撤下 1 张无法复原的研修本导论卡，并最小修补 31 张高置信引号 / OCR / 表倾倒 / 中截尾句。隔离 CMC 66 张继续 ledger-only。本卷 11 张公开 OCR 无卷级台账，继续 hold-as-class，不新抬、不新改。六源映射口径不改。

## 1. 范围与方法

只依据本仓库快照，不假设 Mac 本地 `Resources/` 或 Edit API 仍可访问。

判定口径与以斯拉记 / 民数记 / 马太 1:1 相同：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒 / 中截尾句。
- **hold**：中截 / 表倾倒 / 乱码到无源 PDF 不能复原。

### 为何选雅歌

以斯拉记 / 民数记报告已把雅歌 / 歌罗西书列为下一研修本备选。两卷都没有卷级台账：

| 卷 | 公开研修本 | 公开 OCR | 隔离 CMC | 卷级台账 |
| --- | ---: | ---: | ---: | --- |
| **雅歌** | **80** | **11** | **66** | 无 |
| **歌罗西书** | **77** | **0** | **65** | 无 |

选雅歌是因为：

1. 它是以斯拉记 / 民数记之后下一张未审研修本大面（80）。
2. 隔离 CMC 66 足以复核「ledger-only、不抬进公开包」合同。
3. 本卷 11 张公开 OCR 继续 hold-as-class，不新改。
4. 歌罗西书为本跑第二卷，同步收束。

## 2. 隔离合同

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同** |
| 隔离 CMC `cmc-song-*` | 66 | **hold / ledger-only**。抽样仍是经文残句（如 `cmc-song-1-3` =「你的膏油馨香；你的名如同倒出来的香膏，所以众童女都爱你。」，`cmc-song-1-7` =「我心所爱的啊，求你告诉我，你在何处牧羊？晌午在何处使羊歇卧？…」），不抬进公开包 |
| 民数记隔离 CMC | 965 | 继续 hold |
| 以斯拉记隔离 CMC | 219 | 继续 hold |
| 约翰 leftover OCR | 1 | 未回潮 |

## 3. 雅歌公开包 1:1

复核前：91 = 研修本 80 + OCR 11。复核后：90 = 研修本 79 + OCR 11。

| 源 | 复核前 | 复核后 | 判定 |
| --- | ---: | ---: | --- |
| 研修本 verse / 导论 | 80 | 79 | 主体 **keep**；1 **hold**；31 **fix** |
| OCR | 11 | 11 | 无卷级台账，**hold-as-class**，不新抬、不新改 |
| CMC | 0 | 0 | 隔离 66 继续 hold |

公开锚点全部落在合法 `Song.章.节`。导论保留 6 张（原 7，撤下文学特征 / 结构交错倾倒卡）。

### 3.1 已 hold（1）

正文寓意解释与梦境 / 男女对唱专论交错倾倒，无源 PDF 不能最小复原：

| ID | 锚点 | 问题 |
| --- | --- | --- |
| `study-bible-song-intro-p003-n006` | `Song.1.2` | 「体会根据本书注释的阅读方法」把寓意收束句与梦境专论粘连；后又插入「将自己3:5.交给他」交叉表，三文交错，无法安全分界 |

不作文内补全。补「体会上帝与百姓的属灵爱恋 / 梦的内容大纲 / 众女子说话」会在无 PDF 条件下伪造研修本原文。

本卷 11 张公开 OCR 无台账行，故留在公开包并记入 hold-as-class：

| ID | 公开锚点 | 台账 | 本轮 |
| --- | --- | --- | --- |
| `image-text-22-雅歌-codex-pdf-p003-img001` | `Song.1.1` | 无 | hold-as-class |
| `image-text-22-雅歌-codex-pdf-p003-img002` | `Song.1.5` | 无 | hold-as-class |
| `image-text-22-雅歌-codex-pdf-p006-img003` | `Song.8.6` | 无 | hold-as-class |
| `image-text-22-雅歌-codex-pdf-p014-img012` | `Song.1.4` | 无 | hold-as-class |
| `image-text-22-雅歌-codex-pdf-p027-img024` | `Song.3.5` | 无 | hold-as-class |
| `image-text-22-雅歌-codex-pdf-p032-img028` | `Song.4.8` | 无 | hold-as-class |
| `image-text-22-雅歌-codex-pdf-p052-img046` | `Song.7.5` | 无 | hold-as-class |
| `image-text-22-雅歌-codex-pdf-p057-img054` | `Song.8.3` | 无 | hold-as-class |
| `image-text-22-雅歌-codex-pdf-p059-img055` | `Song.8.6` | 无 | hold-as-class |
| `image-text-22-雅歌-codex-pdf-p059-img057` | `Song.8.7` | 无 | hold-as-class |
| `image-text-22-雅歌-codex-pdf-p061-img059` | `Song.8.12` | 无 | hold-as-class |

### 3.2 已 fix（31）

只做和修闭引号、上下文唯一 OCR、以及「保留完整段落、删表倾倒 / 中截尾句」。不补缺失段落。

#### 删表倾倒 / 中截尾句（4）

| ID | 问题 | 判定 |
| --- | --- | --- |
| `study-bible-song-1-4-p005-n013-2-2` | 1:4 诗班说明后粘上整段 1:5「黑，却是秀美」注 | **fix**：留到「同一群人。」 |
| `study-bible-song-1-7-p005-n010` | 「为面的机会」中截 | **fix**：闭「正午」，删尾词 |
| `study-bible-song-3-6-p008-n026` | 「以唤起感情的方式提」中截 | **fix**：闭「谁」，删轿舆尾句 |
| `study-bible-song-intro-p001-n002` | 「尤为明本书 / 显。及 / —动、不要叫醒」 | **fix**：明显。本书 / 显然，及 / 不要惊动、不要叫醒 |

#### 高置信 OCR / 闭引号（节选）

| 串 | 还原 | 例 |
| --- | --- | --- |
| `不样` / `进人` / `引人人胜` | 不祥 / 进入 / 引人入胜 | `song-2-3`、`song-4-16`、`song-1-14` |
| `目约` / `出然` / `嘱附` | 旧约 / 虽然 / 嘱咐 | `song-2-4`、`song-2-6`、`song-5-8` |
| `汇人约但河` / `展开/旗` | 汇入约旦河 / 展开旌旗 | `song-4-1`、`song-6-4` |
| `难径` / `步人` / `亥于` / `怡当` | 难怪 / 步入 / 女子 / 恰当 | `song-7-5`、`song-8-4`、`song-8-5`、`song-8-6` |
| `所门罗门` / `《歌》是` / `他雅的名字` | 所罗门 / 《雅歌》是 / 所罗门的名字 | 导论作者 |
| `认《雅歌》` / `力一部` / `释是` | 认为 / 为一部 / 释义是 | 导论主题 |
| 闭和修引号 | 正午 / 环抱 / 高塔 / 叫醒你 / 为爱而生病 / 红润发亮 / 香花园 / 太阳 / 两队人马在跳舞 / 紫色 / 曼陀罗草 / 轿 | 多处 verse 卡 |

和修引号只在译词已经完整时闭合。文学特征 / 梦境 / 交叉表三文交错的导论卡 **hold**。

其余公开研修本卡：雅歌锚点合法，短交叉引用或完整注释可读。PDF 点号连接仍普遍存在，但不改变释义，**本轮不批量改写**。本卷 11 张公开 OCR 无台账，不新改。

## 4. 六源口径

不改标识字段，也不按用户全库数补造卡。本轮只减少公开研修本 1 张；同跑歌罗西书再撤 5 张后：

| 源 | 用户全库 | 公开（本轮后） | 对账 |
| --- | ---: | ---: | --- |
| 综合解读 | 29,476 | 858 | 缺口；雅歌隔离 66 ledger-only |
| 研修本 | 16,270 | **9,109** | 缺口；本卷 79 keep/fix + 1 hold |
| 启导本 | 9,521 | 0 | 整类 hold |
| OCR | 254 | 146 | 1 keep + 145 hold-as-class；本卷 11 张无台账继续 hold-as-class |
| 圣经的故事 | 98 | 0 | 整类 hold |
| 信息系列 | 8 | 3 | 稳定注释 8 一致 |

完整矩阵仍见 `docs/verification/2026-09-11-six-source-coverage-matrix/report.md`。标识映射不改写。

## 5. 下一卷

雅歌已在本跑收束。同跑已续展**歌罗西书**（公开 77→72，隔离 CMC 65 ledger-only）。见 `docs/verification/2026-09-11-colossians-1to1-hold-queue/report.md`。下一高价值未审研修本面可看阿摩司书（75）或弥迦书（75）。

## 6. 验证

已跑：

- `vitest run` 雅歌 / 歌罗西书及既有公开审计 / `publicData` / `publicBibleData`。
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、公开文字卡 10,116、无不安全串。
- `node scripts/validatePublicRepository.mjs`：通过。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地 `App.tsx` 不走 `loadPublicBook("Song")`，因此无法在本环境用阅读页点开这些公开卡。对照与修补都落在公开数据包和台账 JSONL。

GitHub `verify` 全量仍会因本快照缺创世记资源 / v4 / `rg` 失败；失败面不读雅歌公开包，不补造真源。
