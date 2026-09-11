# 使徒行传 1:1 复核与隔离 CMC 台账分源判定

- 复核日期：2026-09-11
- 基线：路加 hold-queue（约翰 / 创世记 / 诗篇 / 耶利米 / 路加已闭合）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：隔离 ∩ 公开仍为 ∅。已从公开使徒行传撤下 21 张无法复原的研修本卡，并最小修补 32 张高置信引号 / OCR / 表倾倒。隔离 CMC 543 张继续 ledger-only。本卷公开 OCR = 0，六源映射口径不改。

## 1. 范围与方法

判定口径与路加相同：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒。
- **hold**：中截 / 表倾倒 / 无源 PDF 不能复原。

选使徒行传：路加之后最大的未审公开研修本面（483），且有隔离 CMC 543 可复核 ledger-only 合同。无卷级台账，公开 OCR 0。

## 2. 隔离合同

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同** |
| 隔离 CMC `cmc-acts-*` | 543 | **hold / ledger-only**。抽样仍是经文残句，不抬进公开包 |
| 路加隔离 CMC | 144 | 继续 hold |
| 约翰 leftover OCR | 1 | 未回潮 |

## 3. 使徒行传公开包 1:1

复核前：483 = 研修本 483。复核后：462 = 研修本 462。

| 源 | 复核前 | 复核后 | 判定 |
| --- | ---: | ---: | --- |
| 研修本 verse / 导论 | 483 | 462 | 主体 **keep**；21 **hold**；32 **fix** |
| OCR | 0 | 0 | 本卷无公开 OCR；跨卷 146 继续 1 keep + 145 hold-as-class |
| CMC | 0 | 0 | 隔离 543 继续 hold |

公开锚点全部落在合法 `Acts.章.节`。导论保留 8 张（原 11，撤下 3 张倾倒/中截卡）。

### 3.1 已 hold（21）

正文中截、主题/年表倾倒或结构损坏，无源 PDF 不能最小复原：

| ID | 锚点 | 问题 |
| --- | --- | --- |
| `study-bible-acts-intro-p002-n004` | `Acts.1.1` | 年表倾倒 + 尾垃圾 |
| `study-bible-acts-intro-p004-n007` | `Acts.1.8` | 主题条与经文表搅在一起 |
| `study-bible-acts-intro-p005-n010` | `Acts.1.1` | 例证中截 |
| `study-bible-acts-1-14-p009-n025` | `Acts.1.14` | 「因此他们」中截；「空攻墓」 |
| `study-bible-acts-2-23-p037-n310` | `Acts.2.23` | 残片倾倒 |
| `study-bible-acts-4-10-p015-n080` | `Acts.4.10` | 「雙霖多有費任…上帝以他」中截 |
| `study-bible-acts-5-10-p017-n073` | `Acts.5.10` | 「无法与圣」中截 |
| `study-bible-acts-5-31-p037-n320` | `Acts.5.31` | 残句堆叠 |
| `study-bible-acts-6-11-p019-n135` | `Acts.6.11` | 「传播进程」中截 |
| `study-bible-acts-7-37-p021-n150` | `Acts.7.37` | 「见申18:15；徒」中截 |
| `study-bible-acts-7-56-p022-n160` | `Acts.7.56` | 「见但7:13：太」中截 |
| `study-bible-acts-9-35-p028-n220` | `Acts.9.35` | 「沙仑沿海平」中截 |
| `study-bible-acts-10-48-p030-n247` | `Acts.10.48` | 「事实上，太」中截 |
| `study-bible-acts-15-6-p040-n230` | `Acts.15.6` | 「会议的决」中截 |
| `study-bible-acts-15-39-p041-n362` | `Acts.15.39` | 「重要的侍」中截 |
| `study-bible-acts-16-23-p044-n386` | `Acts.16.23` | 「后来的教会传」中截 |
| `study-bible-acts-19-19-p051-n307` | `Acts.19.19` | 「800万元人」中截 |
| `study-bible-acts-20-7-p053-n492` | `Acts.20.7` | 「礼拜天的崇」中截 |
| `study-bible-acts-20-16-p053-n321` | `Acts.20.16` | 「到达耶路撒」中截 |
| `study-bible-acts-21-28-p056-n525` | `Acts.21.28` | 「带外邦人闯」中截 |
| `study-bible-acts-28-19-p067-n640` | `Acts.28.19` | 「错误指控」中截 |

### 3.2 已 fix（32）

只做和修闭引号、上下文唯一 OCR、以及「保留完整段落、删表倾倒」。不补缺失段落。

高置信 OCR 例：`盼咐→吩咐`、`壁饼→擘饼`、`旧日约→旧约`、`迎南→迦南`、`差遭/差遺→差遣`、`蓄告→警告`、`帖撒罗尼迎→帖撒罗尼迦`、`胖立比→腓立比`、`圣路经→圣经`、`加但→但`、`无人能这些→无人能懂这些`。

表倾倒裁剪：`acts-1-9`、`acts-9-11`、`acts-13-48`、`acts-17-10`、导论 `p003-n006` 损坏尾段。

## 4. 六源口径

不改标识字段，也不按用户全库数补造卡。本轮只减少公开研修本 21 张：

| 源 | 用户全库 | 公开（本轮后） | 对账 |
| --- | ---: | ---: | --- |
| 综合解读 | 29,476 | 858 | 缺口；使徒行传隔离 543 ledger-only |
| 研修本 | 16,270 | **9,355** | 缺口；本卷 462 keep/fix + 21 hold |
| 启导本 | 9,521 | 0 | 整类 hold |
| OCR | 254 | 146 | 1 keep + 145 hold-as-class |
| 圣经的故事 | 98 | 0 | 整类 hold |
| 信息系列 | 8 | 3 | 稳定注释 8 一致 |

完整矩阵仍见 `docs/verification/2026-09-11-six-source-coverage-matrix/report.md`。

## 5. 下一卷

**以赛亚**（公开研修本 475，隔离 CMC 947，公开 OCR 0）。马太（453 / 隔离 143）为备选。

## 6. 验证

已跑公开卡审计测试与 `generatePublicBibleData --validate-only`。GitHub `verify` 全量仍会因本快照缺创世记资源 / v4 / `rg` 失败；失败面不读使徒行传公开包，不补造真源。
