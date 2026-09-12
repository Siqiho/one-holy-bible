# 犹大书 1:1 复核与隔离 CMC 台账分源判定

- 复核日期：2026-09-12
- 基线：同跑俄巴底亚书 / 玛拉基书及约翰二书 / 约翰三书 / 腓利门书 hold-queue
- 台账包：`local-audit-pack/john-gospel-20260909/`
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：隔离 ∩ 公开仍为 ∅。腓利门书收束后继续犹大书（公开研修本 20，隔离 CMC 16，公开 OCR 0）。已从公开包撤下 2 张无法复原的目录残卡，并最小修补 13 张高置信引号 / OCR / 表倾倒 / 中截尾句。隔离 CMC 16 张继续 ledger-only。六源映射口径不改。

## 1. 范围与方法

判定口径与腓利门书 / 俄巴底亚书 / 马太相同：keep / fix / hold。不改六源标识，不抬隔离 CMC，不补造无 PDF 原文。不假设 Mac 本地 `Resources/` 仍可访问。

## 2. 隔离合同

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同** |
| 隔离 CMC `cmc-jude-*` | 16 | **hold / ledger-only**。抽样仍是经文残句（`cmc-jude-1-1` =「耶稣基督的仆人，雅各的弟兄犹大……」，`cmc-jude-1-3` =「亲爱的弟兄啊，我想尽心写信给你们……」），不抬进公开包 |
| 腓利门书隔离 CMC | 7 | 继续 hold |
| 约翰 leftover OCR | 1 | 未回潮 |

## 3. 犹大书公开包 1:1

复核前：20 = 研修本 20。复核后：18 = 研修本 18。

| 源 | 复核前 | 复核后 | 判定 |
| --- | ---: | ---: | --- |
| 研修本 verse / 导论 | 20 | 18 | 主体 **keep**；2 **hold**；13 **fix** |
| OCR | 0 | 0 | 本卷无公开 OCR |
| CMC | 0 | 0 | 隔离 16 继续 hold |

公开锚点全部落在合法 `Jude.章.节`。导论保留 9 张；关键主题接回 6 条节号，大事年表删轴，不整卡撤下。

### 3.1 已 hold（2）

目录残句到无源 PDF 不能最小复原：

| ID | 锚点 | 问题 |
| --- | --- | --- |
| `study-bible-jude-9-p005-n032` | `Jude.1.9` | 「节 米迦勒没有谴责魔鬼"但这些人"10节」目录残片 |
| `study-bible-jude-11-p005-n033` | `Jude.1.11` | 「节 该隐、巴兰、可拉"这样的人"12节」目录残片 |

不作文内补全。把这两行补成注释会在无 PDF 条件下伪造研修本原文。

### 3.2 已 fix（13）

#### 删表倾倒 / 中截尾句（3）

| ID | 问题 | 判定 |
| --- | --- | --- |
| `study-bible-jude-24-p006-n037` | 「而会以他能实现」中截 | **fix**：留「绝不会任由属他的人失脚」 |
| `study-bible-jude-intro-p002-n007` | 「主后303540…」年表轴 | **fix**：写《彼得后书》；删轴 |
| `study-bible-jude-intro-p002-n008` | 六条主题节号倾倒 | **fix**：按卡内残片回填 3 / 4-19 / 17-23 / 24-25 节 |

#### 高置信 OCR / 闭引号（节选）

| 串 | 还原 | 例 |
| --- | --- | --- |
| `奋类` / `材前` / `争瓣` | 畜类 / 林前 / 争辩 | `10`、`20`、主题 |
| `SOz6` / `参业3` / `创1：.1` | sozo / 参亚3 / 创1:1 | `23`、`25` |
| `摩太前书` / `《《圣经〉` | 提摩太前书 / 《〈圣经〉 | 作者、救恩历史 |
| `祷告》和2的一个分词` | 祷告"）和21节的一个分词 | `21` |
| 闭和修引号 | 为自己的利益 | `16` |

和修引号只在译词已经完整时闭合。9 / 11 两张目录残卡不补写。

其余公开研修本卡：犹大书锚点合法。PDF 点号连接不批量改写。

## 4. 六源口径

本轮减少公开研修本 2 张。公开研修本现计 **9,090**；公开文字卡 **10,097**。犹大书隔离 16 继续 ledger-only。公开 OCR 146 不变（1 keep + 145 hold-as-class）。标识映射不改写。

## 5. 下一卷

俄巴底亚书 + 玛拉基书 + 约翰二书 + 约翰三书 + 腓利门书 + 犹大书已在本跑收束。下一未审短卷可看**提多书**（公开 34，隔离 14）或**帖撒罗尼迦后书**（公开 34，隔离 CMC 0）。利未记（研修本 30 / OCR 6）与彼得后书（49）仍是较大未审面。

## 6. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts scripts/generatePublicBibleData.test.mjs`
- `vitest run` 本跑六卷及路加六源对账 / `publicData` / `publicBibleData`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、公开文字卡 10,097、无不安全串。
- `node scripts/validatePublicRepository.mjs`：通过。
- 原始输出见同目录 `validate.txt`。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地 `App.tsx` 不走 `loadPublicBook("Jude")`，因此无法在本环境用阅读页点开这些公开卡。对照与修补都落在公开数据包和台账 JSONL。

GitHub `verify` 全量仍会因本快照缺创世记资源 / v4 / `rg` 失败；失败面不读犹大书公开包，不补造真源。
