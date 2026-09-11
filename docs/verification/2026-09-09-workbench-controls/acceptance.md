# 原工作台控件梳理验收

**结论：最终梳理报告通过独立复核，Codex 已验收。** 本阶段交付为现状清单、处理建议和风险边界，产品代码未修改。

## 结果

共 54 项：2 项可直接移除、3 项合并展示、4 项移到次级入口、17 项保留、19 项现存缺陷、6 项已解决、3 项待验证。具体见 [完整报告](inventory.md) 与 [逐项 JSON](inventory.json)。

- 可直接移除：已禁用的“添加资源库”按钮、英文 study desk 眉题。
- 必须保留能力：交换按钮的键盘入口、真实尺寸调节、两套搜索各自的对象和范围、真实 HTML/视频资源、显式保存回调、触屏操作入口。
- 保存和重置建议降低展示优先级，但需保留存储失败反馈/重试、回调语义与重置确认；本轮未实施这些产品变更。

## 验收证据

| 阶段 | Cursor Task Bridge 任务 ID | 结果 |
|---|---|---|
| 原始梳理 | 07f7e0fc-3012-4ad4-bc69-b057a500c910 | 产物落盘；协议回传最终 failed / acp_timeout，不作为完成证据 |
| 六项定向修订 | 0ec8ca80-35aa-422e-b357-309a6e1c4db0 | completed；控制器检查通过 |
| 完整独立复核 | d15adb7e-3e68-40a3-b3cc-fb3b485feb53 | 新会话 ef5b429e-e1b1-496a-984b-110d1d6f6f74；PASS，无阻断发现 |
| 历史引用勘误 | b212ffba-d4f9-4467-8f1a-7460ef42ed7a | completed；仅 DF-12 两处引用行号 102→103 |
| 勘误独立复核 | f0ac8ed0-e504-4f09-8ec7-b30a87e7fd50 | 新会话 1a7d09ef-d9ba-4a25-abf8-083111f7526f；PASS |

执行修订与复核使用不同 Cursor 会话。写任务 trusted，复核 restricted/read。均请求并确认配置 grok-4.6 / xhigh；未返回 reported_model/effort，不能视作供应商后端证明。

- 92 个只读输入哈希一致。
- 54 项字段、唯一 ID、证据路径及行号范围校验通过。
- 完整复核的候选指纹：0ee38fa5c23c08f3039083726efbc7849892d6b513b2e1c5f508906ea3f89174。
- 勘误后最终候选指纹：810a83125115441eaa28df73d65ec9b889d656130a277edf2076bc3a9d120c9e；勘误执行与独立复核一致。
- 精确差异检查确认：JSON 只改 DF-12 的 line_start/line_end，Markdown 未变；完整复核其余结论适用于最终版本。
- Codex 已抽查保存/重置调用链、键盘交换与报告建议，并读取两次独立复核的原始结论。
- 当前内置浏览器抽查及主组件 sourcemap 与磁盘一致的证据见 [UI 记录](ui-evidence.md)。

## 最终文件 SHA-256

| 文件 | SHA-256 |
|---|---|
| inventory.md | 8286432c0a4bea53a0acff4f6143d602ee7673a15f404130e01b81d796f7f88b |
| inventory.json | ab68080ecbb94567ca47e35cfdacad39506d7528ec6708848e23a6366dbb4023 |
| ui-evidence.md | 420fd1efc98bc89c3519adaa6bf84da21fb60c8412f6cd779752e1c506fbab81 |

完整回执、复核原文与最终 manifest 已保存到 [evidence.json](evidence.json)。原轮失败及旧哈希边界见 [执行历史](execution-history.md)，不把旧 finish 当作最新候选。

## 验收范围与限制

- 主工具栏、相关模块/搜索/设置/卡片操作及历史冗余问题已梳理；上一章/下一章与通用坞宽/中栏分隔条未逐个拆成独立清单条目，它们不在历史可删项中，也不改变移除/保留决策。该清单不是每个 DOM 按钮的逐元素普查。
- 3 项保守标为待验证，包含预览颜色的实际主题/视觉检查；历史出处已经修正。
- 当前 UI 观察由 Codex 完成，独立 Cursor 复核的是源码、报告及该观察记录，没有冒充亲自浏览。
- 本轮未执行保存/重置/删除/退回/同步等数据动作，未重跑产品全套测试/构建，未验证桌面 Tauri App；这些产品效果不在此次报告验收结论内。

## 备份

- [修订前报告备份](/Users/simon/备份/codex/20260909-workbench-controls-report-before-fix-143237)：保留第一轮完整报告，原文件为本目录的 inventory.md 和 inventory.json，原目录绝对路径 /Users/simon/OHB/one-holy-bible/docs/verification/2026-09-09-workbench-controls。
- [引用勘误前备份](/Users/simon/备份/codex/20260909-workbench-controls-before-citation-fix-144405)：保留已独立复核的 JSON，原文件 /Users/simon/OHB/one-holy-bible/docs/verification/2026-09-09-workbench-controls/inventory.json，用于证明没有其他语义改动。
- 两个备份目录均附 README，记录原因、原绝对路径与备份时间。
