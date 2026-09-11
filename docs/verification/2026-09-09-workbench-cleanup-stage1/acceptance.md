# 第一批工作台修改验收

2026-09-09，Codex 结论：**本批 5 项通过标准验证，接受当前实现。** 这不是全部 54 项清单的完成声明；DF-01 本批仅覆盖书卷／章节弹层。

| 项目 | 已实现并验证 |
|---|---|
| DK-03 | 移除永久禁用的“添加资源库”按钮 |
| ST-03 | 移除英文 study desk 眉题 |
| TB-10 | 搜索草稿改变后，标题用“待搜索”，正文只保留一次操作提示 |
| CD-07 | 右侧卡片搜索无匹配时明确提示，清除后恢复资源 |
| DF-01 部分 | 两个导航弹层 Esc 关闭并恢复触发按钮焦点，外部点击仍关闭 |

## 必要证据

- Codex 独立重跑：`Workbench.test.tsx`、`App.test.tsx`、`ReaderView.test.tsx` 共 **162/162 通过**，退出码 0；见 [日志](codex-tests.log)。桥接类型检查 `tsc --noEmit` 退出码 0。
- Codex 检查了相对改前备份的完整两文件差异；见 [源码差异](Workbench.tsx.diff)、[测试差异](Workbench.test.tsx.diff)。90 个非目标输入文件哈希保持不变。
- Codex 内置浏览器实际验收：右侧无匹配提示 4 处；清除后恢复 101 张资源，中间 34 张卡片不受影响；搜索提示去重；两个弹层 Esc 关闭并恢复焦点；外部关闭；最终恢复创世记 1 章阅读模式。详见 [页面证据](ui-evidence.md)。
- [运行身份](runtime-identity.json)：现有端口 1420 / PID 82698，Vite 返回的 source-map 源码与当前 Workbench 文件逐字一致。没有重启或部署。
- 全新独立 Cursor 审查会话 `b2e4248c-9fd2-4cb8-84b7-6fd4140f5525` 给出 **PASS**；任务 `039b9665-3a4e-406d-a4cb-7b135a934a27`。审查针对五项代码接线、相邻逻辑和测试；完整本轮 diff 由 Codex 另行检查。低优先级意见是焦点自动测试未主动移入弹层；真实页面已从弹层内部按钮执行 Esc 并验证焦点返回，作为本次补充证据。

## 执行与证据边界

Cursor 负责实现，Codex 规划并独立验收。三个 Cursor 会话均配置 `grok-4.6 / xhigh` 且配置确认成功；没有后端模型或实际推理级别证明。

原实现任务 `ae7ec5a5-6673-4463-8a61-cf37df53aec0` 已交付代码，但 controller 重复测试的输出超过 512 KiB 被终止，回执仍为 `uncertain / verification_failed`。取消接口未解除该状态；原测试进程组 97811 已确认不存在。这一桥接状态没有被修改或伪装为恢复。

Codex 改用 `--silent` 独立重跑上述完整 162 项测试成功。随后将 11 个证据／代码文件复制到只读审查工作区，登记任务 `259f0ce4-fdab-4209-ad0b-d4576c3b3b4c` 完成，再由上述全新会话关联复核。登记及复核的 controller 都验证副本与原件哈希一致，复核同时验证 90 个非目标输入不变。独立复核通过针对的是相同代码候选，不代表原桥接回执恢复。原任务的工作区占用标记仍是后续桥接维护事项。

所有回执、检查结果和独立意见见 [evidence.json](evidence.json)。

## 回滚依据

为保留本轮前的原有未提交修改，已备份原文件 `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx` 和 `/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx` 至 `/Users/simon/备份/codex/20260909-workbench-cleanup-stage1-151836`，附 README 记录原因、原路径及时间。未改 Reader、样式、依赖、配置、资源数据及同步链路。
