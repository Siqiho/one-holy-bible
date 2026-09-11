# OHB 序章卡经文归位验证

## 结论

- 已将 66 卷中原本位于“序章”的 3,032 张卡全部归位到同卷的唯一具体经文。
- 卡片类型：图片卡 2,429 张，文字/注释卡 603 张。
- 最终映射 3,032 个唯一 card ID，覆盖 66 卷，无非法经文，无跨卷归位，无未复核条目。
- Edit 加载日志显示 `introCardVerseMappingAppliedCount=3032` 、`remainingBookIntroCount=0`。
- 应用 v4 同步资源共 13,833 张；目标 3,032 张全部存在，经文锚点与审定映射一致，不再含 `bookIntro` 或 `book-intro:*` 导航锚点。

## 人工逐卡复核

- 旧约上（1–22 卷）：1,687 张。
- 旧约下至使徒行传（23–44 卷）：931 张。
- 新约书信至启示录（45–66 卷）：414 张。
- 人工复核共调整了 1,905 个算法候选锚点；每张卡均保留审定理由、证据和备选经文。

## 自动验证

- Edit 全量测试：14 个测试文件，170/170 通过。
- OHB 应用全量测试：18 个测试文件，209/209 通过。
- Edit 与 OHB 应用生产构建均通过。OHB 构建仅有 Vite 的标准大 chunk 提示，无构建错误。
- 映射基础设施终审：37/37 聚焦测试通过；确认中文序数跨卷引用、Bible 索引 fail-closed、重复候选 ID 拒绝、registry/audit 原子写入保护均正常。
- 应用语义终审：7 个聚焦用例通过；非法锚点 `Bogus.1.1` 和 `Gen.999.999` 不会抢占章节，合法 primaryAnchor-only 卡可正常匹配，热刷新会把同 ID 卡从序章迁到章节。

## 真实界面试用

- Chrome 独立窗口打开 `http://127.0.0.1:5174/`，页面标题为 `One Holy Bible`，工作台加载成功。
- 旧约主路径：创世记 1:1 当前经文显示 32 张卡，可见原序章图片卡，并带有 `Gen.1.1` 跳转锚点。
- 新约/单章书卷路径：腓利门书 1:1 显示“保罗可能在伊庇鲁斯的尼哥坡里过冬。”图片卡和“腓利门书 导论：作者和书名”文字卡，两者均锚定 `Phlm.1.1`。
- 腓利门书章节菜单仅显示“第 1 章”，不再显示“序章”。

## 日志与可观测性

- 最新缓存加载：20,769 张卡，3,032 张映射成功，序章剩余 0，耗时 978 ms。
- 从该次加载到同步结束，日志记录 20,770 次 API 请求，全部 HTTP 200，`api_error`/error 计数为 0。
- 界面试用期间无加载阻断，工作台显示“工作台已加载”。

## 备份

- 备份原因：在序章卡经文归位实施前保留关键原文件，便于必要时回溯。
- 备份目录：`/Users/simon/备份/codex/ohb-intro-card-verse-mapping-20260714-110209`
- 原文件：
  - `/Users/simon/OHB/Edit/server/ledger.ts`
  - `/Users/simon/OHB/Edit/shared/commentarySyncClassification.ts`
  - `/Users/simon/OHB/one-holy-bible/scripts/syncWorkbenchResources.mjs`
  - `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
  - `/Users/simon/OHB/one-holy-bible/src/data/workbenchSyncedResources.ts`

## 主要产物

- 最终映射：`/Users/simon/OHB/Resources/序章卡经文映射.json`
- 最终审计：`/Users/simon/OHB/Resources/序章卡经文映射审计.json`
- 应用同步资源：`/Users/simon/OHB/one-holy-bible/src/data/generated/workbenchSyncedResources-v4.json`
