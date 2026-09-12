# OHB 云端审阅简报（暂停时 tip）

- 简报日期：2026-09-12
- 状态：**PAUSED by user**。用户已叫停隔夜残差 OCR；**不再新开第十二轮及以后**。第十二轮在暂停时取消，远端无 `twelfth` 分支。
- 性质：**只读审阅**。本文件只汇总已落盘的卷级 / 残差报告，不发明研修本原文，不改公开包，不续跑残差。
- 残差栈顶端（暂停时 tip）：`cursor/ohb-residual-holds-eleventh-pass-a16a`（[PR #42](https://github.com/Siqiho/one-holy-bible/pull/42)）
- 顶端 SHA：`904d6372a745c294efda46c7695f85511d6018f8`（`904d637`）
- 已完成、尚未合入 `main`：第十轮 [PR #41](https://github.com/Siqiho/one-holy-bible/pull/41)（`cursor/ohb-residual-holds-tenth-pass-bf14`）→ 第十一轮 PR #42。
- 过期简报：[PR #40](https://github.com/Siqiho/one-holy-bible/pull/40)（`cursor/cloud-review-brief-ohb`）写于第九轮 tip（PR #39）。残差已继续到第十一轮；以本文件为准。
- 公开包钉数（第二轮起至第十一轮不变）：66 卷、文字卡 **10,096** = 研修本 **9,089** + CMC **858** + OCR **146** + 信息系列 **3**。
- 隔离 ∩ 公开：`[]`（合同 keep）。
- 本简报分支：`cursor/cloud-review-brief-ohb-pause-35f9`。只加这份文档，**不改** `public/data/books/*.json`。

---

## a. 66 卷第一过 1:1（至 PR #31）

第一过按马太口径（keep / fix / hold）逐卷审公开研修本，不抬隔离 CMC，不改六源标识，不假设 Mac `Resources/`。PR #31（`cursor/ohb-titus-2thess-1to1-hold-queue-0b63`）收束提多书 / 帖后 / 利未记 / 彼得后书后，**66 份** `*PublicCardAudit.test.ts` 齐，公开包均有卷级 1:1。

收束钉数见 `docs/verification/2026-09-12-titus-1to1-hold-queue/report.md`：研修本 **9,089**、文字卡 **10,096**、公开 OCR **146**（1 keep + 145 hold-as-class）、公开 CMC **858**（全是已解释创世记 `cmc-gen-*`）。彼得后书撤 1 张 3:18 乱码叠卡后卡数落到此钉，其后残差轮**不再撤卡、不再救回**。

六源对账口径（标识不改写）见 `docs/verification/2026-09-11-six-source-coverage-matrix/report.md`。用户全库数是 Edit/Resources 真源；本仓库能 1:1 点名的只有信息系列 8、约翰台账子集、隔离 CMC 18,387、以及已发布公开子集。缺口不是漏审，也不按全库数补造。

### 书卷 → PR（同跑卷写在同一行）

| PR | 分支 | 卷 |
| ---: | --- | --- |
| [#2](https://github.com/Siqiho/one-holy-bible/pull/2) | `cursor/john-gospel-1to1-review-4102` | 约翰福音 |
| [#3](https://github.com/Siqiho/one-holy-bible/pull/3) | `cursor/ohb-card-quality-hold-queue-4582` | 创世记（兼约翰 hold 分源） |
| [#4](https://github.com/Siqiho/one-holy-bible/pull/4) | `cursor/ohb-card-quality-next-books-8265` | 诗篇 |
| [#5](https://github.com/Siqiho/one-holy-bible/pull/5) | `cursor/ohb-jeremiah-1to1-hold-queue-a460` | 耶利米书 |
| [#6](https://github.com/Siqiho/one-holy-bible/pull/6) | `cursor/ohb-six-source-coverage-audit-1ee5` | 六源审计（文档，不是卷级 1:1） |
| [#7](https://github.com/Siqiho/one-holy-bible/pull/7) | `cursor/ohb-luke-1to1-hold-queue-63b7` | 路加福音；同跑使徒行传 |
| [#8](https://github.com/Siqiho/one-holy-bible/pull/8) | `cursor/ohb-matthew-1to1-hold-queue-1c17` | 马太福音 |
| [#9](https://github.com/Siqiho/one-holy-bible/pull/9) | `cursor/ohb-isaiah-1to1-hold-queue-8a93` | 以赛亚书；同跑马可福音 |
| [#10](https://github.com/Siqiho/one-holy-bible/pull/10) | `cursor/ohb-deut-rom-1to1-hold-queue-40fd` | 申命记、罗马书 |
| [#11](https://github.com/Siqiho/one-holy-bible/pull/11) | `cursor/ohb-1sam-exod-prov-1to1-hold-queue-1568` | 撒母耳记上、出埃及记 |
| [#12](https://github.com/Siqiho/one-holy-bible/pull/12) | `cursor/ohb-prov-1to1-hold-queue-d28f` | 箴言、哥林多前书 |
| [#13](https://github.com/Siqiho/one-holy-bible/pull/13) | `cursor/ohb-ezek-1to1-hold-queue-bdeb` | 以西结书、约伯记 |
| [#14](https://github.com/Siqiho/one-holy-bible/pull/14) | `cursor/ohb-2sam-1to1-hold-queue-2f59` | 撒母耳记下、列王纪上 |
| [#15](https://github.com/Siqiho/one-holy-bible/pull/15) | `cursor/ohb-rev-1to1-hold-queue-e0e5` | 启示录；同跑尼希米记 |
| [#16](https://github.com/Siqiho/one-holy-bible/pull/16) | `cursor/ohb-josh-1to1-hold-queue-de43` | 约书亚记、列王纪下、希伯来书 |
| [#17](https://github.com/Siqiho/one-holy-bible/pull/17) | `cursor/ohb-2chr-1to1-hold-queue-c439` | 历代志下、士师记、以弗所书 |
| [#18](https://github.com/Siqiho/one-holy-bible/pull/18) | `cursor/ohb-1chr-1to1-hold-queue-12e6` | 历代志上、耶利米哀歌、加拉太书、哥林多后书 |
| [#19](https://github.com/Siqiho/one-holy-bible/pull/19) | `cursor/ohb-zech-1to1-hold-queue-b5a9` | 撒迦利亚书、何西阿书、但以理书 |
| [#20](https://github.com/Siqiho/one-holy-bible/pull/20) | `cursor/ohb-1tim-1to1-hold-queue-b6ce` | 提摩太前书、雅各书、约翰一书 |
| [#21](https://github.com/Siqiho/one-holy-bible/pull/21) | `cursor/ohb-ezra-num-1to1-hold-queue-8350` | 以斯拉记、民数记 |
| [#22](https://github.com/Siqiho/one-holy-bible/pull/22) | `cursor/ohb-song-col-1to1-hold-queue-e307` | 雅歌、歌罗西书 |
| [#23](https://github.com/Siqiho/one-holy-bible/pull/23) | `cursor/ohb-amos-mic-1to1-hold-queue-55be` | 阿摩司书、弥迦书 |
| [#24](https://github.com/Siqiho/one-holy-bible/pull/24) | `cursor/ohb-1pet-2tim-1to1-hold-queue-2f1b` | 彼得前书、提摩太后书 |
| [#25](https://github.com/Siqiho/one-holy-bible/pull/25) | `cursor/ohb-1thess-esth-1to1-hold-queue-b6bf` | 帖撒罗尼迦前书、以斯帖记 |
| [#26](https://github.com/Siqiho/one-holy-bible/pull/26) | `cursor/ohb-phil-joel-1to1-hold-queue-2b9c` | 腓立比书、约珥书 |
| [#27](https://github.com/Siqiho/one-holy-bible/pull/27) | `cursor/ohb-eccl-zeph-1to1-hold-queue-5a7b` | 传道书、西番雅书 |
| [#28](https://github.com/Siqiho/one-holy-bible/pull/28) | `cursor/ohb-hab-ruth-1to1-hold-queue-0014` | 哈巴谷书、路得记 |
| [#29](https://github.com/Siqiho/one-holy-bible/pull/29) | `cursor/ohb-hag-jonah-nah-1to1-hold-queue-da2c` | 哈该书、约拿书、那鸿书 |
| [#30](https://github.com/Siqiho/one-holy-bible/pull/30) | `cursor/ohb-oba-mal-1to1-hold-queue-b96f` | 俄巴底亚书、玛拉基书、约翰二书、约翰三书、腓利门书、犹大书 |
| [#31](https://github.com/Siqiho/one-holy-bible/pull/31) | `cursor/ohb-titus-2thess-1to1-hold-queue-0b63` | 提多书、帖撒罗尼迦后书、利未记、彼得后书 |

卷级报告目录：`docs/verification/2026-09-1{1,2}-*-1to1-hold-queue/report.md`（约翰为 `2026-09-12-john-gospel-1to1-review`）。

第一过是**栈式开放 PR**（#2 基于本地约翰卡分支，#3–#31 彼此叠底），**尚未合入 `main`**。审阅时看栈顶即可；不要把中间卷 PR 单独 cherry-pick 到 Mac。

---

## b. 残差轮 2–11 与公开 mix

第一过收束后不再展开未审卷。第二轮起只做跨卷残差：高置信 OCR / 引号 / 表倾倒最小修补，加厚禁串，重钉隔离 CMC 台账。公开 mix **从未因残差轮变动**。

| 轮 | PR | 分支 | 本轮公开研修本 fix（不撤卡） | 公开 mix |
| ---: | ---: | --- | ---: | --- |
| 2 | [#32](https://github.com/Siqiho/one-holy-bible/pull/32) | `cursor/ohb-residual-holds-second-pass-fa57` | 57 | 9,089 / 146 / 858 / 3 → **10,096** |
| 3 | [#33](https://github.com/Siqiho/one-holy-bible/pull/33) | `cursor/ohb-residual-holds-third-pass-796c` | 29 | 同上 |
| 4 | [#34](https://github.com/Siqiho/one-holy-bible/pull/34) | `cursor/ohb-residual-holds-fourth-pass-3d92` | 117 | 同上 |
| 5 | [#35](https://github.com/Siqiho/one-holy-bible/pull/35) | `cursor/ohb-residual-holds-fifth-pass-9fe9` | 99 | 同上 |
| 6 | [#36](https://github.com/Siqiho/one-holy-bible/pull/36) | `cursor/ohb-residual-holds-sixth-pass-9e44` | 20 | 同上 |
| 7 | [#37](https://github.com/Siqiho/one-holy-bible/pull/37) | `cursor/ohb-residual-holds-seventh-pass-bcf0` | 42 | 同上 |
| 8 | [#38](https://github.com/Siqiho/one-holy-bible/pull/38) | `cursor/ohb-residual-holds-eighth-pass-4747` | 85 | 同上 |
| 9 | [#39](https://github.com/Siqiho/one-holy-bible/pull/39) | `cursor/ohb-residual-holds-ninth-pass-94c2` | 71 | 同上 |
| 10 | [#41](https://github.com/Siqiho/one-holy-bible/pull/41) | `cursor/ohb-residual-holds-tenth-pass-bf14` | 150 | 同上 |
| 11（暂停 tip） | [#42](https://github.com/Siqiho/one-holy-bible/pull/42) | `cursor/ohb-residual-holds-eleventh-pass-a16a` | 17 | 同上 |
| 12 | — | 暂停时取消 | 0 | 未开分支 |

[PR #40](https://github.com/Siqiho/one-holy-bible/pull/40) 是第九轮时的只读简报，**不是**残差 OCR 轮。

结构化 mix 针：`docs/verification/2026-09-12-residual-holds-second-pass/cross-pack.json` 与第十一轮 `remaining-public-card-debt.json` 的 `publicMix` 一致。

第十一轮钉过的校验（`docs/verification/2026-09-12-residual-holds-eleventh-pass/validate.txt`）：

- 公开审计 + 残差测试：80 files / 324 tests passed
- `generatePublicBibleData --validate-only`：66 卷、31,102 CUV/KJV、10,096 文字卡、0 unsafe
- `validatePublicRepository`：通过

第十轮同口径：79 files / 318 tests（`docs/verification/2026-09-12-residual-holds-tenth-pass/`）。

各轮只改仍留包内的 `study-bible-*` 四字段（`title` / `body` / `summary` / `searchText`），不改经文，不改 OCR 卡正文。字段级清单在对应 `*-pass-fixes.json`。审阅时读报告与禁表即可，**不要重跑 OCR，也不要开第十二轮**。

---

## c. 隔离 ∩ 公开 = ∅

合同从第一过贯穿到第十一轮 tip，测试与台账都钉空集。

| 集合 | 张数 / 哈希 | 状态 |
| --- | --- | --- |
| 隔离 ∩ 公开 | **0** | `isolationPublicIntersection: []`（`cross-pack.json`、`isolation-cmc-ledger.json`） |
| 隔离包行 | 18,397 | `local-audit-pack/no-explain-isolation-20260731/` |
| 隔离 CMC | **18,387** | ledger-only，不抬进公开包；排序 SHA-256 `fa086c106e0fe8f96facdc00e0946233b524a28e25d02c8a13ff8cb74643c257` |
| 隔离研修本 | 10 | 继续 hold，未回潮 |
| 公开 CMC | **858** | 全部 `cmc-gen-*`；排序 SHA-256 `57faabdbe9c8ced51267e6b1142581e1e5475c08e6392f8d2451f93bb87377f6` |
| 隔离创世记 CMC | 508 | 含哨兵 `cmc-gen-1-3`；与公开创世记 858 不相交 |
| 约翰 leftover OCR | 1 | `image-text-43-约翰福音-codex-pdf-p019-img004` 不在公开包 |

隔离 CMC 按 65 卷分册计数（帖后隔离 `cmc-2thess-*` = 0，见 `docs/verification/2026-09-12-2thess-1to1-hold-queue/report.md`）。哨兵均在隔离、均不在公开：`cmc-matt-1-9`、`cmc-luke-1-37`、`cmc-john-4-1`、`cmc-acts-1-1`、`cmc-ps-1-5`、`cmc-isa-1-2`、`cmc-gen-1-3`、`cmc-rom-1-9`、`cmc-mark-1-23`。

抽样口径不变：隔离 CMC 是无解释经文残句，有解释才 keep。本快照不新抬、不改六源映射。第十一轮测试 `src/data/residualHoldsEleventhPass.test.ts` 重钉哈希、65 卷分册、哨兵与公开不相交。

---

## d. 剩余 hold / OCR hold-as-class 债务

下列项目**仍留在第十一轮暂停之后的债务面**。无 Mac `Resources/`、无源 PDF、无卷级 OCR 台账（约翰除外）则不能复原，**禁止补造原文**。完整针：`docs/verification/2026-09-12-residual-holds-eleventh-pass/remaining-public-card-debt.md` 与同目录 `.json`。

### 已撤、须 PDF 才能重判

| 集合 | 张数 | 判定 |
| --- | ---: | --- |
| 已撤研修本 | **347** | 第二轮从 `origin/main` 找回原文后全部 **keep-hold**。无 PDF 不能补「权柄 / 儿子 / 诫命后文」。ID：`docs/verification/2026-09-12-residual-holds-second-pass/held-study-bible.json` |
| 已撤 OCR | 4 | 约翰 leftover 1 + 创世记跨卷损坏 3 |

### 公开 OCR：1 keep + 145 hold-as-class

| 判定 | 张数 | 说明 |
| --- | ---: | --- |
| keep | 1 | `image-text-01-创世记-codex-pdf-p102-img057`（创世记稳定注释面） |
| hold-as-class | **145** | 无卷级台账则不改正文、不撤不补。希伯来转写噪声按诗篇 / 马太合同留包。ID：`docs/verification/2026-09-12-residual-holds-second-pass/ocr-hold-as-class.json` |

### 整类 / ledger-only（不抬进公开包）

| 集合 | 公开 | 下一轮（须用户明确恢复，且须 Mac Resources） |
| --- | ---: | --- |
| 隔离 CMC | 0（18,387 ledger-only） | 有解释才 keep |
| 隔离研修本 | 0（10 hold） | 继续 hold |
| 启导本 | 0 | 整类 hold（用户全库 9,521） |
| 圣经的故事 | 0 | 整类 hold（用户全库 98） |
| 信息系列 | 3 | 与稳定注释 8 一致，不假性加总 |

### 仍留公开包、本快照不补造的中截（36）

第十一轮 `remaining-public-card-debt.json` 的 `publicMidCutStillInPackage` 共 **36** 条（hold-in-place）。第九轮钉过 23 条，第十轮新确认 6 条，第十一轮新确认 7 条。下表只抄报告已有残片，**不补词**。

第九轮起已 hold（23）：

| ID | 残片（报告原文，不补词） |
| --- | --- |
| `study-bible-john-18-22-p046-n297` | `参了、12节` |
| `study-bible-john-3-17-p011-n061` | `受差遣的遭者自己` |
| `study-bible-luke-19-30-p061-n651` | `路加懞只提到` |
| `study-bible-luke-6-29-p028-n173` | `懞生动地说明` |
| `study-bible-ps-12-8-p017-n078` | `懞提醒忠信人` |
| `study-bible-jer-26-19-p048-n469` | `入侵犹大这里指审判官。坐在，时降下灾祸` |
| `study-bible-isa-7-14-p018-n085` | `责备亚哈斯没有信心的世俗还有一些人认为` |
| `study-bible-acts-22-28-p058-n357` | `密谋罗余害保岁` |
| `study-bible-acts-14-2-p050-n462` | `/23节；见本书9:2章` |
| `study-bible-ps-41-13-p044-n198` | `其中首似乎不属于相关诗篇的部分` |
| `study-bible-1cor-11-4-p019-n164` | `就必须先了当时的社会背景` |
| `study-bible-1cor-11-29-p021-n117` | `吃喝自己的吃喝就是定自己的罪了）` |
| `study-bible-1cor-7-39-p015-n079` | `意*愿意` |
| `study-bible-acts-3-18-p037-n312` | `主将得救的11:18*` |
| `study-bible-acts-4-13-p015-n084` | `4:31（*放胆》` |
| `study-bible-john-19-14-p048-n463` | `约"是：*` |
| `study-bible-jas-4-11-p012-n117` | `*不可彼此批评`（整卡表头残句） |
| `study-bible-jas-5-4-p012-n066` | `*不可……起……誓`（第九轮只按正文抄了 `收劃` / `残人自肥`，不复原利 19 表） |
| `study-bible-acts-13-48-p037-n209-2-2` | `*凡预定得保罗所讲的话"` |
| `study-bible-1john-intro-p001-n001` | `或某位""，` |
| `study-bible-luke-9-60-p039-n273` | `也表示""。` |
| `study-bible-matt-12-27-p029-n258` | `径异仪式`（驱邪 / 禁咒不唯一） |
| `study-bible-1chr-intro-p001-n001` | `'编年史""。` |

第十轮新确认（6）：

| ID | 残片 |
| --- | --- |
| `study-bible-john-1-51-p008-n034` | `个像人子的` |
| `study-bible-mark-12-14-p030-n301` | `耶稣己的看法` |
| `study-bible-1john-2-6-p007-n026` | `我们是在面` |
| `study-bible-acts-18-12-p048-n286` | `（《和庭"` |
| `study-bible-matt-15-2-p036-n258` | `那时的人经》` |
| `study-bible-matt-10-23-p025-n175` | `（《和修》-人子就要来临）` |

第十一轮新确认（7）：

| ID | 残片 |
| --- | --- |
| `study-bible-1cor-12-18-p023-n131` | `另参了、11、28节` |
| `study-bible-acts-10-35-p030-n167` | `美好行。` |
| `study-bible-acts-18-26-p049-n451` | `如个谈或小组查经` |
| `study-bible-mark-intro-p002-n007` | `与他一起到处，搜集` |
| `study-bible-acts-20-28-p054-n520` | `商數食會中喬理至朶「濃` |
| `study-bible-jer-24-7-p045-n435` | `吾珥"「答比歷犹大埃及` |
| `study-bible-john-14-12-p037-n239` | `安有通奕加「希關原要處的` |

上表均标注 hold-in-place（含嵌套引号 `1chr-intro`，改一处不等于复原内层）。不是债务的合法子串见第十一轮 `keepNotDebt`（`膳长` / `王膳`、`满有良善` / `普世`、`dia加人名属格`、`堕落人性`、`出人意料`、`浩瀚宇宙`、`征收人头税`、`犹太老师` 等），勿当禁串回扫。

交叉字段：第十一轮已按正文抄雅 2:21「因行为称义 / 希腊原文」与林前 8:1「希腊原文brasis」。雅 2:5「拣选 / 选举」两词合法，不改。其余 summary 分叉多为括号切边 / 省略号，不整段重写。

生成器：本快照无 `workbenchSyncedResources-v4.json`，不能按用户全库数重生成 66 卷，也不能把隔离 CMC / 启导本 / 故事卡抬进公开包。

---

## e. 已知全量 vitest 阻断

明细：`docs/verification/2026-09-12-residual-holds-eleventh-pass/full-vitest-blockers.md`。原则：记录真实缺失，不发明创世记图像 / 工作台 v4 / 假隔离资源，不改 CI 装绿。

GitHub `verify` 作业会跑 `validate:public-data`（应绿）再跑全量 `npm test`（仍红）。失败面**不读**第十一轮公开包修补，与 PR #32–#41 同一类缺口。

| 缺口 | 路径 / 条件 | 拖死的测试（报告所列） |
| --- | --- | --- |
| 工作台 v4 | `src/data/generated/workbenchSyncedResources-v4.json` **不存在** | `bookIntroView.test.ts`、`workbenchSyncedResources.test.ts`、`syncWorkbenchResources.test.mjs`、`studyBibleScriptureCoverage.test.ts`（5 个 stage ENOENT）。`generate:public-data` 也以 v4 为 `--resources`，云端只能 `--validate-only` 已发布包 |
| 创世记图像 | `src/assets/resources/genesis/images/cmc-01/` 等 **不存在**（工作区只有 `src/assets/react.svg`） | `sampleBible.test.ts`、`genesisCommentaryResources.test.ts`、`Workbench.test.tsx`、`bibleSearch.test.ts`、`genesisResourceAudit.test.ts`、`auditGenesisResourceCards.test.mjs`。文字 JSON `genesisCommentaryResources.json`（1,625）仍在，被图像模块拖死 |
| 综合解读生成 JSON | `src/data/generated/comprehensiveCommentaryResources.json` | `comprehensiveCommentaryScriptureCoverage.test.ts` |
| Doré 缩图 | `/resources/dore/001_Gen.1.jpg` | `doreChapterArtwork.test.ts` |
| Node 引擎 | 声明 `>=24 <25`；部分云快照是 Node 22 | `.mts` 加载失败（`registerHooks is not a function` 等） |
| ripgrep | GitHub runner / 部分快照无 `rg` | `scripts/migrateCodexNames.test.mjs` → `spawnSync rg ENOENT` |

**可通过、且读公开包的面**（第十一轮已实测）：

```bash
npx vitest run src/data/*PublicCardAudit.test.ts \
  src/data/residualHoldsInventory.test.ts \
  src/data/residualHoldsThirdPass.test.ts \
  src/data/residualHoldsFourthPass.test.ts \
  src/data/residualHoldsFifthPass.test.ts \
  src/data/residualHoldsSixthPass.test.ts \
  src/data/residualHoldsSeventhPass.test.ts \
  src/data/residualHoldsEighthPass.test.ts \
  src/data/residualHoldsNinthPass.test.ts \
  src/data/residualHoldsTenthPass.test.ts \
  src/data/residualHoldsEleventhPass.test.ts \
  src/data/publicData.test.ts \
  src/data/publicBibleData.test.ts \
  scripts/generatePublicBibleData.test.mjs \
  scripts/validatePublicRepository.test.mjs
node scripts/generatePublicBibleData.mjs --validate-only public/data
node scripts/validatePublicRepository.mjs
# 或：npm run validate:public-data
```

本快照无 v4，本地阅读页不走 `loadPublicBook`。对照落在公开数据包与台账 JSONL，不做浏览器点选。

---

## f. 如何在 GitHub 审阅、不把栈合进本地 Mac

残差史是 **#32←#33←…←#41←#42** 开放栈，底在 PR #31，**都还没进 `main`**。本简报另开分支，就是为了在暂停点钉一份对照，不在 tip 上再叠一轮 OCR、也不逼 Mac 快进合并。

### 不要做

- 不要 `git pull` / merge 任一 `cursor/ohb-residual-holds-*-pass-*` 或 1:1 hold-queue 分支到本地 `main` / 本地 Mac 快照。
- 不要在 Mac 上对公开包做第十二轮及以后 OCR，或按用户全库数「补齐」启导本 / 故事卡 / 隔离 CMC。
- 不要为了让 GitHub `verify` 全绿而补造创世记 PNG、工作台 v4、或改 CI 跳过 `npm test`。
- 不要发明研修本后文去救 347 张 keep-hold 或 36 条中截。
- 不要把 [PR #40](https://github.com/Siqiho/one-holy-bible/pull/40) 当当前 tip（那是第九轮时的简报）。

### 推荐做法（GitHub / 云端只读）

1. **只开这一份暂停简报 PR**（`cursor/cloud-review-brief-ohb-pause-35f9`，draft）。Files changed 应只有 `docs/verification/2026-09-12-cloud-review-brief.md`。
2. **残差正文以 PR #42 为准**。GitHub 上打开 [PR #42](https://github.com/Siqiho/one-holy-bible/pull/42)，用 *Files changed* / *Commits* 看第十一轮公开包修补与台账。第十轮看 [PR #41](https://github.com/Siqiho/one-holy-bible/pull/41)；需要更早轮次时沿 base 链点 #41 → #39 → #32，**不要 checkout 到笔记本**。
3. **要跑命令就开 Cursor Cloud Agent**，检出 `cursor/ohb-residual-holds-eleventh-pass-a16a`（或本简报分支，公开包与 tip 相同）。本环境跑身份：<https://cursor.com/agents/bc-2f794d24-503b-526e-810c-ceca64ac35f9>。
4. 云端只跑上一节的公开包校验 + 残差测试。全量 `npm test` 红是**已知资产缺口**，不是第十一轮回归失败。
5. 对照顺序建议：本简报 → 第十一轮 `report.md` / `remaining-public-card-debt.md` / `full-vitest-blockers.md` → 需要时再打开对应卷的 `*-1to1-hold-queue/report.md`。
6. Mac 本地继续停在你原来的工作树（约翰卡 / `main` / Resources）。审阅结论写在 GitHub review 或云端 follow-up。**等你明确要求**再谈合栈、恢复 v4、或恢复残差 OCR。

### 顶端只读指纹（2026-09-12 pause checkout）

```text
$ git log --oneline -20
904d637 docs: pin eleventh-pass validation counts and public-data hashes
5547d1d fix: eleventh-pass residual OCR, closers, and four-field dirt
ced7b00 docs: pin tenth-pass validation counts and public-data hashes
4ff5afb review: tenth-pass residual OCR bans and isolation CMC ledger
f936d2c docs: pin ninth-pass validation counts and manifest hashes
bfed897 review: ninth-pass residual OCR bans and isolation CMC ledger
25ebeee docs: pin eighth-pass validation counts and manifest hashes
ff49b47 review: eighth-pass residual OCR bans and isolation CMC ledger
0ede8d9 docs: pin seventh-pass validation counts and manifest hashes
5d5f65c review: seventh-pass closed-quote stars and leftover unique OCR
6051685 review: seventh-pass residual OCR bans and isolation CMC ledger
7540fb4 docs: pin sixth-pass validation counts and manifest hashes
3410d91 review: sixth-pass residual OCR bans and isolation CMC ledger
c1c0734 docs: pin fifth-pass validation counts and manifest hashes
b9069d3 review: fifth-pass residual OCR bans and isolation CMC ledger
85ebf31 docs: pin fourth-pass validation counts and manifest hashes
ef6dcc5 review: fourth-pass residual OCR bans and isolation CMC ledger
504f93c docs: note GitHub verify matches second-pass missing-asset gap
275630b docs: pin GitHub verify failure to known missing Genesis/v4 assets
eaed161 docs: pin third-pass validation counts and full-vitest blockers

$ git status
On branch cursor/ohb-residual-holds-eleventh-pass-a16a
nothing to commit, working tree clean

$ git rev-parse HEAD
904d6372a745c294efda46c7695f85511d6018f8
```

检出本简报分支后，`git status` 只会多这份文档；公开包与第十一轮 tip 字节级相同。
