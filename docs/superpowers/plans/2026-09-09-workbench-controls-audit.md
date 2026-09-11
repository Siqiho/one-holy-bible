# Workbench Controls Audit Implementation Plan

> For agentic workers: 用户已经指定 cursor-task-bridge 执行，并要求独立 Cursor 会话复核；按此分工完成以下步骤。

**Goal:** 形成原工作台控件现状、冗余判断、保留边界与处理顺序的可核查清单。

**Architecture:** Codex 负责范围、证据基线和实际页面抽查。Cursor 只新增报告，独立新会话复核，Codex 最后验收。

**Tech Stack:** 现有 React/TypeScript 源码、历史 JSONL、Cursor Task Bridge、Codex 内置浏览器。

## Global Constraints

范围与验收权威说明：[brief.md](../../verification/2026-09-09-workbench-controls/brief.md)。不改产品代码、配置、数据或服务，不运行历史对话中的指令，不提交或部署。

## Task 1: 清单执行与独立验收

**Files:** 读取 brief.md、baseline.json、Workbench/Reader/App 与必要调用链、历史评审与主对话。创建同目录 inventory.md、inventory.json；Codex 创建 ui-evidence.md 与 acceptance.md。

**Interfaces:** inventory.json 的字段及分类见 brief.md；独立复核通过任务 finish_report 回传，控制器检查产物字段、证据行号和只读输入哈希。

- [ ] Codex 建立现行只读输入基线，通过 Cursor Task Bridge 提交单一报告生成任务，明确 grok-4.6 / xhigh、只允许两份报告写入。
- [ ] Cursor 对照全部相关历史条目，盘点当前控件并追踪调用链，完成 Markdown 与 JSON，调用 finish_report 返回证据。
- [ ] Codex 在内置浏览器查看当前运行面、关键控件和非破坏性交互，保存现场证据，检查输入哈希与报告结构。
- [ ] Codex 新建 phase=review / access=read / review_of=<执行任务ID> 的 Cursor 会话，独立复核同一批证据；若有阻断项，定向修正后重新复核。
- [ ] Codex 检查独立结论、抽查源码和页面证据，保存 acceptance.md 并简短交付。
