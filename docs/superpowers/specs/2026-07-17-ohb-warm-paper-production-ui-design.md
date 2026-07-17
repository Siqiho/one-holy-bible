# One Holy Bible 现代暖纸正式 UI 设计规格

日期：2026-07-17

## 1. 决策与目标

把已经通过本地 Demo、浏览器 QA 和独立复审的“现代暖纸”视觉，升级为 One Holy Bible 两个本地工作台的正式默认外观：

- 阅读台：`/Users/simon/OHB/one-holy-bible`，本地界面 `http://127.0.0.1:5174/`。
- 卡片工作台：`/Users/simon/OHB/Edit`，本地界面 `http://127.0.0.1:5179/`。

两个工作台都不再显示“纸张模式”按钮，不再保留主题切换、主题本地存储或“模式”概念。Demo 暖纸状态所呈现的 UI 直接成为正式默认样式。

本轮只正式化并同步 UI，不改变数据、布局模型、搜索、编辑、卡片同步、来源定位、PDF 加载、经文导航或资源映射行为；不部署、不发布、不同步公有 GitHub 仓库。

## 2. 视觉真值

用户确认的唯一正式视觉真值：

`/var/folders/g_/cx_qfcqn1nd45brx4p137xnm0000gn/T/codex-clipboard-3e9245f9-77e7-4dc7-942d-5d572d6b4f49.png`

该截图确定以下视觉关系：

- 浅象牙色、低饱和暖纸画布；不得偏成明黄或柠檬黄。
- 暖灰棕墨色正文与次级文字，中央内容是视觉中心。
- 书卷型中文衬线字体与英文 book-serif 字体用于阅读内容；按钮、输入框和操作标签继续使用系统无衬线字体。
- 黄铜色只用于选中、边界和关键操作反馈，避免高饱和警示感。
- 卡片和面板通过轻微明度差、细边线和克制阴影分层，不增加厚重古籍边框、烧边、强纹理或装饰性图案。
- 黑白扫描图可以轻度融纸；彩色图、PDF 页面、证据图片不得被全局 sepia 或 multiply 误处理。

截图中的“纸张模式”按钮只代表 Demo 截图时的状态，不属于正式 UI。

## 3. 共享设计语言

### 3.1 正式 token 角色

两个工作台应使用视觉等价的正式 token：

- `--canvas: oklch(94% 0.03 94)`
- `--surface: oklch(98% 0.022 96)`
- `--surface-2: oklch(96% 0.026 94)`
- `--surface-3: oklch(92% 0.028 91)`
- `--ink: oklch(31% 0.035 75)`
- `--ink-soft: oklch(42% 0.032 75)`
- `--muted: oklch(51% 0.028 76)`
- `--faint: oklch(63% 0.025 80)`
- `--line: oklch(81% 0.04 88)`
- `--line-strong: oklch(72% 0.05 84)`
- `--accent: oklch(56% 0.07 72)`
- `--accent-soft: oklch(95% 0.038 88)`
- `--accent-quiet: oklch(82% 0.046 84)`
- `--focus-ring: oklch(45% 0.075 72)`
- `--focus-halo: oklch(99% 0.012 96)`

项目可保留各自既有 token 名称，但角色关系和实际观感必须一致。不得通过运行时跨项目 CSS import 把两个独立开发服务耦合；一致性由规格、显式 token 和测试合同保证。

### 3.2 纸面层级

- 最外层画布使用 `--canvas`，允许非常弱的暖光渐变，不使用可见网格纹理。
- 主阅读/编辑内容使用 `--surface`。
- 侧栏、结果栏和资料抽屉使用 `--surface-2`。
- 次级空状态、折叠区和低优先级背景使用 `--surface-3`。
- 卡片背景使用 `surface` 与 `surface-2` 的轻微混合；边界使用 `--line`，阴影保持低透明度。

### 3.3 字体与内容

- 中文经文、卡片正文、来源摘录和长篇阅读内容：`"Songti SC", STSong, "Source Han Serif SC", "Noto Serif CJK SC", serif`。
- 英文经文和英文长篇阅读：`"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif`。
- 按钮、输入框、筛选、状态标签、计数、文件路径、技术元数据：系统无衬线字体。
- 不下载或打包新的字体资产；使用本机字体栈，避免增加构建体积。

### 3.4 交互与可访问性

- 所有正常正文达到 WCAG AA 4.5:1。
- 暖纸专用键盘焦点使用 2px 浅色隔离环加 5px 深黄铜外环；焦点外环与相邻纸面至少 3:1。
- focus 规则必须覆盖 selected、pressed、input、textarea、select、link 与可交互卡片，不能被状态阴影的 selector specificity 或 source order 覆盖。
- hover、active、selected、disabled、loading、empty 和 error 状态保持现有行为，只替换视觉 token。
- 风险等级、删除、同步成功/失败和警告继续保留可区分的语义色，不统一染成黄铜色。

## 4. 阅读台正式化

### 4.1 移除 Demo 模式逻辑

从 `Workbench` 移除：

- “纸张模式”工具栏按钮及其响应式标签规则。
- `paperThemeStorageKey`、`PaperTheme`、读取/写入 localStorage helper、theme state 和切换 status 文案。
- `data-paper-theme="default|warm"` 条件切换；根节点不再表达主题模式。

不得因此改变工具栏其他控件顺序、搜索宽度、当前经节、布局存储或卡片状态。

### 4.2 暖纸规则成为默认规则

把经浏览器 QA 的 warm token 和 scoped 样式提升为 `.workbench` 默认样式，或合并到现有 root token/组件规则。删除已无意义的 Demo 注释和条件 selector，避免保留双套主题 CSS。

保留：

- 中英经文的字体分工。
- 选中经文的柔和纸光、细边线与低阴影。
- 高对比双焦点环和 cascade 合同。
- 精确灰阶资源 allowlist 与三条真实图片 render path 的 `data-paper-blend` 标记。
- 彩色图片无 marker、无 filter、normal blend 的边界。
- `prefers-reduced-motion` 对颜色过渡的处理。

### 4.3 阅读台成功标准

- 5174 首次加载即与视觉真值中的 Demo 暖纸状态一致。
- 页面中不存在“纸张模式”按钮或主题 storage 读写。
- `Gen.1.1`、栏宽、搜索、卡片编辑、折叠/拖拽和布局保存行为不变。
- 1440×900 与 1180×760 均无新增横向溢出或工具栏裁切。

## 5. 卡片工作台同步

### 5.1 作用表面

5179 的以下现有区域统一映射到正式暖纸体系：

- `.appShell` 外层画布。
- `.sidebar` 来源筛选与统计卡。
- `.queuePanel`、结果分组、`.queueItem` 检索卡。
- `.reviewPanel`、`.reviewDrawer`、`.sourceBlock`、`.ohbCardPreview`。
- `.previewPanel`、PDF 工具栏、`.pdfFrame` 与空状态容器。
- 输入框、textarea、select、经文/来源选择器、弹层、同步进度和通知。

不改变现有四栏 grid、折叠宽度、拖拽调宽、滚动容器或各面板顺序。

### 5.2 卡片与来源内容

- 卡片标题和正文采用与阅读台一致的暖墨/书卷字体关系。
- 搜索、来源路径、台账、风险元数据和同步操作保持无衬线，保证密集工具信息清晰。
- 当前检索卡和当前编辑卡使用柔和 `accent-soft` 表面、黄铜细边线和克制阴影，不使用高饱和填充。
- low/medium/high 风险、回收站、退出同步、错误通知和成功进度保留独立语义色；只校准其在暖纸背景上的对比度。

### 5.3 图片与 PDF

- 图片卡缩略图、来源证据图、PDF iframe/image 页面默认保持原始色彩与正常 blend。
- 不对未知图片路径、整类图片卡或 PDF 页面做自动 sepia。
- 只有存在人工确认的精确灰阶资源 allowlist 时，才允许增加显式 `data-paper-blend="true"`；本轮不要求为 Edit 建立新的图片分类器。
- 图片容器可使用暖纸边框和表面，但不得影响图片像素内容、裁切、缩放与可读性。

### 5.4 卡片工作台成功标准

- 5179 首次加载就是正式暖纸 UI，不新增主题按钮或 storage。
- 总卡片、图片、文字、同步、回收站等统计与筛选行为完全不变。
- 检索选择、编辑保存、来源定位、PDF 文本/图片预览与项目同步主路径保持可用。
- 图片和 PDF 抽样 computed style 为 `filter: none`、`mix-blend-mode: normal`。
- 宽屏主布局无新增裁切、重叠或横向页面溢出。

## 6. 状态、数据与错误边界

本改动不新增业务 state、API、持久数据、迁移或跨端口同步。阅读台只删除 Demo theme state；卡片工作台不增加 theme state。

现有错误处理继续负责：

- 阅读台资源加载、卡片编辑/刷新和布局保存。
- 卡片工作台 `/api/cards` 加载、来源搜索、编辑保存、同步、回收站与 PDF 预览。

UI 正式化不得吞掉、改写或延迟这些错误；通知和风险状态只做对比度校准。

## 7. 实施与文件边界

预期主要修改：

- `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`
- `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`
- `/Users/simon/OHB/one-holy-bible/src/styles.css`
- `/Users/simon/OHB/Edit/src/App.tsx`（仅在需要稳定 class/data marker 时）
- `/Users/simon/OHB/Edit/src/App.test.tsx`
- `/Users/simon/OHB/Edit/src/styles.css`

实施前必须在 `/Users/simon/备份/codex` 新建本轮专属备份子目录，包含所有实际目标文件和 README，说明备份原因、原始绝对路径与时间。

由于阅读台三个目标文件和 Edit 工作区可能包含用户既有改动，实施计划必须先做精确基线备份，避免把非本轮改动混入提交。除设计/计划文档外，源文件是否提交应根据当前 ownership 和工作区状态决定；不得为了生成整洁 commit 覆盖或回滚用户改动。

## 8. 测试与验证

### 8.1 自动验证

- 阅读台：先用 TDD 把主题切换合同改成“永久 warm、无按钮、无 storage”，再迁移 CSS；运行相关聚焦测试、完整 `Workbench.test.tsx`、`npx vite build` 和差异检查。
- 卡片工作台：先增加 CSS token/表面/字体/焦点/图片保护合同，再实现；运行相关聚焦测试、完整 Edit test suite、`npm run build` 和差异检查。
- 对已存在的失败或 TypeScript 基线债务，必须用备份/任务前结果分类，不能把非本轮问题伪报为新 GREEN，也不能无授权扩大修复范围。

### 8.2 真实运行面

按标准 Web/UI 验证在 Codex 内置浏览器完成：

- 5174 阅读台：视觉真值状态、无模式按钮、选中经文、字体、焦点、灰阶/彩色图片边界、1440/1180 响应式、控制台。
- 5179 卡片工作台：侧栏、结果卡、编辑抽屉、来源定位、PDF 容器、表单焦点、语义状态、图片/PDF 原色保护和控制台。
- 两边都必须确认目标进程来自本轮代码，而不是旧端口、旧 PID 或旧 bundle。

### 8.3 设计 QA

分别保存阅读台与卡片工作台的最终截图。阅读台以用户确认截图做同状态对照；卡片工作台以阅读台正式 token 和现有 5179 布局做跨产品一致性对照。

必须记录并修复所有 P0/P1/P2 视觉问题；只有 `design-qa.md` 的最终结果为 `passed` 才能交付。

## 9. 明确不做

- 不保留“纸张模式”按钮、主题开关或旧主题回退入口。
- 不增加夜间模式、颜色选择器、用户字体设置或跨端口主题同步。
- 不重构阅读台或卡片工作台布局。
- 不改变资源、卡片、PDF、API、同步或审核数据。
- 不下载字体，不生成新的装饰资产，不部署，不发布，不同步公有仓库。

## 10. 回退方案

本轮实施前备份两个工作台的所有目标文件。若正式 UI 需要回退：

- 阅读台恢复本轮备份即可回到带 Demo 开关的状态。
- 卡片工作台恢复本轮备份即可回到现有视觉。

回退不涉及数据迁移、API 或持久内容恢复。

## 11. 已解决问题

- 正式外观：用户确认的 Demo 暖纸截图。
- 模式入口：两个工作台都不保留按钮或主题状态。
- 同步范围：阅读台和 5179 卡片工作台。
- 图片策略：阅读台保留精确灰阶 allowlist；Edit 图片/PDF 默认原色。
- 发布边界：只做本地正式代码，不部署、不发布、不修改公有仓库。

当前没有阻塞实施计划的开放设计问题。
