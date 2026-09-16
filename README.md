# One Holy Bible

One Holy Bible is a local-first Bible study workbench built with React, TypeScript, and Vite. It pairs synchronized Chinese Union Version (CUV) and King James Version (KJV) reading with verse-linked explanatory text and image cards.

## 项目初衷 · Why this project exists

One Holy Bible 希望成为一个服务于圣经阅读的数字媒介——不是人与神之间的中介，也不是代替人发声的属灵主体，而是帮助人来到经文面前，专注聆听并作出回应的工具。

在这个被人工智能深刻重塑、充满不确定性的时代，我们仿佛再次站在一个类似印刷术兴起之初的历史门槛上。

印刷术改变的不只是知识的传播方式；它也深刻重塑了政治秩序、经济结构与教会的面貌。它使圣经得以更广泛地进入普通人的手中，也为宗教改革的传播提供了重要条件。今天，AI 正以一种同样难以预估的力量，重新定义我们理解世界、表达意义，乃至寻求真理的方式。

我不知道这条路最终会通向何处，也不知道人工智能的边界将延伸到哪里。但我坚信：无论技术如何更迭，历史如何转向，一切仍在神的恩手之中。神从未停止掌权。

正是出于这样的信念，我开始了人生中的第一个 GitHub 项目（没错，它也是借助 AI、以 `vibe coding` 的方式开始的。）One Holy Bible 的核心不在于技术的炫目，而在于尝试成为一个服务于神话语的数字阅读与查考空间：借助技术与设计，帮助人更专注地阅读、聆听、查考和默想圣经。在一个日益被算法与模拟充斥的时代，不把圣经还原为冰冷的数据，而使人仍能在阅读、查考、聆听与默想之中，与那活泼的道相遇，感受一种真实的“在场”。

这或许只是一次微小的尝试。但我相信，即使面对最不确定的未来，神的话语仍会被阅读、被聆听、被默想。技术可以帮助经文抵达人的眼前和耳畔；至于这活泼的话语如何光照、安慰、责备并更新人心，从来不属于技术的能力，而在于神自己的工作。

## `v0.3.0` scope

This public snapshot follows the latest maintained development reader and contains all 66 Bible books, CUV and KJV Scripture, 16,092 explanatory text cards, and 2,927 image-card placements. Books are packaged separately and loaded on demand. The image cards reference 2,735 unique PNGs; 178 Doré chapter artworks are provided separately for the reading view.

Image binaries remain in the public [one-holy-bible-assets repository](https://github.com/Siqiho/one-holy-bible-assets). Descriptors record immutable HTTPS URLs, SHA-256, byte size, MIME type, and dimensions. See the [v0.3.0 release notes](docs/releases/2026-09-16-v0.3.0-release-notes.md) for changes and provenance.

## Features

- focused reading and study-workbench views with synchronized CUV/KJV text;
- navigation across all 66 canonical books and whole-Bible Scripture search;
- lazy book loading, cached return navigation, and retry on load failure;
- verse-linked explanatory text and read-only image cards;
- chapter artwork, remembered reading position, and reading appearance controls;
- movable study modules in the reading workbench;
- deterministic public-data packaging and integrity validation.

## Architecture

The public runtime loads `public/data/manifest.json`, then requests the selected book package from `public/data/books`. Each book contains Scripture, `textCards`, and `imageCards`. The search index contains Scripture fields; the asset manifest binds image-card hashes to fixed public URLs. Chapter artwork has a separate `dore-artwork.json` manifest. Runtime schemas, URL checks, package hashes, and release validation protect the public-data boundary. The global Scripture index and chapter artwork manifest are also checked against digests embedded in the release. Related introduction packages are loaded for books that share introductory material.

This repository contains the public React runtime. The development workspace's editing services and desktop packaging are maintained separately.

## Prerequisites

- Node.js 24 (see `.node-version`)
- npm, using the checked-in lockfile

## Install and run

```bash
git clone https://github.com/Siqiho/one-holy-bible.git
cd one-holy-bible
npm ci
npm run dev
```

Vite prints the local development URL after startup.

## Validate and build

The checked-in public packages can be validated without private source inputs:

```bash
npm run validate:public-data
npm run validate:public-repository
npm run validate:public-release
npm test
npx tsc --noEmit
npx tsc -p tsconfig.node.json --noEmit
npm run build
npm audit --omit=dev
```

The source-import and release-preparation pipeline is intentionally kept outside this public repository. This checkout is a read-only public snapshot: contributors should update the checked-in book packages, image manifest, and public runtime only through the approved independent release workflow.

## Delivery scope

This release updates the public GitHub source and image repositories. It does not publish or update a hosted website, and it does not provide a new desktop installer.

## Data rights

The MIT license covers project-owned source code and documentation only. It does not relicense the CUV, KJV, explanatory-card datasets, or image source material. Publication scope, provenance policy, jurisdiction cautions, and excluded resources are documented in [`DATA_SOURCES.md`](DATA_SOURCES.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). The external image repository has its own provenance and rights review.

## Repository structure

```text
src/                  React application, public runtime, and domain logic
public/data/          public manifests, search index, and 66 book packages
scripts/              public-data, repository, and release validation
.github/workflows/    continuous integration
```

## Contributing and security

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before proposing code or data changes. Report vulnerabilities, sensitive-data exposure, or content-rights concerns using the private process in [`SECURITY.md`](SECURITY.md).

## License

Project-owned code and documentation are available under the [MIT License](LICENSE). Dataset rights remain separate as described above.
