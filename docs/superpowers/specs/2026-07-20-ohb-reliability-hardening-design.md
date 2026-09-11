# OHB 数据链路与可靠性交付加固设计

## 1. 目标

在不改变 OHB 既有产品边界的前提下，分阶段修复当前构建与测试基线、经文引用坐标、批量台账操作、Reader 投影状态、来源目录和质量报告中的可靠性问题。

本设计保留唯一允许的数据方向：

```text
PDF 只读 → Resources 真相源 → Edit 操作 → Reader 开发投影 → 独立公开发布
```

任何阶段都不得让 Reader、Edit 或公开仓反向覆盖 Resources；公开发布始终独立、显式触发。

## 2. 范围与非目标

### 2.1 本轮范围

1. 恢复 Reader 与 Edit 的可构建、可测试基线。
2. 为经文归一化建立原文 offset 映射。
3. 将 Edit 多台账批量修改实现为有日志、可恢复的批事务。
4. 把 Resources 提交与 Reader 投影拆成可独立记录、重试的两个阶段。
5. 建立派生的 `eligible`、`projected`、`published` 三层状态。
6. 建立基于 `source_stream` 的简单来源目录。
7. 让质量报告以明细结果作为唯一事实源，并增加一致性门禁。
8. 在行为稳定后拆分超大模块，并将 Edit 纳入版本控制。

### 2.2 非目标

- 不引入数据库、分布式事务框架、插件系统、动态加载器或策略引擎。
- 不把 Resources 写入、Reader 投影和公开发布合并为一键事务。
- 不为每张卡增加 `eligible`、`projected`、`published` 三个持久布尔字段。
- 不自动发布到 `/Users/simon/OHB/one-holy-bible-github`。
- 不把真实 Resources 写入或真实 `/api/sync` 当作普通自动测试的一部分。
- 不在构建与测试基线阶段顺带重构业务模块。

## 3. 组件和数据边界

### 3.1 PDF 与 Resources

- `/Users/simon/OHB/文档` 下的 PDF 是只读来源材料。
- `/Users/simon/OHB/Resources` 是卡片台账真相源。
- Edit 可以读取 PDF、读取并修改 Resources；Reader 不直接修改两者。
- 卡片修正不得直接写入 Reader 的生成数据来绕过 Resources。

### 3.2 Edit 与 Reader 开发投影

- Edit 的 Resources 提交和 Reader 项目投影是两个独立阶段。
- 同一次用户操作只有在用户明确选择“提交后同步 Reader”，且变更会影响当前 Reader 包时，才能在 Resources 成功提交后调用一次 `/api/sync`。
- 投影失败不得伪装为整体成功，也通常不得回滚已正确提交的 Resources。
- 投影失败后的状态是“台账已更新、投影待重试”，并提供独立重试入口。

### 3.3 独立公开发布

- 公开发布只允许从开发仓单向进入 `/Users/simon/OHB/one-holy-bible-github`。
- 本轮任何 Edit 操作、Resources 批处理或 Reader 开发投影均不得自动触发公开发布。
- `published` 状态只能来自明确的公开发布 manifest 或发布清单。

## 4. 经文归一化与原文 offset

### 4.1 最小模块契约

归一化模块返回：

```ts
interface NormalizedTextWithOffsets {
  normalizedText: string;
  originalStartByNormalizedOffset: number[];
  originalEndByNormalizedOffset: number[];
}
```

实现要求：

1. 解析器只扫描 `normalizedText`。
2. 每个匹配完成后，在返回结果前把归一化 `start/end` 映射回原文坐标。
3. 返回的 `raw`、`start`、`end` 都以原文为准。
4. UI 只消费原文坐标，不理解归一化规则。
5. 保留单一路径，不并存“原文解析器”和“归一化解析器”两套体系。

### 4.2 映射语义

- 每个归一化字符记录其覆盖的原文起止边界。
- 删除或合并 OCR 标点时，命中范围应覆盖构成该引用的完整原文片段。
- CRLF 归一化、软换行和长度变化不得使后续命中漂移。
- 多引用结果继续按原文出现顺序返回。

## 5. 有日志、可恢复的批事务

普通文件系统不能提供跨多个 Resources 台账的真正原子事务。本设计采用操作级备份、同文件系统临时文件、逐文件原子替换、操作日志和失败恢复。

### 5.1 状态机

```text
preflight
  → backed_up
  → prepared
  → committing
  → resources_committed
  → projection_requested
  → projected
```

异常状态：

- `failed_preflight`：预检失败，除记录结果外零写入。
- `resources_rolled_back`：提交中途失败，已替换文件均从备份恢复并校验成功。
- `recovery_failed`：自动恢复未能完成，停止后续动作并返回人工恢复路径。
- `projection_retry_pending`：Resources 已提交，Reader 投影失败或尚未执行。

### 5.2 执行顺序

1. 全量预检所有目标卡片、台账、预期状态和文件版本；任一不合法即停止。
2. 在 `/Users/simon/备份/codex/<独立操作目录>/` 为所有目标台账建立一次操作级备份。
3. `README.md` 记录备份原因、时间和全部原始绝对路径。
4. 在与目标文件相同的文件系统生成全部临时文件。
5. 重新解析临时文件，校验 JSONL、行数、ID 唯一性和逐项结果。
6. 逐个使用原子 `rename` 替换目标文件，并立即把已替换路径写入操作日志。
7. 中途失败时，只恢复本次已替换的文件，并校验恢复后哈希。
8. 返回逐项结果、Resources 最终状态和 Reader 投影状态。

### 5.3 操作记录

每次操作至少记录：

- `operationId`、操作类型、请求卡片 ID。
- 目标文件、提交前哈希或版本。
- 备份目录、临时文件、已经替换的文件。
- 每张卡的预检与提交结果。
- Resources 状态和 Reader 投影状态。
- Reader 快照版本、时间或失败信息。
- 开始、备份、提交、恢复、投影和结束时间。

### 5.4 失败处理

- 预检失败：不创建临时提交文件、不修改 Resources、不请求投影。
- Resources 提交失败：恢复已经替换的文件；恢复验证失败时进入 `recovery_failed`，禁止投影。
- Reader 投影失败：Resources 保持 `resources_committed`，进入 `projection_retry_pending`。
- 任何失败都不得触发公开发布。

## 6. 三层派生状态

### 6.1 `eligible`

根据现有 `syncStatus` 规则派生：

- 可纳入：`syncable`、`not_ready`。
- 不纳入：`temporarily_unsynced`、`reader_returned`、软删除卡片。
- 人工设置的暂不同步和 Reader 回流状态不得被自动分类覆盖。

### 6.2 `projected`

- 依据卡片 ID 是否存在于指定 Reader 快照派生。
- 必须同时返回快照版本或内容哈希以及生成时间。
- 不能只显示脱离快照语境的“已投影”。

### 6.3 `published`

- 依据卡片 ID 是否存在于明确的公开发布 manifest 或发布清单派生。
- 没有公开发布证据时返回 `unknown`，不能显示为 `false` 或“未发布”。
- 公开状态读取失败不得影响 Resources 或开发投影状态。

## 7. 来源目录

以 `source_stream` 为稳定主键，建立简单、静态、可测试的数据表：

```ts
interface SourceCatalogEntry {
  sourceStream: string;
  displayName: string;
  libraryGroup: string;
  resourceKind: string;
  order?: number;
}
```

约束：

- 不增加插件生命周期、动态模块加载或策略规则。
- Reader 只显示当前快照中实际存在的来源，目录注册本身不得生成空资料库按钮。
- Edit 以只读方式使用开发仓中的同一规范目录。
- Edit 的来源建议数量继续按照当前总栏及筛选作用域计算。
- 当前固定工作区接受 Edit 对开发仓规范目录的显式依赖。

## 8. 质量报告

明细结果是唯一事实源：

```text
明细结果
  ├─ 汇总数量
  ├─ 通过率
  ├─ 分卷统计
  └─ 异常清单
```

每次运行必须绑定同一输入快照标识，并执行以下断言：

1. 所有分组数量之和等于明细总数。
2. `pass + fail + skipped = total`。
3. 报告中的所有 ID 都能在明细中找到。
4. 同一次运行的所有派生结果都使用同一输入快照。

任何断言失败都使报告门禁失败，不得把不一致的汇总作为成功报告。

## 9. 分阶段实施

### 阶段一：构建与测试基线

- 重新复现 Reader、Edit 的构建错误和失败测试。
- 只修复根因，不改变业务语义。
- 分别通过构建、目标测试和必要回归测试。

### 阶段二：offset 与批量一致性

- 先用失败测试固定原文坐标契约，再实现最小 offset 映射。
- 先用临时台账和故障注入测试固定批事务契约，再接入 API/UI。
- 默认不写真实 Resources，不执行真实 `/api/sync`。

### 阶段三：状态、来源与质量门禁

- 派生三层状态并显示快照语境。
- 用简单来源表替代重复硬编码。
- 让所有质量汇总从明细计算并执行一致性门禁。

### 阶段四：模块拆分与 Edit 版本控制

- 只在前述行为测试稳定后拆分超大组件和 PDF 定位脚本。
- Edit 初始化 Git 前先做操作级备份并审查忽略规则。
- 不自动提交、推送或修改公开仓。

## 10. 验证与完成标准

每个阶段单独选择与风险相称的验证：

- 检查本轮目标文件实际差异，排除无关修改。
- 执行相关静态检查、构建、目标测试和必要回归测试。
- 涉及 Reader/Edit 可见行为时，使用 Codex 内置浏览器验证真正目标运行面。
- 真实 Resources 写入、真实投影、Git 初始化和公开发布均需要各自明确授权。
- 未在真实运行面验证的结果只报告为“代码/自动检查完成”，不报告为完整闭环。

阶段退出门禁：本阶段新增测试通过、原有相关回归通过、构建通过、无非目标差异；涉及 UI 时还需要目标页面主路径验证。

