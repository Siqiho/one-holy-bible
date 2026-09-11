# 马太福音 1:1 复核与隔离 CMC 台账分源判定

- 复核日期：2026-09-11
- 基线：`cursor/ohb-luke-1to1-hold-queue-63b7`（约翰 / 创世记 / 诗篇 / 耶利米 / 路加 / 使徒行传已闭合）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：隔离 ∩ 公开仍为 ∅。路加 / 使徒行传已闭合后，下一高价值公开面是马太福音（下一卷福音，公开研修本 453，隔离 CMC 143）。已从公开马太撤下 23 张无法复原的研修本卡，并最小修补 55 张高置信引号 / OCR / 表倾倒。隔离 CMC 143 张继续 ledger-only。本卷公开 OCR = 0，六源映射口径不改。

## 1. 范围与方法

只依据本仓库快照，不假设 Mac 本地 `Resources/` 或 Edit API 仍可访问。

判定口径与约翰 / 创世记 / 诗篇 / 耶利米 / 路加 / 使徒行传 1:1 相同：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒 / 中截尾句。
- **hold**：中截 / 表倾倒 / 乱码到无源 PDF 不能复原。

### 为何选马太，而不是以赛亚

路加 PR 已收束使徒行传。用户本轮优先「使徒行传或马太 / 路加之后下一卷福音」，或大面未审研修本。使徒行传已闭合，故取马太：

| 卷 | 公开研修本 | 公开 OCR | 隔离 CMC | 卷级台账 |
| --- | ---: | ---: | ---: | --- |
| **马太** | **453** | **0** | **143** | 无 |
| 以赛亚 | 475 | 0 | 947 | 无 |
| 马可 | 260 | 0 | 280 | 无 |

两边都没有卷级台账，也都没有公开 OCR。选马太是因为：

1. 它是路加之后下一卷福音，公开研修本面仍大（453）。
2. 隔离 CMC 143 足以复核「ledger-only、不抬进公开包」合同。
3. 以赛亚（475 / 947）仍是下一张最大未审研修本，本轮不展开。

## 2. 隔离合同

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同** |
| 隔离 CMC `cmc-matt-*` | 143 | **hold / ledger-only**。抽样仍是经文残句（如 `cmc-matt-1-9` =「乌西雅生约坦…」，`cmc-matt-2-10` =「他们看见那星，就大大地欢喜；」），不抬进公开包 |
| 路加隔离 CMC | 144 | 继续 hold |
| 使徒行传隔离 CMC | 543 | 继续 hold |
| 约翰 leftover OCR | 1 | 未回潮 |

## 3. 马太公开包 1:1

复核前：453 = 研修本 453。复核后：430 = 研修本 430。

| 源 | 复核前 | 复核后 | 判定 |
| --- | ---: | ---: | --- |
| 研修本 verse / 导论 | 453 | 430 | 主体 **keep**；23 **hold**；55 **fix** |
| OCR | 0 | 0 | 本卷无公开 OCR；跨卷 146 继续 1 keep + 145 hold-as-class |
| CMC | 0 | 0 | 隔离 143 继续 hold |

公开锚点全部落在合法 `Matt.章.节`。导论保留 7 张（原 9，撤下写作时间中截卡与关键主题倾倒卡）。

### 3.1 已 hold（23）

正文中截、主题/年表倾倒、和修引号吞掉后文，或乱码到无源 PDF 不能最小复原：

| ID | 锚点 | 问题 |
| --- | --- | --- |
| `study-bible-matt-3-2-p009-n031` | `Matt.3.2` | 「约輸在这人们」无法复原 |
| `study-bible-matt-5-2-p013-n068` | `Matt.5.2` | 「深蝶业的夾方」乱码 |
| `study-bible-matt-5-9-p013-n067` | `Matt.5.9` | 「获秀生工餐」乱码 |
| `study-bible-matt-7-15-p015-n106` | `Matt.7.15` | 开篇损坏 +「以经文集…再婚部」中截 |
| `study-bible-matt-8-26-p021-n168` | `Matt.8.26` | 「没有腊原文apistos」「不的信心」无法复原 |
| `study-bible-matt-10-40-p026-n239` | `Matt.10.40` | 「基督赋予他们权」中截 |
| `study-bible-matt-11-13-p027-n235` | `Matt.11.13` | 「旧日约先知都期待基督」中截 |
| `study-bible-matt-15-5-p036-n259` | `Matt.15.5` | 「赡养年老」中截 |
| `study-bible-matt-15-14-p036-n339` | `Matt.15.14` | 和修引号吞掉「向赛人…」 |
| `study-bible-matt-15-39-p037-n263` | `Matt.15.39` | 「很可的另一种写法」中截 |
| `study-bible-matt-16-18-p038-n276` | `Matt.16.18` | 「淺農帮李問…」乱码 + `ekkfEsia` |
| `study-bible-matt-17-15-p040-n287` | `Matt.17.15` | 「医治他的儿」中截 |
| `study-bible-matt-19-20-p044-n415` | `Matt.19.20` | 「还缺点什」中截 |
| `study-bible-matt-22-16-p051-n369` | `Matt.22.16` | 「权力和地位」中截 |
| `study-bible-matt-23-23-p015-n113` | `Matt.23.23` | 开篇残片 +「以及林前」中截 |
| `study-bible-matt-23-24-p054-n381` | `Matt.23.24` | 「忽略了律法最重要」中截 |
| `study-bible-matt-23-35-p054-n514` | `Matt.23.35` | 「撒迎利亚」连环损坏，无源不能复原 |
| `study-bible-matt-26-5-p061-n570` | `Matt.26.5` | 「庆祝逾越」中截 |
| `study-bible-matt-26-41-p063-n594` | `Matt.26.41` | 和修引号吞掉「试探是指忍不住要睡觉」 |
| `study-bible-matt-27-2-p065-n616` | `Matt.27.2` | 塔西佗引文「判發期前 / 第年员」无法复原 |
| `study-bible-matt-27-38-p067-n642` | `Matt.27.38` | `/Estes`「叛虽然」无法复原 |
| `study-bible-matt-intro-p001-n002` | `Matt.1.1` | 「因为在70年）。」写作时间论证中截 |
| `study-bible-matt-intro-p003-n008` | `Matt.1.1` | 关键主题倾倒 +「意帝的儿子」 |

不作文内补全。补「权柄 / 父母 / 儿子」会在无 PDF 条件下伪造研修本原文。

### 3.2 已 fix（55）

只做和修闭引号、上下文唯一 OCR、以及「保留完整段落、删表倾倒 / 中截尾句」。不补缺失段落。

#### 删表倾倒 / 中截尾句（13）

| ID | 问题 | 判定 |
| --- | --- | --- |
| `study-bible-matt-4-2-p010-n045` | 「禁食的最」中截 | **fix**：保留到「禁食有助于专心祷告。」 |
| `study-bible-matt-5-16-p013-n089` | 五篇讲论表倾倒 | **fix**：只留好行为/荣耀完整句 |
| `study-bible-matt-5-17-p014-n080` | 「心意和整本《旧约》」中截 | **fix**：删尾句 |
| `study-bible-matt-9-9-p022-n156` | `9［约16:20］…i有关` 尾垃圾 | **fix**：删尾串 |
| `study-bible-matt-15-21-p036-n261` | 平行经文表倾倒 | **fix**：保留到「见11:20-24注。」 |
| `study-bible-matt-16-28-p039-n362` | 收尾「有些」中截 | **fix**：删尾词 |
| `study-bible-matt-21-10-p047-n451` | 耶路撒冷地图尺标倾倒 | **fix**：保留城邑说明，删尺标/插图尾 |
| `study-bible-matt-21-33-p050-n358` | 「发展其他事」中截 | **fix**：删尾句 |
| `study-bible-matt-21-43-p050-n355` | `ethnos的单` 中截 | **fix**：删尾句 |
| `study-bible-matt-22-3-p050-n472` | `22:24S［申25:5］` 尾垃圾 | **fix**：删尾串 |
| `study-bible-matt-22-9-p051-n363` | 收尾「参太」中截 | **fix**：删尾串 |
| `study-bible-matt-26-47-p063-n445` | 苦路地图倾倒 | **fix**：保留六步路线，删地图尾 |
| `study-bible-matt-intro-p002-n005` | 年表轴 `主前10年主后1年1020…` | **fix**：保留大事年表，删轴 |

#### 高置信 OCR / 闭引号（节选）

| 串 | 还原 | 例 |
| --- | --- | --- |
| `旧日约` | 旧约 | `matt-5-17`、`matt-5-43`、`matt-15-3`、`matt-20-29` |
| `迎南人` | 迦南人 | `matt-15-22` |
| `盼咐` / `吩附` / `风他们所` | 吩咐 / 凡他们所吩咐 | `matt-23-3`、`matt-5-43`、`matt-11-1` |
| `菜耀` | 荣耀 | `matt-6-10` |
| `服待` | 服侍 | `matt-3-15`、`matt-4-11`、`matt-6-24` |
| `自已` | 自己 | `matt-27-46` |
| `陷人》` | 陷入"） | `matt-6-13` |
| `诚命` | 诫命 | `matt-5-19`、`matt-19-17` |
| `供名之作` | 匿名之作 | 导论作者 |
| `意次` / `受，呼应大卫者` / `受者` | 意即 / 受膏者 | `matt-1-1` |
| `lesous` | Iesous | `matt-1-1` |
| `鸟西亚` | 乌西亚 | `matt-1-17` |
| `一格那丢` | 伊格那丢 | 导论背景 |
| `试採` / `毫疑问` | 试探 / 毫无疑问 | `matt-4-1` |
| `进人` | 进入 | 9 处 |
| `巴勤斯坦` | 巴勒斯坦 | `matt-9-9` |
| `登山显菜` | 登山显荣 | `matt-16-28` |
| `耶路撤冷` / `背频` | 耶路撒冷 / 背弃 | `matt-20-34` |
| `衣裳的继子` | 衣裳的繸子 | `matt-23-5` |
| `婚奶` / `各持已见` / `犯好淫` | 婚姻 / 各持己见 / 犯奸淫 | `matt-19-9` |
| `同态治畢法则` | 同态复仇法则 | `matt-5-38` |
| `掌捆` | 掌掴 | `matt-5-39` |

和修引号只在译词已经完整时闭合，例如 `履行全部的义》`、`天快亮的时候》`、`佩戴的经匣》`、`总督府》`、`教导》`、`老师》`。

其余公开研修本卡：马太锚点合法，短交叉引用或完整注释可读。PDF 点号连接（如 `4:5，8.11.13:39`）仍普遍存在，但不改变释义，**本轮不批量改写**。

## 4. 六源口径

不改标识字段，也不按用户全库数补造卡。本轮只减少公开研修本 23 张：

| 源 | 用户全库 | 公开（本轮后） | 对账 |
| --- | ---: | ---: | --- |
| 综合解读 | 29,476 | 858 | 缺口；马太隔离 143 ledger-only |
| 研修本 | 16,270 | **9,332** | 缺口；本卷 430 keep/fix + 23 hold |
| 启导本 | 9,521 | 0 | 整类 hold |
| OCR | 254 | 146 | 1 keep + 145 hold-as-class |
| 圣经的故事 | 98 | 0 | 整类 hold |
| 信息系列 | 8 | 3 | 稳定注释 8 一致 |

完整矩阵仍见 `docs/verification/2026-09-11-six-source-coverage-matrix/report.md`。标识映射不改写。

## 5. 下一卷

**以赛亚**（公开研修本 475，隔离 CMC 947，公开 OCR 0）。马可（260 / 隔离 280）为下一卷福音备选。

## 6. 验证

已跑：

- `vitest run src/data/matthewPublicCardAudit.test.ts src/data/lukePublicCardAudit.test.ts src/data/actsPublicCardAudit.test.ts src/data/jeremiahPublicCardAudit.test.ts src/data/psalmsPublicCardAudit.test.ts src/data/genesisPublicCardAudit.test.ts src/data/johnGospelPublicCardAudit.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts`：66/66 通过。
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、公开文字卡 10,339、无不安全串。
- `node scripts/validatePublicRepository.mjs`：通过。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地 `App.tsx` 不走 `loadPublicBook("Matt")`，因此无法在本环境用阅读页点开这些公开卡。对照与修补都落在公开数据包和台账 JSONL。

GitHub `verify` 全量仍会因本快照缺创世记资源 / v4 / `rg` 失败；失败面不读马太公开包，不补造真源。
