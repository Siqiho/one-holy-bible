# 全量 `vitest run` 已知阻断（不补造夹具）

- 日期：2026-09-12
- 对照快照：本工作区（第七轮 PR #37 顶端 + 第八轮公开包修补）
- 本快照资产缺口与第七轮相同：缺创世记图像、缺工作台 v4、缺综合解读生成 JSON / Doré 缩图；本快照 Node 22；runner 无 `rg`。
- 原则：记录真实缺失；不发明创世记图像、不发明工作台 v4、不把隔离 CMC 写成假资源、不改 CI 去假装绿。

失败面不读本轮公开包修补。`src/data/*PublicCardAudit.test.ts`、`residualHoldsInventory.test.ts`、`residualHoldsThirdPass.test.ts`、`residualHoldsFourthPass.test.ts`、`residualHoldsFifthPass.test.ts`、`residualHoldsSixthPass.test.ts`、`residualHoldsSeventhPass.test.ts`、`residualHoldsEighthPass.test.ts`、`publicData.test.ts`、`publicBibleData.test.ts`、`scripts/generatePublicBibleData.test.mjs`、`scripts/validatePublicRepository.test.mjs` 均在通过面。

## 1. 缺失工作台 v4

路径：`src/data/generated/workbenchSyncedResources-v4.json`

本快照**没有**该文件。

| 测试 | 失败方式 |
| --- | --- |
| `src/domain/bookIntroView.test.ts` | 静态 import v4，加载期失败 |
| `src/data/workbenchSyncedResources.test.ts` | `workbenchSyncedResources.ts` 的 `?url` import 解析失败 |
| `scripts/syncWorkbenchResources.test.mjs` | 同上，加载 `workbenchSyncedResources.ts` |
| `src/domain/studyBibleScriptureCoverage.test.ts` | `readFileSync(v4)`，5 个 stage 测试全部 ENOENT |

`package.json` 的 `generate:public-data` 也以 v4 为 `--resources`。本环境不能重跑 66 卷生成器，只能 `--validate-only` 已发布的 `public/data`。

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

## 3. 本快照一并缺、同样不补造的邻接资产

这些不是本轮公开包问题，也不补造：

| 缺失 | 测试 |
| --- | --- |
| `src/data/generated/comprehensiveCommentaryResources.json` | `src/domain/comprehensiveCommentaryScriptureCoverage.test.ts` |
| `/resources/dore/001_Gen.1.jpg`（Doré 缩图） | `src/data/doreChapterArtwork.test.ts` |

## 4. 本快照 Node 与引擎声明不一致

| 项 | 值 |
| --- | --- |
| `.node-version` / `package.json` `engines.node` | `24` / `>=24 <25` |
| 本快照 `node -v` | `v22.14.0` |

实测与 Node 22 相关的加载失败：

| 测试 | 现象 |
| --- | --- |
| `scripts/resolveBibleEncyclopediaAnchors.test.mts` | `registerHooks is not a function` |
| `scripts/generateBibleEncyclopediaResources.test.mts` | `node:internal/modules/esm/get_format` 进了断言 stderr |

不在本轮升级 Node、不改引擎声明、不发明 `.mts` 夹具。

GitHub `ubuntu-latest` runner 另有 `spawnSync rg ENOENT`（`scripts/migrateCodexNames.test.mjs`）。本快照未装 ripgrep，不补造。

## 5. 本轮仍可跑、且读公开包的面

已实测通过：

- `vitest run src/data/*PublicCardAudit.test.ts src/data/residualHoldsInventory.test.ts src/data/residualHoldsThirdPass.test.ts src/data/residualHoldsFourthPass.test.ts src/data/residualHoldsFifthPass.test.ts src/data/residualHoldsSixthPass.test.ts src/data/residualHoldsSeventhPass.test.ts src/data/residualHoldsEighthPass.test.ts src/data/publicData.test.ts src/data/publicBibleData.test.ts scripts/generatePublicBibleData.test.mjs scripts/validatePublicRepository.test.mjs`
- `node scripts/generatePublicBibleData.mjs --validate-only public/data`：66 卷、10,096 文字卡、0 unsafe
- `node scripts/validatePublicRepository.mjs`：通过

全量 `npm test` 的失败面不读第八轮公开包修补。不补造真源来强行绿全量。GitHub `verify` 上 `validate:public-data` 应绿、全量 `npm test` 仍红，与 PR #32 / #33 / #34 / #35 / #36 / #37 同一类缺口。
