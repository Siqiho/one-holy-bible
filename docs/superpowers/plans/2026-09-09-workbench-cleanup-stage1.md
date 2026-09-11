# Workbench Cleanup Stage 1 Implementation Plan

> 执行分工：用户明确指定 Cursor Task Bridge 实现，Codex 规划验收，独立新 Cursor 会话复核。

**Goal:** 落实已验收控件清单中第一批小范围展示与导航改进。

**Architecture:** 只在现行 Workbench.tsx 与 Workbench.test.tsx 定向修改。保持 Reader、布局持久化、交换按钮、数据同步和现有样式体系不变。源码已有大量未提交修改，以本轮备份为 diff 基线，禁止 git reset/checkout/commit。

**Tech Stack:** React、TypeScript、现有 Vitest/Testing Library、Codex 内置浏览器。

## 交付范围

1. DK-03：移除始终 disabled 的“添加资源库”按钮；只移除因此真正未使用的图标导入，不影响来源选择及收起侧栏。
2. ST-03：移除英文 `{book} study desk` 眉题，保留书卷章标题、上一章/下一章、顶栏调高等功能。
3. TB-10：经文搜索词已改变但未提交时，只保留正文“输入已改变，点击搜索更新结果。”一处提示；标题使用非重复的中性状态（如“待搜索”），保留提交、范围、译本和清空行为。
4. CD-07：右坞卡片因非空卡片搜索而为空时显示“没有匹配的卡片。”；没有过滤且确实无资源时保留正常无资源提示。判断要传递到实际显示空态的组件，不修改过滤范围，不影响中间当前经文卡片或左侧整理。原生输入框清除功能继续可用，不新建冗余入口。
5. DF-01（部分）：书卷和章节导航弹层按 Esc 关闭，焦点回到对应触发按钮；外点关闭仍有效。仅在导航弹层打开时监听并清理事件，不干扰设置、搜索、编辑、灯箱等其他弹层。

不实施其余49项整治，不改保存/重置/删除/退回/同步、卡片数据、布局默认值、Reader、样式、依赖、配置或全局规则。不部署、不启停服务；Codex 使用现有1420开发面。此次不是全新视觉设计，只在现有控件中删除占位和修正文案/行为。

## 文件与验证

- 可改：/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx、/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx。
- 只读依据：docs/verification/2026-09-09-workbench-controls/inventory.md；本轮 docs/verification/2026-09-09-workbench-cleanup-stage1/baseline.json 与备份。
- Cursor 可新增短 result.md 于本轮验证目录；最多约80行，包含逐项实现、测试命令结果、限制。不要生成或重传大JSON。

- [ ] 读取相关现行组件/测试，按调用链确认5项修改范围。
- [ ] 添加有意义的行为测试：两类导航 Esc 和焦点恢复；搜索过滤空态及清空恢复、非过滤空态；待提交提示不重复。对于两个静态删除只调整必要既有断言。
- [ ] 定向实现，沿用现有类名、组件结构和样式；不安装Tailwind/daisyUI或改样式体系。
- [ ] 执行 Workbench、App、ReaderView 相关测试与 TypeScript noEmit。失败先区分本轮引入和既有基线；不借机改非目标文件。
- [ ] 写短result.md，调用finish_report登记源码/测试/报告路径后立即结束。禁止在write_report里重传整个源码或清单，原生定向编辑即可。
- [ ] Codex 比对备份差异和非目标哈希，在内置浏览器重新加载1420、确认服务返回本轮源码，验证5项可见行为及关键保留入口，检查现有控制台日志。
- [ ] 独立Cursor新会话phase=review/access=read/review_of=实现任务ID，检查本轮diff、测试和5项约束，PASS后Codex明确验收。

## 回滚

baseline.json 给出本轮备份目录。仅按备份恢复两个目标文件，恢复前核对是否有后续他人改动；不回滚整棵工作树或数据。
