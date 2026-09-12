# 全量 `vitest run` 已知阻断（不补造夹具）

- 日期：2026-09-12
- 对照快照：本工作区（第十一轮 PR #42 顶端 + 第十二轮公开包修补）
- 本快照资产缺口与第十一轮相同：缺创世记图像、缺工作台 v4、缺综合解读生成 JSON / Doré 缩图；本快照 Node 22；runner 无 `rg`。
- 原则：记录真实缺失；不发明创世记图像、不发明工作台 v4、不把隔离 CMC 写成假资源、不改 CI 去假装绿。

失败面不读本轮公开包修补。`src/data/*PublicCardAudit.test.ts`、`residualHoldsInventory.test.ts`、`residualHoldsThirdPass.test.ts`、`residualHoldsFourthPass.test.ts`、`residualHoldsFifthPass.test.ts`、`residualHoldsSixthPass.test.ts`、`residualHoldsSeventhPass.test.ts`、`residualHoldsEighthPass.test.ts`、`residualHoldsNinthPass.test.ts`、`residualHoldsTenthPass.test.ts`、`residualHoldsEleventhPass.test.ts`、`residualHoldsTwelfthPass.test.ts`、`publicData.test.ts`、`publicBibleData.test.ts`、`scripts/generatePublicBibleData.test.mjs`、`scripts/validatePublicRepository.test.mjs` 均在通过面。

## 1. 缺失工作台 v4

路径：`src/data/generated/workbenchSyncedResources-v4.json`

本快照**没有**该文件。

| 测试 | 失败方式 |
| --- | --- |
| `src/domain/bookIntroView.test.ts` | 静态 import v4，加载期失败 |
| `src/data/workbenchSyncedResources.test.ts` | `workbenchSyncedResources.ts` 的 `?url` import 解析失败 |
| `scripts/syncWorkbenchResources.test.mjs` | 同上，加载 `workbenchSyncedResources.ts` |
| `src/domain/studyBibleScriptureCoverage.test.ts` | `readFileSync(v4)`，5 个 stage 测试全部 ENOENT |

`package.json` 的 `generate:public-data` 也以 v4 为 `--resources`。本环境不能重跑 66 卷生成器，只能 `--validate-only` 已发布的 `public/data`。仓库没有 `generatePublicBibleResources` 脚本。

## 2. 缺失创世记图像资产

路径：`src/assets/resources/genesis/images/cmc-01/`（以及 `ohb-genesis-codex-v2-crops/`）

本快照只有 `src/assets/react.svg`。`src/data/genesisResources.ts` 在缺 PNG 时抛 `Missing Genesis resource asset for p008_img007_1893x2778.png`。

| 测试 | 失败方式 |
| --- | --- |
| `src/data/sampleBible.test.ts` | 加载 `genesisResources` |
| `src/data/genesisCommentaryResources.test.ts` | 加载 `genesisResources`（文字 JSON 仍在，图像模块把套件拖死） |
| `src/components/Workbench.test.tsx` | 同上 |
| `src/lib/bibleSearch.test.ts` | 同上 |
| `src/data/genesisResourceAudit.test.ts` | `readdirSync(.../cmc-01)` ENOENT，7 测 |
| `scripts/auditGenesisResourceCards.test.mjs` | CLI 同样 `scandir` ENOENT，2 测 |

**不是**缺失：`src/data/generated/genesisCommentaryResources.json` 仍在（1,625 张文字注释）。单独读这份 JSON 的覆盖测试可以过；被 `genesisResources` 拖死的是图像路径。

## 3. 本快照 Node 22 / runner 无 `rg`

`.node-version` 钉 Node 24，本快照是 Node 22。若干 `.mts` 生成器测试和依赖 `rg` 的校验会在这个 runner 上失败。这不是公开包修补回归，不补造 `rg` 包装或降级语法去绿洗。

## 4. 不绿洗

不发明创世记 PNG、不发明 v4、不把隔离 CMC 写进公开包、不改 CI 去假装全量 `vitest` / GitHub `verify` 已绿。第十二轮对照面仍是公开数据包四字段和台账 JSONL。
