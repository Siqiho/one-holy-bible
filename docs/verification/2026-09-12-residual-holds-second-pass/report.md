# 66 卷后第二轮：残余 unrestorable hold / 公开 OCR hold-as-class

- 复核日期：2026-09-12
- 基线：`cursor/ohb-titus-2thess-1to1-hold-queue-0b63`（PR #31 顶端；66 卷公开包均已有卷级 1:1）
- 台账包：`local-audit-pack/john-gospel-20260909/`（本快照唯一卷级台账）
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：隔离 ∩ 公开仍为 ∅。第二轮不新抬隔离 CMC，不改六源标识，不假设 Mac `Resources/`。347 张已撤研修本 hold 复核 main 原文后全部 **keep-hold**。公开 OCR 继续 **1 keep + 145 hold-as-class**。已对仍留在公开包的 57 张研修本卡做高置信引号 / OCR / 表倾倒 / 中截尾句最小修补。公开研修本 **9,089**、公开文字卡 **10,096** 不变。

## 1. 范围与方法

判定口径仍是马太方法：

- **keep**：锚点合法、正文可读。
- **fix**：仓库内可安全修补的引号、唯一 OCR、完整段落后的表倾倒 / 中截尾句。
- **hold**：中截 / 表倾倒 / 乱码到无源 PDF 不能复原。

本轮不再展开未审卷，只做跨卷第二过：

1. 残余 unrestorable hold：从 `origin/main` 找回 351 张已撤卡原文，只允许高置信引号 / OCR / 表倾倒救援；否则继续 hold。
2. 公开 OCR hold-as-class：无卷级台账则整类记录，不改正文，不补造。
3. 交叉包合同：隔离 ∩ 公开 = ∅；不改写六源；不把隔离 CMC 抬进公开包。
4. 收紧 `docs/verification/` 残余 hold 清单与公开卡审计覆盖。

## 2. 隔离合同

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同** |
| 隔离 CMC | 18,387 | **hold / ledger-only**，不抬进公开包 |
| 隔离研修本 | 10 | 继续 hold，未回潮 |
| 约翰 leftover OCR | 1 | 未回潮（`image-text-43-约翰福音-codex-pdf-p019-img004`） |

公开包 CMC 仍只有创世记已解释 858。信息系列 3 张不动。

## 3. 残余研修本 hold（351 声明 ID）

审计测试共声明 351 张已撤卡：347 `study-bible-*` + 4 `image-text-*`（创世记跨卷损坏 3 + 约翰 leftover 1）。全部不在公开包。

从 `origin/main` 找回 347 张研修本原文后：

| 初筛 | 张数 | 第二轮判定 |
| --- | ---: | --- |
| 正文乱码 / 开篇损坏 / 无完整段 | 242 | **keep-hold** |
| 疑似表尾 / 引号 / OCR | 105 | 复核后仍是中截或缺段，**keep-hold** |

没有一张可以从公开包撤卡状态救回。补「权柄 / 儿子 / 诫命后文」会在无 PDF 条件下伪造研修本原文。完整清单见 `held-study-bible.json`。

## 4. 公开 OCR：1 keep + 145 hold-as-class

| 判定 | 张数 | 台账 |
| --- | ---: | --- |
| keep | 1 | `image-text-01-创世记-codex-pdf-p102-img057`（创世记稳定注释面） |
| hold-as-class | 145 | 无卷级台账 |
| 已撤 OCR | 4 | 约翰 leftover 1 + 创世记轮跨卷损坏 3 |

本轮**不改**这 145 张正文。希伯来转写噪声继续留在公开包，按诗篇 / 马太 OCR 合同：无台账则不撤不改。逐张 ID / 锚点见 `ocr-hold-as-class.json`。先前只有利未记卷测列出 OCR ID；本轮把 146 张全部钉进清单测试。

## 5. 已 fix（公开研修本 57 张，不撤卡）

只改 `study-bible-*` 的 `title` / `body` / `summary` / `searchText`。不改经文，不改 OCR 卡。

### 5.1 高置信 OCR

| 串 | 还原 | 例 |
| --- | --- | --- |
| `旧日约` / `《I日约》` | 旧约 / 《旧约》 | 创世记、约翰、雅各、马太 |
| `迎南` | 迦南 | 创 1:21 / 12:9 / 16:16；诗 94:23 |
| `服待` | 服侍 | 徒 20:1、耶 17:4、约 13:14 |
| `自已` | 自己 | 约 11:33、诗 1:3 |
| `诚命` | 诫命 | 约一 3:15 的 summary / searchText |
| `吩附` / `盼咐` | 吩咐 | 创 22:2、耶 16:5、路 5:14 / 8:29 / 13:14 |
| `进人` | 进入 | 路加、约翰、诗篇、创世记、撒上 |
| `陷人` | 陷入 | 林前 10:7、伯 9:15、箴 1:29、诗 61:8 |
| `耶路撤冷` | 耶路撒冷 | 诗 118:26 |
| `犯好淫` | 犯奸淫 | 诗篇导论作者 |

### 5.2 表倾倒 / 中截尾句

| ID | 问题 | 判定 |
| --- | --- | --- |
| `study-bible-1cor-intro-p002-n005` | `《圣经文主后30 3540…集》` | **fix**：删轴，还原「圣经文集」 |
| `study-bible-acts-28-28-p067-n647` | `13：提后2:9］` | **fix**：留完整句，删表尾 |
| `study-bible-gen-17-17-p036-n137` | 「不能再生养孩」 | **fix**：留到「感到不可思议。」 |
| `study-bible-gen-34-21-p061-n461` | `15］e本书32:28` | **fix**：留完整句，删表尾 |
| `study-bible-john-19-31-p052-n332` | 「记载吻」 | **fix**：留到发掘完整句 |
| `study-bible-ps-27-8-p030-n230` | `72m赛40:11,46:3.` | **fix**：留完整句，删表尾 |
| `study-bible-ps-78-2-p078-n507-2-2-2` | 「耶稣使用」 | **fix**：留智慧工具完整段 |

徒 20:1 只改 `服待`→`服侍`。末句「于是保罗写了《哥林多后书》。」完整，不删。

字段级记录见 `second-pass-fixes.json`。

## 6. 六源口径

不改标识字段，也不按用户全库数补造卡。

| 源 | 用户全库 | 公开（本轮后） | 对账 |
| --- | ---: | ---: | --- |
| 综合解读 | 29,476 | 858 | 缺口；隔离 18,387 ledger-only |
| 研修本 | 16,270 | **9,089** | 缺口；本轮 0 张撤 / 0 张救回 |
| 启导本 | 9,521 | 0 | 整类 hold |
| OCR | 254 | 146 | 1 keep + 145 hold-as-class |
| 圣经的故事 | 98 | 0 | 整类 hold |
| 信息系列 | 8 | 3 | 稳定注释 8 一致 |

完整矩阵仍见 `docs/verification/2026-09-11-six-source-coverage-matrix/report.md`。标识映射不改写。

## 7. 审计覆盖

新增跨卷测试 `src/data/residualHoldsInventory.test.ts`：

- 66 份 `*PublicCardAudit.test.ts` 仍在。
- 347 张研修本 hold ID 与卷测声明 1:1，且都不在公开包。
- 146 张公开 OCR 与 `ocr-hold-as-class.json` 1:1。
- 隔离 ∩ 公开 = ∅；约翰 leftover OCR 未回潮。
- 公开研修本卡禁止本轮已修的 OCR / 表尾残串回潮。

## 8. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts src/data/residualHoldsInventory.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts scripts/generatePublicBibleData.test.mjs scripts/validatePublicRepository.test.mjs`：71/71 通过（270 tests）。
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、公开文字卡 10,096、无不安全串。
- `node scripts/validatePublicRepository.mjs`：通过。
- 原始输出见同目录 `validate.txt`。

`vitest run` 全量仍会因本快照缺创世记资源 / v4 / Node 22 跑 `.mts` 失败；失败面不读本轮公开包修补，不补造真源。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地阅读页不走 `loadPublicBook`。对照与修补都落在公开数据包和台账 JSONL。
