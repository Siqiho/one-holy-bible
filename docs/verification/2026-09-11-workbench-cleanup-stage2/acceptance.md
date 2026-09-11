# Workbench 第二批修改验收

2026-09-11。本批 DF-07、DF-01、TB-15 已完成实现、自动检查、真实页面验证及独立增量复核。此结论仅覆盖本批，不表示历史 54 项清单全部完成。

## 交付

- DF-07：搜索显示已加载数／总数，每批增加 120 条；查询、译本、范围及当前书卷变化重置批次，保留结果跳转。修复筛选后反馈残留旧加载数量。
- DF-01：图片灯箱支持 Esc、Tab／Shift+Tab 与关闭后返回原入口；复制菜单、搜索浮层及设置补齐相关关闭和焦点行为，保留第一批书卷／章节导航。
- TB-15：现有搜索、复制及布局保存反馈可见，并保留 aria-live。布局保存仍仅由原有显式操作触发。

产品变更仅限 `src/components/Workbench.tsx`、`src/components/Workbench.test.tsx`、`src/styles.css`。完整本批差异见同目录三个 `.diff` 文件。336 个非生成源码文件对比另发现同步线修改 `src/data/workbenchSyncedResources.test.ts`，已保留；生成索引也由同步线独立维护，未回退。

## 验证证据

- [tests.log](tests.log)：Workbench／App／ReaderView 共 170 项通过，3 个测试文件通过，14:18:24 开始，退出码 0。
- `tsc --noEmit` 退出码 0，输出为空，见 [typecheck.log](typecheck.log)。未执行独立发布构建；当前 Vite 编译、类型检查和相关测试通过。
- [ui-evidence.md](ui-evidence.md)：Codex 内置浏览器在 Reader 1420 验证真实搜索 120→240→360→429、后续结果跳转、筛选复位、灯箱／菜单／搜索／设置键盘操作、可见复制及保存反馈；相关浏览器 warn/error 为空。
- [runtime-identity.json](runtime-identity.json)：PID 53819，启动时间 2026-09-11 14:03:26。服务返回的 Workbench TSX 和 CSS 与当前磁盘内容一致。本线未启动或重启共享服务。
- [overlay-review-snapshot.json](overlay-review-snapshot.json)：最终三个文件 SHA-256。独立复核的控制器检查退出码 0，确认复核副本与实时文件一致。

## 独立复核与执行归属

原写任务 `ae7ec5a5-6673-4463-8a61-cf37df53aec0` 仍为 uncertain／verification_failed；未修改旧锁、重放该任务或修复全局桥接。按本轮已确认的续作方式，实际实现由 Codex 完成，Cursor 通过 cursor-task-bridge 0.4.0 的独立只读会话复核。

| 独立任务 | 会话 | 范围 | 结论 |
| --- | --- | --- | --- |
| 60b4fd44-3406-4a9a-892d-fc3c6fde203d | 98748a5f-daa4-45c9-bd31-e1e7e258554c | 分页、灯箱及可见反馈主体 | PASS，见 [review1.json](review1.json) |
| 30d3c548-5abc-424e-adef-d9a363dcd181 | ae3cdd83-9809-4ad9-a83e-5fc0769dd294 | 筛选后反馈数量修正 | PASS，见 [review2.json](review2.json) |
| b9c97de8-0821-48c3-8c12-afe3989940c6 | 4debfde6-de5c-42c0-86f5-d1c30870c763 | 复制、搜索、设置相关浮层增量 | PASS，见 [review3.json](review3.json) |

各会话配置请求为 grok-4.6 / xhigh，桥接确认配置；返回 reported_model／reported_effort 为空，不能据此证明后端实际模型或思考强度。复核是源码增量审查，复核者没有自行运行测试或浏览器；自动检查和真实运行验收由 Codex 执行。三份复核均无阻断项，最终由 Codex 综合源文件、测试和页面证据接受本批结果。

## 备份与边界

备份目录：`/Users/simon/备份/codex/20260911-workbench-cleanup-stage2-140206`。原因：保存本批修改前的原始代码，避免依赖已有大量脏改的 Git HEAD 回滚。原文件为 `/Users/simon/OHB/one-holy-bible/src/components/Workbench.tsx`、`/Users/simon/OHB/one-holy-bible/src/components/Workbench.test.tsx`、`/Users/simon/OHB/one-holy-bible/src/styles.css`，备份 README 记录时间和路径。

未提交、推送或部署，未修改同步／存储实现或全局配置。实际 UI 完成后已清空测试搜索、关闭浮层并返回创世记 1 章。当前书卷变化的批次重置有实现审查证据，尚无专用自动断言；复制失败由自动测试覆盖。复核另指出设置原有全局 Esc 在仅用 Tab 跨浮层的路径存在既有局限，本批未重构该交互。
