# OHB / one-holy-bible 只读审计：卡片同步逻辑与库存盘点恢复

- **任务**：Task B — card sync logic and inventory restoration
- **仓库**：https://github.com/Siqiho/one-holy-bible
- **审计基线**：`main` @ `0d72867`（工作树干净）
- **公开快照版本**：`v0.2.0`（`PUBLIC_RELEASE.json` / `package.json`）
- **审计日期**：2026-09-11
- **约束**：只读调查；本文件是本次唯一允许的仓库写入。未改应用代码、配置、依赖、CI 或运行时行为。
- **方法**：源码与文档交叉阅读、公开数据包字段盘点（Node 只读统计）、历史提交对照（含已移除的生成器）、GitHub issue/PR 扫描。未启动开发服务器，未改数据。

---

## 1. 结论先行

当前公开仓库是 **开发工作台的截肢快照**，不是完整卡片同步系统。

1. **卡片 ↔ 经文的运行时同步**（选节后刷新卡片列表）在本仓库内是完整的，但匹配算法与公开映射层都被削薄：`PublicApp` 丢弃 `primaryAnchor` / `coverageRanges` / `bookIntro` / `searchText` / `summary`；匹配只看 `verses[]` + 正文 `[[wiki]]`，而公开数据里 wiki 链接数为 0。
2. **工作台 ↔ 源库存的同步**（刷新已同步卡片、编辑回写、删除并退回未同步）只留下 UI 与回调孔位。公开宿主把这些回调标成 `never` 且不接线；`debugMeta.sourceWorkbenchCardId` 被发布卫生规则禁止进入公开数据。
3. **库存恢复**存在两套互不衔接的机制：
   - 客户端 `localStorage` 恢复布局 / 本地编辑 / 本地删除；
   - 发布侧 `PUBLIC_RELEASE.json` 只保存哈希与计数投影，**没有**生成器、ledger、备份交换目录或从 `cardInputSha256` 重建的路径。
4. 最危险的实现间隙：工作台在 `visibleResources`（公开路径下 = **当前书卷**）变化时，把「他卷」的整理卡片、本地编辑、本地删除一律当作「刷新后不存在」剪掉。这会把跨书卷库存恢复直接做坏。
5. 文档与代码多处过时：`note` 卡片宣称存在但实际为 0；README 仍写 Tauri/`src-tauri/` 与生成器时代的测试规模；schema v1 校验器仍留在 `src/core/data/publicData.ts`，会拒绝当前 v2 数据包。

---

## 2. 当前状态

### 2.1 仓库形态

| 层 | 现状 | 证据 |
|---|---|---|
| 公开运行时 | `src/App.tsx` → `PublicApp` → 只读 `Workbench` | `src/App.tsx` L10–16；`src/public/PublicApp.tsx` L165–175 |
| 开发工作台 UI | 单文件 `Workbench.tsx`（4471 行），仍含同步/反同步/刷新/本地恢复 | `src/core/components/Workbench.tsx` |
| 卡片领域模型 | `StudyResource` + 大量 `debugMeta`（sync/ledger/PDF/路径） | `src/core/domain/resources.ts` L5–81 |
| 公开数据 schema | v2：经文 + `textCards` + `imageCards` + 资产描述符 | `src/public/publicData.ts`；`public/data/manifest.json` |
| 遗留 schema | v1：无 `imageCards`，允许 `debugMeta` | `src/core/data/publicData.ts` L16–29, L176–208 |
| 发布卫生 | 禁止 `generate:public-data`、禁止私有字段进入公开数据路径 | `scripts/validatePublicRepository.mjs` L52–54；`scripts/validatePublicRelease.mjs` L13 |
| 桌面壳 | README/`vite.config.ts` 仍提 Tauri，工作树 **无** `src-tauri/` | `README.md` L76–94；`vite.config.ts` L11–29 |
| 测试 | 仅 2 个脚本测试（约 39 行断言）+ 空 `src/test/setup.ts` | 对比 v0.1.0 文档的 15 文件 / 248 测试 |
| 议题 | GitHub 无开放 issue / PR | `gh issue list` / `gh pr list` 为空 |

文档明确把同步内部实现排除在公开快照之外：

> Private source imports, source PDFs, local paths and services, **synchronization internals**, review-state metadata, and development-only inputs remain outside this public release.  
> — `docs/releases/2026-07-15-v0.2.0-release-notes.md`

`.ohb-public-managed.json` 却把完整 `Workbench.tsx` 和 **v1 + v2 两套** `publicData.ts` 一并列入公开托管文件（88 个条目）。结果是：同步 **实现** 不在仓库，同步 **表面** 仍在仓库。

### 2.2 公开库存快照（实测，非文档转述）

来源：`PUBLIC_RELEASE.json` + `public/data/manifest.json` + 66 本 `public/data/books/*.json` 只读遍历。

| 项目 | 文档/投影 | 实测 | 备注 |
|---|---:|---:|---|
| 书卷 | 66 | 66 | 与 `bibleBooks.ts` 规范顺序一致 |
| CUV 经文 | 31,102 | 31,102 | 搜索索引一对一对账 |
| KJV 经文 | 31,102 | 31,102 | 同上 |
| 文本卡 | 10,963 | 10,963 | **全部** `type=commentary` |
| 笔记卡 `note` | 文档称 commentary **和** note | **0** | schema 允许，库存为空 |
| 图像卡 | 2,705 | 2,705 | 引用 2,515 个 PNG 描述符 |
| 未使用资产 | — | 0 | 资产清单与引用集合相等 |
| 文本卡重复 ID | — | 0 | |
| 图像卡重复 ID | — | 0 | |
| 空 `verses[]` | — | 0 | 公开包已展开 |
| 文本卡 `primaryAnchor` | — | 10,963 / 10,963 | 且均落在 `verses[]` 内 |
| 图像卡 `primaryAnchor` | — | 2,702 / 2,705 | 缺 3 张 |
| 文本卡 `coverageRanges` | — | 10,963 / 10,963 | 与 `verses[]` 集合相等（创世记抽样：全部单节、单 range） |
| `bookIntro` | 工作台有完整序言路径 | **0** | 公开库存无书卷序卡 |
| 正文 `[[wiki]]` | `resourceMentionsVerse` 依赖此项作补充匹配 | **0** | |
| 有文本卡的 CUV 节 | — | 10,095 / 31,102（**32.46%**） | 按 `verses[]` 命中 |
| 有任一类卡的 CUV 节 | — | 11,230 / 31,102（**36.11%**） | |

`v0.1.0` 文本卡为 **11,124**，`v0.2.0` 为 **10,963**，净减 **161**。公开发布说明只写新数量，不解释删并/筛选/不同源输入。

`PUBLIC_RELEASE.json` 投影字段：

```json
{
  "developmentSourceCommit": "d4637acc3b4cff8e6409c99e2f169d9d40b4ad11",
  "cardInputSha256": "105838053128ba05d18ca84fb25bef4237729843186a913ed087783a9c0f6513",
  "textCardCount": 10963,
  "imageCardCount": 2705,
  "generatedAt": "2026-07-15T13:58:18.077Z"
}
```

这些是 **单向投影**：本仓库无法用它们重建输入库存。`developmentSourceCommit` 指向仓外开发工作台。

### 2.3 书卷密度与空洞（库存缺口预览）

按「CUV 节数 − 至少有一张文本卡的节数」排序的高缺口书卷：

| 书卷 | 文本卡 | 图像卡 | CUV 节 | 有文本卡的节 | 约未覆盖节 | 单节最多图像卡 |
|---|---:|---:|---:|---:|---:|---:|
| Ps | 446 | 214 | 2461 | 432 | 2029 | 10 |
| Num | 89 | 81 | 1288 | 84 | 1204 | 21 |
| Ezek | 186 | 104 | 1273 | 177 | 1096 | 6 |
| Exod | 215 | 130 | 1213 | 203 | 1010 | 11 |
| Job | 166 | 76 | 1070 | 158 | 912 | 6 |
| 1Chr | 71 | 59 | 942 | 64 | 878 | 14 |
| Lev | 36 | 83 | 859 | 32 | 827 | 19 |
| Isa | 475 | 120 | 1292 | 468 | 824 | 9 |

最密书卷是创世记：1,640 文本 + 229 图像，包体约 **3.4 MiB**。诗篇图像也密（214）。这直接决定选节时的扫描成本。

---

## 3. 卡片同步逻辑

仓库里其实叠了 **三层「同步」**，文档没有拆开，实现也没有统一入口。

### 3.1 层 A：经文选择 → 卡片列表（读者同步）

这是公开产品真正在跑的同步。

**数据流**

```text
选节 / 选章 / 选书 / 搜索跳转
  → selectedVerseId | selectedIntroBook
  → currentResources = 当前章全部经文 × resourceMentionsVerse(全部可见卡)
  → currentVerseResources = resourcesForVerse(当前节)
  → 中心「当前经文已有卡片」+ 右侧模块 + 卡片搜索
```

**匹配规则**（`src/core/lib/backlinks.ts` L7–18）：

1. `resource.primaryAnchor === verseId`，或
2. `resource.verses.includes(verseId)`，或
3. 正文 `[[...]]` 经 wiki-link 规范化后等于该节。

**未参与匹配的字段**（模型有、公开包也有，运行时不用）：

- `coverageRanges`
- `debugMeta.relatedRanges` / `estimatedSpan` / `displayRange`
- `searchText`（只进卡片搜索串，且公开映射已丢弃）
- `bookIntro`（公开库存为 0；即便有，`PublicApp` 也不会传下去）

**公开映射丢弃**（`src/public/PublicApp.tsx` `resourcesForBook` L78–97）只保留：

`id, title, type, verses, body, source, assetPath`

因此公开路径下：

- 匹配退化为 **仅 `verses[]`**（`primaryAnchor` 被丢掉；wiki 为 0）。
- 当前公开包里 `verses[]` 已与 `coverageRanges` 对齐，所以 **现网选节列表仍能对上**；一旦源库存改为「range 宽、verses 窄」或依赖 `bookIntro`，公开层会静默漏卡。
- 卡片搜索失去 `searchText` / `summary`。创世记 1,640 张卡的 `searchText` **全部不等于** `body` 或 `title`，说明该字段是独立检索投影。

**导航校验**（`resourceWithValidatedVerseNavigation`，Workbench L1171–1184）会丢掉当前书卷经文集合之外的 `verses` / `primaryAnchor`。按书加载时这合理；若开发宿主一次灌入全书资源，跨卷引用会被剪掉。

**序言路径**（`verseFirstBookIntroResources`）只收「有 `bookIntro` 且没有合法 verse」的卡。公开库存 0 条，工具栏仍保留「序」交互。文档未说明序卡是否被发布流程剔除。

### 3.2 层 B：工作台 ↔ 源库存（开发同步，公开已挖空）

Workbench 仍实现完整宿主协议：

| 回调 / 字段 | 意图 | 公开宿主 |
|---|---|---|
| `onRefreshResources` | 「重新读取工作台已同步卡片」 | 类型为 `never`，不传，刷新按钮不渲染 |
| `onUnsyncResource` | 「删除并退回未同步」 | `never`；且依赖 `debugMeta.sourceWorkbenchCardId` |
| `onUpdateWorkbenchResource` | 编辑回写源卡 | `never`；无 `sourceWorkbenchCardId` 时退回本地 draft |
| `isRefreshingResources` / `unsyncingResourceId` | 飞行中状态 | 未接线 |
| `syncStatus` / `syncSelection` / `readerInclusion` / `reviewStatus` | 源侧评审/入选状态 | 公开 schema 不允许这些键 |

关键判定：

```text
canUnsync  = debugMeta.sourceWorkbenchCardId && onUnsyncResource
saveEditor = 若有 sourceWorkbenchCardId 则走 onUpdateWorkbenchResource，否则写 localStorage
delete     = 若可 unsync 则 unsync，否则把 id 记入 one-holy-bible-deleted-resource-ids
```

发布卫生把 `sourceWorkbenchCardId` / `sourceLedgerPath` / `sourcePdfPath` 等列为私有字段（`scripts/validatePublicRelease.mjs` L13；`scripts/validatePublicData.mjs` L78–79）。因此 **公开包在结构上不可能驱动层 B**。这与发布说明一致，但工作台仍把层 B UI、日志、飞行锁留在公开托管文件里。

历史生成器（`864bc0c` 的 `scripts/generatePublicBibleData.mjs`）从 `resourcesPath` 读 `resources[]`，按 `bookIntro` / `primaryAnchor` / `verses[0]` 分书，并剥离 `sourceWorkbench*`。`v0.2.0` 起该脚本被禁止出现在 `package.json`。仓内不再有「从源库存投影到公开包」的可执行路径。

### 3.3 层 C：双语阅读模块对齐（经文滚动同步）

选节后对每个可见译本 `scrollIntoView({ behavior: "smooth" })`，并打日志「visible Bible modules synchronized to selected verse」（Workbench L2855–2871）。这是 UI 对齐，不是卡片库存同步。`smooth` + 每节重算卡片列表，是卡顿的主要线索之一。

### 3.4 文档 / 注释交叉核对（同步）

| 说法 | 出处 | 代码事实 |
|---|---|---|
| 同步内部实现不在公开仓库 | v0.2.0 release notes / `DATA_SOURCES.md` | 层 B 实现确实不在；层 B **孔位与文案** 仍在 Workbench |
| 「synchronized CUV/KJV reading and verse highlighting」 | `README.md` Features | 层 C 存在；高亮靠选中态，不是独立同步引擎 |
| 可移动模块、保存布局、卡片整理、本地文本编辑 | v0.1.0 notes | 布局/整理仍在；公开 `readOnly` 隐藏编辑按钮，但 **删除按钮未按 readOnly 关掉** |
| 刷新按钮「重新读取工作台已同步卡片」 | Workbench L4256 | 公开路径不可达 |
| 「删除并退回未同步」 | Workbench L1576–1598, L3294 | 公开路径不可达 |
| 解释卡含 commentary **和** note | README / DATA_SOURCES / 多处 | 库存 0 张 note |
| Tauri 配置已包含 | README L76–94 | `src-tauri/` 不存在 |
| 生成器 + 248 测试 | v0.1.0 验证文档 | 生成器已删；测试只剩校验脚本 |

---

## 4. 库存恢复 / 盘点备份 / 投影

### 4.1 客户端「恢复」（localStorage）

键：

| 键 | 内容 | 恢复函数 | 失败行为 |
|---|---|---|---|
| `one-holy-bible-layout` | 整份 `WorkbenchLayout` | `storedLayout` | warn，回退 `initialLayout` |
| `one-holy-bible-resource-edits` | `{[id]: {body, summary, title}}` | `storedResourceEdits` | warn，`{}` |
| `one-holy-bible-deleted-resource-ids` | 本地删除 ID 列表 | `storedDeletedResourceIds` | warn，空 Set |

布局恢复还做了多轮迁移：

- `savedCardsByBook` → `savedCardsByVerse`（L188–201）
- 旧 `centerCardResourceIds` → 按卡推断章节 scope（L245–254）
- `centerCardResourceIdsByBook` 再按当前资源重算 scope（L269–284）
- 缺资源时 scope 回退 `Gen.1` 或把书名键改成 `{book}.1`

这些是 **用户整理库存** 的迁移，不是源卡 ledger 恢复。没有版本戳、没有配额、没有跨设备、没有与 `PUBLIC_RELEASE` 对账。`localStorage` 满或隐私模式会静默「本地持久化失败」，只在状态栏加后缀。

### 4.2 「刷新后剪枝」误伤跨书库存（核心缺陷）

三处 `useEffect` 把「当前 `resources` / `visibleResources` 里没有的 ID」当成过期：

1. **整理卡片 / 已保存引用** — `pruneCenterCardsByAvailableResources`（L303–370, 触发 L2802–2818）  
   剪 `centerCardResourceIds*`、`savedCardsByVerse`、`savedCardsByBook`、`activeResourceId`。
2. **本地编辑草稿** — L2821–2835，按 **当前书** 可见 ID 过滤后写回 storage。
3. **本地删除 ID** — L2837–2853，同上。

公开宿主每次只注入 **当前书** 的卡（`PublicApp` L145–146）。因此：

```text
用户在创世记整理/删除/改稿
  → 跳到出埃及记（或首次启动后从 storage 恢复出多书布局）
  → visibleResources = 出埃及记
  → 创世记 ID 被当成「刷新后不存在」
  → changeLayout(..., "prune_stale_resource_refs_after_refresh")
  → 创世记整理栈、编辑、删除记录被持久化抹掉
  → 回到创世记：库存「恢复」失败，卡重新出现 / 整理消失
```

日志文案写的是 after refresh，依赖却是 `[visibleResources]` / `[resources]`，**书卷切换与真正刷新无法区分**。这是「库存恢复」最硬的实现级根因。

### 4.3 发布侧盘点、备份、投影

**还在的投影**

- 每书 `textCardCount` / `imageCardCount`（manifest）
- 全书合计（`PUBLIC_RELEASE.json`）
- 包字节数 + SHA-256
- `cardInputSha256` / `bibleInputSha256` / `assetManifestSha256`
- 运行时再对一次计数（`loadPublicBook` L114–124）
- CI：`validate:public-data` 必须与发布合计一致

**已经不在的恢复能力**

| 能力 | v0.1.0 文档 / 历史代码 | v0.2.0 现状 |
|---|---|---|
| `generate:public-data` | 有；后来还补过「先写 sibling 再交换」 | `package.json` 禁止该脚本名 |
| 失败保留旧输出 | 验证文档 L38；`097c9ea` | 生成器整体移除 |
| 预飞备份 | 「external Codex backup area」，路径只在私有任务报告 | 本仓库无备份清单、无恢复 runbook |
| 源 ledger | `StudyResourceDebugMeta.sourceLedgerPath` | 公开包禁止该字段 |
| 从 `cardInputSha256` 重建 | 无 | 仍无；哈希不能当备份 |
| 生成器测试（34） | v0.1.0 验证 | 不存在 |
| 按书库存差异解释 | 无 | 仍无（161 张文本卡下落不明） |

注意：`864bc0c` 恢复出的生成器本体是 **直接 `rm` 目标目录再写**，与验证文档「bounded sibling + swap」并不一致；`097c9ea` 才补边界。随后 `v0.2.0` 把整条管道移出公开仓。审计无法在本仓复核现行私有生成器是否仍做安全交换。

### 4.4 删除语义分裂

中心「当前经文」列表 **无条件** `showDeleteAction`（L2361），且 `canDeleteResource` **不看** `readOnly`（L1390）。公开版会显示删除：

- 无 `sourceWorkbenchCardId` → 只写本地删除集合，不改 JSON 包；
- 换书后该集合被剪枝 → 删除不持久；
- 刷新（若开发宿主接线）后，剪枝可能把「源里已真正删掉的 ID」清掉，或把「仅他卷未加载」误判为已恢复。

这不是源库存恢复，也不是可审计盘点，只是带误剪枝的本地遮罩。

---

## 5. 卡顿 / 性能线索

以下均为静态分析，未做浏览器采样。

| 线索 | 位置 | 为何会顿 |
|---|---|---|
| 选节后对当前章 **每一节** × **全书已加载卡** 做 `resourceMentionsVerse` | Workbench L2625–2631 | 创世记约 1,869 卡；每张还跑 wiki 正则（数据里 0 命中） |
| 无 `verseId → cards[]` 倒排 | `backlinks.ts` | 每次选节全表扫描 |
| `scrollIntoView({ behavior: "smooth" })` 双栏同时滚 | L2859–2865 | 与卡片重算叠在同一 tick |
| DEV 日志在选节时打印 **全部** `resourceIds` | L2770–2781 | 创世记会序列化上千 ID；依赖含 `currentResources` 数组 |
| scope 比较用 `JSON.stringify` 整份 map | L2790 | 整理栈一大就贵 |
| 中心/右侧对每张卡渲染 Markdown + dnd-kit | ResourceCard | 一节最多 8 张文本 + 十余张图时仍可接受；整章卡片搜索会放大 |
| 卡片搜索只扫 `currentResources`（整章） | L2633–2635, L1092–1108 | 公开还丢掉 `searchText`，只能扫 title/body |
| 全书搜索索引启动即加载 | `PublicApp` L114；`search-index.json` **约 14 MiB** | 与卡片无关，但和选节争主线程/带宽 |
| 创世记包 3.4 MiB，加载后做 SHA-256 | `publicBibleData.ts` L63–76 | 切书延迟；`bookPromises` **永不驱逐** |
| 单节图像峰值高 | 申命记 24、历代志下 28、民数记 21 | 远程 PNG + 预览 |
| 4471 行单组件 | Workbench.tsx | 任何选节日都会走巨大渲染树 |
| 无 Workbench / backlinks 测试 | tests 目录 | 回归时只能靠手感，卡顿易被当「正常」 |

层 B 飞行锁（`refreshInFlightRef` / `unsyncInFlightResourceIdRef` / `updateInFlightResourceIdRef`）在公开路径不会触发。开发宿主若一次 `onRefreshResources` 重灌全书资源，会同时点燃剪枝三件套 + 全表重匹配，这是最像「同步后卡一下」的组合。

---

## 6. 问题清单、根因假设、证据路径

| ID | 问题 | 严重度 | 根因假设 | 证据路径 |
|---|---|---|---|---|
| S1 | 公开映射丢弃同步/检索字段 | 高 | 发布层有意最小化 `PublicStudyResource`，未与 Workbench 匹配器对齐 | `PublicApp.tsx` L78–97；`backlinks.ts` L7–18；`publicData.ts` TEXT_CARD_KEYS |
| S2 | 换书误剪跨书整理/编辑/删除 | **高** | 剪枝 effect 把「当前书资源集合」当成「全球库存」 | Workbench L2802–2853, L303–370；`PublicApp` 按书注入 |
| S3 | 层 B 同步只剩死孔位 | 中 | 公开快照截断开发宿主，UI 未同步拆除 | Workbench L64–76, L3264–3322；`PublicApp` L42–44；release notes「synchronization internals」 |
| S4 | 公开 `readOnly` 仍能本地删当前经文卡 | 中 | `showDeleteAction` 与 `readOnly` 正交 | Workbench L1390, L1672–1689, L2361 |
| S5 | 无源库存备份/重建 | 高（运维） | 生成器与输入数据集被移出；只留哈希投影 | `validatePublicRepository.mjs` L52–54；`PUBLIC_RELEASE.json`；v0.1.0 验证 L11, L38 |
| S6 | 文本卡 11,124 → 10,963 无说明 | 中 | 换了 `cardInput` 或发布筛选；仓内无法对账 | v0.1.0 notes vs `PUBLIC_RELEASE.json` |
| S7 | 文档称 note 卡，库存为 0 | 低/产品 | 生成器仍接收 note，发布输入没有；或文档套话 | 实测 `types.note=0`；历史生成器 `type !== commentary && type !== note` 才 skip |
| S8 | 约 64% CUV 经文无文本卡 | 产品 | 「selected」子集，不是全本注释层 | 覆盖率 32.46%；DATA_SOURCES「10,963 selected」 |
| S9 | schema v1 死代码与 v2 并行 | 中 | `.ohb-public-managed.json` 仍托管 core v1 | `src/core/data/publicData.ts` L176–208；Workbench 只 import 其 search 类型 |
| S10 | README 宣称 Tauri/`src-tauri` | 低 | v0.2.0 拆仓时壳目录未进公开快照，文档未改 | `README.md` L94；工作树无该目录 |
| S11 | 测试从 248 降到校验快照 | 高（质量） | 生成器与 Workbench 测试未随公开快照留下 | 验证文档 L32 vs 现 `scripts/*.test.mjs` |
| S12 | 选节卡顿结构 | 中 | 无倒排 + smooth scroll + 重日志 + 全书卡扫描 | §5 |
| S13 | `coverageRanges` 不参与匹配 | 中（潜伏） | 匹配器早于 range 模型；公开包碰巧 1:1 | `backlinks.ts`；创世记 range≡verses |
| S14 | 3 张图像无 `primaryAnchor` | 低 | 导入/消毒不一致 | Gen 1 张、Mic 2 张 |
| S15 | 图像 ID 泄露源 PDF 命名 | 低（卫生/版权语境） | 公开 ID 未重写 | 例：`document-image-01-创世记-codex-pdf-p005-img000` |
| S16 | 书卷缓存不驱逐 | 低/中 | `bookPromises` Map 只增 | `publicBibleData.ts` L31, L99–135 |
| S17 | 搜索不含卡片 | 产品 | 索引 schema 只有经文 | `search-index.json`；`bibleSearch.ts` |
| S18 | 无 issue/计划文档可对需求 | 审计限制 | 公开仓刻意不含 internal plans | v0.1.0 验证 L9；`gh issue list` 空 |

---

## 7. 差距表（期望 vs 公开仓）

| 能力 | 文档 / UI / 领域模型所暗示 | 公开仓实际 | 缺口 |
|---|---|---|---|
| 选节出卡 | 有，且含 coverage / 序言 | 仅 `verses[]`；序言 0 | 映射与匹配器窄于模型 |
| 刷新已同步卡 | 工具栏按钮 + 剪枝 | 按钮不出现；剪枝仍在，且误绑换书 | 刷新语义被换书冒充 |
| 编辑回写源 | 编辑器 + sync 日志 | 公开只读隐藏编辑；无宿主 | 层 B 不可用 |
| 退回未同步 | 危险按钮 | 无 `sourceWorkbenchCardId` | 层 B 不可用 |
| 本地编辑恢复 | v0.1.0 功能 | 代码还在，readOnly 关掉入口；换书剪草稿 | 恢复不可靠 |
| 本地删除恢复 | 隐式 | 可删；换书后删除集合被清空 | 「删了又回来」 |
| 多书整理栈恢复 | `centerCardResourceIdsByBook` | 换书按当前书剪全球 map | 跨书整理丢失 |
| 发布库存重建 | `cardInputSha256` + 历史生成器 | 无生成器、无输入、无 sibling 备份 | 只能校验不能再生 |
| 盘点差异解释 | 计数必须相等 | 相等；不解释 161 张减少或 64% 无卡 | 无差异账本 |
| note / 序卡 | schema + 文案 | 0 / 0 | 产品表面超额承诺 |
| 卡片全文检索 | `searchText` 字段 | 不映射；搜索只扫当前章 title/body | 检索投影浪费 |
| 图像完整性 | 描述符 + 外仓 URL | 校验描述符；不拉 PNG 字节 | 运行时坏图要到点击才知 |
| 桌面壳 | README Tauri | 目录缺失 | 文档漂移 |
| 回归网 | 248 tests / 34 generator | 2 个校验测试 | 同步与恢复 0 覆盖 |
| 源 ledger | `sourceLedgerPath` | 禁止出现在公开数据 | 盘点链在仓外断裂 |

---

## 8. 风险

1. **用户整理库存被换书摧毁**（S2）。这是公开只读工作台上最接近「数据丢失」的路径：布局还在，卡片引用没了。
2. **发布不可再生**（S5）。磁盘/误提交损坏 `public/data` 时，本仓只能用 git 历史回滚，不能从 `cardInputSha256` 重投影。私有备份只存在于仓外「Codex backup area」叙述中。
3. **双 schema / 双工作台**（S9, S3）。后续若有人用 `src/core/data/publicData.ts` 校验现行包，会因 schemaVersion 1 直接失败；若有人给公开 `Workbench` 接上半套同步宿主，会立刻碰到剪枝误杀。
4. **只读名不副实**（S4）。公开用户能本地删卡，刷新/换书后又回来，造成「同步坏了」的错觉。
5. **创世记 / 诗篇选节卡顿**（S12）。结构上已具备 stutter 条件；开发态日志会再加一档。
6. **覆盖率被误读成数据丢失**（S8）。32% 有文本卡是发布范围，不是运行时 bug；若没有盘点说明，审计/用户都会当成缺失。
7. **版权与卫生余量**（S15）。图像 ID 带 `codex-pdf` 与中文书名，增加溯源暴露面；与「公开包剥离私有路径」目标不完全一致。

---

## 9. 建议（只建议，不实施）

优先级按「先止损库存，再补盘点，最后拆表面」排列。

### P0 — 停止误剪枝

- 剪枝与草稿清理必须以 **「明确的刷新成功」** 或 **「该书卷资源集合」** 为范围，禁止在 `visibleResources` 因换书而变时删除他卷 ID。
- 按书加载时：只 prune **当前书** 的 stale 引用；或维护 `loadedBookIds` 并集再 prune。
- 给 layout / edits / deleted 加 schema 版本，避免旧键与新 scope 混迁。

### P0 — 给公开只读一个诚实的删除策略

- `readOnly` 应同时关掉 `showDeleteAction`、本地删除 persistence，或明确做成「会话内隐藏」且换书不写回 storage。
- 不要让只读用户写入会在换书时被抹掉的删除账本。

### P1 — 对齐映射层与匹配器

- `resourcesForBook` 至少传递 `primaryAnchor`、`bookIntro`、`coverageRanges`、`summary`、`searchText`。
- `resourceMentionsVerse` 应定义是否展开 `coverageRanges`；并与发布生成器的展开策略写成同一份契约。
- 若公开数据保证 `verses[]` 已是闭包，就在文档写死，避免第二套匹配语义。

### P1 — 盘点账本

- 在仓外或受控文档中记录：`cardInputSha256` 对应的输入规模、`note`/序卡是否剔除、11,124→10,963 的 161 张去向、按书期望覆盖率。
- 校验器可增加 **非 fail-closed** 的覆盖率报告（每书有卡节数 / 总节数），与「计数必须相等」分开。
- 明确图像描述符校验 **不等于** 远程字节校验；若需要库存完整性，在发布管道对 2,515 个 SHA 抽检。

### P1 — 性能

- 按书建 `Map<VerseId, StudyResource[]>`，选节 O(1)。
- 选节滚动改为 `auto` 或 rAF 单次对齐；DEV 日志不要 dump 全 ID 列表。
- 搜索索引与书卷包考虑分片或延迟；`bookPromises` 加上限。

### P2 — 拆除或隔离层 B 表面

- 公开构建不打包 unsync/refresh/sourceWorkbench 文案；或把 Workbench 拆成 `public` / `authoring`。
- 删除或冻结 `src/core/data/publicData.ts` v1，避免误用。
- README 去掉不存在的 `src-tauri/`，或把壳目录真的放回来。
- 补 Workbench 单测：换书不丢他卷整理、readOnly 不删、匹配字段契约、剪枝只在 refresh 后发生。

### P2 — 仓外同步系统（本仓无法审计）

对开发工作台（`developmentSourceCommit`）建议单独审计：

- 源卡 ledger 与 `sourceWorkbenchCardId` 生命周期；
- unsync 是否真的回到「未同步」队列，还是只删公开投影；
- 刷新是否全量替换导致本仓剪枝逻辑误伤；
- 生成器现行是否仍 sibling-swap；备份是否可从哈希复原。

---

## 10. 本审计未覆盖

- 未运行 `npm test` / 浏览器 / 性能剖析（只读、且无产品改动需要验证）。
- 未读取仓外开发工作台、Codex 备份路径、`one-holy-bible-assets` 二进制。
- 未验证 2,515 张远程 PNG 是否全部 200。
- 未对 10,963 张卡做内容质量 / 解经正确性审查。
- GitHub 无 issue，无法把发现绑到既有票证。

---

## 11. 关键路径索引

```text
src/App.tsx                                      公开入口，只读 Workbench
src/public/PublicApp.tsx                         按书加载；丢弃卡字段；同步回调 = never
src/public/publicBibleData.ts                    校验加载 + 永续缓存
src/public/publicData.ts                         公开 schema v2
src/core/data/publicData.ts                      遗留 schema v1（会拒收现行包）
src/core/domain/resources.ts                     含 sync/ledger debugMeta
src/core/lib/backlinks.ts                        选节匹配
src/core/components/Workbench.tsx                同步 UI、恢复、误剪枝、滚动同步
src/core/domain/layout.ts                        整理库存结构
scripts/validatePublicData.mjs                   计数/哈希盘点
scripts/validatePublicRelease.mjs                禁止私有同步字段
scripts/validatePublicRepository.mjs             禁止公开生成器
PUBLIC_RELEASE.json                              投影：计数 + cardInputSha256
public/data/manifest.json                        分书库存
docs/releases/2026-07-15-v0.2.0-release-notes.md 声明同步内部不在仓内
docs/verification/2026-07-14-...                 历史备份/生成器/248 tests
```

---

*本报告只描述现状与建议，不包含修复补丁。*
