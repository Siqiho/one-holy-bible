# 约拿书 1:1 复核与隔离 CMC 台账分源判定

- 复核日期：2026-09-12
- 基线：同跑哈该书 hold-queue（哈巴谷书 / 路得记已闭合）
- 台账包：`local-audit-pack/john-gospel-20260909/`
- 隔离包：`local-audit-pack/no-explain-isolation-20260731/`
- 应用对照面：`public/data/books/*.json`
- 工作台投影：本快照**没有** `src/data/generated/workbenchSyncedResources-v4.json`
- 结论：隔离 ∩ 公开仍为 ∅。哈该书收束后，本跑按指定第二卷展开约拿书（公开研修本 39，隔离 CMC 28，公开 OCR 1）。无整卡 unrestorable hold；已最小修补 21 张高置信引号 / OCR / 表倾倒 / 中截尾句。隔离 CMC 28 张继续 ledger-only。本卷 1 张公开 OCR 无卷级台账，继续 hold-as-class，不撤不改。六源映射口径不改。

## 1. 范围与方法

判定口径与哈该书 / 哈巴谷书 / 马太相同：keep / fix / hold。不改六源标识，不抬隔离 CMC，不补造无 PDF 原文。不假设 Mac 本地 `Resources/` 仍可访问。

选约拿书：与哈该书并列下一未审研修本大面（公开 39），且带 1 张公开 OCR，足以复核「无台账则 hold-as-class」合同。

## 2. 隔离合同

| 集合 | 张数 | 本轮 |
| --- | ---: | --- |
| 隔离 ∩ 公开 | 0 | **keep 合同** |
| 隔离 CMC `cmc-jonah-*` | 28 | **hold / ledger-only**。抽样仍是经文残句（`cmc-jonah-1-1` =「耶和华的话临到亚米太的儿子约拿，说：」，`cmc-jonah-1-4` =「然而耶和华使海中起大风，海就狂风大作，甚至船几乎破坏。」），不抬进公开包 |
| 哈该书隔离 CMC | 25 | 继续 hold |
| 约翰 leftover OCR | 1 | 未回潮 |

## 3. 约拿书公开包 1:1

复核前：40 = 研修本 39 + OCR 1。复核后：40 = 研修本 39 + OCR 1。

| 源 | 复核前 | 复核后 | 判定 |
| --- | ---: | ---: | --- |
| 研修本 verse / 导论 | 39 | 39 | 主体 **keep**；0 **hold**；21 **fix** |
| OCR | 1 | 1 | **hold-as-class / 本轮不改**。无卷级台账，不撤不改；跨卷继续 1 keep + 145 hold-as-class（本卷 1 张计入这 145） |
| CMC | 0 | 0 | 隔离 28 继续 hold |

公开锚点全部落在合法 `Jonah.章.节`。导论保留 9 张；文学体裁补「认为 / 叙事 / 自己」，关键主题改异船教 / 船主，大纲删图表倾倒，不整卡撤下。1:7 / 4:1 标题中截已按正文补全。

### 3.1 已 hold（0）

本卷没有无源就不能复原的整卡。1:17 鱼/三日中截、3:10 / 4:2 残句、大纲图表倾倒都落在完整段落后或可用卡内残片唯一重排，按马太口径删尾 / 重排保留。

本卷 1 张公开 OCR 无台账行，故留在公开包并记入 hold-as-class：

| ID | 公开锚点 | 台账 | 本轮 |
| --- | --- | --- | --- |
| `image-text-32-约拿书-codex-pdf-p005-img002` | `Jonah.1.9` | 无 | hold-as-class |

### 3.2 已 fix（21）

只做和修闭引号、上下文唯一 OCR、以及「保留完整段落、删表倾倒 / 中截尾句」。不补缺失段落。

#### 删表倾倒 / 中截尾句（6）

| ID | 问题 | 判定 |
| --- | --- | --- |
| `study-bible-jonah-1-17-p005-n029` | 「通常指复活 / 日三夜 / 这稣 / 原困」交错 | **fix**：鱼定义后直接接三天三夜；耶稣；原因 |
| `study-bible-jonah-3-10-p007-n034` | 「上帝回3:7-8注」中截 | **fix**：留 ra'ah 完整句 |
| `study-bible-jonah-4-1-p007-n041` | 「灾病 / 拿没有」交错 | **fix**：闭恶/灾祸引号；约拿没有 |
| `study-bible-jonah-4-2-p007-n030-2-2-2-2` | 「见这种属性」中截 | **fix**：第二次祷告后直接接慈爱对比 |
| `study-bible-jonah-intro-p002-n005` | 「教事导 / 自已 / 呼之欲出了然而」 | **fix**：教导；自己；补句号 |
| `study-bible-jonah-intro-p003-n009` | 七段情节图表倾倒 | **fix**：留 A–D 大纲与平行说明，删图表尾 |

#### 高置信 OCR / 闭引号（节选）

| 串 | 还原 | 例 |
| --- | --- | --- |
| `差遺` / `拈阔` / `三目` / `这稣` | 差遣 / 拈阄 / 三日 / 耶稣 | `1-6`、`1-7`、`3-3`、`1-17` |
| `异船教水手` / `主（1：.6）` / `读者自已` | 异教水手 / 船主（1:6） / 读者自己 | 关键主题、文学体裁 |
| `对尼尼微意` / `苦楚。共出现` | 对尼尼微的敌意 / 苦楚（ra'ah）共出现 | `2-10`、`4-6` |
| 闭和修引号 | 门闩 / 干死 / 灵魂 / 恶 | `2-6`、`1-6`、`4-3`、`4-6` |

和修引号只在译词已经完整时闭合。本卷无整卡 unrestorable hold。1:7 / 4:1 标题中截已按正文补全。

其余公开研修本卡：约拿书锚点合法，短交叉引用或完整注释可读。PDF 点号连接仍普遍存在，但不改变释义，**本轮不批量改写**。

本卷 1 张 `image-text-32-约拿书-*` 无卷级台账，继续 **hold-as-class**。卡片含希伯来转写噪声（`Yonah` / `TUV nn`），但按诗篇 / 马太 OCR 合同：无台账则不在本轮撤、不在本轮改。

## 4. 六源口径

本轮不减少公开研修本。与哈该书 / 那鸿书合计后：公开研修本现计 **9,092**；公开文字卡 **10,099**。约拿书隔离 28 继续 ledger-only。公开 OCR 146 不变（1 keep + 145 hold-as-class）。标识映射不改写。

## 5. 下一卷

哈该书 + 约拿书已在本跑收束。同跑已续展**那鸿书**（公开研修本 39 无整卡 hold，公开 OCR 1 继续 hold-as-class，隔离 CMC 31 ledger-only）。见 `docs/verification/2026-09-12-nahum-1to1-hold-queue/report.md`。下一高价值未审研修本面可看**俄巴底亚书**（13）或**玛拉基书**（20 / OCR 2）。

## 6. 验证

已跑：

- `vitest run src/data/*PublicCardAudit.test.ts scripts/generatePublicBibleData.test.mjs`
- `vitest run` 哈该书 / 约拿书 / 那鸿书及哈巴谷书 / 路得记 / `publicData` / `publicBibleData`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、公开文字卡 10,099、无不安全串。
- `node scripts/validatePublicRepository.mjs`：通过。
- 原始输出见同目录 `validate.txt`。

未做浏览器点选：本快照没有 `workbenchSyncedResources-v4.json`，本地 `App.tsx` 不走 `loadPublicBook("Jonah")`，因此无法在本环境用阅读页点开这些公开卡。对照与修补都落在公开数据包和台账 JSONL。

GitHub `verify` 全量仍会因本快照缺创世记资源 / v4 / `rg` 失败；失败面不读约拿书公开包，不补造真源。
