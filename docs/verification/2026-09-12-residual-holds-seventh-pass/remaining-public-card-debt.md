# 下一轮公开卡债务（须 Mac Resources / 源 PDF）

- 日期：2026-09-12
- 本轮**没有** Mac `Resources/`、工作台 v4、或卷级 OCR 台账（约翰除外）。
- 下列项目是第七轮之后仍可行动、但不能在本快照伪造原文的债务。结构化针见 `remaining-public-card-debt.json`。

## 1. 已撤研修本 hold（347）

第二轮已从 `origin/main` 找回 347 张原文并全部 **keep-hold**。无源 PDF 不能补「权柄 / 儿子 / 诫命后文」。下一轮若有 Mac Resources 研修本 PDF，才能按马太方法逐张重判 keep / fix / hold。

ID 清单仍以 `docs/verification/2026-09-12-residual-holds-second-pass/held-study-bible.json` 为准。

## 2. 公开 OCR hold-as-class（145）

公开 OCR 继续 1 keep（创世记 `image-text-01-创世记-codex-pdf-p102-img057`）+ 145 hold-as-class。无卷级台账则不改正文、不撤不补。约翰 leftover `image-text-43-约翰福音-codex-pdf-p019-img004` 继续不在公开包。

## 3. 隔离 CMC / 整类 hold（不抬进公开包）

| 集合 | 张数 | 下一轮 |
| --- | ---: | --- |
| 隔离 CMC | 18,387 | 有解释才 keep；本快照抽样仍是经文残句，ledger-only |
| 隔离研修本 | 10 | 继续 hold |
| 启导本 | 公开 0 | 整类 hold |
| 圣经的故事 | 公开 0 | 整类 hold |

隔离哈希 / 65 卷分册 / 哨兵与第六轮相同，见 `isolation-cmc-ledger.json`。

排序 SHA-256：隔离 CMC `fa086c106e0fe8f96facdc00e0946233b524a28e25d02c8a13ff8cb74643c257`；公开 CMC `57faabdbe9c8ced51267e6b1142581e1e5475c08e6392f8d2451f93bb87377f6`。

## 4. 仍留公开包、但不能本轮补造的中截

| ID | 残串 | 为何不 fix |
| --- | --- | --- |
| `study-bible-john-18-22-p046-n297` | `参了、12节` | 可能是参 7、12 节；补数字等于造原文 |
| `study-bible-john-3-17-p011-n061` | `受差遣的遭者自己` | `差遭` 已改 `差遣`；「遭者自己」仍中截 |
| `study-bible-luke-19-30-p061-n651` | `路加懞只提到` | 已删地图尺标 / `必着见`；`懞` 不能唯一还原 |
| `study-bible-luke-6-29-p028-n173` | `懞生动地说明` | 与路 19:30 同类 |
| `study-bible-ps-12-8-p017-n078` | `懞提醒忠信人` | `懞` 无唯一还原 |
| `study-bible-jer-26-19-p048-n469` | `入侵犹大这里指审判官。坐在，时降下灾祸` | `弥迎` / `己被` 已改；审判官句仍中截 |
| `study-bible-isa-7-14-p018-n085` | `责备亚哈斯没有信心的世俗还有一些人认为` | 已删 `见本书7:8.9` 表尾；两侧中截不补造 |
| `study-bible-acts-22-28-p058-n357` | `密谋罗余害保岁` | 年表倾倒后的残句 |
| `study-bible-acts-14-2-p050-n462` | `/23节；见本书9:2章` | 表头后正文是徒 18 亚波罗材料，hold |
| `study-bible-ps-41-13-p044-n198` | `其中首似乎不属于` | 「有些 / 三首」不唯一 |
| `study-bible-1cor-11-4-p019-n164` | `就必须先了当时的社会背景` | 本轮只改同卡 `头中`；`先了` 不唯一 |
| `study-bible-1cor-11-29-p021-n117` | `吃喝自己的吃喝就是定自己的罪了）` | 本轮只改同卡 `亵读` / `響告`；缺开括号不补造 |

不是债务：`Iesous`、`形成鲜明对比`、可读年表里的 `主后30`、`自己经历`（含 `己经` 子串）、`非利士地`、`希伯来话`、`隐罗结`、`ViaDolorosa`、`《和修》注`、`征收人头税`、`救赎大工` / `办理大工`、`着重`、`善事上常用`、`昆虫` / `昆兰` / `撤离`、`墻垣` / `墻壁`。

## 5. 交叉字段仍未对齐（不整段重写）

第七轮只按正文抄高置信残串：提前 6:5 summary/searchText 的 `遺责` 按 body `谴责` 对齐。雅各 2:5 body「拣选术语」vs summary「选举术语」两词都合法，不改。其余 summary 分叉多为括号切边 / 省略号截断。

## 6. 生成器缺口

本快照没有 `workbenchSyncedResources-v4.json`。不能按用户全库数重生成 66 卷，也不能把隔离 CMC / 启导本 / 故事卡抬进公开包。下一轮 Mac Resources 恢复工作台投影后，再谈六源补齐。
