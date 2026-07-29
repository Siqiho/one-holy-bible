# One Holy Bible

One Holy Bible is a local-first Bible study workbench built with React, TypeScript, Vite, and Tauri. It pairs synchronized Chinese Union Version (CUV) and King James Version (KJV) reading with verse-linked explanatory text and image cards.

## 项目初衷 · Why this project exists

在这个被人工智能深刻重塑、充满不确定性的时代，我们仿佛再次站在一个类似印刷术兴起之初的历史门槛上。

印刷术改变的不只是知识的传播方式；它也深刻重塑了政治秩序、经济结构与教会的面貌。它使圣经得以更广泛地进入普通人的手中，也为宗教改革的传播提供了重要条件。今天，AI 正以一种同样难以预估的力量，重新定义我们理解世界、表达意义，乃至追问真理的方式。

我不知道这条路最终会通向何处，也不知道人工智能的边界将延伸到哪里。但我相信：无论技术如何更迭、历史如何转向，一切仍在神恩慈的手中。神始终掌权。

正是出于这样的信念，我开始了人生中的第一个 GitHub 项目——没错，它也是借助 AI、以 `vibe coding` 的方式开始的。One Holy Bible 的核心不在于技术的炫目，而在于成为一个承载神话语的器皿。它不是要给新技术简单贴上一个“基督教”的标签，而是愿意认真对待这个媒介本身，让技术、设计与内容一同服事于神的话语：在一个日益被算法与模拟充斥的时代，不把圣经还原为冰冷的数据，而使人仍能在阅读、查考、聆听与默想之中，与那活泼的道相遇，感受一种真实的“在场”。

这或许只是一次微小的尝试。但我相信，即使面对最不确定的未来，神的话语仍能在新的媒介中被阅读、被聆听、被默想，并以它独有的方式临在于我们中间。

## `v0.2.0` scope

This public release includes all 66 Bible books, CUV and KJV Scripture, 10,963 verse-linked explanatory text cards, and 2,705 image cards. Books are packaged separately and loaded on demand. Image-card binaries are kept in the separate public [one-holy-bible-assets repository](https://github.com/Siqiho/one-holy-bible-assets) and referenced through immutable HTTPS URLs in the checked-in asset manifest.

The code repository intentionally does not duplicate the 2,515 unique PNG binaries. Each image descriptor records its SHA-256, byte size, MIME type, and dimensions so release validators and downstream consumers can verify the association without importing the development workbench.

## Features

- synchronized CUV/KJV reading and verse highlighting;
- navigation across all 66 canonical books;
- lazy loading with cached return navigation and retry on load failure;
- whole-Bible Scripture search with cross-book navigation;
- verse-linked explanatory `commentary` and `note` cards;
- verse-linked read-only image cards with remote preview and integrity metadata;
- movable study modules in the reading workbench;
- deterministic public-data packaging and integrity validation.

## Architecture

The browser UI loads `public/data/manifest.json`, then requests only the selected book package from `public/data/books`. Each book payload contains `textCards` and `imageCards`; image cards carry an `asset` descriptor rather than embedding binary data. The whole-Bible search index contains minimal Scripture fields, while the asset manifest maps image-card hashes to fixed public URLs. Runtime schemas, URL checks, package hashes, asset descriptors, and release validation keep public data fail-closed.

Tauri provides the desktop shell. The web application can also run directly with Vite for development and review.

## Prerequisites

- Node.js 24 (see `.node-version`)
- npm, using the checked-in lockfile
- optional: the current Tauri prerequisites and Rust toolchain for desktop packaging

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

## Tauri status

The web build and development server are the primary verified `v0.2.0` paths. Tauri configuration is included, but platform desktop bundles require the relevant OS toolchain and have not all been produced or signed. Run the desktop development shell only after installing Tauri's platform prerequisites:

```bash
npm run tauri dev
```

## Data rights

The MIT license covers project-owned source code and documentation only. It does not relicense the CUV, KJV, explanatory-card datasets, or image source material. Publication scope, provenance policy, jurisdiction cautions, and excluded resources are documented in [`DATA_SOURCES.md`](DATA_SOURCES.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). The external image repository has its own provenance and rights review.

## Repository structure

```text
src/                  React application, public runtime, and domain logic
public/data/          public manifest, asset manifest, search index, and 66 book packages
scripts/              public-data, repository, and release validation
src-tauri/            Tauri desktop-shell configuration
.github/workflows/    continuous integration
```

## Contributing and security

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before proposing code or data changes. Report vulnerabilities, sensitive-data exposure, or content-rights concerns using the private process in [`SECURITY.md`](SECURITY.md).

## License

Project-owned code and documentation are available under the [MIT License](LICENSE). Dataset rights remain separate as described above.
