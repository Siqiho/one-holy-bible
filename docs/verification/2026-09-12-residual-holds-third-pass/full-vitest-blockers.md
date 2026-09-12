# 全量 `vitest run` 已知阻断（不补造夹具）

- 日期：2026-09-12
- 对照快照：本工作区（第二轮 PR #32 顶端 + 第三轮公开包修补）
- 原则：记录真实缺失；不发明创世记图像、不发明工作台 v4、不把隔离 CMC 写成假资源。

## 1. 缺失工作台 v4

路径：`src/data/generated/workbenchSyncedResources-v4.json`

本快照**没有**该文件。直接 import / `readFileSync` 的测试会在加载期失败，失败面不读本轮公开包：

| 测试 | 如何依赖 v4 |
| --- | --- |
| `src/domain/bookIntroView.test.ts` | `import generatedPayload from "../data/generated/workbenchSyncedResources-v4.json"` |
| `src/domain/studyBibleScriptureCoverage.test.ts` | `readFileSync(.../workbenchSyncedResources-v4.json)` |
| `src/data/workbenchSyncedResources.test.ts` | `loadWorkbenchSyncedResourcePayload()` → 动态 import v4 |
| `src/data/workbenchSyncedResources.ts` | 开发路径 `import("./generated/workbenchSyncedResources-v4.json")` |

`package.json` 的 `generate:public-data` 也以 v4 为 `--resources`。本环境不能重跑 66 卷生成器，只能 `--validate-only` 已发布的 `public/data`。

## 2. 缺失创世记图像资产

路径：`src/assets/resources/genesis/images/`（`cmc-01/*.png`、`ohb-genesis-codex-v2-crops/*.png`）

本快照只有 `src/assets/react.svg`。`src/data/genesisResources.ts` 用 `import.meta.glob` 收集这些 PNG。图像不在时，`src/data/sampleBible.test.ts` 等创世记资源测试会因 `assetPath` / 张数对不上而失败。

**不是**缺失：`src/data/generated/genesisCommentaryResources.json` 仍在（1,625 张文字注释）。`src/data/genesisCommentaryResources.test.ts` 与创世记综合解读覆盖测试读的是这份 JSON，不是图像夹具。

## 3. 本快照 Node 与引擎声明不一致

| 项 | 值 |
| --- | --- |
| `.node-version` / `package.json` `engines.node` | `24` / `>=24 <25` |
| 本快照 `node -v` | `v22.14.0` |

第二轮已记录「Node 22 跑 `.mts` 失败」。这是环境差，不是公开包内容错误。不在本轮升级 Node、不改引擎声明。

## 4. 本轮仍可跑、且读公开包的面

这些测试不依赖 v4 / 创世记 PNG，应在本快照通过：

- `src/data/*PublicCardAudit.test.ts`（66）
- `src/data/residualHoldsInventory.test.ts`
- `src/data/residualHoldsThirdPass.test.ts`
- `src/data/publicData.test.ts`
- `src/data/publicBibleData.test.ts`
- `scripts/generatePublicBibleData.test.mjs`
- `scripts/validatePublicRepository.test.mjs`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`
- `node scripts/validatePublicRepository.mjs`

全量 `npm test` / `vitest run` 的失败面不读第三轮公开包修补。不补造真源来强行绿全量。
