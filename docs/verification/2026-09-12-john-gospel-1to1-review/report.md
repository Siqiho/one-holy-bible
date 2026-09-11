# 约翰福音卡片 1:1 复核报告

- 复核日期：2026-09-12
- 台账包：`local-audit-pack/john-gospel-20260909/`
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/John.json`（公开 v0.1.0 经文卡包）
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：约翰福音 1,533 张台账卡已完成分源 1:1 对照；公开包 414→409。已对确认的同步泄漏与正文损坏做最小修补，其余未入公开包的源继续搁置。

## 1. 范围与方法

只依据本仓库快照，不假设 Mac 本地 `Resources/` 或 Edit API 仍可访问。

对照路径：

1. 台账：`card候选清单.jsonl`、`placement候选清单.jsonl`、`app同步清单.jsonl`、`暂不同步清单.jsonl`、`资源审计台账.jsonl`、`manifest.jsonl`。
2. 无解释隔离：`no-explain-isolation-20260731/card候选清单.jsonl`。
3. 应用数据：`public/data/books/John.json`、`public/data/manifest.json`。
4. 代码路径：`scripts/generatePublicBibleData.mjs`、`src/data/publicBibleData.ts`、`src/App.tsx`、`src/data/resources.ts`、`scripts/syncWorkbenchResources.mjs`、`src/lib/backlinks.ts`、`src/components/ReaderView.tsx`。

判定口径：

- **keep**：锚点合法、正文可读、不应再改。
- **fix**：已确认的映射/正文质量问题，且能在仓库内安全修补。
- **hold**：证据不足、跨章过宽、无解释、OCR/启导本未审定，或损坏到无法在无源 PDF 条件下可靠复原。

## 2. 台账与应用总表

| 集合 | 条数 | 说明 |
| --- | ---: | --- |
| `card候选清单` | 1,533 | 唯一 `commentary_key`，无重复 |
| `placement候选清单` | 1,534 | 多 1 张孤儿启导本卡 |
| `app同步清单` | 1,287 | 含 `syncable` 609 + `not_ready` 405 + `temporarily_unsynced` 273 |
| `暂不同步清单` | 520 | 与 app 清单重叠 273（几乎全是启导本） |
| `资源审计台账` | 769 | 主要覆盖研修本/OCR，不含 765 张 CMC |
| `manifest` | 768 | 与审计台账差 1（即孤儿启导本） |
| `异常清单` | 0 | 空 |
| 公开 `John.json` 原文卡 | 414→409 | 全部能在台账找到；无公开独有卡 |
| 工作台 v4 | 缺失 | `.gitignore` 例外声明了该文件，但快照未打包 |
| CMC 综合解读 JSON | 缺失 | `comprehensiveCommentaryResources.ts` 引用的生成文件不在快照 |

分源：

| 源 | 台账 | 公开包（复核前） | 台账 sync | 1:1 结论 |
| --- | ---: | ---: | --- | --- |
| 圣经研修本 verse | 486 | 404 | 404 `not_ready` 入公开包，82 `temporarily_unsynced` | 公开 404 张做内容复核（后撤 4 张）；82 张宽范围继续 hold |
| 圣经研修本导论 | 9 | 9 | 全部 `temporarily_unsynced` | 公开已按 2026-07-14 序章归位挂到经文；keep + 1 处 typo fix |
| CMC 综合解读 | 765 | 0 | 609 `syncable`，156 `temporarily_unsynced` | 156 张与无解释隔离 1:1 对齐，hold；609 张本快照无投影入口 |
| 启导本试验 | 267+1 孤儿 | 0 | 210 `syncable` 但清单同时标 hold | 全部 hold |
| Hurlbut 故事 | 5 | 0 | `temporarily_unsynced` | hold |
| OCR 图转文 | 1 | 1 | `not_ready` | 已从公开包 hold 移除 |

约翰福音 CUV 共 879 节。公开卡锚点全部合法、无跨卷。研修本 verse 卡覆盖第 1–21 章。

## 3. 应用代码路径

公开阅读包：

- 生成：`scripts/generatePublicBibleData.mjs` 只收 `commentary`/`note`，按 `primaryAnchor`/`verses`/`bookIntro` 分卷写入 `public/data/books/*.json`。
- 装载：`src/data/publicBibleData.ts` 的 `loadPublicBook("John")` 校验 `textCardCount` 与 manifest hash。
- 阅读页挂卡：`src/lib/backlinks.ts` 的 `resourcesForVerse()` 只认 `primaryAnchor`、`verses` 或 `[[wiki]]` 链接；`src/components/ReaderView.tsx` 用它拉右边栏。

本地工作台阅读：

- `src/App.tsx` 合并百科/BibleEveryone 稳定源 + `loadWorkbenchSyncedResourcePayload()`。
- 同步排除：`scripts/syncWorkbenchResources.mjs` 把 `temporarily_unsynced` / `reader_returned` / `soft_deleted` 写成 tombstone，再由 `mergeStableAndWorkbenchResources()` 从稳定源隐藏。
- 本快照没有 v4 投影，因此**本地 App 路径看不到这 409 张研修本公开卡**；它们只活在 `public/data`。这不是约翰卡正文错误，但是对照缺口。

导论呈现：

- `src/domain/bookIntroView.ts` 用 `study-bible-*-intro-*` ID 识别导论卡。
- 公开包 9 张导论已去掉 `bookIntro`，改挂 `John.1.1` / `John.20.31` / `John.21.24`，与 `docs/verification/2026-07-14-ohb-intro-card-verse-mapping.md` 一致。

## 4. 分源 1:1 结论

### 4.1 公开研修本 verse 卡（404→400）

这 404 张在台账标 `not_ready` + `needs content and navigation review`，但已经进入公开包（另 1 张公开 `not_ready` 是 OCR 卡）。这次复核把公开包当作已发布阅读面，逐类判定：

- **keep**：单节或短交叉引用、锚点与标题经文一致、正文完整可读。这是公开约翰卡的主体。
- **fix**：已确认的 PDF 抽取损坏（见第 5 节），已在 `public/data/books/John.json` 修补。
- **hold**：无法安全复原的损坏卡，已移出公开包。

82 张未进公开包的研修本 verse 卡全部在 `暂不同步清单`，理由是 `broad or contextual study-bible commentary needs manual chapter-level review`。其中：

- 宽范围 / 跨章：`John.1.19–12.50`、`2.12–4.54`、`5.1–10.42`、`11.1–12.19`、`13.1–20.31`、`13.1–17.26`、`18.1–19.42` 等。
- 其余多为相邻两节注释。正文常见 PDF 断句，但它们本来就没进公开包。

**结论：这 82 张继续 hold。** 不应在无源 PDF 条件下抬进公开包。

### 4.2 公开研修本导论（9）

| ID | 公开锚点 | 判定 |
| --- | --- | --- |
| `study-bible-john-intro-p001-n001` | `John.21.24` | **fix**：补「耶稣所**爱**的那个门徒」 |
| `study-bible-john-intro-p001-n002` | `John.1.1` | **keep** |
| `study-bible-john-intro-p001-n003` | `John.20.31` | **keep** |
| `study-bible-john-intro-p001-n004` | `John.20.31` | **keep** |
| `study-bible-john-intro-p002-n005` | `John.20.31` | **keep** |
| `study-bible-john-intro-p002-n006` | `John.1.1` | **keep** |
| `study-bible-john-intro-p002-n007` | `John.1.1` | **keep** |
| `study-bible-john-intro-p003-n008` | `John.1.1` | **keep**（年表脚注符号保留） |
| `study-bible-john-intro-p003-n009` | `John.1.1` | **keep** |

台账仍写 `temporarily_unsynced` / `book-intro`，与公开包不一致。这是历史归位后的台账漂移，不是锚点错误。**不把 9 张导论从公开包撤下。**

### 4.3 CMC 综合解读（765）

- 156 张 `temporarily_unsynced` **恰好等于**无解释隔离包中的约翰福音卡，集合完全重合。
- 抽样如 `cmc-john-4-43`、`cmc-john-6-48` 正文只有经文引句，符合隔离合同。
- 公开包 0 张 CMC。隔离有效。
- 609 张台账标 `syncable`，但本快照没有 CMC/工作台投影，阅读面不可见。

**结论：156 hold；609 keep-as-ledger-only（本 PR 不抬进公开包）。**

### 4.4 启导本（267 + 1 孤儿）

- 267 张全部在 `暂不同步清单`，公开包 0。
- 其中 210 张 card 行写 `syncable`，但 app/暂不同步清单同时 hold（`matt-to-acts optimize`）。以更严的清单为准：**hold**。
- 孤儿 `qidaben-john-15-18-p1496-n001`：有 placement/audit/held，**没有** card 候选。正文是错卷残片（「一八 所以犹太人越发想要'杀他」+ 毕士大池），风险旗含 `pdf-audit-soft-deleted`、`group15-soft-delete-garbage`。**hold，且不要补回 card 清单。**

### 4.5 Hurlbut 故事（5）

全部 `temporarily_unsynced`，公开包 0。

- `hurlbut-story-070`、`hurlbut-story-081` 的 coverage 含 `Luke.*`。对约翰卷包来说这是跨卷相关范围，不是非法锚点；主锚仍在约翰。
- **结论：继续 hold。** 故事卡不是 v0.1.0 公开文字卡范围。

### 4.6 OCR 图转文（1）

`image-text-43-约翰福音-codex-pdf-p019-img004`：

- 台账：`not_ready`，`ocr-derived-from-image-card`，`requires-human-review-before-resource-write`。
- 正文讲约 2:1「第三日 / 迦拿」，编辑覆盖却挂 `John.2.5`。
- 上下文证据已写明「拿但业的家乡（二十一 2）」，OCR 却成「二十—2」；希伯来词被抽成 `Double Blessings/210 D"`。
- **结论：hold。** 已从公开包移除。未改台账（台账本就该保持 not_ready）。

### 4.7 相邻但不在本台账的约翰资源

- 百科：`bibleEncyclopediaResources-v1.json` 中约 72 张卡的经文范围碰到约翰（如「变水为酒」`John.2.1`）。这是稳定百科源，不在约翰福音台账包。
- Doré 章图：`doreChapterArtwork.json` 有约翰章图，不是注释卡。
- 二者不纳入本 1:1 台账结论。

## 5. 实质性议题与判定

### 5.1 已 fix（写入公开包）

| ID | 台账证据 | 代码路径 | 问题 | 判定 |
| --- | --- | --- | --- | --- |
| `study-bible-john-1-1-p005-n012` | card 候选；`not_ready`；公开 `John.1.1` | `public/data/books/John.json` → `resourcesForVerse()` | `/ogos`、`agod`、科威尔法则引号断裂、尾部串入 1:3「凡被造的」 | **fix**：保留序言/三位一体可读书段，修 Colwell 句，删 1:3 串段 |
| `study-bible-john-1-14-p006-n015` | 同上，锚 `John.1.14` | 同上 | 「本是上帝的"，同时成"道"了人」；`约1.：17`；Theos 经文表倾倒；「显信彰显」 | **fix**：复原道成肉身段，删表，修明显 OCR |
| `study-bible-john-8-56-p026-n160` | 同上，锚 `John.8.56` | 同上 | 「我是」总表插入亚伯拉罕注释中间 | **fix**：抽出总表，保留 8:56/8:58 正文 |
| `study-bible-john-20-28-p055-n350` | 同上，锚 `John.20.28` | 同上 | 「昇端」；序言引用写成「11，18」 | **fix**：昇→异；补 1:1、1:18；闭合和修引号 |
| `study-bible-john-intro-p001-n001` | 暂不同步 / book-intro；公开挂 `John.21.24` | `bookIntroView.ts` + 阅读页 | 「耶稣所的那个门徒」缺「爱」 | **fix** |
| `study-bible-john-7-14-p022-n175` 等 | 公开短交叉引用 | 阅读页 | `（《和修》"圣殿，` 等引号未闭 | **fix**：只闭引号，不改释义 |
| `study-bible-john-6-4-p019-n108` | 公开 `John.6.4` | 阅读页 | 收尾「另见2:13」无「注」 | **fix** |

同批闭合和修引号：`6-64`、`8-32`、`10-34`、`11-52`、`7-28`。

### 5.2 已 hold（移出公开包）

| ID | 台账证据 | 代码路径 | 问题 | 判定 |
| --- | --- | --- | --- | --- |
| `image-text-43-约翰福音-codex-pdf-p019-img004` | `not_ready`；锚 `John.2.5`；OCR 风险旗 | 生成器未挡 `not_ready`，写入公开包 | 同步泄漏 + 错锚 + OCR 垃圾 | **hold / 移出公开包** |
| `study-bible-john-21-24-p056-n512` | `not_ready`；公开 `John.21.24` | 阅读页 21:24 | 「十"那门徒"」「儿子论：作者和书名」「见真的」 | **hold** |
| `study-bible-john-13-16-p035-n221` | `not_ready`；公开 `John.13.16` | 阅读页 | 「在人新烈！森瀝播想。開經基修」 | **hold** |
| `study-bible-john-12-44-p034-n214` | `not_ready`；公开 `John.12.44` | 阅读页 | 「最终不是信」中截 | **hold** |
| `study-bible-john-10-36-p029-n255` | `not_ready`；公开 `John.10.36` | 阅读页 | 「分别为圣」后中截 | **hold** |

### 5.3 继续 hold（未进公开包，不改）

- 82 张宽范围/上下文研修本。
- 156 张 CMC 无解释卡（与隔离包 1:1）。
- 267+1 启导本。
- 5 张 Hurlbut。
- 609 张 CMC `syncable`：台账可同步，但本快照无生成投影，也不是 v0.1.0 公开文字卡范围。

### 5.4 keep（公开包保留）

其余公开研修本卡（409 中未整段重写的部分）：约翰锚点合法，标题经文与 `primaryAnchor` 一致，正文为可引用注释或完整交叉引用。PDF 点号连接（如 `13:23.19:26`）仍普遍存在，但不改变释义，**本轮不批量改写**，以免在无源 PDF 下误修。

## 6. 已落地的仓库修改

1. `public/data/books/John.json`：删除 5 张 hold 卡；修补 12 张确认损坏卡。414→409。
2. `public/data/manifest.json`：更新 John 的 `bytes` / `sha256` / `textCardCount`。
3. `src/data/johnGospelPublicCardAudit.test.ts`：锁住「OCR 卡不得回潮、已知垃圾串不得回潮、公开卡必须挂合法约翰经文」。
4. 本报告。

未做：

- 不重写台账 JSONL（那是 Edit/Resources 真源，本快照只读对照）。
- 不伪造缺失的 `workbenchSyncedResources-v4.json`。
- 不把 CMC/启导本/Hurlbut 抬进公开包。
- 不改 `generatePublicBibleData.mjs` 的通用过滤策略（缺工作台源，改生成器也无法在本环境重跑全 66 卷）。

## 7. 1:1 总判

约翰福音台账 1,533 张卡的去向已经闭合：

| 去向 | 张数 |
| --- | ---: |
| 公开保留（研修本 verse keep/fix） | 400 |
| 公开保留（研修本导论） | 9 |
| 从公开包撤下（4 张损坏研修本 + 1 张 OCR） | 5 |
| 台账已 hold 的宽范围研修本 | 82 |
| CMC 无解释隔离 | 156 |
| CMC 台账 syncable、本快照无投影 | 609 |
| 启导本 card 候选 | 267 |
| Hurlbut 故事 | 5 |
| **合计（= card 候选）** | **1,533** |

另有 1 张孤儿启导本 `qidaben-john-15-18-p1496-n001` 只出现在 placement/held/audit，不计入 1,533。公开包 409 = 400 verse + 9 导论；原文公开 414 = 404 verse + 9 导论 + 1 OCR。

公开包与台账的关系可以收束为：

> 约翰福音 v0.1.0 公开文字卡 = 研修本单节/短注，减去 5 张已确认损坏卡；导论保留并挂在既有归位经文上。CMC、启导本、故事、OCR、宽范围研修本全部不进入公开阅读面。
