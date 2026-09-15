import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cuvBible, kjvBible } from "../data/bibleLibrary";
import { sampleResources } from "../data/sampleLibrary";
import type { BibleVersion } from "../domain/bible";
import type { PublicScriptureSearchEntry } from "../data/publicData";
import { defaultWorkbenchLayout } from "../domain/layout";
import {
  acceptsResourceCardDropTarget,
  anchorDragOverlayToCursor,
  commentaryLibraryIdForResource,
  commentaryLibraryIdFromLabel,
  layoutStorageKey,
  paperThemeStorageKey,
  readingFontStorageKey,
  reorderCenterCardsByDrag,
  reorderCenterModulesByDrag,
  ResourceCard,
  resourceMatchesSelectedCommentaryLibrary,
  resourceMatchesEnabledCommentaryLibraries,
  shouldBlendImageWithPaper,
  Workbench,
} from "./Workbench";

function dragResourceCard(element: Element, startX: number, endX: number, y = 260) {
  const activationX = startX + Math.sign(endX - startX) * 8;

  fireEvent.pointerDown(element, { button: 0, clientX: startX, clientY: y, isPrimary: true, pointerId: 2 });
  fireEvent.pointerMove(document, { clientX: activationX, clientY: y, isPrimary: true, pointerId: 2 });
  fireEvent.pointerMove(document, { clientX: endX, clientY: y, isPrimary: true, pointerId: 2 });
  fireEvent.pointerUp(document, { clientX: endX, clientY: y, isPrimary: true, pointerId: 2 });
}

function dragSeparator(element: Element, startX: number, endX: number, y = 160) {
  fireEvent.pointerDown(element, { button: 0, clientX: startX, clientY: y, isPrimary: true, pointerId: 1 });
  fireEvent.pointerMove(window, { clientX: endX, clientY: y, isPrimary: true, pointerId: 1 });
  fireEvent.pointerUp(window, { clientX: endX, clientY: y, isPrimary: true, pointerId: 1 });
}

function dragCenterCard(element: Element, startY: number, endY: number, x = 640) {
  const activationY = startY + Math.sign(endY - startY) * 8;

  fireEvent.pointerDown(element, { button: 0, clientX: x, clientY: startY, isPrimary: true, pointerId: 4 });
  fireEvent.pointerMove(document, { clientX: x, clientY: activationY, isPrimary: true, pointerId: 4 });
  fireEvent.pointerMove(document, { clientX: x, clientY: endY, isPrimary: true, pointerId: 4 });
  fireEvent.pointerUp(document, { clientX: x, clientY: endY, isPrimary: true, pointerId: 4 });
}

function separatorValue(element: Element) {
  return Number(element.getAttribute("aria-valuenow"));
}

function waitForDndClickSuppressionCleanup() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 60);
  });
}

const genesisMathImageId = "genesis-cmc-01-p014-img002-669x195";
const genesisMathImageTitle = sampleResources.find((resource) => resource.id === genesisMathImageId)?.title ?? "创世记插图：Gen.1.1";
const genesisPaperBlendImageId = "genesis-cmc-01-p011-img001-661x631";
const genesisPaperBlendImageTitle = sampleResources.find((resource) => resource.id === genesisPaperBlendImageId)?.title ?? "希伯来文创世记残片";
const genesisNearEastMapId = "genesis-ohb-genesis-codex-v2-p008-img007-1893x2778";
const genesisNearEastMapTitle = sampleResources.find((resource) => resource.id === genesisNearEastMapId)?.title ?? "古代近东世界地图";
const styles = readFileSync("src/styles.css", "utf8");
const productionPaperRoot = '.workbench[data-paper-theme="warm"]';
const productionPaperMarker = "/* Modern warm paper theme (toggleable) */";

type CssContractRule = {
  atRules: string[];
  body: string;
  selectors: string[];
};

function parseCssContractRules(source: string): CssContractRule[] {
  const rules: CssContractRule[] = [];

  function scan(block: string, atRules: string[]) {
    let cursor = 0;

    while (cursor < block.length) {
      while (/\s/.test(block[cursor] ?? "")) cursor += 1;
      if (block.startsWith("/*", cursor)) {
        const commentEnd = block.indexOf("*/", cursor + 2);
        cursor = commentEnd === -1 ? block.length : commentEnd + 2;
        continue;
      }

      const openingBrace = block.indexOf("{", cursor);
      if (openingBrace === -1) break;

      const prelude = block.slice(cursor, openingBrace).trim();
      let closingBrace = openingBrace + 1;
      let depth = 1;

      while (closingBrace < block.length && depth > 0) {
        if (block[closingBrace] === "{") depth += 1;
        if (block[closingBrace] === "}") depth -= 1;
        closingBrace += 1;
      }

      const body = block.slice(openingBrace + 1, closingBrace - 1);
      if (prelude.startsWith("@")) {
        scan(body, [...atRules, prelude.replace(/\s+/g, " ").trim()]);
      } else if (prelude) {
        rules.push({
          atRules,
          body,
          selectors: prelude.split(",").map((selector) => selector.replace(/\s+/g, " ").trim()),
        });
      }

      cursor = closingBrace;
    }
  }

  scan(source, []);
  return rules;
}

function cssContractRule(rules: CssContractRule[], selector: string) {
  const rule = rules.find((candidate) => candidate.selectors.includes(selector));
  expect(rule, `missing CSS rule for ${selector}`).toBeDefined();
  return rule!;
}

function oklchToken(rule: CssContractRule, token: string) {
  const match = rule.body.match(new RegExp(`${token}:\\s*oklch\\(([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)\\)`));
  expect(match, `missing OKLCH token ${token}`).not.toBeNull();
  return [Number(match![1]) / 100, Number(match![2]), Number(match![3])] as const;
}

function relativeLuminance([lightness, chroma, hue]: readonly [number, number, number]) {
  const radians = hue * Math.PI / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;
  const linearRgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.max(0, Math.min(1, channel)));

  return 0.2126 * linearRgb[0] + 0.7152 * linearRgb[1] + 0.0722 * linearRgb[2];
}

function contrastRatio(first: readonly [number, number, number], second: readonly [number, number, number]) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

function cssSpecificity(selector: string) {
  const normalized = selector.replace(/:not\(([^()]*)\)/g, "$1");
  const ids = normalized.match(/#[\w-]+/g)?.length ?? 0;
  const classLike = (normalized.match(/\.[\w-]+/g)?.length ?? 0)
    + (normalized.match(/\[[^\]]+\]/g)?.length ?? 0)
    + (normalized.match(/:(?!:)[\w-]+/g)?.length ?? 0);
  const elements = normalized
    .replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|::?[\w-]+/g, "")
    .split(/[\s>+~]+/)
    .filter((part) => /^[a-z][\w-]*$/i.test(part)).length;
  return [ids, classLike, elements] as const;
}

function compareCssSpecificity(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
) {
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) return first[index] - second[index];
  }
  return 0;
}

it("uses an exact monochrome asset suffix allowlist without treating source families as monochrome", () => {
  expect(shouldBlendImageWithPaper({
    id: "archive-scan",
    title: "旧书版画",
    type: "image",
    verses: ["Gen.1.1"],
    body: "",
    assetPath: "/src/assets/resources/genesis/images/cmc-01/p011_img001_661x631.png",
  })).toBe(true);

  expect(shouldBlendImageWithPaper({
    id: "archive-line-art",
    title: "灰阶白底线图",
    type: "image",
    verses: ["Gen.1.1"],
    body: "",
    assetPath: "/src/assets/resources/genesis/images/cmc-01/p015_img003_435x262.png",
  })).toBe(true);

  expect(shouldBlendImageWithPaper({
    id: "blue-hebrew",
    title: "蓝色希伯来文",
    type: "image",
    verses: ["Gen.1.1"],
    body: "",
    assetPath: "/src/assets/resources/genesis/images/cmc-01/p014_img002_669x195.png",
  })).toBe(false);

  expect(shouldBlendImageWithPaper({
    id: "early-earth",
    title: "彩色 Early Earth",
    type: "image",
    verses: ["Gen.1.3"],
    body: "",
    assetPath: "/src/assets/resources/genesis/images/cmc-01/p018_img009_716x518.png",
  })).toBe(false);

  expect(shouldBlendImageWithPaper({
    id: "codex-map",
    title: "彩色近东地图",
    type: "image",
    verses: ["Gen.1.1"],
    body: "",
    assetPath: "/src/assets/resources/genesis/images/ohb-genesis-codex-v2/p008_img007_1893x2778.png",
  })).toBe(false);

  expect(shouldBlendImageWithPaper({
    id: "codex-crop-map",
    title: "彩色近东地图裁切",
    type: "image",
    verses: ["Gen.1.1"],
    body: "",
    assetPath: "/src/assets/resources/genesis/images/ohb-genesis-codex-v2-crops/p008_img007_880x900.png",
  })).toBe(false);

  expect(shouldBlendImageWithPaper({
    id: "color-photo",
    title: "彩色照片",
    type: "image",
    verses: ["Gen.1.1"],
    body: "",
    assetPath: "/resources/color/landscape.webp",
  })).toBe(false);

  expect(shouldBlendImageWithPaper({
    id: "text-resource",
    title: "文字资料",
    type: "note",
    verses: ["Gen.1.1"],
    body: "",
    assetPath: "/src/assets/resources/genesis/images/cmc-01/p011_img001_661x631.png",
  })).toBe(false);

  expect(shouldBlendImageWithPaper({
    id: "pathless-image",
    title: "无路径图片",
    type: "image",
    verses: ["Gen.1.1"],
    body: "",
  })).toBe(false);
});

it("marks only allowlisted non-zoomable image cards in the DOM", () => {
  render(
    <DndContext>
      <ResourceCard
        resource={{
          id: "non-zoomable-archive",
          title: "普通古籍图",
          type: "image",
          verses: ["Gen.1.1"],
          body: "",
          assetPath: "/src/assets/resources/genesis/images/cmc-01/p015_img003_435x262.png",
        }}
        origin="right"
        sourceVerseId="Gen.1.1"
        onCopyStatus={() => undefined}
        onEditResource={() => ({ persisted: true })}
        onOpenResource={() => undefined}
        draggable={false}
      />
      <ResourceCard
        resource={{
          id: "non-zoomable-blue-hebrew",
          title: "蓝色希伯来文",
          type: "image",
          verses: ["Gen.1.1"],
          body: "",
          assetPath: "/src/assets/resources/genesis/images/cmc-01/p014_img002_669x195.png",
        }}
        origin="right"
        sourceVerseId="Gen.1.1"
        onCopyStatus={() => undefined}
        onEditResource={() => ({ persisted: true })}
        onOpenResource={() => undefined}
        draggable={false}
      />
    </DndContext>,
  );

  const archivalImage = screen.getByRole("img", { name: "普通古籍图" });
  expect(archivalImage).toHaveAttribute("data-paper-blend", "true");
  expect(screen.queryByRole("button", { name: "放大普通古籍图" })).not.toBeInTheDocument();
  expect(screen.getByRole("img", { name: "蓝色希伯来文" })).not.toHaveAttribute("data-paper-blend");
});

function getResourceArticleByTitle(container: HTMLElement, title: string, index = 0) {
  return within(container).getAllByRole("article", { name: title })[index];
}

function queryResourceArticleByTitle(container: HTMLElement, title: string) {
  return within(container).queryByRole("article", { name: title });
}

function getLeftOrganizedCardStack() {
  const leftDock = screen.getByRole("complementary", { name: "左侧资料栏" });
  return within(leftDock).getByLabelText("用户根据章节自行整理卡片");
}

function getLeftResourceLibrary() {
  const leftDock = screen.getByRole("complementary", { name: "左侧资料栏" });
  return within(leftDock).getByRole("region", { name: "注释资源库" });
}

function getCenterCurrentCardModule() {
  const center = screen.getByRole("region", { name: "中间工作区" });
  return within(center).getByRole("region", { name: "当前经文已有卡片" });
}

const navigationCuv: BibleVersion = {
  id: "cuv",
  label: "和合本",
  language: "zh",
  verses: [
    { id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "起初，神创造天地。" },
    { id: "Gen.1.2", book: "Gen", chapter: 1, verse: 2, text: "地是空虚混沌。" },
    { id: "Gen.2.1", book: "Gen", chapter: 2, verse: 1, text: "天地万物都造齐了。" },
    { id: "Exod.1.1", book: "Exod", chapter: 1, verse: 1, text: "以色列的众子，各带家眷和雅各一同来到埃及。" },
    { id: "John.1.1", book: "John", chapter: 1, verse: 1, text: "太初有道，道与神同在，道就是神。" },
    { id: "John.3.16", book: "John", chapter: 3, verse: 16, text: "神爱世人，甚至将他的独生子赐给他们。" },
    { id: "Rev.22.21", book: "Rev", chapter: 22, verse: 21, text: "愿主耶稣的恩惠常与众圣徒同在。阿们。" },
  ],
};

const navigationKjv: BibleVersion = {
  id: "kjv",
  label: "KJV",
  language: "en",
  verses: [
    { id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "In the beginning God created the heaven and the earth." },
    { id: "Gen.1.2", book: "Gen", chapter: 1, verse: 2, text: "And the earth was without form, and void." },
    { id: "Gen.2.1", book: "Gen", chapter: 2, verse: 1, text: "Thus the heavens and the earth were finished." },
    { id: "Exod.1.1", book: "Exod", chapter: 1, verse: 1, text: "Now these are the names of the children of Israel." },
    { id: "John.1.1", book: "John", chapter: 1, verse: 1, text: "In the beginning was the Word, and the Word was with God." },
    { id: "John.3.16", book: "John", chapter: 3, verse: 16, text: "For God so loved the world, that he gave his only begotten Son." },
    { id: "Rev.22.21", book: "Rev", chapter: 22, verse: 21, text: "The grace of our Lord Jesus Christ be with you all. Amen." },
  ],
};

const multiBookResources = [
  ...sampleResources,
  {
    id: "exod-1-1-note",
    title: "埃及名单",
    type: "note",
    verses: ["Exod.1.1"],
    body: "出埃及记开头的家族名单观察。",
  },
] as const;

const bookIntroResources = [
  {
    id: "gen-intro-map",
    title: "古代近东世界地图",
    type: "image",
    verses: [],
    bookIntro: "Gen",
    body: "古代近东世界地图。",
    assetPath: "/src/assets/resources/genesis/images/ohb-genesis-codex-v2/p008_img007_1893x2778.png",
  },
  {
    id: "gen-intro-video",
    title: "创世记导论视频",
    type: "video",
    verses: [],
    bookIntro: "Gen",
    body: "视频资源占位。",
  },
  {
    id: "gen-1-1-creation-note",
    title: "起初，神创造天地",
    type: "commentary",
    verses: ["Gen.1.1"],
    body: "“起初”声明时间、宇宙和历史都在神的创造中开始。",
  },
] as const;

const staleBookIntroVerseResources = [
  {
    id: "mapped-gen-intro",
    title: "已映射创世记序章卡",
    type: "commentary",
    verses: ["Gen.1.2"],
    primaryAnchor: "Gen.1.2",
    bookIntro: "Gen",
    body: "这张卡已迁移到创世记一章二节，但仍带有陈旧序章字段。",
  },
  bookIntroResources[0],
] as const;

const broadOverviewResources = [
  {
    id: "bibleeveryone-egyptian-empire-map",
    title: "埃及帝國地圖",
    type: "image",
    verses: [],
    body: "埃及帝國地圖只来自全圣经书卷时间轴，不能归入创世记。",
    assetPath: "/resources/bibleeveryone/153-埃及帝國地圖.jpg",
    source: "BibleEveryone 聖經圖庫",
    debugMeta: {
      navigationLabels: ["聖經書卷時間軸"],
      navigationPlacementScopes: ["canon-timeline"],
      navigationRisk: "unanchored-overview",
      navigationPrimaryAnchors: [],
    },
  },
  {
    id: "bibleeveryone-genesis-intro-map",
    title: "创世记明确序言图",
    type: "image",
    verses: [],
    bookIntro: "Gen",
    body: "明确属于创世记序言的对照图。",
    assetPath: "/resources/bibleeveryone/genesis-intro-map.jpg",
  },
  {
    id: "bibleeveryone-genesis-verse-image",
    title: "创世记明确经文图",
    type: "image",
    verses: ["Gen.1.1"],
    body: "明确属于创世记一章一节的对照图。",
    assetPath: "/resources/bibleeveryone/genesis-verse-image.jpg",
  },
] as const;

const searchableResources = [
  {
    id: "search-note",
    title: "安静笔记",
    type: "note",
    verses: ["Gen.1.1"],
    body: "这一张用于测试卡片搜索。",
    summary: "quiet card summary",
    source: "个人笔记",
    category: "灵修",
  },
  {
    id: "search-commentary",
    title: "晨星综合解读",
    type: "commentary",
    verses: ["Gen.1.1"],
    body: "正文包含 hiddenriver 这个词。",
    summary: "注释摘要",
    source: "圣经综合解读·创世记",
    category: "注释",
  },
  {
    id: "search-link",
    title: "词典条目",
    type: "link",
    verses: ["Gen.1.1"],
    body: "百科字典正文。",
    summary: "dictionary summary",
    source: "Bible Dictionary",
    category: "字典",
  },
  {
    id: "search-image-text",
    title: "图像索引",
    type: "image",
    verses: ["Gen.1.1"],
    body: "图像正文不包含隐藏索引词。",
    searchText: "archival-lamp",
    source: "图像档案",
  },
] as const;

describe("Workbench", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const dualCenterLayout = {
    ...defaultWorkbenchLayout,
    centerModules: ["cuv", "kjv"],
    activeCenterModules: ["cuv"],
  } as const;

  const lukeIntroVersions: BibleVersion[] = [
    {
      id: "cuv",
      label: "和合本",
      language: "zh",
      verses: [
        { id: "Luke.1.1", book: "Luke", chapter: 1, verse: 1, text: "提阿非罗大人哪，有好些人提笔作书。" },
      ],
    },
    {
      id: "kjv",
      label: "KJV",
      language: "en",
      verses: [
        { id: "Luke.1.1", book: "Luke", chapter: 1, verse: 1, text: "Forasmuch as many have taken in hand." },
      ],
    },
  ];

  const lukeIntroResources = [
    {
      id: "study-bible-luke-intro-p001-n001",
      title: "路加福音 作者与写作背景",
      type: "commentary",
      primaryAnchor: "Luke.1.1",
      verses: ["Luke.1.1"],
      body: "路加写作的处境与背景。",
    },
    {
      id: "study-bible-luke-intro-p002-n001",
      title: "路加福音 核心主题",
      type: "commentary",
      primaryAnchor: "Luke.1.1",
      verses: ["Luke.1.1"],
      body: "路加福音强调救恩临到万民。",
    },
    {
      id: "study-bible-luke-intro-p003-n001",
      title: "路加福音 文学结构",
      type: "commentary",
      primaryAnchor: "Luke.1.1",
      verses: ["Luke.1.1"],
      body: "路加按旅程与应验展开叙事。",
    },
  ] as const;

  const samuelIntroVersions: BibleVersion[] = [
    {
      id: "cuv",
      label: "和合本",
      language: "zh",
      verses: [
        { id: "1Sam.1.1", book: "1Sam", chapter: 1, verse: 1, text: "以法莲山地的拉玛琐非有一个以法莲人。" },
        { id: "2Sam.1.1", book: "2Sam", chapter: 1, verse: 1, text: "扫罗死后，大卫击杀亚玛力人回来。" },
      ],
    },
    {
      id: "kjv",
      label: "KJV",
      language: "en",
      verses: [
        { id: "1Sam.1.1", book: "1Sam", chapter: 1, verse: 1, text: "Now there was a certain man of Ramathaim-zophim." },
        { id: "2Sam.1.1", book: "2Sam", chapter: 1, verse: 1, text: "Now it came to pass after the death of Saul." },
      ],
    },
  ];

  const samuelIntroResources = [
    {
      id: "study-bible-1sam-intro-p001-n001",
      title: "撒母耳记上 作者背景",
      type: "commentary",
      primaryAnchor: "1Sam.1.1",
      verses: ["1Sam.1.1"],
      body: "撒母耳记上下共享的历史背景。",
    },
    {
      id: "study-bible-2sam-intro-p002-n001",
      title: "撒母耳记下 结构大纲",
      type: "commentary",
      primaryAnchor: "2Sam.1.1",
      verses: ["2Sam.1.1"],
      body: "撒母耳记下自身的结构大纲。",
    },
  ] as const;

  it("scopes book-intro StableGrid CSS to the middle intro canvas only", () => {
    const introMarker = "/* Book intro StableGrid canvas */";
    const introMarkerIndex = styles.indexOf(introMarker);
    expect(introMarkerIndex).toBeGreaterThan(-1);
    expect(styles).not.toContain(".prototype-");

    const introStyles = styles.slice(introMarkerIndex);
    const introRules = parseCssContractRules(introStyles);
    const reducedMotionAtRule = "@media (prefers-reduced-motion: reduce)";
    expect(introStyles).toContain(".book-intro-canvas");
    expect(introStyles).toContain("@container book-intro-canvas");
    expect(cssContractRule(introRules, ".book-intro-canvas").body).toMatch(/container:\s*book-intro-canvas \/ inline-size/);
    expect(introRules.some((rule) =>
      rule.atRules.includes(reducedMotionAtRule)
      && rule.selectors.includes(".book-intro-canvas *")
      && /transition:\s*none !important/.test(rule.body)
    )).toBe(true);

    const selectorRoots = [".book-intro-canvas", ".book-intro-stable-grid"];
    for (const rule of introRules) {
      expect(rule.selectors.every((selector) =>
        selectorRoots.some((root) => selector.startsWith(root))
      )).toBe(true);
    }

    expect(introRules.some((rule) => rule.selectors.includes(".workbench-grid"))).toBe(false);
    expect(introRules.some((rule) => rule.selectors.includes(".resource-dock"))).toBe(false);
    expect(introRules.some((rule) => rule.selectors.includes(".resource-card"))).toBe(false);
  });

  it("renders the stable grid only in the middle reading area for book intros", () => {
    render(
      <Workbench
        versions={lukeIntroVersions}
        resources={lukeIntroResources}
        initialIntroBook="Luke"
        initialLayout={dualCenterLayout}
      />,
    );

    expect(screen.getByRole("region", { name: "路加福音书卷序" })).toBeInTheDocument();
    const contextLane = screen.getByRole("region", { name: "书卷背景" });
    const messageLane = screen.getByRole("region", { name: "核心信息" });
    const structureLane = screen.getByRole("region", { name: "阅读结构" });
    expect(within(contextLane).getByRole("heading", { level: 2, name: "书卷背景" })).toBeInTheDocument();
    expect(within(messageLane).getByRole("heading", { level: 2, name: "核心信息" })).toBeInTheDocument();
    expect(within(structureLane).getByRole("heading", { level: 2, name: "阅读结构" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "左侧资料栏" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "右侧资料栏" })).toBeInTheDocument();
    expect(screen.queryByTestId("center-module")).not.toBeInTheDocument();

    const legacyIntroPanel = screen.queryByText("路加福音导论")?.closest(".book-intro-panel") ?? null;
    expect(legacyIntroPanel).not.toBeInTheDocument();
  });

  it("restores the normal center workspace after leaving a book intro", async () => {
    render(
      <Workbench
        versions={lukeIntroVersions}
        resources={lukeIntroResources}
        initialIntroBook="Luke"
        initialLayout={dualCenterLayout}
      />,
    );

    expect(screen.getByRole("region", { name: "路加福音书卷序" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择章节 序" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "章节选择" })).getByRole("button", { name: "第 1 章" }));

    expect(screen.queryByRole("region", { name: "路加福音书卷序" })).not.toBeInTheDocument();
    const center = screen.getByRole("region", { name: "中间工作区" });
    expect(within(center).getByTestId("center-module")).toBeInTheDocument();
    expect(screen.getByTestId("cuv-Luke.1.1")).toHaveAttribute("aria-current", "true");
  });

  it("marks shared first-volume intro cards and keeps their original navigation anchors", async () => {
    render(
      <Workbench
        versions={samuelIntroVersions}
        resources={samuelIntroResources}
        initialIntroBook="2Sam"
        initialLayout={dualCenterLayout}
      />,
    );

    const introCanvas = screen.getByRole("region", { name: "撒母耳记下书卷序" });
    expect(within(introCanvas).getByText("上下卷共用导论 · 撒母耳记上")).toBeInTheDocument();
    expect(within(introCanvas).getByRole("article", { name: "撒母耳记下 结构大纲" })).toBeInTheDocument();

    const sharedCard = within(introCanvas).getByRole("article", { name: "撒母耳记上 作者背景" });
    const navigationButton = within(sharedCard).getByRole("button", { name: "跳转到 1Sam.1.1：撒母耳记上 作者背景" });
    expect(navigationButton).toHaveAttribute("title", "跳转到 1Sam.1.1");

    await userEvent.click(navigationButton);

    expect(screen.queryByRole("region", { name: "撒母耳记下书卷序" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择书卷 撒母耳记上" })).toBeInTheDocument();
    expect(screen.getByTestId("cuv-1Sam.1.1")).toHaveAttribute("aria-current", "true");
  });

  it("syncs selected verse highlighting across CUV and KJV", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    await userEvent.click(screen.getByTestId("cuv-Gen.1.3"));
    expect(screen.getByTestId("cuv-Gen.1.3")).toHaveAttribute("aria-current", "true");
    await userEvent.click(screen.getByRole("button", { name: "KJV" }));
    expect(screen.getByTestId("kjv-Gen.1.3")).toHaveAttribute("aria-current", "true");
  });

  it("defaults to warm paper theme and allows toggling back to classic UI", async () => {
    localStorage.removeItem(paperThemeStorageKey);
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const workbench = screen.getByRole("main");
    expect(workbench).toHaveAttribute("data-paper-theme", "warm");
    await userEvent.click(screen.getByRole("button", { name: "打开设置" }));
    const paperButton = screen.getByRole("button", { name: "关闭纸张模式" });
    expect(paperButton).toHaveAttribute("aria-pressed", "true");
    expect(paperButton.querySelector(".toolbar-button__label")).toHaveTextContent("纸张模式");

    await userEvent.click(paperButton);
    expect(workbench).toHaveAttribute("data-paper-theme", "default");
    expect(localStorage.getItem(paperThemeStorageKey)).toBe("default");
    expect(screen.getByRole("button", { name: "开启纸张模式" })).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(screen.getByRole("button", { name: "开启纸张模式" }));
    expect(workbench).toHaveAttribute("data-paper-theme", "warm");
    expect(localStorage.getItem(paperThemeStorageKey)).toBe("warm");
  });

  it("restores the stored paper theme preference on load", async () => {
    localStorage.setItem(paperThemeStorageKey, "default");
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );
    expect(screen.getByRole("main")).toHaveAttribute("data-paper-theme", "default");
    await userEvent.click(screen.getByRole("button", { name: "打开设置" }));
    expect(screen.getByRole("button", { name: "开启纸张模式" })).toHaveAttribute("aria-pressed", "false");
  });

  it("defaults to serif reading font and allows toggling to system sans", async () => {
    localStorage.removeItem(readingFontStorageKey);
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const workbench = screen.getByRole("main");
    expect(workbench).toHaveAttribute("data-reading-font", "serif");
    await userEvent.click(screen.getByRole("button", { name: "打开设置" }));
    const fontButton = screen.getByRole("button", { name: "切换为系统字体" });
    expect(fontButton).toHaveAttribute("aria-pressed", "true");
    expect(fontButton.querySelector(".toolbar-button__label")).toHaveTextContent("书体");

    await userEvent.click(fontButton);
    expect(workbench).toHaveAttribute("data-reading-font", "sans");
    expect(localStorage.getItem(readingFontStorageKey)).toBe("sans");
    expect(screen.getByRole("button", { name: "切换为书体阅读字体" })).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(screen.getByRole("button", { name: "切换为书体阅读字体" }));
    expect(workbench).toHaveAttribute("data-reading-font", "serif");
    expect(localStorage.getItem(readingFontStorageKey)).toBe("serif");
  });

  it("moves paper and font controls into the left dock settings panel", async () => {
    localStorage.removeItem(paperThemeStorageKey);
    localStorage.removeItem(readingFontStorageKey);
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const layoutGroup = screen.getByRole("group", { name: "布局操作" });
    expect(within(layoutGroup).queryByRole("button", { name: "关闭纸张模式" })).not.toBeInTheDocument();
    expect(within(layoutGroup).queryByRole("button", { name: "切换为系统字体" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "打开设置" }));
    const settingsPanel = screen.getByRole("dialog", { name: "阅读台设置" });
    expect(within(settingsPanel).getByRole("button", { name: "关闭纸张模式" })).toBeVisible();
    expect(within(settingsPanel).getByRole("button", { name: "切换为系统字体" })).toBeVisible();
  });

  it("scrolls every visible Bible module to the selected verse", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["kjv", "cuv", "card"],
          activeCenterModules: ["cuv", "kjv"],
        }}
      />,
    );

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    scrollIntoView.mockClear();

    await userEvent.click(screen.getByTestId("cuv-Gen.1.3"));

    await waitFor(() => {
      const scrolledTestIds = scrollIntoView.mock.contexts.map((element) => (
        element instanceof HTMLElement ? element.dataset.testid : undefined
      ));
      expect(scrolledTestIds).toEqual(expect.arrayContaining(["cuv-Gen.1.3", "kjv-Gen.1.3"]));
    });
  });

  it("refreshes resources for the selected verse", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    expect(screen.getAllByText("起初，神创造天地").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByTestId("cuv-Gen.1.2"));
    expect(screen.getAllByText("空虚混沌").length).toBeGreaterThan(0);
  });

  it("keeps the center card chooser scoped to the selected verse while the right dock stays chapter-scoped", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["kjv", "cuv", "card"],
          activeCenterModules: ["cuv", "card"],
        }}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const leftStack = getLeftOrganizedCardStack();
    const cardModule = getCenterCurrentCardModule();
    expect(within(rightDock).getByText("起初，神创造天地")).toBeInTheDocument();
    expect(within(rightDock).getByText("空虚混沌")).toBeInTheDocument();
    expect(within(cardModule).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();
    expect(within(cardModule).queryByRole("article", { name: "空虚混沌" })).not.toBeInTheDocument();
    expect(leftStack).toHaveTextContent("还没有整理卡片");

    await userEvent.click(screen.getByTestId("cuv-Gen.1.2"));

    expect(within(rightDock).getByText("起初，神创造天地")).toBeInTheDocument();
    expect(within(rightDock).getByText("空虚混沌")).toBeInTheDocument();
    expect(within(cardModule).queryByRole("article", { name: "起初，神创造天地" })).not.toBeInTheDocument();
    expect(within(cardModule).getByRole("article", { name: "空虚混沌" })).toBeInTheDocument();
    expect(within(cardModule).queryByRole("button", { name: "从左侧移除 空虚混沌" })).not.toBeInTheDocument();
    expect(leftStack).toHaveTextContent("还没有整理卡片");
  });

  it("places book intro before chapter one and keeps intro cards out of Genesis 1:1", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={bookIntroResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    expect(within(rightDock).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "古代近东世界地图" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择章节 第 1 章" }));
    const chapterDialog = screen.getByRole("dialog", { name: "章节选择" });
    const chapterOptions = within(chapterDialog).getAllByRole("button");
    expect(chapterOptions.map((button) => button.textContent)).toEqual(["序", "1", "2"]);

    await userEvent.click(within(chapterDialog).getByRole("button", { name: "创世记 序" }));

    expect(screen.getByRole("heading", { name: "创世记 Genesis 序" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择章节 序" })).toHaveTextContent("序");
    expect(within(rightDock).getByRole("article", { name: "古代近东世界地图" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("img", { name: "古代近东世界地图" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "创世记导论视频" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "起初，神创造天地" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择章节 序" }));
    await userEvent.click(screen.getByRole("button", { name: "第 1 章" }));

    expect(screen.getByRole("heading", { name: "创世记 Genesis 1" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "古代近东世界地图" })).not.toBeInTheDocument();
  });

  it("uses full-width masthead zones for previous and next chapter navigation", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={bookIntroResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const reader = screen.getByRole("region", { name: "双译本阅读区" });
    const title = within(reader).getByRole("heading", { name: "创世记 Genesis 1" });
    const previousChapter = within(reader).getByRole("button", { name: "上一章" });
    const nextChapter = within(reader).getByRole("button", { name: "下一章" });

    expect(previousChapter.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(nextChapter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(previousChapter).toBeDisabled();
    expect(nextChapter).not.toBeDisabled();
    expect(within(reader).getByText("当前经节")).toBeInTheDocument();
    expect(within(reader).queryByText(/study desk/i)).not.toBeInTheDocument();
    expect(within(reader).getByText("Gen.1.1")).toBeInTheDocument();

    await userEvent.click(nextChapter);
    expect(within(reader).getByRole("heading", { name: "创世记 Genesis 2" })).toBeInTheDocument();
    expect(within(reader).getByText("Gen.2.1")).toBeInTheDocument();
    expect(previousChapter).not.toBeDisabled();

    await userEvent.click(previousChapter);
    expect(within(reader).getByRole("heading", { name: "创世记 Genesis 1" })).toBeInTheDocument();
    expect(within(reader).getByText("Gen.1.1")).toBeInTheDocument();
  });

  it("closes the book picker on Escape and restores focus to the book button", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const bookButton = screen.getByRole("button", { name: "选择书卷 创世记" });
    await userEvent.click(bookButton);
    expect(screen.getByRole("dialog", { name: "书卷选择" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "书卷选择" })).not.toBeInTheDocument();
    expect(bookButton).toHaveFocus();

    await userEvent.click(bookButton);
    expect(screen.getByRole("dialog", { name: "书卷选择" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("complementary", { name: "右侧资料栏" }));
    expect(screen.queryByRole("dialog", { name: "书卷选择" })).not.toBeInTheDocument();
  });

  it("closes the chapter picker on Escape and restores focus to the chapter button", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const chapterButton = screen.getByRole("button", { name: "选择章节 第 1 章" });
    await userEvent.click(chapterButton);
    expect(screen.getByRole("dialog", { name: "章节选择" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "章节选择" })).not.toBeInTheDocument();
    expect(chapterButton).toHaveFocus();
  });

  it("groups and navigates verse-anchored resources by verse when bookIntro is stale", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={staleBookIntroVerseResources}
        initialLayout={{
          ...dualCenterLayout,
          centerCardResourceIdsByBook: {
            "book-intro:Gen": ["mapped-gen-intro"],
          },
        }}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const mappedCard = within(rightDock).getByRole("article", { name: "已映射创世记序章卡" });
    expect(within(getLeftOrganizedCardStack()).getByRole("article", { name: "已映射创世记序章卡" })).toBeInTheDocument();

    await userEvent.click(within(mappedCard).getByRole("button", { name: "跳转到 Gen.1.2：已映射创世记序章卡" }));
    await waitFor(() => expect(screen.getByTestId("cuv-Gen.1.2")).toHaveAttribute("aria-current", "true"));

    await userEvent.click(screen.getByRole("button", { name: "选择章节 第 1 章" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "章节选择" })).getByRole("button", { name: "创世记 序" }));

    expect(within(rightDock).queryByRole("article", { name: "已映射创世记序章卡" })).not.toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "古代近东世界地图" })).toBeInTheDocument();
  });

  it("keeps semantically invalid verse anchors on the genuine intro surface", () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[
          {
            id: "bogus-book-intro",
            title: "未知书卷锚点序章卡",
            type: "commentary",
            verses: [],
            primaryAnchor: "Bogus.1.1",
            bookIntro: "Gen",
            body: "未知书卷不能抢占创世记序章。",
          },
          {
            id: "out-of-range-intro",
            title: "越界经节锚点序章卡",
            type: "commentary",
            verses: ["Gen.999.999"],
            bookIntro: "Gen",
            body: "越界经节不能抢占创世记序章。",
          },
        ]}
        initialIntroBook="Gen"
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    expect(within(rightDock).getByRole("article", { name: "未知书卷锚点序章卡" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "越界经节锚点序章卡" })).toBeInTheDocument();
  });

  it("keeps unanchored BibleEveryone overview images out of Genesis verse and intro card lists", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={broadOverviewResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    expect(within(rightDock).getByRole("article", { name: "创世记明确经文图" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "埃及帝國地圖" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择章节 第 1 章" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "章节选择" })).getByRole("button", { name: "创世记 序" }));

    expect(within(rightDock).getByRole("article", { name: "创世记明确序言图" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "埃及帝國地圖" })).not.toBeInTheDocument();
  });

  it("shows navigation on book-level image cards and jumps back to the book intro", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={bookIntroResources}
        initialLayout={{
          ...dualCenterLayout,
          centerCardResourceIdsByBook: {
            "book-intro:Gen": ["gen-intro-map"],
          },
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "选择章节 第 1 章" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "章节选择" })).getByRole("button", { name: "创世记 序" }));

    const introImageCard = within(getLeftOrganizedCardStack()).getByRole("article", { name: "古代近东世界地图" });
    const navigationButton = within(introImageCard).getByRole("button", { name: "跳转到 创世记序：古代近东世界地图" });
    expect(navigationButton).toHaveAttribute("title", "跳转到 创世记序");
    expect(navigationButton).not.toHaveTextContent("创世记序");
  });

  it("navigates from a currently mounted book-level image card back to the book intro", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={bookIntroResources}
        initialLayout={{
          ...dualCenterLayout,
          centerCardResourceIdsByBook: {
            "book-intro:Gen": ["gen-intro-map"],
          },
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "选择章节 第 1 章" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "章节选择" })).getByRole("button", { name: "创世记 序" }));
    const introImageCard = within(getLeftOrganizedCardStack()).getByRole("article", { name: "古代近东世界地图" });
    const navigationButton = within(introImageCard).getByRole("button", { name: "跳转到 创世记序：古代近东世界地图" });

    await userEvent.click(navigationButton);

    expect(screen.getByRole("heading", { name: "创世记 Genesis 序" })).toBeInTheDocument();
    expect(within(getLeftOrganizedCardStack()).getByRole("article", { name: "古代近东世界地图" })).toBeInTheDocument();
  });

  it("migrates older dock module positions into the new right-side verse card model", async () => {
    localStorage.setItem(
      layoutStorageKey,
      JSON.stringify({
        ...defaultWorkbenchLayout,
        modules: defaultWorkbenchLayout.modules.map((module) => (
          module.id === "notes" ? { ...module, side: "left" } : module
        )),
      }),
    );

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    await userEvent.click(screen.getByTestId("cuv-Gen.1.2"));

    expect(within(rightDock).getByRole("region", { name: "笔记" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "空虚混沌" })).toBeInTheDocument();
  });

  it("merges dictionary cards into the encyclopedia category", () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    expect(within(rightDock).getByRole("region", { name: "笔记" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("region", { name: "注释" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("region", { name: "媒体" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("region", { name: "百科" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("region", { name: "字典" })).not.toBeInTheDocument();
    expect(within(rightDock).getByLabelText("资料类别快捷跳转")).toBeInTheDocument();
    expect(within(rightDock).getByRole("button", { name: /跳转到注释/ })).toBeInTheDocument();
    expect(within(rightDock).getByRole("button", { name: /跳转到媒体/ })).toBeInTheDocument();
    expect(within(rightDock).getByRole("button", { name: /跳转到百科/ })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("button", { name: /跳转到字典/ })).not.toBeInTheDocument();
    expect(within(rightDock).getByRole("button", { name: /跳转到笔记/ })).toBeInTheDocument();
    expect(within(rightDock).queryByText("回链")).not.toBeInTheDocument();
  });

  it("shows a dictionary-labelled link card inside encyclopedia with an encyclopedia type label", () => {
    const legacyDictionaryResource = {
      id: "gen-1-1-legacy-dictionary",
      title: "圣经词典条目",
      type: "link",
      verses: ["Gen.1.1"],
      body: "历史上标记为字典的链接卡片。",
      category: "字典",
    } as const;

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={[legacyDictionaryResource]}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const encyclopediaSection = within(rightDock).getByRole("region", { name: "百科" });
    const dictionaryCard = within(encyclopediaSection).getByRole("article", { name: "圣经词典条目" });

    expect(dictionaryCard.querySelector(".resource-card__source-pill")).toHaveTextContent("百科");
    expect(within(rightDock).queryByRole("region", { name: "字典" })).not.toBeInTheDocument();
  });

  it("migrates a visible legacy dictionary module into the merged encyclopedia module", () => {
    localStorage.setItem(
      layoutStorageKey,
      JSON.stringify({
        ...defaultWorkbenchLayout,
        modules: [
          ...defaultWorkbenchLayout.modules.map((module) => (
            module.id === "encyclopedia" ? { ...module, visible: false } : module
          )),
          { id: "dictionary", title: "字典", side: "right", visible: true },
        ],
      }),
    );

    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={searchableResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const encyclopediaSection = within(rightDock).getByRole("region", { name: "百科" });

    expect(within(encyclopediaSection).getByRole("article", { name: "词典条目" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("region", { name: "字典" })).not.toBeInTheDocument();
  });

  it("filters right-side source cards with toolbar card search and logs status", async () => {
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={searchableResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "搜索类型" }), "cards");
    const cardSearch = screen.getByRole("search", { name: "经文与卡片搜索" });
    const searchInput = within(cardSearch).getByRole("searchbox", { name: "搜索卡片资源" });

    expect(within(rightDock).getByRole("article", { name: "安静笔记" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "晨星综合解读" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "词典条目" })).toBeInTheDocument();

    await userEvent.type(searchInput, "hiddenriver");

    expect(within(rightDock).queryByRole("article", { name: "安静笔记" })).not.toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "晨星综合解读" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "词典条目" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("status").some((element) => element.textContent === "卡片搜索：1 张匹配 hiddenriver")).toBe(true);
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[workbench] card search updated",
      expect.objectContaining({
        query: "hiddenriver",
        total: 1,
      }),
    );

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "综合解读");
    expect(within(rightDock).getByRole("article", { name: "晨星综合解读" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "词典条目" })).not.toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "《综合解读》");
    expect(within(rightDock).getByRole("article", { name: "晨星综合解读" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "词典条目" })).not.toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "Bible Dictionary");
    expect(within(rightDock).getByRole("article", { name: "词典条目" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "晨星综合解读" })).not.toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "archival-lamp");
    expect(within(rightDock).getByRole("article", { name: "图像索引" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "词典条目" })).not.toBeInTheDocument();

    await userEvent.click(within(cardSearch).getByRole("button", { name: "清除卡片搜索" }));
    expect(searchInput).toHaveValue("");
    expect(within(rightDock).getByRole("article", { name: "安静笔记" })).toBeInTheDocument();
    expect(screen.getAllByRole("status").some((element) => element.textContent === "卡片搜索已清除")).toBe(true);
  });

  it("keeps the ordinary right-dock empty copy when card search is not filtering", () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[]}
        initialLayout={{
          ...dualCenterLayout,
          activeCenterModules: ["cuv", "card"],
        }}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const leftStack = getLeftOrganizedCardStack();
    const centerCards = getCenterCurrentCardModule();

    expect(within(rightDock).getAllByText("当前经节还没有资源。").length).toBeGreaterThan(0);
    expect(within(rightDock).queryByText("没有匹配的卡片。")).not.toBeInTheDocument();
    expect(within(centerCards).getByText("当前经文还没有卡片。")).toBeInTheDocument();
    expect(within(centerCards).queryByText("没有匹配的卡片。")).not.toBeInTheDocument();
    expect(leftStack).toHaveTextContent("还没有整理卡片");
    expect(within(leftStack).queryByText("没有匹配的卡片。")).not.toBeInTheDocument();
  });

  it("shows a filtered-empty copy in the right dock and restores cards after clearing search", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={searchableResources}
        initialLayout={{
          ...dualCenterLayout,
          activeCenterModules: ["cuv", "card"],
        }}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const leftStack = getLeftOrganizedCardStack();
    const centerCards = getCenterCurrentCardModule();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "搜索类型" }), "cards");
    const cardSearch = screen.getByRole("search", { name: "经文与卡片搜索" });
    const searchInput = within(cardSearch).getByRole("searchbox", { name: "搜索卡片资源" });

    expect(within(rightDock).getByRole("article", { name: "安静笔记" })).toBeInTheDocument();
    expect(within(centerCards).getByRole("article", { name: "安静笔记" })).toBeInTheDocument();
    expect(leftStack).toHaveTextContent("还没有整理卡片");

    await userEvent.type(searchInput, "zzz-nomatch");

    expect(within(rightDock).queryByRole("article", { name: "安静笔记" })).not.toBeInTheDocument();
    expect(within(rightDock).getAllByText("没有匹配的卡片。").length).toBeGreaterThan(0);
    expect(within(rightDock).queryByText("当前经节还没有资源。")).not.toBeInTheDocument();
    expect(within(centerCards).getByRole("article", { name: "安静笔记" })).toBeInTheDocument();
    expect(within(centerCards).queryByText("没有匹配的卡片。")).not.toBeInTheDocument();
    expect(leftStack).toHaveTextContent("还没有整理卡片");
    expect(within(leftStack).queryByText("没有匹配的卡片。")).not.toBeInTheDocument();
    expect(within(cardSearch).getByRole("button", { name: "清除卡片搜索" })).toBeInTheDocument();

    await userEvent.click(within(cardSearch).getByRole("button", { name: "清除卡片搜索" }));
    expect(searchInput).toHaveValue("");
    expect(within(rightDock).getByRole("article", { name: "安静笔记" })).toBeInTheDocument();
    expect(within(rightDock).queryByText("没有匹配的卡片。")).not.toBeInTheDocument();
  });

  it("uses one search field and carries its query between scripture and card search", async () => {
    render(<Workbench versions={[navigationCuv, navigationKjv]} resources={searchableResources} initialLayout={dualCenterLayout} />);
    const search = screen.getByRole("search", { name: "经文与卡片搜索" });
    const input = within(search).getByRole("searchbox");
    const target = within(search).getByRole("combobox", { name: "搜索类型" });
    await userEvent.type(input, "hiddenriver{Enter}");
    expect(screen.getByRole("region", { name: "经文搜索结果" })).toBeInTheDocument();
    await userEvent.selectOptions(target, "cards");
    expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    expect(input).toHaveValue("hiddenriver");
    expect(input).toHaveAttribute("placeholder", "搜索本章卡片");
    expect(screen.queryByRole("region", { name: "经文搜索结果" })).not.toBeInTheDocument();
    const dock = screen.getByRole("complementary", { name: "右侧资料栏" });
    expect(within(dock).queryByRole("article", { name: "安静笔记" })).not.toBeInTheDocument();
    expect(within(dock).getByRole("article", { name: "晨星综合解读" })).toBeInTheDocument();
    await userEvent.selectOptions(target, "scripture");
    expect(input).toHaveValue("hiddenriver");
    expect(within(dock).getByRole("article", { name: "安静笔记" })).toBeInTheDocument();
    await userEvent.click(within(search).getByRole("button", { name: "清除搜索" }));
    await userEvent.selectOptions(target, "cards");
    expect(input).toHaveValue("");
    expect(within(dock).getByRole("article", { name: "安静笔记" })).toBeInTheDocument();
  });

  it("resets only presentation and preserves organized card references", async () => {
    render(<Workbench versions={[cuvBible, kjvBible]} resources={sampleResources} initialLayout={{
      ...defaultWorkbenchLayout,
      leftWidth: 410,
      savedCardsByBook: { Gen: [{ resourceId: genesisMathImageId, sourceVerseId: "Gen.1.1" }] },
      centerCardResourceIdsByBook: { Gen: [genesisMathImageId] },
    }} />);
    await userEvent.click(screen.getByRole("button", { name: "保存布局" }));
    const before = JSON.parse(localStorage.getItem(layoutStorageKey)!);
    await userEvent.click(screen.getByRole("button", { name: "重置排版" }));
    const after = JSON.parse(localStorage.getItem(layoutStorageKey)!);
    expect(after.savedCardsByBook).toEqual(before.savedCardsByBook);
    expect(after.savedCardsByVerse).toEqual(before.savedCardsByVerse);
    expect(after.centerCardResourceIdsByBook).toEqual(before.centerCardResourceIdsByBook);
    expect(after.leftWidth).toBe(defaultWorkbenchLayout.leftWidth);
    expect(screen.getByText("排版已重置，整理卡片已保留")).toBeInTheDocument();
  });

  it("exposes a top toolbar action for refreshing synced cards", async () => {
    let resolveRefresh: () => void = () => undefined;
    const refreshPromise = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const onRefreshResources = vi.fn(() => refreshPromise);

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
        onRefreshResources={onRefreshResources}
      />,
    );

    const layoutGroup = screen.getByRole("group", { name: "布局操作" });
    await userEvent.click(within(layoutGroup).getByRole("button", { name: "刷新卡片" }));

    expect(onRefreshResources).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("status").some((element) => element.textContent === "正在刷新卡片资源...")).toBe(true);

	    resolveRefresh();
	    await waitFor(() => {
	      expect(screen.getAllByRole("status").some((element) => element.textContent === "卡片资源已刷新")).toBe(true);
	    });
	    expect(within(layoutGroup).queryByText("已刷新")).not.toBeInTheDocument();
	    expect(screen.getByText("卡片资源已刷新")).toHaveClass("workbench-status");
	  });

  it("guards against duplicate toolbar refresh requests before parent state catches up", async () => {
    let resolveRefresh: () => void = () => undefined;
    const refreshPromise = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const onRefreshResources = vi.fn(() => refreshPromise);

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
        onRefreshResources={onRefreshResources}
      />,
    );

    const layoutGroup = screen.getByRole("group", { name: "布局操作" });
    const refreshButton = within(layoutGroup).getByRole("button", { name: "刷新卡片" });
    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);

    expect(onRefreshResources).toHaveBeenCalledTimes(1);

    resolveRefresh();
    await waitFor(() => {
      expect(screen.getAllByRole("status").some((element) => element.textContent === "卡片资源已刷新")).toBe(true);
    });
  });

  it("removes stale organized card references when refreshed resources no longer include them", async () => {
    const warnSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { rerender } = render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={bookIntroResources}
        initialLayout={{
          ...dualCenterLayout,
          centerCardResourceIdsByBook: {
            "Gen.1": ["gen-1-1-creation-note"],
          },
        }}
      />,
    );

    const leftStack = getLeftOrganizedCardStack();
    expect(within(leftStack).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();

    rerender(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={bookIntroResources.filter((resource) => resource.id !== "gen-1-1-creation-note")}
        initialLayout={{
          ...dualCenterLayout,
          centerCardResourceIdsByBook: {
            "Gen.1": ["gen-1-1-creation-note"],
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(within(leftStack).queryByRole("article", { name: "起初，神创造天地" })).not.toBeInTheDocument();
    });
    expect(window.localStorage.getItem(layoutStorageKey)).not.toContain("gen-1-1-creation-note");
    expect(screen.getAllByRole("status").some((element) => (
      element.textContent === "已移除 1 张刷新后不存在的整理卡片"
    ))).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith("[workbench] stale organized resource references pruned after refresh", {
      removedResourceIds: ["gen-1-1-creation-note"],
    });
    warnSpy.mockRestore();
  });

  it("rescopes an organized intro card after refresh adds a verse to the same resource id", async () => {
    const introResource = {
      id: "refresh-mapped-intro",
      title: "刷新后映射的序章卡",
      type: "commentary" as const,
      verses: [],
      bookIntro: "Gen",
      body: "刷新前属于创世记序章。",
    };
    const { rerender } = render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[introResource]}
        initialLayout={{
          ...dualCenterLayout,
          centerCardResourceIdsByBook: {
            "book-intro:Gen": [introResource.id],
          },
        }}
      />,
    );

    expect(within(getLeftOrganizedCardStack()).queryByRole("article", { name: introResource.title })).not.toBeInTheDocument();

    rerender(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[{
          ...introResource,
          verses: ["Gen.1.2"],
          primaryAnchor: "Gen.1.2",
        }]}
        initialLayout={{
          ...dualCenterLayout,
          centerCardResourceIdsByBook: {
            "book-intro:Gen": [introResource.id],
          },
        }}
      />,
    );

    await waitFor(() => {
      expect(within(getLeftOrganizedCardStack()).getByRole("article", { name: introResource.title })).toBeInTheDocument();
    });
    const storedLayout = JSON.parse(window.localStorage.getItem(layoutStorageKey) ?? "{}");
    expect(storedLayout.centerCardResourceIdsByBook["Gen.1"]).toContain(introResource.id);
    expect(storedLayout.centerCardResourceIdsByBook["book-intro:Gen"] ?? []).not.toContain(introResource.id);
  });

  it("removes stale legacy saved card references and active ids after resources refresh", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { rerender } = render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={bookIntroResources}
        initialLayout={{
          ...dualCenterLayout,
          activeResourceId: "gen-1-1-creation-note",
          centerCardResourceIds: ["gen-1-1-creation-note"],
          savedCardsByBook: {
            Gen: [{ resourceId: "gen-1-1-creation-note", sourceVerseId: "Gen.1.1" }],
          },
          savedCardsByVerse: {
            "Gen.1.1": [{ resourceId: "gen-1-1-creation-note", sourceVerseId: "Gen.1.1" }],
          },
        }}
      />,
    );

    expect(within(getLeftOrganizedCardStack()).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();

    rerender(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={bookIntroResources.filter((resource) => resource.id !== "gen-1-1-creation-note")}
        initialLayout={{
          ...dualCenterLayout,
          activeResourceId: "gen-1-1-creation-note",
          centerCardResourceIds: ["gen-1-1-creation-note"],
          savedCardsByBook: {
            Gen: [{ resourceId: "gen-1-1-creation-note", sourceVerseId: "Gen.1.1" }],
          },
          savedCardsByVerse: {
            "Gen.1.1": [{ resourceId: "gen-1-1-creation-note", sourceVerseId: "Gen.1.1" }],
          },
        }}
      />,
    );

    await waitFor(() => {
      const stored = window.localStorage.getItem(layoutStorageKey);
      expect(stored).not.toContain("gen-1-1-creation-note");
      expect(stored).toContain("\"activeResourceId\":null");
      expect(stored).toContain("\"savedCardsByBook\":{}");
      expect(stored).toContain("\"savedCardsByVerse\":{}");
      expect(stored).toContain("\"centerCardResourceIds\":[]");
    });
    expect(infoSpy).toHaveBeenCalledWith("[workbench] stale organized resource references pruned after refresh", {
      removedResourceIds: ["gen-1-1-creation-note"],
    });
    infoSpy.mockRestore();
  });

  it("shows a quiet delete-and-unsync action only for resources sourced from Workbench cards", () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[
          {
            id: "workbench-synced-only",
            title: "工作台已同步卡片",
            type: "note",
            verses: ["Gen.1.1"],
            body: "来自 Edit 工作台的同步卡片。",
            debugMeta: {
              sourceWorkbenchCardId: "cmc-gen-1-1",
            },
          },
          {
            id: "ordinary-local-note",
            title: "普通本地卡片",
            type: "note",
            verses: ["Gen.1.1"],
            body: "不来自 Edit 工作台。",
          },
        ]}
        initialLayout={dualCenterLayout}
        onUnsyncResource={vi.fn()}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const syncedCard = within(rightDock).getByRole("article", { name: "工作台已同步卡片" });
    const localCard = within(rightDock).getByRole("article", { name: "普通本地卡片" });

    expect(within(syncedCard).getByRole("button", { name: "删除并退回待复核：工作台已同步卡片" })).toBeInTheDocument();
    expect(within(localCard).queryByRole("button", { name: "删除并退回待复核：普通本地卡片" })).not.toBeInTheDocument();
  });

  it("disables a card while unsync succeeds and records the interaction logs", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    let resolveUnsync: () => void = () => undefined;
    const onUnsyncResource = vi.fn(() => new Promise<void>((resolve) => {
      resolveUnsync = resolve;
    }));

    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[
          {
            id: "workbench-synced-only",
            title: "工作台已同步卡片",
            type: "note",
            verses: ["Gen.1.1"],
            body: "来自 Edit 工作台的同步卡片。",
            debugMeta: {
              sourceWorkbenchCardId: "cmc-gen-1-1",
            },
          },
        ]}
        initialLayout={dualCenterLayout}
        onUnsyncResource={onUnsyncResource}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const syncedCard = within(rightDock).getByRole("article", { name: "工作台已同步卡片" });
    const deleteButton = within(syncedCard).getByRole("button", { name: "删除并退回待复核：工作台已同步卡片" });

    await userEvent.click(deleteButton);

    expect(deleteButton).toBeDisabled();
    expect(within(syncedCard).getByRole("status")).toHaveTextContent("删除中");
    expect(infoSpy).toHaveBeenCalledWith("[workbench] resource unsync requested", {
      resourceId: "workbench-synced-only",
      title: "工作台已同步卡片",
      sourceWorkbenchCardId: "cmc-gen-1-1",
    });

    resolveUnsync();
    await waitFor(() => {
      expect(screen.getAllByRole("status").some((element) => (
        element.textContent === "已删除并退回待复核：工作台已同步卡片"
      ))).toBe(true);
    });
    expect(infoSpy).toHaveBeenCalledWith("[workbench] resource unsync succeeded", {
      resourceId: "workbench-synced-only",
      title: "工作台已同步卡片",
      sourceWorkbenchCardId: "cmc-gen-1-1",
    });
  });

  it("disables editing while a workbench-sourced card is being unsynced", async () => {
    let resolveUnsync: () => void = () => undefined;
    const onUnsyncResource = vi.fn(() => new Promise<void>((resolve) => {
      resolveUnsync = resolve;
    }));

    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[
          {
            id: "workbench-synced-only",
            title: "工作台已同步卡片",
            type: "note",
            verses: ["Gen.1.1"],
            body: "来自 Edit 工作台的同步卡片。",
            debugMeta: {
              sourceWorkbenchCardId: "cmc-gen-1-1",
            },
          },
        ]}
        initialLayout={dualCenterLayout}
        onUnsyncResource={onUnsyncResource}
        onUpdateWorkbenchResource={vi.fn()}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const syncedCard = within(rightDock).getByRole("article", { name: "工作台已同步卡片" });
    const deleteButton = within(syncedCard).getByRole("button", { name: "删除并退回待复核：工作台已同步卡片" });
    const editButton = within(syncedCard).getByRole("button", { name: "编辑工作台已同步卡片的标题和正文" });

    await userEvent.click(deleteButton);

    expect(deleteButton).toBeDisabled();
    expect(editButton).toBeDisabled();
    resolveUnsync();
    await waitFor(() => {
      expect(editButton).not.toBeDisabled();
    });
  });

  it("calls unsync once on rapid delete clicks and keeps failure feedback visible", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onUnsyncResource = vi.fn(() => Promise.reject(new Error("unsync failed")));

    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[
          {
            id: "workbench-synced-only",
            title: "工作台已同步卡片",
            type: "note",
            verses: ["Gen.1.1"],
            body: "来自 Edit 工作台的同步卡片。",
            debugMeta: {
              sourceWorkbenchCardId: "cmc-gen-1-1",
            },
          },
        ]}
        initialLayout={dualCenterLayout}
        onUnsyncResource={onUnsyncResource}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const syncedCard = within(rightDock).getByRole("article", { name: "工作台已同步卡片" });
    const deleteButton = within(syncedCard).getByRole("button", { name: "删除并退回待复核：工作台已同步卡片" });
    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);

    expect(onUnsyncResource).toHaveBeenCalledTimes(1);
    expect(onUnsyncResource).toHaveBeenCalledWith("workbench-synced-only");
    await waitFor(() => {
      expect(within(syncedCard).getByRole("alert")).toHaveTextContent("删除失败");
    });
    expect(screen.getAllByRole("status").some((element) => (
      element.textContent === "删除并退回待复核失败：工作台已同步卡片"
    ))).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[workbench] resource unsync failed",
      expect.objectContaining({ resourceId: "workbench-synced-only" }),
    );
  });

  it("prunes stale local resource edit drafts after refreshed resources remove a card", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    localStorage.setItem(
      "one-holy-bible-resource-edits",
      JSON.stringify({
        "removed-workbench-card": {
          title: "已经删除的本地标题",
          body: "已经删除的本地正文。",
        },
        "remaining-workbench-card": {
          title: "保留的本地标题",
        },
      }),
    );

    const { rerender } = render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[
          {
            id: "removed-workbench-card",
            title: "将被刷新移除的卡片",
            type: "note",
            verses: ["Gen.1.1"],
            body: "刷新前存在。",
          },
          {
            id: "remaining-workbench-card",
            title: "保留的卡片",
            type: "note",
            verses: ["Gen.1.1"],
            body: "刷新后仍存在。",
          },
        ]}
        initialLayout={dualCenterLayout}
      />,
    );

    expect(screen.getByRole("article", { name: "已经删除的本地标题" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "保留的本地标题" })).toBeInTheDocument();

    rerender(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[
          {
            id: "remaining-workbench-card",
            title: "保留的卡片",
            type: "note",
            verses: ["Gen.1.1"],
            body: "刷新后仍存在。",
          },
        ]}
        initialLayout={dualCenterLayout}
      />,
    );

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("one-holy-bible-resource-edits") ?? "{}")).toEqual({
        "remaining-workbench-card": {
          title: "保留的本地标题",
        },
      });
    });
    expect(screen.queryByRole("article", { name: "已经删除的本地标题" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("status").some((element) => (
      element.textContent === "已清理 1 条刷新后不存在的本地卡片编辑"
    ))).toBe(true);
    expect(infoSpy).toHaveBeenCalledWith("[workbench] stale resource edit drafts pruned after refresh", {
      removedResourceIds: ["removed-workbench-card"],
    });
  });

			  it("keeps a visible failure hint when refreshing synced cards fails", async () => {
	    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
	    const onRefreshResources = vi.fn(() => Promise.reject(new Error("refresh failed")));

	    render(
	      <Workbench
	        versions={[cuvBible, kjvBible]}
	        resources={sampleResources}
	        initialLayout={dualCenterLayout}
	        onRefreshResources={onRefreshResources}
	      />,
	    );

	    const layoutGroup = screen.getByRole("group", { name: "布局操作" });
	    await userEvent.click(within(layoutGroup).getByRole("button", { name: "刷新卡片" }));

	    await waitFor(() => {
	      expect(screen.getByText("卡片资源刷新失败")).toHaveClass("workbench-status");
	    });
	    expect(screen.getByText("卡片资源刷新失败")).toBeVisible();
	    expect(screen.getByText("卡片资源刷新失败")).toHaveClass("toolbar-refresh-status--error");
	    expect(screen.getAllByRole("status").some((element) => element.textContent === "卡片资源刷新失败")).toBe(true);
	    consoleErrorSpy.mockRestore();
	  });

  it("disables the top toolbar refresh action while synced cards are refreshing", () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
        isRefreshingResources
        onRefreshResources={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "正在刷新卡片" })).toBeDisabled();
  });

  it("uses the production modern warm paper palette, book typography, and exact image blending", () => {
    const markerIndex = styles.indexOf(productionPaperMarker);
    expect(markerIndex).toBeGreaterThan(-1);
    expect(styles).toContain('data-paper-theme="warm"');
    expect(styles).toContain(".toolbar-button--paper");
    expect(styles).toContain(".toolbar-button--font");
    expect(styles).toContain('data-reading-font="serif"');
    expect(styles).not.toContain("Modern warm paper demo");
    expect(styles).toContain("Modern warm paper theme (toggleable)");
    const taskRules = parseCssContractRules(styles.slice(markerIndex));
    const allRules = parseCssContractRules(styles);
    const rootRule = cssContractRule(taskRules, productionPaperRoot);
    expect(rootRule.body).toMatch(/--canvas:\s*oklch\(/);

    const readingFontRoot = '.workbench[data-reading-font="serif"]';
    const readingFontRules = allRules.filter((rule) =>
      rule.selectors.some((selector) => selector.startsWith(readingFontRoot))
      && /font-family\s*:/.test(rule.body)
    );
    expect(readingFontRules.length).toBeGreaterThan(0);
    for (const rule of readingFontRules) {
      expect(rule.selectors.every((selector) => selector.startsWith(".workbench[data-reading-font="))).toBe(true);
    }

    const readingFaceRule = readingFontRules.find((rule) =>
      rule.selectors.some((selector) => selector.includes(".verse-text"))
      && rule.selectors.some((selector) => selector.includes(".resource-card__body"))
      && rule.selectors.some((selector) => selector.includes(".resource-card__selectable-text"))
      && rule.selectors.some((selector) => selector.includes("figcaption"))
      && /Songti SC/.test(rule.body)
    );
    expect(readingFaceRule, "reading-area and card reading faces should share one Songti rule").toBeDefined();
    expect(readingFaceRule!.body).toMatch(/Noto Serif CJK SC/);

    const rightDockRhythm = allRules.find((rule) =>
      rule.selectors.some((selector) => selector.includes(".resource-dock--right .resource-card") && selector.startsWith(readingFontRoot))
      && /--resource-card-body-size\s*:\s*16\.5px/.test(rule.body)
    );
    expect(rightDockRhythm, "right-dock cards should use a book-like body size close to scripture rhythm").toBeDefined();
    expect(rightDockRhythm!.body).toMatch(/--resource-card-body-line:\s*1\.78/);

    const selectedVerseRule = cssContractRule(taskRules, `${productionPaperRoot} .verse-button[aria-current="true"]`);
    expect(selectedVerseRule.body).toMatch(/background\s*:/);
    expect(selectedVerseRule.body).toMatch(/border-color\s*:/);
    expect(selectedVerseRule.body).not.toMatch(/border-(?:left|right)\s*:/);

    const imageEffectRules = allRules.filter((rule) => /(?:^|;)\s*(?:filter|mix-blend-mode)\s*:/m.test(rule.body));
    expect(imageEffectRules.length).toBeGreaterThan(0);
    for (const rule of imageEffectRules) {
      expect(rule.selectors.every((selector) => (
        selector.startsWith(productionPaperRoot) && selector.includes('[data-paper-blend="true"]')
      ))).toBe(true);
    }

    const paperBlendRule = cssContractRule(taskRules, `${productionPaperRoot} [data-paper-blend="true"]`);
    expect(paperBlendRule.body).toMatch(/filter:\s*sepia\(/);
    expect(paperBlendRule.body).toMatch(/mix-blend-mode:\s*multiply/);
  });

  it("uses a lighter lower-chroma warm-paper palette and restrained selected verse illumination", () => {
    const markerIndex = styles.indexOf(productionPaperMarker);
    const taskRules = parseCssContractRules(styles.slice(markerIndex));
    const rootRule = cssContractRule(taskRules, productionPaperRoot);

    expect(oklchToken(rootRule, "--canvas")).toEqual([0.94, 0.03, 94]);
    expect(oklchToken(rootRule, "--surface")).toEqual([0.98, 0.022, 96]);
    expect(oklchToken(rootRule, "--surface-2")).toEqual([0.96, 0.026, 94]);
    expect(oklchToken(rootRule, "--surface-3")).toEqual([0.92, 0.028, 91]);
    expect(oklchToken(rootRule, "--accent")).toEqual([0.56, 0.07, 72]);
    expect(oklchToken(rootRule, "--accent-soft")).toEqual([0.95, 0.038, 88]);
    expect(oklchToken(rootRule, "--accent-quiet")).toEqual([0.82, 0.046, 84]);
    expect(rootRule.body).toMatch(/rgb\(255 248 196 \/ 24%\)/);
    expect(rootRule.body).toMatch(/rgb\(218 188 116 \/ 7%\)/);

    const selectedVerseRule = cssContractRule(taskRules, `${productionPaperRoot} .verse-button[aria-current="true"]`);
    expect(selectedVerseRule.body).toMatch(/var\(--accent-soft\) 34%, var\(--surface\)/);
    expect(selectedVerseRule.body).toMatch(/border-color:\s*color-mix\(in oklch, var\(--accent\) 38%, var\(--line\)\)/);
    expect(selectedVerseRule.body).toMatch(/inset 0 0 0 1px/);
  });

  it("uses a dedicated high-contrast focus ring across warm-paper surfaces", () => {
    const markerIndex = styles.indexOf(productionPaperMarker);
    const taskRules = parseCssContractRules(styles.slice(markerIndex));
    const rootRule = cssContractRule(taskRules, productionPaperRoot);
    const focusRing = oklchToken(rootRule, "--focus-ring");
    const warmSurfaces = ["--canvas", "--surface", "--surface-2", "--surface-3"]
      .map((token) => oklchToken(rootRule, token));

    for (const surface of warmSurfaces) {
      expect(contrastRatio(focusRing, surface)).toBeGreaterThanOrEqual(3);
    }

    const focusSelectors = [
      `${productionPaperRoot} button:focus-visible:not(:disabled)`,
      `${productionPaperRoot} input:focus-visible:not(:disabled)`,
      `${productionPaperRoot} textarea:focus-visible:not(:disabled)`,
      `${productionPaperRoot} select:focus-visible:not(:disabled)`,
      `${productionPaperRoot} a[href]:focus-visible`,
      `${productionPaperRoot} .resource-card[tabindex="0"]:focus-visible:not([aria-disabled="true"])`,
    ];
    const focusRule = cssContractRule(taskRules, focusSelectors[0]);
    expect(focusRule.selectors).toEqual(expect.arrayContaining(focusSelectors));
    expect(focusRule.body).toMatch(/0 0 0 2px var\(--focus-halo\)/);
    expect(focusRule.body).toMatch(/0 0 0 5px var\(--focus-ring\)/);
    expect(focusRule.body).not.toMatch(/transparent|accent-soft/);
  });

  it("keeps warm focus rings above selected and pressed control shadows in the cascade", () => {
    const markerIndex = styles.indexOf(productionPaperMarker);
    const taskRules = parseCssContractRules(styles.slice(markerIndex));
    const allRules = parseCssContractRules(styles);
    const focusSelectors = [
      `${productionPaperRoot} button:focus-visible:not(:disabled)`,
      `${productionPaperRoot} input:focus-visible:not(:disabled)`,
      `${productionPaperRoot} textarea:focus-visible:not(:disabled)`,
      `${productionPaperRoot} select:focus-visible:not(:disabled)`,
      `${productionPaperRoot} a[href]:focus-visible`,
      `${productionPaperRoot} .resource-card[tabindex="0"]:focus-visible:not([aria-disabled="true"])`,
    ];
    const focusRule = cssContractRule(allRules, focusSelectors[0]);
    expect(focusRule.selectors).toEqual(expect.arrayContaining(focusSelectors));

    const stateSelectors = [
      `${productionPaperRoot} .verse-button[aria-current="true"]`,
      '.resource-card__action-button[aria-expanded="true"]',
    ];
    for (const stateSelector of stateSelectors) {
      const stateRule = cssContractRule(allRules, stateSelector);
      for (const focusSelector of focusSelectors) {
        expect(compareCssSpecificity(
          cssSpecificity(focusSelector),
          cssSpecificity(stateSelector),
        )).toBeGreaterThanOrEqual(0);
      }
      expect(allRules.indexOf(focusRule)).toBeGreaterThan(allRules.indexOf(stateRule));
    }
  });

  it("uses an AA warm-paper text token at the real placeholder and search metadata sites", () => {
    const markerIndex = styles.indexOf(productionPaperMarker);
    const taskRules = parseCssContractRules(styles.slice(markerIndex));
    const rootRule = cssContractRule(taskRules, productionPaperRoot);
    const muted = oklchToken(rootRule, "--muted");
    const surface = oklchToken(rootRule, "--surface");

    expect(contrastRatio(muted, surface)).toBeGreaterThanOrEqual(4.5);
    expect(cssContractRule(taskRules, `${productionPaperRoot} .bible-search input::placeholder`).body).toMatch(/color:\s*var\(--muted\)/);
    expect(cssContractRule(taskRules, `${productionPaperRoot} .bible-search-result__meta > span`).body).toMatch(/color:\s*var\(--muted\)/);
  });

  it("defines distinct visible warm-paper backgrounds for the reader, docks, and cards", () => {
    const markerIndex = styles.indexOf(productionPaperMarker);
    const taskRules = parseCssContractRules(styles.slice(markerIndex));
    const surfaceSelectors = [
      `${productionPaperRoot} .reader-pane`,
      `${productionPaperRoot} .resource-dock`,
      `${productionPaperRoot} .resource-card:not(.resource-card--video)`,
    ];
    const surfaceBackgrounds = surfaceSelectors.map((selector) => {
      const rule = cssContractRule(taskRules, selector);
      const background = rule.body.match(/(?:^|;)\s*background:\s*([^;]+);/m)?.[1] ?? "";
      expect(background).toContain("var(--");
      expect(background).not.toMatch(/(?:rgb|oklch)\(/);
      return background.replace(/\s+/g, " ").trim();
    });

    expect(new Set(surfaceBackgrounds).size).toBe(surfaceBackgrounds.length);
  });

  it("limits the warm-paper reduced-motion override to the production workbench", () => {
    const markerIndex = styles.indexOf(productionPaperMarker);
    const taskRules = parseCssContractRules(styles.slice(markerIndex));
    const reducedMotionAtRule = "@media (prefers-reduced-motion: reduce)";
    const reducedMotionRules = taskRules.filter((rule) => /transition-duration:\s*0\.01ms/.test(rule.body));
    const rulesInsideReducedMotion = reducedMotionRules.filter((rule) => rule.atRules?.includes(reducedMotionAtRule));
    const rulesOutsideReducedMotion = reducedMotionRules.filter((rule) => !rule.atRules?.includes(reducedMotionAtRule));

    expect(rulesInsideReducedMotion.length).toBeGreaterThan(0);
    expect(rulesOutsideReducedMotion).toHaveLength(0);
    for (const rule of rulesInsideReducedMotion) {
      expect(rule.selectors.every((selector) => selector.startsWith(productionPaperRoot))).toBe(true);
    }
  });

  it("keeps rounded resource card CSS polish", () => {
    expect(styles).toMatch(/\.resource-card\s*{[^}]*border:\s*1px solid color-mix\(in oklch,\s*var\(--line\)\s*72%,\s*var\(--surface\)\)/s);
    expect(styles).toMatch(/\.resource-card\s*{[^}]*border-radius:\s*var\(--radius-xl\)/s);
    expect(styles).toMatch(/\.resource-card\s*{[^}]*box-shadow:[^}]*0 1px 1px rgb\(70 48 22 \/ 4%\)[^}]*inset 0 1px 0 rgb\(255 253 247 \/ 68%\)/s);
    expect(styles).toMatch(/\.resource-card__header\s*{[^}]*border-radius:\s*calc\(var\(--radius-xl\) - 1px\) calc\(var\(--radius-xl\) - 1px\) 0 0/s);
    expect(styles).toMatch(/\.resource-card-drag-preview\s*{[^}]*border-radius:\s*var\(--radius-xl\)/s);
    expect(styles).toMatch(/\.resource-card-drag-preview--compact\s*{[^}]*border-radius:\s*var\(--radius-lg\)/s);
    expect(styles).toMatch(/\.resource-card__source-pill\s*{[^}]*display:\s*inline-flex/s);
    expect(styles).toMatch(/\.resource-card__source-pill\s*{[^}]*border-radius:\s*999px/s);
    expect(styles).toMatch(/\.resource-card__source-pill\s*{[^}]*border:\s*1px solid color-mix\(in oklch,\s*var\(--line\)\s*78%,\s*var\(--accent-quiet\)\)/s);
    expect(styles).toMatch(/\.resource-card__source-pill\s*{[^}]*padding:\s*2px 7px/s);
    expect(styles).toMatch(/\.resource-card__source-pill\s*{[^}]*letter-spacing:\s*0/s);
    expect(styles).toMatch(/\.resource-card__source-pill\s*{[^}]*text-transform:\s*none/s);
  });

  it("keeps the workbench grid within a 900px viewport while controls stay reachable", () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 900,
      writable: true,
    });

    try {
      const { container } = render(
        <Workbench
          versions={[cuvBible, kjvBible]}
          resources={sampleResources}
          initialLayout={defaultWorkbenchLayout}
        />,
      );

      const grid = container.querySelector<HTMLElement>(".workbench-grid");
      expect(grid).not.toBeNull();
      const minimumTracks = Array.from(grid!.style.gridTemplateColumns.matchAll(/minmax\((\d+)px,/g))
        .map((match) => Number(match[1]));
      expect(minimumTracks).toHaveLength(3);
      expect(minimumTracks.reduce((total, width) => total + width, 16)).toBeLessThanOrEqual(window.innerWidth);

      expect(screen.getByRole("button", { name: "和合本" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "KJV" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "卡片" })).toBeEnabled();
      expect(screen.getByRole("combobox", { name: "搜索类型" })).toBeInTheDocument();
      expect(screen.getAllByRole("searchbox")).toHaveLength(1);
      expect(screen.getByRole("searchbox", { name: "搜索经文" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "保存布局" })).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalInnerWidth,
        writable: true,
      });
    }
  });

  it("upgrades cramped persisted side widths to the roomier defaults", () => {
    localStorage.setItem(
      layoutStorageKey,
      JSON.stringify({
        ...defaultWorkbenchLayout,
        leftWidth: 220,
        rightWidth: 240,
      }),
    );

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    expect(screen.getByRole("separator", { name: "调整左侧资料栏宽度" })).toHaveAttribute("aria-valuenow", "300");
    expect(screen.getByRole("separator", { name: "调整右侧资料栏宽度" })).toHaveAttribute("aria-valuenow", "320");
  });

  it("shows current verse cards in the center chooser while chapter cards stay on the right", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["kjv", "cuv", "card"],
          activeCenterModules: ["cuv", "card"],
        }}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const center = screen.getByRole("region", { name: "中间工作区" });
    const cardModule = within(center).getByRole("region", { name: "当前经文已有卡片" });

    expect(within(rightDock).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "空虚混沌" })).toBeInTheDocument();
    expect(within(cardModule).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();
    expect(within(cardModule).queryByRole("article", { name: "空虚混沌" })).not.toBeInTheDocument();
    expect(within(cardModule).queryByRole("button", { name: "从左侧移除 起初，神创造天地" })).not.toBeInTheDocument();
    expect(within(cardModule).queryByRole("button", { name: "拖动排序 起初，神创造天地" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("cuv-Gen.1.2"));

    expect(within(cardModule).getByRole("article", { name: "空虚混沌" })).toBeInTheDocument();
    expect(within(cardModule).queryByRole("article", { name: "起初，神创造天地" })).not.toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "空虚混沌" })).toBeInTheDocument();
    expect(within(cardModule).queryByRole("button", { name: "从左侧移除 空虚混沌" })).not.toBeInTheDocument();
  });

  it("adds source cards to the left organized stack and persists them by chapter", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["kjv", "cuv", "card"],
          activeCenterModules: ["cuv", "card"],
        }}
      />,
    );

    const leftStack = getLeftOrganizedCardStack();
    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });

    expect(leftStack).toHaveTextContent("还没有整理卡片");
    await userEvent.dblClick(getResourceArticleByTitle(rightDock, genesisMathImageTitle));
    await waitForDndClickSuppressionCleanup();
    expect(within(leftStack).getByRole("article", { name: genesisMathImageTitle })).toBeInTheDocument();

    dragResourceCard(within(rightDock).getByRole("article", { name: "起初，神创造天地" }), 900, 180, 260);
    expect(within(leftStack).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();
    await waitForDndClickSuppressionCleanup();
    await userEvent.click(within(leftStack).getByRole("button", { name: `从左侧移除 ${genesisMathImageTitle}` }));
    expect(queryResourceArticleByTitle(leftStack, genesisMathImageTitle)).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(layoutStorageKey) ?? "{}")).toEqual(
      expect.objectContaining({
        centerCardResourceIdsByBook: {
          "Gen.1": ["gen-1-1-creation-note"],
        },
      }),
    );
  });

  it("keeps left organized cards scoped to the selected chapter", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    await userEvent.dblClick(getResourceArticleByTitle(rightDock, genesisMathImageTitle));
    await waitForDndClickSuppressionCleanup();
    expect(within(getLeftOrganizedCardStack()).getByRole("article", { name: genesisMathImageTitle })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择章节 第 1 章" }));
    await userEvent.click(screen.getByRole("button", { name: "第 2 章" }));
    expect(queryResourceArticleByTitle(getLeftOrganizedCardStack(), genesisMathImageTitle)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择章节 第 2 章" }));
    await userEvent.click(screen.getByRole("button", { name: "第 1 章" }));
    expect(within(getLeftOrganizedCardStack()).getByRole("article", { name: genesisMathImageTitle })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(layoutStorageKey) ?? "{}")).toEqual(
      expect.objectContaining({
        centerCardResourceIdsByBook: {
          "Gen.1": ["genesis-cmc-01-p014-img002-669x195"],
        },
      }),
    );
  });

  it("shows a clean custom drag preview for resource cards", () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const creationCard = within(rightDock).getByRole("article", { name: "起初，神创造天地" });

    fireEvent.pointerDown(creationCard, { button: 0, clientX: 900, clientY: 260, isPrimary: true, pointerId: 3 });
    fireEvent.pointerMove(document, { clientX: 860, clientY: 260, isPrimary: true, pointerId: 3 });

    const dragOverlay = screen.getByTestId("resource-drag-overlay");
    expect(dragOverlay).toHaveTextContent("起初，神创造天地");
    expect(dragOverlay).toHaveTextContent("注释");
    expect(dragOverlay).not.toHaveTextContent("commentary");

    fireEvent.pointerUp(document, { clientX: 860, clientY: 260, isPrimary: true, pointerId: 3 });
  });

  it("keeps dragged cards anchored while showing a restrained overlay", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const creationCard = within(rightDock).getByRole("article", { name: "起初，神创造天地" });

    fireEvent.pointerDown(creationCard, { button: 0, clientX: 900, clientY: 260, isPrimary: true, pointerId: 3 });
    fireEvent.pointerMove(document, { clientX: 860, clientY: 260, isPrimary: true, pointerId: 3 });

    expect(creationCard).toHaveClass("is-dragging");
    expect(creationCard).not.toHaveStyle({ transform: "translate3d(-40px, 0px, 0)" });
    expect(screen.getByTestId("resource-drag-overlay")).toHaveClass("resource-card-drag-preview--compact");

    fireEvent.pointerUp(document, { clientX: 860, clientY: 260, isPrimary: true, pointerId: 3 });
    await waitFor(() => {
      expect(screen.queryByTestId("resource-drag-overlay")).not.toBeInTheDocument();
    });
  });

  it("adds a double-clicked card to the left organized stack", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    await userEvent.dblClick(getResourceArticleByTitle(rightDock, genesisMathImageTitle));

    const center = screen.getByRole("region", { name: "中间工作区" });
    const leftStack = getLeftOrganizedCardStack();
    expect(leftStack).toHaveTextContent(genesisMathImageTitle);
    expect(within(leftStack).getByRole("img", { name: genesisMathImageTitle })).toBeInTheDocument();
    expect(within(center).getByRole("region", { name: "和合本阅读" })).toBeInTheDocument();
    expect(within(center).queryByRole("region", { name: "KJV阅读" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "卡片" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "KJV" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "和合本" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId("center-module-button").map((element) => element.getAttribute("data-module-id"))).toEqual(["kjv", "cuv", "card"]);
    expect(screen.getAllByTestId("center-module").map((element) => element.getAttribute("data-module-id"))).toEqual(["cuv"]);
    expect(JSON.parse(localStorage.getItem(layoutStorageKey) ?? "{}")).toEqual(
      expect.objectContaining({
        activeCenterModules: ["cuv"],
        activeResourceId: "genesis-cmc-01-p014-img002-669x195",
        centerCardResourceIdsByBook: {
          "Gen.1": ["genesis-cmc-01-p014-img002-669x195"],
        },
        centerModules: ["kjv", "cuv", "card"],
      }),
    );
  });

  it("copies a resource card body from the card action menu", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const creationCard = within(rightDock).getByRole("article", { name: "起初，神创造天地" });

    await userEvent.click(within(creationCard).getByRole("button", { name: "打开起初，神创造天地复制菜单" }));
    await userEvent.click(within(creationCard).getByRole("menuitem", { name: "复制正文" }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("“起初”声明时间、宇宙和历史都在神的创造中开始"));
    expect(screen.getAllByRole("status").some((element) => element.textContent === "已复制：正文")).toBe(true);
    expect(screen.getByText("已复制：正文")).toHaveClass("workbench-status");
  });

  it("copies a resource card as Markdown from the card action menu", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const creationCard = within(rightDock).getByRole("article", { name: "起初，神创造天地" });

    await userEvent.click(within(creationCard).getByRole("button", { name: "打开起初，神创造天地复制菜单" }));
    await userEvent.click(within(creationCard).getByRole("menuitem", { name: "复制Markdown" }));

    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^## 起初，神创造天地\n\n/));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("“起初”声明时间、宇宙和历史都在神的创造中开始"));
    expect(screen.getAllByRole("status").some((element) => element.textContent === "已复制：Markdown")).toBe(true);
  });

  it("falls back to selection copy when the clipboard API is blocked", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard denied"));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const creationCard = within(rightDock).getByRole("article", { name: "起初，神创造天地" });

    await userEvent.click(within(creationCard).getByRole("button", { name: "打开起初，神创造天地复制菜单" }));
    await userEvent.click(within(creationCard).getByRole("menuitem", { name: "复制标题" }));

    expect(writeText).toHaveBeenCalledWith("起初，神创造天地");
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea[data-resource-copy-fallback='true']")).not.toBeInTheDocument();
    expect(screen.getAllByRole("status").some((element) => element.textContent === "已复制：标题")).toBe(true);
    expect(screen.getAllByRole("status").some((element) => element.textContent === "复制失败：标题")).toBe(false);
  });

  it("does not open a card in the center when using the copy menu", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const creationCard = within(rightDock).getByRole("article", { name: "起初，神创造天地" });

    await userEvent.click(within(creationCard).getByRole("button", { name: "打开起初，神创造天地复制菜单" }));
    await userEvent.click(within(creationCard).getByRole("menuitem", { name: "复制标题" }));

    const center = screen.getByRole("region", { name: "中间工作区" });
    expect(within(center).queryByRole("region", { name: "当前经文已有卡片" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "卡片" })).toHaveAttribute("aria-pressed", "false");
    expect(writeText).toHaveBeenCalledWith("起初，神创造天地");
  });

  it("does not show a drag overlay when pressing the copy action button", () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const creationCard = within(rightDock).getByRole("article", { name: "起初，神创造天地" });
    const copyButton = within(creationCard).getByRole("button", { name: "打开起初，神创造天地复制菜单" });

    fireEvent.pointerDown(copyButton, { button: 0, clientX: 860, clientY: 220, isPrimary: true, pointerId: 8 });
    fireEvent.pointerMove(document, { clientX: 900, clientY: 220, isPrimary: true, pointerId: 8 });

    expect(screen.queryByTestId("resource-drag-overlay")).not.toBeInTheDocument();
  });

  it("keeps card text selectable without starting a card drag", () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const creationCard = within(rightDock).getByRole("article", { name: "起初，神创造天地" });
    const selectableText = within(creationCard).getByTestId("resource-selectable-text");

    expect(selectableText).toHaveAttribute("data-selection-mode", "text");
    fireEvent.pointerDown(selectableText, { button: 0, clientX: 860, clientY: 252, isPrimary: true, pointerId: 10 });
    fireEvent.pointerMove(document, { clientX: 900, clientY: 252, isPrimary: true, pointerId: 10 });

    expect(screen.queryByTestId("resource-drag-overlay")).not.toBeInTheDocument();
  });

  it("formats text card bodies with paragraph spacing around bullet sections", () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={[
          {
            id: "gen-1-6-commentary",
            title: "创世记 1:6 综合解读",
            type: "commentary",
            verses: ["Gen.1.1"],
            body: "「神说：『诸水之间要有空气，将水分为上下。』」• 「空气」原文是「穹苍」。• 「将水分为上下」并不是一件简单的事情。",
            source: "圣经综合解读·创世记",
          },
        ]}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const card = within(rightDock).getByRole("article", { name: "创世记 1:6 综合解读" });
    const paragraphs = within(card).getByTestId("resource-selectable-text").querySelectorAll("p");

    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toHaveTextContent("「神说：『诸水之间要有空气，将水分为上下。』」");
    expect(paragraphs[1]).toHaveTextContent("• 「空气」原文是「穹苍」。");
    expect(paragraphs[2]).toHaveTextContent("• 「将水分为上下」并不是一件简单的事情。");
  });

  it("opens title and body editing from the pencil action without opening or dragging it", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const creationCard = within(rightDock).getByRole("article", { name: "起初，神创造天地" });
    const editButton = within(creationCard).getByRole("button", { name: "编辑起初，神创造天地的标题和正文" });

    fireEvent.pointerDown(editButton, { button: 0, clientX: 830, clientY: 220, isPrimary: true, pointerId: 9 });
    fireEvent.pointerMove(document, { clientX: 880, clientY: 220, isPrimary: true, pointerId: 9 });
    await userEvent.click(editButton);

    const center = screen.getByRole("region", { name: "中间工作区" });
    const editor = within(creationCard).getByRole("form", { name: "编辑起初，神创造天地" });
    const titleInput = within(editor).getByRole("textbox", { name: "标题" });
    const bodyInput = within(editor).getByRole("textbox", { name: "正文" });

    expect(titleInput).toHaveValue("起初，神创造天地");
    expect((bodyInput as HTMLTextAreaElement).value).toContain("“起初”声明时间、宇宙和历史都在神的创造中开始");

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "创世记 1:1 标题测试");
    await userEvent.clear(bodyInput);
    await userEvent.type(bodyInput, "正文测试内容");
    await userEvent.click(within(editor).getByRole("button", { name: "保存卡片文字" }));

    expect(within(center).queryByRole("region", { name: "当前经文已有卡片" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("resource-drag-overlay")).not.toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "创世记 1:1 标题测试" })).toHaveTextContent("正文测试内容");
    expect(screen.getAllByRole("status").some((element) => element.textContent === "已更新卡片文字：创世记 1:1 标题测试")).toBe(true);
  });

  it("replaces a local range card placement when its scripture location is edited", async () => {
    const title = "苏维埃五日周历法测试卡";
    const relocationCuv: BibleVersion = {
      ...navigationCuv,
      verses: [
        ...navigationCuv.verses,
        { id: "Gen.2.2", book: "Gen", chapter: 2, verse: 2, text: "到第七日，神造物的工已经完毕。" },
        { id: "Gen.2.3", book: "Gen", chapter: 2, verse: 3, text: "神赐福给第七日，定为圣日。" },
      ],
    };
    render(
      <Workbench
        versions={[relocationCuv, navigationKjv]}
        resources={[
          {
            id: "local-soviet-calendar",
            title,
            type: "image",
            verses: ["Gen.2.1", "Gen.2.2", "Gen.2.3"],
            primaryAnchor: "Gen.2.1",
            body: "苏联曾实施五日周历法。",
            assetPath: "/resources/test/soviet-calendar.png",
            debugMeta: {
              coverageRanges: [{ start: "Gen.2.1", end: "Gen.2.3" }],
            },
          },
        ]}
        initialLayout={{
          ...dualCenterLayout,
          centerModules: ["kjv", "cuv", "card"],
          activeCenterModules: ["cuv", "card"],
        }}
        initialVerseId="Gen.2.1"
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const cardModule = getCenterCurrentCardModule();
    const rightCard = within(rightDock).getByRole("article", { name: title });
    expect(within(cardModule).getByRole("article", { name: title })).toBeInTheDocument();

    await userEvent.click(within(rightCard).getByRole("button", { name: `编辑${title}的标题和正文` }));
    const editor = within(rightCard).getByRole("form", { name: `编辑${title}` });
    const locationInput = within(editor).getByRole("textbox", { name: "经文定位" });
    await userEvent.clear(locationInput);
    await userEvent.type(locationInput, "Gen.2.2");
    await userEvent.click(within(editor).getByRole("button", { name: "保存卡片文字" }));

    expect(within(cardModule).queryByRole("article", { name: title })).not.toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: title })).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("cuv-Gen.2.2"));
    expect(within(cardModule).getByRole("article", { name: title })).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("cuv-Gen.2.3"));
    expect(within(cardModule).queryByRole("article", { name: title })).not.toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: title })).toBeInTheDocument();
  });

  it("syncs workbench-sourced card text edits through the parent before showing them locally", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const onUpdateWorkbenchResource = vi.fn().mockResolvedValue(undefined);

    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[
          {
            id: "workbench-synced-only",
            title: "工作台已同步卡片",
            type: "commentary",
            verses: ["Gen.1.1"],
            primaryAnchor: "Gen.1.1",
            body: "来自 Edit 工作台的同步卡片。",
            debugMeta: {
              sourceWorkbenchCardId: "cmc-gen-1-1",
            },
          },
        ]}
        initialLayout={dualCenterLayout}
        onUpdateWorkbenchResource={onUpdateWorkbenchResource}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const syncedCard = within(rightDock).getByRole("article", { name: "工作台已同步卡片" });
    await userEvent.click(within(syncedCard).getByRole("button", { name: "编辑工作台已同步卡片的标题和正文" }));

    const editor = within(syncedCard).getByRole("form", { name: "编辑工作台已同步卡片" });
    const titleInput = within(editor).getByRole("textbox", { name: "标题" });
    const bodyInput = within(editor).getByRole("textbox", { name: "正文" });
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "OHB 写回后的标题");
    await userEvent.clear(bodyInput);
    await userEvent.type(bodyInput, "OHB 写回后的正文");
    await userEvent.click(within(editor).getByRole("button", { name: "保存卡片文字" }));

    await waitFor(() => {
      expect(onUpdateWorkbenchResource).toHaveBeenCalledWith("workbench-synced-only", {
        body: "OHB 写回后的正文",
        primaryAnchor: "Gen.1.1",
        title: "OHB 写回后的标题",
      });
    });
    expect(localStorage.getItem("one-holy-bible-resource-edits")).toBeNull();
    expect(screen.getAllByRole("status").some((element) => (
      element.textContent === "已保存并进入工作台「已编辑」：OHB 写回后的标题"
      || element.textContent === "已同步卡片修改：OHB 写回后的标题"
    ))).toBe(true);
    expect(infoSpy).toHaveBeenCalledWith("[workbench] resource card edit sync succeeded", {
      resourceId: "workbench-synced-only",
      title: "OHB 写回后的标题",
      sourceWorkbenchCardId: "cmc-gen-1-1",
    });
  });

  it("disables delete while a workbench-sourced card text edit is syncing", async () => {
    let resolveUpdate: () => void = () => undefined;
    const onUpdateWorkbenchResource = vi.fn(() => new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    }));

    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[
          {
            id: "workbench-synced-only",
            title: "工作台已同步卡片",
            type: "commentary",
            verses: ["Gen.1.1"],
            primaryAnchor: "Gen.1.1",
            body: "来自 Edit 工作台的同步卡片。",
            debugMeta: {
              sourceWorkbenchCardId: "cmc-gen-1-1",
            },
          },
        ]}
        initialLayout={dualCenterLayout}
        onUnsyncResource={vi.fn()}
        onUpdateWorkbenchResource={onUpdateWorkbenchResource}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const syncedCard = within(rightDock).getByRole("article", { name: "工作台已同步卡片" });
    await userEvent.click(within(syncedCard).getByRole("button", { name: "编辑工作台已同步卡片的标题和正文" }));

    const editor = within(syncedCard).getByRole("form", { name: "编辑工作台已同步卡片" });
    const deleteButton = within(syncedCard).getByRole("button", { name: "删除并退回待复核：工作台已同步卡片" });
    await userEvent.click(within(editor).getByRole("button", { name: "保存卡片文字" }));

    expect(within(editor).getByRole("button", { name: "保存中" })).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    resolveUpdate();
    await waitFor(() => {
      expect(screen.getAllByRole("status").some((element) => (
        element.textContent === "已保存并进入工作台「已编辑」：工作台已同步卡片"
        || element.textContent === "已同步卡片修改：工作台已同步卡片"
      ))).toBe(true);
    });
  });

  it("keeps the editor open when syncing workbench-sourced card text edits fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onUpdateWorkbenchResource = vi.fn().mockRejectedValue(new Error("edit sync failed"));

    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[
          {
            id: "workbench-synced-only",
            title: "工作台已同步卡片",
            type: "commentary",
            verses: ["Gen.1.1"],
            primaryAnchor: "Gen.1.1",
            body: "来自 Edit 工作台的同步卡片。",
            debugMeta: {
              sourceWorkbenchCardId: "cmc-gen-1-1",
            },
          },
        ]}
        initialLayout={dualCenterLayout}
        onUpdateWorkbenchResource={onUpdateWorkbenchResource}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const syncedCard = within(rightDock).getByRole("article", { name: "工作台已同步卡片" });
    await userEvent.click(within(syncedCard).getByRole("button", { name: "编辑工作台已同步卡片的标题和正文" }));

    const editor = within(syncedCard).getByRole("form", { name: "编辑工作台已同步卡片" });
    const titleInput = within(editor).getByRole("textbox", { name: "标题" });
    const bodyInput = within(editor).getByRole("textbox", { name: "正文" });
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "失败时保留标题");
    await userEvent.clear(bodyInput);
    await userEvent.type(bodyInput, "失败时保留正文");
    await userEvent.click(within(editor).getByRole("button", { name: "保存卡片文字" }));

    await waitFor(() => {
      expect(within(syncedCard).getByRole("alert")).toHaveTextContent("同步失败");
    });
    expect(within(syncedCard).getByRole("form", { name: "编辑工作台已同步卡片" })).toBeInTheDocument();
    expect(titleInput).toHaveValue("失败时保留标题");
    expect(bodyInput).toHaveValue("失败时保留正文");
    expect(localStorage.getItem("one-holy-bible-resource-edits")).toBeNull();
    expect(screen.getAllByRole("status").some((element) => (
      element.textContent?.startsWith("卡片修改同步失败：工作台已同步卡片")
    ))).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[workbench] resource card edit sync failed",
      expect.objectContaining({ resourceId: "workbench-synced-only" }),
    );
  });

  it("adds right-side cards to the left organized stack by dragging into it", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["kjv", "cuv", "card"],
          activeCenterModules: ["cuv", "card"],
        }}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const leftStack = getLeftOrganizedCardStack();
    const imageCard = getResourceArticleByTitle(rightDock, genesisMathImageTitle);

    expect(queryResourceArticleByTitle(leftStack, genesisMathImageTitle)).not.toBeInTheDocument();
    dragResourceCard(imageCard, 900, 180);

    expect(getResourceArticleByTitle(leftStack, genesisMathImageTitle)).toBeInTheDocument();
    expect(within(leftStack).getByText("整理卡片")).toBeInTheDocument();
    expect(within(leftStack).queryByText("已选卡片")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(layoutStorageKey) ?? "{}")).toEqual(
      expect.objectContaining({
        activeCenterModules: ["cuv", "card"],
        activeResourceId: "genesis-cmc-01-p014-img002-669x195",
        centerCardResourceIdsByBook: {
          "Gen.1": ["genesis-cmc-01-p014-img002-669x195"],
        },
      }),
    );
  });

  it("uses the left dock as an editable organized-card workspace", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    await userEvent.dblClick(getResourceArticleByTitle(rightDock, genesisMathImageTitle));
    await waitForDndClickSuppressionCleanup();
    await userEvent.dblClick(within(rightDock).getByRole("article", { name: "起初，神创造天地" }));
    await waitForDndClickSuppressionCleanup();

    const cardModule = getLeftOrganizedCardStack();
    expect(within(cardModule).queryByRole("region", { name: "媒体" })).not.toBeInTheDocument();
    expect(within(cardModule).queryByRole("region", { name: "注释" })).not.toBeInTheDocument();
    expect(within(cardModule).queryByRole("searchbox", { name: "搜索中间卡片" })).not.toBeInTheDocument();
    expect(within(cardModule).getAllByRole("article")).toHaveLength(2);

    const imageCard = getResourceArticleByTitle(cardModule, genesisMathImageTitle);
    const textCard = within(cardModule).getByRole("article", { name: "起初，神创造天地" });
    expect(within(imageCard).getByRole("img", { name: genesisMathImageTitle })).toBeInTheDocument();
    expect(within(textCard).getByText(/“起初”声明时间/)).toBeInTheDocument();

    await userEvent.click(within(cardModule).getByRole("button", { name: `折叠 ${genesisMathImageTitle}` }));
    expect(within(imageCard).queryByRole("img", { name: genesisMathImageTitle })).not.toBeInTheDocument();
    expect(within(cardModule).getByRole("button", { name: `展开 ${genesisMathImageTitle}` })).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(within(cardModule).getByRole("button", { name: `从左侧移除 ${genesisMathImageTitle}` }));
    expect(queryResourceArticleByTitle(cardModule, genesisMathImageTitle)).not.toBeInTheDocument();
    expect(within(cardModule).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();
    expect(getResourceArticleByTitle(rightDock, genesisMathImageTitle)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(layoutStorageKey) ?? "{}")).toEqual(
      expect.objectContaining({
        activeResourceId: "gen-1-1-creation-note",
        centerCardResourceIdsByBook: {
          "Gen.1": ["gen-1-1-creation-note"],
        },
      }),
    );
  });

  it("reorders left organized cards by dragging card rows and persists the current scope order", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    await userEvent.dblClick(getResourceArticleByTitle(rightDock, genesisMathImageTitle));
    await waitForDndClickSuppressionCleanup();
    await userEvent.dblClick(within(rightDock).getByRole("article", { name: "起初，神创造天地" }));
    await waitForDndClickSuppressionCleanup();

    const cardModule = getLeftOrganizedCardStack();
    const cardTitles = () => within(cardModule).getAllByRole("article").map((element) => element.getAttribute("aria-label"));
    expect(cardTitles()).toEqual([genesisMathImageTitle, "起初，神创造天地"]);

    const imageSortHandle = within(cardModule).getByRole("button", { name: `拖动排序 ${genesisMathImageTitle}` });
    dragCenterCard(imageSortHandle, 360, 520, 604);

    expect(cardTitles()).toEqual(["起初，神创造天地", genesisMathImageTitle]);
    expect(JSON.parse(localStorage.getItem(layoutStorageKey) ?? "{}")).toEqual(
      expect.objectContaining({
        centerCardResourceIds: ["gen-1-1-creation-note", "genesis-cmc-01-p014-img002-669x195"],
        centerCardResourceIdsByBook: {
          "Gen.1": ["gen-1-1-creation-note", "genesis-cmc-01-p014-img002-669x195"],
        },
      }),
    );
  });

  it("keeps left organized card drag activation on the left handle", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["cuv", "card"],
          activeCenterModules: ["cuv", "card"],
          centerCardResourceIds: [genesisMathImageId],
          activeResourceId: genesisMathImageId,
        }}
      />,
    );

    const cardModule = getLeftOrganizedCardStack();
    const imageCard = getResourceArticleByTitle(cardModule, genesisMathImageTitle);
    const sortableItem = within(cardModule).getByRole("button", { name: `拖动排序 ${genesisMathImageTitle}` }).closest(".center-card-stack__item");

    expect(within(cardModule).getByRole("button", { name: `拖动排序 ${genesisMathImageTitle}` })).toBeInTheDocument();
    expect(imageCard).not.toHaveAttribute("aria-roledescription", "sortable");
    expect(sortableItem).not.toHaveAttribute("aria-label", `拖动排序 ${genesisMathImageTitle}`);
    expect(styles).toMatch(/\.center-card-stack__item\s*{[^}]*cursor:\s*default/s);
    expect(styles).toMatch(/\.center-card-stack__item\s*{(?:(?!touch-action:\s*none).)*}/s);
  });

  it("keeps left organized cards scoped to the current chapter while the center chooser follows the selected verse", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={multiBookResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["kjv", "cuv", "card"],
          activeCenterModules: ["cuv", "card"],
        }}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const centerCards = getCenterCurrentCardModule();

    dragResourceCard(getResourceArticleByTitle(rightDock, genesisMathImageTitle), 900, 180);
    dragResourceCard(within(rightDock).getByRole("article", { name: "起初，神创造天地" }), 900, 180);
    expect(getResourceArticleByTitle(getLeftOrganizedCardStack(), genesisMathImageTitle)).toBeInTheDocument();
    expect(within(getLeftOrganizedCardStack()).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();

    await waitForDndClickSuppressionCleanup();
    await userEvent.click(screen.getByTestId("cuv-Gen.1.2"));
    expect(getResourceArticleByTitle(getLeftOrganizedCardStack(), genesisMathImageTitle)).toBeInTheDocument();
    expect(within(centerCards).queryByRole("article", { name: "起初，神创造天地" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择书卷 创世记" }));
    await userEvent.click(screen.getByRole("button", { name: "出埃及记" }));
    expect(queryResourceArticleByTitle(getLeftOrganizedCardStack(), genesisMathImageTitle)).not.toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "埃及名单" })).toBeInTheDocument();
    dragResourceCard(within(rightDock).getByRole("article", { name: "埃及名单" }), 900, 180);
    expect(within(getLeftOrganizedCardStack()).getByRole("article", { name: "埃及名单" })).toBeInTheDocument();

    await waitForDndClickSuppressionCleanup();
    await userEvent.click(screen.getByRole("button", { name: "选择书卷 出埃及记" }));
    await userEvent.click(screen.getByRole("button", { name: "创世记" }));
    await userEvent.click(screen.getByRole("button", { name: "选择章节 序" }));
    await userEvent.click(screen.getByRole("button", { name: "第 1 章" }));
    expect(getResourceArticleByTitle(getLeftOrganizedCardStack(), genesisMathImageTitle)).toBeInTheDocument();
    expect(within(getLeftOrganizedCardStack()).queryByRole("article", { name: "埃及名单" })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(layoutStorageKey) ?? "{}")).toEqual(
      expect.objectContaining({
        centerCardResourceIdsByBook: {
          "Gen.1": ["genesis-cmc-01-p014-img002-669x195", "gen-1-1-creation-note"],
          "Exod.1": ["exod-1-1-note"],
        },
      }),
    );
  });

  it("uses the center module capsules as independent show and hide toggles", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    const center = screen.getByRole("region", { name: "中间工作区" });
    expect(within(center).getByRole("region", { name: "和合本阅读" })).toBeInTheDocument();
    expect(within(center).queryByRole("region", { name: "KJV阅读" })).not.toBeInTheDocument();
    expect(within(center).queryByRole("region", { name: "当前经文已有卡片" })).not.toBeInTheDocument();
    expect(screen.getAllByTestId("center-module-button").map((element) => element.getAttribute("data-module-id"))).toEqual(["kjv", "cuv", "card"]);
    expect(screen.getByRole("button", { name: "和合本" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "KJV" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "卡片" })).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(screen.getByRole("button", { name: "KJV" }));
    expect(within(center).getByRole("region", { name: "KJV阅读" })).toBeInTheDocument();
    expect(within(center).getByRole("region", { name: "和合本阅读" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "KJV" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId("center-module").map((element) => element.getAttribute("data-module-id"))).toEqual(["kjv", "cuv"]);

    await userEvent.click(screen.getByRole("button", { name: "和合本" }));
    expect(within(center).queryByRole("region", { name: "和合本阅读" })).not.toBeInTheDocument();
    expect(within(center).getByRole("region", { name: "KJV阅读" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "和合本" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByTestId("center-module")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "KJV" }));
    expect(screen.queryAllByTestId("center-module")).toHaveLength(0);
    expect(screen.getByLabelText("未开启中间模块")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "KJV" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "和合本" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "卡片" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("请选择至少一个译本。")).not.toBeInTheDocument();
  });

  it("keeps at most two center modules visible when a third capsule is opened", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "KJV" }));
    await userEvent.click(screen.getByRole("button", { name: "卡片" }));

    const center = screen.getByRole("region", { name: "中间工作区" });
    expect(within(center).queryByRole("region", { name: "和合本阅读" })).not.toBeInTheDocument();
    expect(within(center).getByRole("region", { name: "KJV阅读" })).toBeInTheDocument();
    expect(within(center).getByRole("region", { name: "当前经文已有卡片" })).toBeInTheDocument();
    expect(screen.getAllByTestId("center-module")).toHaveLength(2);
    expect(screen.getAllByTestId("center-module").map((element) => element.getAttribute("data-module-id"))).toEqual(["kjv", "card"]);
    expect(screen.getAllByTestId("center-module-button").map((element) => element.getAttribute("data-module-id"))).toEqual(["kjv", "cuv", "card"]);
    expect(screen.getByRole("button", { name: "卡片" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "KJV" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "和合本" })).toHaveAttribute("aria-pressed", "false");
    expect(JSON.parse(localStorage.getItem(layoutStorageKey) ?? "{}")).toEqual(
      expect.objectContaining({
        activeCenterModules: ["kjv", "card"],
      }),
    );
  });

  it("keeps the center module locator as three quiet capsules with an icon-only swap control", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "KJV" }));
    expect(screen.queryByRole("button", { name: "模块左移" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "模块右移" })).not.toBeInTheDocument();
    const swapButton = screen.getByRole("button", { name: "交换中间模块顺序" });
    expect(swapButton).toBeInTheDocument();
    expect(swapButton).not.toHaveTextContent("交换");
    expect(screen.getAllByTestId("center-module-button").map((element) => element.getAttribute("data-module-id"))).toEqual(["kjv", "cuv", "card"]);
    expect(screen.getAllByTestId("center-module")).toHaveLength(2);
    expect(screen.getAllByTestId("center-module").map((element) => element.getAttribute("data-module-id"))).toEqual(["kjv", "cuv"]);
    expect(screen.getByRole("button", { name: "KJV" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "和合本" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(swapButton);
    expect(screen.getAllByTestId("center-module").map((element) => element.getAttribute("data-module-id"))).toEqual(["cuv", "kjv"]);
  });

  it("shows a left commentary resource library picker instead of study tools", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    const library = getLeftResourceLibrary();
    expect(within(library).getByRole("button", { name: /综合解读/ })).toBeInTheDocument();
    expect(within(library).getByRole("button", { name: /研读本圣经/ })).toBeInTheDocument();
    expect(within(library).getByRole("button", { name: /圣经研修本/ })).toBeInTheDocument();
    expect(within(library).getByRole("button", { name: /圣经信息系列/ })).toBeInTheDocument();

    const leftDock = screen.getByRole("complementary", { name: "左侧资料栏" });
    expect(within(leftDock).queryByText("学习工具")).not.toBeInTheDocument();
    expect(within(leftDock).queryByText("我的资料")).not.toBeInTheDocument();
    expect(within(leftDock).getByText("资源库")).toBeInTheDocument();
    expect(within(leftDock).queryByRole("button", { name: "添加资源库" })).not.toBeInTheDocument();
    expect(getLeftOrganizedCardStack()).toBeInTheDocument();
  });

  it("scopes only text commentary libraries while keeping image cards unscoped", () => {
    const zongheText = {
      id: "t-zonghe",
      title: "综合解读卡",
      type: "commentary" as const,
      verses: ["Gen.1.1" as const],
      source: "圣经综合解读·创世记",
      body: "text",
    };
    const yanduText = {
      id: "t-yandu",
      title: "研读本卡",
      type: "commentary" as const,
      verses: ["Gen.1.1" as const],
      source: "研读本圣经·创世记",
      body: "text",
    };
    const imageCard = {
      id: "t-image",
      title: "插图卡",
      type: "image" as const,
      verses: ["Gen.1.1" as const],
      source: "BibleEveryone 聖經圖庫",
      body: "image",
      assetPath: "/images/sample.png",
    };
    const noteCard = {
      id: "t-note",
      title: "用户笔记",
      type: "note" as const,
      verses: ["Gen.1.1" as const],
      source: "用户笔记",
      body: "note",
    };

    const ocrCaption = {
      id: "t-ocr",
      title: "图注卡",
      type: "commentary" as const,
      verses: ["Exod.3.15" as const],
      source: "visible-image-text-ocr-conversion",
      body: "text",
    };

    expect(commentaryLibraryIdForResource(zongheText)).toBe("zonghe");
    expect(commentaryLibraryIdForResource(yanduText)).toBe("yandu");
    expect(commentaryLibraryIdForResource(imageCard)).toBeNull();
    expect(commentaryLibraryIdForResource(noteCard)).toBeNull();
    expect(commentaryLibraryIdFromLabel("image-text-ocr-conversion")).toBeNull();
    expect(commentaryLibraryIdFromLabel("visible-image-text-ocr-conversion")).toBeNull();
    expect(commentaryLibraryIdFromLabel("综合解读·图注")).toBeNull();
    expect(commentaryLibraryIdFromLabel("圣经综合解读·创世记")).toBe("zonghe");
    expect(commentaryLibraryIdForResource(ocrCaption)).toBeNull();
    expect(resourceMatchesSelectedCommentaryLibrary(ocrCaption, "zonghe")).toBe(true);

    expect(resourceMatchesSelectedCommentaryLibrary(zongheText, "zonghe")).toBe(true);
    expect(resourceMatchesSelectedCommentaryLibrary(yanduText, "zonghe")).toBe(false);
    expect(resourceMatchesSelectedCommentaryLibrary(imageCard, "zonghe")).toBe(true);
    expect(resourceMatchesSelectedCommentaryLibrary(noteCard, "zonghe")).toBe(true);
    expect(resourceMatchesSelectedCommentaryLibrary(yanduText, "yandu")).toBe(true);
  });

  it("filters right-dock text cards by the single selected commentary library", async () => {
    const resources = [
      {
        id: "lib-zonghe-gen-1-1",
        title: "创世记 1:1 综合解读",
        type: "commentary" as const,
        verses: ["Gen.1.1" as const],
        source: "圣经综合解读·创世记",
        body: "综合解读正文。",
      },
      {
        id: "lib-yandu-gen-1-1",
        title: "创世记 1:1 研读本注释",
        type: "commentary" as const,
        verses: ["Gen.1.1" as const],
        source: "研读本圣经·创世记",
        body: "研读本正文。",
      },
      {
        id: "lib-yanxiu-gen-1-1",
        title: "创世记 1:1 研修本注释",
        type: "commentary" as const,
        verses: ["Gen.1.1" as const],
        source: "圣经研修本 01_创世记-v3",
        body: "研修本正文。",
      },
      {
        id: "lib-image-gen-1-1",
        title: "创世记 1:1 插图",
        type: "image" as const,
        verses: ["Gen.1.1" as const],
        source: "BibleEveryone 聖經圖庫",
        body: "图片说明",
        assetPath: "/images/sample.png",
      },
    ];

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={resources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const library = getLeftResourceLibrary();

    // Default selected library is 综合解读: only that text source + all images.
    expect(within(rightDock).getByRole("article", { name: "创世记 1:1 综合解读" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "创世记 1:1 研读本注释" })).not.toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "创世记 1:1 研修本注释" })).not.toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "创世记 1:1 插图" })).toBeInTheDocument();
    expect(within(library).getByRole("button", { name: /综合解读/ })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(within(library).getByRole("button", { name: /研读本圣经/ }));

    expect(within(rightDock).queryByRole("article", { name: "创世记 1:1 综合解读" })).not.toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "创世记 1:1 研读本注释" })).toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "创世记 1:1 研修本注释" })).not.toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "创世记 1:1 插图" })).toBeInTheDocument();
    expect(within(library).getByRole("button", { name: /研读本圣经/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(library).getByRole("button", { name: /综合解读/ })).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(within(library).getByRole("button", { name: /圣经研修本/ }));

    expect(within(rightDock).queryByRole("article", { name: "创世记 1:1 综合解读" })).not.toBeInTheDocument();
    expect(within(rightDock).queryByRole("article", { name: "创世记 1:1 研读本注释" })).not.toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "创世记 1:1 研修本注释" })).toBeInTheDocument();
    expect(within(rightDock).getByRole("article", { name: "创世记 1:1 插图" })).toBeInTheDocument();
  });

  it("shows the left organized-card workspace without resource category grouping", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["kjv", "cuv", "card"],
          activeCenterModules: ["cuv", "card"],
          centerCardResourceIds: ["genesis-cmc-01-p014-img002-669x195"],
          activeResourceId: "genesis-cmc-01-p014-img002-669x195",
        }}
      />,
    );

    const cardModule = getLeftOrganizedCardStack();
    expect(within(cardModule).queryByRole("searchbox", { name: "搜索中间卡片" })).not.toBeInTheDocument();
    expect(within(cardModule).queryByRole("region", { name: "注释" })).not.toBeInTheDocument();
    expect(within(cardModule).queryByRole("region", { name: "媒体" })).not.toBeInTheDocument();
    expect(within(cardModule).queryByRole("article", { name: "起初，神创造天地" })).not.toBeInTheDocument();
    expect(within(cardModule).queryByRole("separator", { name: "调整中间卡片浏览和详情高度" })).not.toBeInTheDocument();

    const imageCard = getResourceArticleByTitle(cardModule, genesisMathImageTitle);
    expect(imageCard).toBeInTheDocument();
    expect(within(imageCard).getByRole("img", { name: genesisMathImageTitle })).toBeInTheDocument();
    const verseNavigationButton = within(imageCard).getByRole("button", { name: `跳转到 Gen.1.1：${genesisMathImageTitle}` });
    expect(verseNavigationButton).toHaveAttribute("title", "跳转到 Gen.1.1");
    expect(verseNavigationButton).not.toHaveTextContent("Gen.1.1");
    expect(imageCard.querySelector(".resource-card__leading-action")).toContainElement(verseNavigationButton);
    const copyButton = within(imageCard).getByRole("button", { name: `打开${genesisMathImageTitle}复制菜单` });
    expect(imageCard.querySelector(".resource-card__body-actions")).toContainElement(copyButton);
    expect(imageCard.querySelector(".resource-card__actions")).not.toContainElement(copyButton);
    expect(within(imageCard).queryByRole("button", { name: `跳转到${genesisMathImageTitle}关联经文` })).not.toBeInTheDocument();
    expect(within(cardModule).getByRole("button", { name: `从左侧移除 ${genesisMathImageTitle}` })).toBeInTheDocument();

    await userEvent.click(verseNavigationButton);
    await waitFor(() => expect(screen.getByTestId("cuv-Gen.1.1")).toHaveAttribute("aria-current", "true"));

    const collapseButton = within(imageCard).getByRole("button", { name: `折叠 ${genesisMathImageTitle}` });
    expect(imageCard.querySelector(".resource-card__header")).toContainElement(collapseButton);
    expect(imageCard.querySelector(".resource-card__leading-action")).toContainElement(collapseButton);
    expect(imageCard.querySelector(".resource-card__actions")).not.toContainElement(collapseButton);
    expect(styles).toMatch(/\.resource-card__verse-nav\s*{[^}]*width:\s*24px/s);
    expect(styles).toMatch(/\.resource-card--center\s+\.resource-card__header\s*{[^}]*padding:\s*8px 10px/s);
    expect(styles).toMatch(/\.resource-card--center\s+\.resource-card__body\s*{[^}]*position:\s*relative/s);
    expect(styles).toMatch(/\.resource-card__body-actions\s*{[^}]*bottom:\s*10px/s);

    await userEvent.click(collapseButton);
    expect(within(imageCard).queryByRole("img", { name: genesisMathImageTitle })).not.toBeInTheDocument();
    expect(within(imageCard).queryByRole("button", { name: `打开${genesisMathImageTitle}复制菜单` })).not.toBeInTheDocument();
    expect(imageCard.querySelector(".resource-card__body-actions")).not.toBeInTheDocument();
    await userEvent.click(within(imageCard).getByRole("button", { name: `展开 ${genesisMathImageTitle}` }));
    expect(within(imageCard).getByRole("button", { name: `折叠 ${genesisMathImageTitle}` })).toHaveAttribute("aria-expanded", "true");
    expect(within(imageCard).getByRole("img", { name: genesisMathImageTitle })).toBeInTheDocument();
  });

  it("navigates book-intro center cards from a left intro chip", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={bookIntroResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["cuv", "card"],
          activeCenterModules: ["cuv", "card"],
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "选择章节 第 1 章" }));
    await userEvent.click(within(await screen.findByRole("dialog", { name: "章节选择" })).getByRole("button", { name: "创世记 序" }));
    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    await userEvent.dblClick(within(rightDock).getByRole("article", { name: "创世记导论视频" }));
    await waitForDndClickSuppressionCleanup();
    const introCanvas = screen.getByRole("region", { name: "创世记书卷序" });
    const cardModule = getLeftOrganizedCardStack();
    const introCard = within(cardModule).getByRole("article", { name: "创世记导论视频" });
    const introNavigationButton = within(introCard).getByRole("button", { name: "跳转到 创世记序：创世记导论视频" });
    expect(introNavigationButton).toHaveAttribute("title", "跳转到 创世记序");
    expect(introNavigationButton).not.toHaveTextContent("创世记序");

    await userEvent.click(introNavigationButton);

    expect(screen.getByRole("heading", { name: "创世记 Genesis 序" })).toBeInTheDocument();
    expect(introCanvas).toBeInTheDocument();
    expect(within(introCanvas).getByRole("region", { name: "书卷背景" })).toBeInTheDocument();
  });

  it("opens a dismissible enlarged preview when a left organized image is clicked", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["kjv", "cuv", "card"],
          activeCenterModules: ["cuv", "card"],
          centerCardResourceIds: [genesisPaperBlendImageId],
          activeResourceId: genesisPaperBlendImageId,
        }}
      />,
    );

    const cardModule = getLeftOrganizedCardStack();
    const imageCard = getResourceArticleByTitle(cardModule, genesisPaperBlendImageTitle);
    const image = within(imageCard).getByRole("img", { name: genesisPaperBlendImageTitle });

    expect(image).toHaveAttribute("data-paper-blend", "true");

    await userEvent.click(image);

    const dialog = screen.getByRole("dialog", { name: `图片预览：${genesisPaperBlendImageTitle}` });
    const lightboxImage = within(dialog).getByRole("img", { name: genesisPaperBlendImageTitle });
    expect(lightboxImage).toHaveAttribute("src", image.getAttribute("src"));
    expect(lightboxImage).toHaveAttribute("data-paper-blend", "true");

    await userEvent.click(within(dialog).getByRole("button", { name: "关闭图片预览" }));
    expect(screen.queryByRole("dialog", { name: `图片预览：${genesisPaperBlendImageTitle}` })).not.toBeInTheDocument();
  });

  it("opens the same enlarged preview when a center current-verse image is clicked", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "卡片" }));
    const cardModule = getCenterCurrentCardModule();
    const imageCard = getResourceArticleByTitle(cardModule, genesisMathImageTitle);
    const image = within(imageCard).getByRole("img", { name: genesisMathImageTitle });

    await userEvent.click(image);

    const dialog = screen.getByRole("dialog", { name: `图片预览：${genesisMathImageTitle}` });
    expect(within(dialog).getByRole("img", { name: genesisMathImageTitle })).toHaveAttribute("src", image.getAttribute("src"));
    expect(imageCard.querySelector(".resource-card__body-actions")).toContainElement(
      within(imageCard).getByRole("button", { name: `打开${genesisMathImageTitle}复制菜单` }),
    );
  });

  it("opens the same enlarged preview when a right reading-area image is clicked", async () => {
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const imageCard = getResourceArticleByTitle(rightDock, genesisMathImageTitle);
    const image = within(imageCard).getByRole("img", { name: genesisMathImageTitle });

    await userEvent.click(image);

    const dialog = screen.getByRole("dialog", { name: `图片预览：${genesisMathImageTitle}` });
    expect(within(dialog).getByRole("img", { name: genesisMathImageTitle })).toHaveAttribute("src", image.getAttribute("src"));
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[workbench] image preview opened",
      expect.objectContaining({
        resourceId: genesisMathImageId,
        title: genesisMathImageTitle,
      }),
    );
  });

  it("restores saved Codex v2 image cards by stable id while rendering cropped image dimensions", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["kjv", "cuv", "card"],
          activeCenterModules: ["card"],
          centerCardResourceIdsByBook: {
            "book-intro:Gen": [genesisNearEastMapId],
          },
          activeResourceId: genesisNearEastMapId,
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "选择章节 第 1 章" }));
    await userEvent.click(screen.getByRole("button", { name: "创世记 序" }));

    const cardModule = getLeftOrganizedCardStack();
    const imageCard = getResourceArticleByTitle(cardModule, genesisNearEastMapTitle);
    const image = within(imageCard).getByRole("img", { name: genesisNearEastMapTitle });

    expect(image).toHaveAttribute(
      "src",
      "/src/assets/resources/genesis/images/ohb-genesis-codex-v2-crops/p008_img007_880x900.png",
    );
    expect(image).toHaveAttribute("width", "880");
    expect(image).toHaveAttribute("height", "900");
    expect(within(cardModule).getByRole("button", { name: `从左侧移除 ${genesisNearEastMapTitle}` })).toBeInTheDocument();
  });

  it("uses a larger image preview rule for center card images", () => {
    expect(styles).toMatch(/\.resource-card--center\s+\.image-resource-preview\s+img\s*{[^}]*max-height:\s*min\(520px,\s*62vh\)/s);
  });

  it("renders image resources with their real asset path and alt text", () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={[
          {
            id: "test-genesis-image",
            title: "Genesis garden image",
            type: "image",
            verses: ["Gen.1.1"],
            body: "Source package preview.",
            source: "CMC-01_副本",
            assetPath: "/src/assets/resources/genesis/images/cmc-01/p001_img001_640x480.png",
          },
        ]}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const imageCard = within(rightDock).getByRole("article", { name: "Genesis garden image" });
    const image = within(imageCard).getByRole("img", { name: "Genesis garden image" });

    expect(image).toHaveAttribute("src", "/src/assets/resources/genesis/images/cmc-01/p001_img001_640x480.png");
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("width", "640");
    expect(image).toHaveAttribute("height", "480");
    expect(imageCard.querySelector(".resource-card__source-pill")).toHaveTextContent("媒体");
    expect(within(imageCard).getByText("Source package preview.")).toBeInTheDocument();
    expect(within(imageCard).queryByText("图片 / 地图 / 图表")).not.toBeInTheDocument();
  });

  it("renders image figcaptions with reader copy instead of labeled metadata rows", () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={[
          {
            id: "test-khopesh-image",
            title: "牛腿刀（Khopesh）",
            type: "image",
            verses: ["Gen.1.1"],
            body: [
              "摘要：耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米。",
              "关联经文：Gen.22.10",
              "依据：上图：耶路撒冷附近出土的牛腿刀。",
            ].join("\n"),
            summary: "耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米。",
            source: "CMC-01_副本",
            assetPath: "/src/assets/resources/genesis/images/cmc-01/p220_img124_720x405.png",
          },
        ]}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const imageCard = within(rightDock).getByRole("article", { name: "牛腿刀（Khopesh）" });
    const figureCaption = imageCard.querySelector("figcaption");

    expect(figureCaption).toHaveTextContent("耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米。");
    expect(figureCaption).not.toHaveTextContent(/摘要：|关联经文：|依据：|CMC-01_副本/);
    expect(within(imageCard).queryByText("CMC-01_副本")).not.toBeInTheDocument();
    expect(within(imageCard).queryByText(/摘要：/)).not.toBeInTheDocument();
    expect(within(imageCard).queryByText(/关联经文：/)).not.toBeInTheDocument();
    expect(within(imageCard).queryByText(/依据：/)).not.toBeInTheDocument();
  });

  it("persists edited image card body into the visible figcaption", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={[
          {
            id: "test-khopesh-image",
            title: "牛腿刀（Khopesh）",
            type: "image",
            verses: ["Gen.1.1"],
            body: "摘要：原始正文。",
            summary: "原始摘要。",
            assetPath: "/src/assets/resources/genesis/images/cmc-01/p220_img124_720x405.png",
          },
        ]}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const imageCard = within(rightDock).getByRole("article", { name: "牛腿刀（Khopesh）" });
    await userEvent.click(within(imageCard).getByRole("button", { name: "编辑牛腿刀（Khopesh）的标题和正文" }));

    const editor = within(imageCard).getByRole("form", { name: "编辑牛腿刀（Khopesh）" });
    const bodyInput = within(editor).getByRole("textbox", { name: "正文" });
    await userEvent.clear(bodyInput);
    await userEvent.type(bodyInput, "编辑后的图片说明。");
    await userEvent.click(within(editor).getByRole("button", { name: "保存卡片文字" }));

    expect(within(imageCard).getByText("编辑后的图片说明。")).toBeInTheDocument();
    expect(within(imageCard).queryByText("原始摘要。")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("one-holy-bible-resource-edits") ?? "{}")).toEqual({
      "test-khopesh-image": {
        body: "编辑后的图片说明。",
        summary: "编辑后的图片说明。",
      },
    });
  });

  it("keeps image card caption unchanged when only the title is edited", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={[
          {
            id: "test-khopesh-image",
            title: "牛腿刀（Khopesh）",
            type: "image",
            verses: ["Gen.1.1"],
            body: [
              "摘要：耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米。",
              "关联经文：Gen.22.10",
              "依据：上图：耶路撒冷附近出土的牛腿刀。",
            ].join("\n"),
            summary: "耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米。",
            assetPath: "/src/assets/resources/genesis/images/cmc-01/p220_img124_720x405.png",
          },
        ]}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const imageCard = within(rightDock).getByRole("article", { name: "牛腿刀（Khopesh）" });
    await userEvent.click(within(imageCard).getByRole("button", { name: "编辑牛腿刀（Khopesh）的标题和正文" }));

    const editor = within(imageCard).getByRole("form", { name: "编辑牛腿刀（Khopesh）" });
    const titleInput = within(editor).getByRole("textbox", { name: "标题" });
    const bodyInput = within(editor).getByRole("textbox", { name: "正文" });
    expect(bodyInput).toHaveValue("耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米。");

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "牛腿刀标题修订");
    await userEvent.click(within(editor).getByRole("button", { name: "保存卡片文字" }));

    const editedCard = within(rightDock).getByRole("article", { name: "牛腿刀标题修订" });
    expect(editedCard.querySelector("figcaption")).toHaveTextContent(
      "耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米。",
    );
    expect(JSON.parse(localStorage.getItem("one-holy-bible-resource-edits") ?? "{}")).toEqual({
      "test-khopesh-image": {
        title: "牛腿刀标题修订",
      },
    });
  });

  it("keeps edited card text visible even when localStorage persistence fails", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "QuotaExceededError");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const creationCard = within(rightDock).getByRole("article", { name: "起初，神创造天地" });
    await userEvent.click(within(creationCard).getByRole("button", { name: "编辑起初，神创造天地的标题和正文" }));

    const editor = within(creationCard).getByRole("form", { name: "编辑起初，神创造天地" });
    const titleInput = within(editor).getByRole("textbox", { name: "标题" });
    const bodyInput = within(editor).getByRole("textbox", { name: "正文" });
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "临时可见标题");
    await userEvent.clear(bodyInput);
    await userEvent.type(bodyInput, "即使本地存储失败，也要先显示出来。");
    await userEvent.click(within(editor).getByRole("button", { name: "保存卡片文字" }));

    expect(within(rightDock).getByRole("article", { name: "临时可见标题" })).toHaveTextContent(
      "即使本地存储失败，也要先显示出来。",
    );
    expect(screen.getAllByRole("status").some((element) => (
      element.textContent === "已更新卡片文字：临时可见标题（本地持久化失败）"
    ))).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      "[workbench] resource edits persistence failed",
      expect.any(DOMException),
    );
    expect(setItemSpy).toHaveBeenCalled();
  });

  it("keeps layout changes visible when layout persistence fails", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "QuotaExceededError");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "KJV" }));

    expect(screen.getByRole("region", { name: "KJV阅读" })).toBeInTheDocument();
    expect(screen.getAllByRole("status").some((element) => (
      element.textContent === "已显示KJV模块（本地持久化失败）"
    ))).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      "[workbench] layout persistence failed",
      expect.any(DOMException),
    );
    expect(setItemSpy).toHaveBeenCalled();
  });

  it("restores saved card text edits after remounting", async () => {
    const { unmount } = render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const creationCard = within(rightDock).getByRole("article", { name: "起初，神创造天地" });
    await userEvent.click(within(creationCard).getByRole("button", { name: "编辑起初，神创造天地的标题和正文" }));

    const editor = within(creationCard).getByRole("form", { name: "编辑起初，神创造天地" });
    const titleInput = within(editor).getByRole("textbox", { name: "标题" });
    const bodyInput = within(editor).getByRole("textbox", { name: "正文" });
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "刷新后保留标题");
    await userEvent.clear(bodyInput);
    await userEvent.type(bodyInput, "刷新后保留正文。");
    await userEvent.click(within(editor).getByRole("button", { name: "保存卡片文字" }));

    unmount();
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const restoredRightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    expect(within(restoredRightDock).getByRole("article", { name: "刷新后保留标题" })).toHaveTextContent(
      "刷新后保留正文。",
    );
  });

  it("uses the same clean reader copy in the enlarged image preview", async () => {
    const resources = [
      {
        id: "test-khopesh-image",
        title: "牛腿刀（Khopesh）",
        type: "image",
        verses: ["Gen.1.1"],
        body: [
          "摘要：耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米。",
          "关联经文：Gen.22.10",
          "依据：上图：耶路撒冷附近出土的牛腿刀。",
        ].join("\n"),
        summary: "耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米。",
        assetPath: "/src/assets/resources/genesis/images/cmc-01/p220_img124_720x405.png",
      },
    ] as const;

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={resources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["card", "cuv", "kjv"],
          activeCenterModules: ["card"],
          centerCardResourceIdsByBook: {
            "Gen.1": ["test-khopesh-image"],
          },
          activeResourceId: "test-khopesh-image",
        }}
      />,
    );

    const cardModule = getLeftOrganizedCardStack();
    const imageCard = within(cardModule).getByRole("article", { name: "牛腿刀（Khopesh）" });
    await userEvent.click(within(imageCard).getByRole("img", { name: "牛腿刀（Khopesh）" }));

    const dialog = screen.getByRole("dialog", { name: "图片预览：牛腿刀（Khopesh）" });
    const caption = dialog.querySelector("figcaption");

    expect(caption).toHaveTextContent("耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米。");
    expect(caption).not.toHaveTextContent(/摘要：|关联经文：|依据：/);
  });

  it("persists the dragged center module boundary without inserting a blank divider column", async () => {
    const onSaveLayout = vi.fn();
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["kjv", "cuv", "card"],
          activeCenterModules: ["cuv", "card"],
        }}
        onSaveLayout={onSaveLayout}
      />,
    );

    const center = screen.getByRole("region", { name: "中间工作区" });
    expect(center).toHaveStyle({ gridTemplateColumns: "50% minmax(0, 1fr)" });
    const centerSeparator = screen.getByRole("separator", { name: "调整中间模块占比" });
    expect(centerSeparator).toHaveClass("center-workspace-resize-handle--overlay");
    expect(centerSeparator).toHaveAttribute("aria-valuenow", "50");
    dragSeparator(centerSeparator, 620, 720, 360);
    expect(centerSeparator).toHaveAttribute("aria-valuenow", "60");
    expect(center).toHaveStyle({ gridTemplateColumns: "60% minmax(0, 1fr)" });
    expect(screen.queryByRole("separator", { name: "调整中间卡片浏览和详情高度" })).not.toBeInTheDocument();

    expect(JSON.parse(localStorage.getItem(layoutStorageKey) ?? "{}")).toEqual(
      expect.objectContaining({
        readerSplitPercent: 60,
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "保存布局" }));
    expect(onSaveLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        readerSplitPercent: 60,
      }),
    );
  });

  it("collapses each center current-verse card independently while keeping header actions compact", async () => {
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "卡片" }));
    const cardModule = getCenterCurrentCardModule();
    const currentVerseCard = within(cardModule).getByRole("article", { name: "起初，神创造天地" });
    const header = currentVerseCard.querySelector(".resource-card__header");
    const dragHandle = currentVerseCard.querySelector(".drag-handle");
    const leadingAction = currentVerseCard.querySelector(".resource-card__leading-action");
    expect(within(currentVerseCard).getByText(/“起初”声明时间、宇宙和历史都在神的创造中开始/)).toBeInTheDocument();
    const copyButton = within(currentVerseCard).getByRole("button", { name: "打开起初，神创造天地复制菜单" });
    expect(currentVerseCard.querySelector(".resource-card__body-actions")).toContainElement(copyButton);
    expect(currentVerseCard.querySelector(".resource-card__actions")).not.toContainElement(copyButton);

    const verseNavigationButton = within(currentVerseCard).getByRole("button", { name: "跳转到 Gen.1.1：起初，神创造天地" });
    const collapseButton = within(cardModule).getByRole("button", { name: "折叠 起初，神创造天地" });
    expect(dragHandle).toBeInTheDocument();
    expect(header).toContainElement(leadingAction);
    const headerStart = currentVerseCard.querySelector(".resource-card__header-start");
    expect(headerStart).toBeInTheDocument();
    expect(headerStart).toContainElement(dragHandle);
    expect(headerStart).toContainElement(leadingAction);
    expect(Array.from(header?.children ?? []).map((element) => element.className)).toEqual([
      "resource-card__header-start",
      "resource-card__title resource-card__selectable-title",
      "resource-card__actions",
    ]);
    expect(leadingAction).toContainElement(verseNavigationButton);
    expect(leadingAction).toContainElement(collapseButton);
    expect(Array.from(leadingAction?.children ?? [])).toEqual([verseNavigationButton, collapseButton]);
    expect(currentVerseCard.querySelector(".resource-card__actions")).not.toContainElement(collapseButton);
    expect(collapseButton).toHaveAttribute("aria-expanded", "true");
    expect(collapseButton).not.toHaveTextContent("折叠");
    expect(styles).toMatch(/\.resource-card--current-verse\s+\.drag-handle\s*{[^}]*width:\s*24px/s);
    expect(styles).toMatch(/\.resource-card--current-verse\s+\.resource-card__leading-action\s*{[^}]*position:\s*static/s);
    expect(styles).toMatch(/\.resource-card--current-verse\s+\.saved-card-collapse\s*{[^}]*position:\s*static/s);
    expect(styles).toMatch(/\.resource-card--current-verse\s+\.resource-card__header\s*{[^}]*padding:\s*8px 10px/s);
    await userEvent.click(collapseButton);

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[workbench] current verse resource card collapsed state changed",
      expect.objectContaining({
        collapsed: true,
        resourceId: "gen-1-1-creation-note",
        selectedSourceId: "Gen.1.1",
        title: "起初，神创造天地",
      }),
    );
    expect(within(cardModule).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();
    expect(within(cardModule).getByRole("article", { name: "起初，神创造天地" })).toHaveTextContent("用户笔记");
    expect(within(cardModule).queryByRole("button", { name: "从左侧移除 起初，神创造天地" })).not.toBeInTheDocument();
    expect(within(cardModule).queryByText(/“起初”声明时间、宇宙和历史都在神的创造中开始/)).not.toBeInTheDocument();

    const expandButton = within(cardModule).getByRole("button", { name: "展开 起初，神创造天地" });
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
    expect(within(cardModule).queryByRole("button", { name: "打开起初，神创造天地复制菜单" })).not.toBeInTheDocument();

    await userEvent.dblClick(within(cardModule).getByRole("article", { name: "起初，神创造天地" }));
    expect(getLeftOrganizedCardStack()).toHaveTextContent("起初，神创造天地");

    expect(within(cardModule).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();
  });

  it("shows a delete action on every center current-verse card and locally removes ordinary cards", async () => {
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "卡片" }));
    const cardModule = getCenterCurrentCardModule();
    const currentVerseCards = within(cardModule).getAllByRole("article");
    expect(currentVerseCards.length).toBeGreaterThan(1);
    currentVerseCards.forEach((card) => {
      expect(within(card).getByRole("button", { name: /^删除/ })).toBeInTheDocument();
    });

    const ordinaryCard = within(cardModule).getByRole("article", { name: "起初，神创造天地" });
    await userEvent.click(within(ordinaryCard).getByRole("button", { name: "删除：起初，神创造天地" }));

    expect(within(cardModule).queryByRole("article", { name: "起初，神创造天地" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("status").some((element) => (
      element.textContent === "已删除当前经文卡片：起初，神创造天地"
    ))).toBe(true);
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[workbench] current resource card locally deleted",
      expect.objectContaining({
        resourceId: "gen-1-1-creation-note",
        selectedSourceId: "Gen.1.1",
        title: "起初，神创造天地",
      }),
    );
  });

  it("removes a deleted workbench-sourced center card after the parent refreshes synced resources", async () => {
    const onUnsyncResource = vi.fn();
    const workbenchSyncedResource = {
      id: "workbench-synced-only",
      title: "工作台已同步卡片",
      type: "commentary",
      verses: ["Gen.1.1"],
      primaryAnchor: "Gen.1.1",
      body: "来自 Edit 工作台的同步卡片。",
      debugMeta: {
        sourceWorkbenchCardId: "cmc-gen-1-1",
        syncStatus: "syncable",
      },
    } as const;
    const localResource = {
      id: "ordinary-local-note",
      title: "普通本地卡片",
      type: "note",
      verses: ["Gen.1.1"],
      body: "不来自 Edit 工作台。",
    } as const;

    function SyncedResourceHarness() {
      const [resources, setResources] = useState([workbenchSyncedResource, localResource]);

      return (
        <Workbench
          versions={[navigationCuv, navigationKjv]}
          resources={resources}
          initialLayout={{
            ...dualCenterLayout,
            centerModules: ["kjv", "cuv", "card"],
            activeCenterModules: ["cuv", "card"],
          }}
          onUnsyncResource={async (resourceId) => {
            onUnsyncResource(resourceId);
            setResources((currentResources) => (
              currentResources.filter((resource) => resource.id !== resourceId)
            ));
          }}
        />
      );
    }

    render(<SyncedResourceHarness />);

    const cardModule = getCenterCurrentCardModule();
    expect(within(cardModule).getByLabelText("当前经文卡片选择")).toHaveTextContent("当前经文2");
    expect(within(cardModule).getByRole("article", { name: "工作台已同步卡片" })).toBeInTheDocument();

    await userEvent.click(within(cardModule).getByRole("button", { name: "删除并退回待复核：工作台已同步卡片" }));

    expect(onUnsyncResource).toHaveBeenCalledWith("workbench-synced-only");
    await waitFor(() => {
      expect(within(cardModule).queryByRole("article", { name: "工作台已同步卡片" })).not.toBeInTheDocument();
    });
    expect(within(cardModule).getByLabelText("当前经文卡片选择")).toHaveTextContent("当前经文1");
    expect(within(cardModule).getByRole("article", { name: "普通本地卡片" })).toBeInTheDocument();
    expect(screen.getAllByRole("status").some((element) => (
      element.textContent === "已删除并退回待复核：工作台已同步卡片"
    ))).toBe(true);
  });

  it("navigates from right-side chapter resource cards to their linked verse", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const rightVerseCard = within(rightDock).getByRole("article", { name: "空虚混沌" });
    const verseNavigationButton = within(rightVerseCard).getByRole("button", { name: "跳转到 Gen.1.2：空虚混沌" });

    await userEvent.click(verseNavigationButton);

    await waitFor(() => expect(screen.getByTestId("cuv-Gen.1.2")).toHaveAttribute("aria-current", "true"));
  });

  it("navigates resource cards to their explicit primary anchor instead of the first coverage verse", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[
          {
            id: "anchored-range-note",
            title: "锚点范围卡",
            type: "note",
            verses: ["Gen.1.1", "Gen.1.2"],
            primaryAnchor: "Gen.1.2",
            body: "显示在 Gen.1.1，但点击时跳到更准确的主锚点。",
          },
        ]}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const rangeCard = within(rightDock).getByRole("article", { name: "锚点范围卡" });
    const navigationButton = within(rangeCard).getByRole("button", { name: "跳转到 Gen.1.2：锚点范围卡" });

    await userEvent.click(navigationButton);

    await waitFor(() => expect(screen.getByTestId("cuv-Gen.1.2")).toHaveAttribute("aria-current", "true"));
  });

  it("uses the current BibleEveryone source path when a multi-context image appears in another chapter", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={[
          {
            id: "bibleeveryone-multi-context-map",
            title: "多上下文地图",
            type: "image",
            verses: ["Gen.1.1", "Exod.1.1"],
            primaryAnchor: "Gen.1.1",
            body: "同一张地图同时属于创世记和出埃及记上下文。",
            assetPath: "/resources/bibleeveryone/multi-context-map.jpg",
            debugMeta: {
              navigationPrimaryAnchors: ["Gen.1.1", "Exod.1.1"],
            },
          },
        ]}
        initialLayout={dualCenterLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "选择书卷 创世记" }));
    await userEvent.click(within(await screen.findByRole("dialog", { name: "书卷选择" })).getByRole("button", { name: "出埃及记" }));

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const multiContextCard = within(rightDock).getByRole("article", { name: "多上下文地图" });
    const navigationButton = within(multiContextCard).getByRole("button", { name: "跳转到 Exod.1.1：多上下文地图" });

    expect(navigationButton).toHaveAttribute("title", "跳转到 Exod.1.1");
    await userEvent.click(navigationButton);

    await waitFor(() => expect(screen.getByTestId("cuv-Exod.1.1")).toHaveAttribute("aria-current", "true"));
  });

  it("keeps right-side resource navigation in normal header flow before the title", () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const rightVerseCard = within(rightDock).getByRole("article", { name: "空虚混沌" });
    const header = rightVerseCard.querySelector(".resource-card__header");
    const headerStart = rightVerseCard.querySelector(".resource-card__header-start");
    const dragHandle = rightVerseCard.querySelector(".drag-handle");
    const leadingAction = rightVerseCard.querySelector(".resource-card__leading-action");
    const title = rightVerseCard.querySelector(".resource-card__title");
    const verseNavigationButton = within(rightVerseCard).getByRole("button", { name: "跳转到 Gen.1.2：空虚混沌" });
    const copyButton = within(rightVerseCard).getByRole("button", { name: "打开空虚混沌复制菜单" });

    expect(Array.from(header?.children ?? []).slice(0, 2)).toEqual([headerStart, title]);
    expect(Array.from(headerStart?.children ?? [])).toEqual([dragHandle, leadingAction]);
    expect(leadingAction).toContainElement(verseNavigationButton);
    expect(rightVerseCard.querySelector(".resource-card__actions")).toContainElement(copyButton);
    expect(rightVerseCard.querySelector(".resource-card__body-actions")).not.toBeInTheDocument();
    expect(styles).toMatch(/\.resource-card:not\(\.resource-card--center\):not\(\.resource-card--current-verse\)\s+\.resource-card__leading-action\s*{[^}]*position:\s*static/s);
    expect(styles).toMatch(/\.resource-card:not\(\.resource-card--center\):not\(\.resource-card--current-verse\)\s+\.resource-card__header\s*{[^}]*padding:\s*8px 10px/s);
  });

  it("exits center current-verse card editing when expanded or collapsed", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "卡片" }));
    const cardModule = getCenterCurrentCardModule();
    const currentVerseCard = within(cardModule).getByRole("article", { name: "起初，神创造天地" });

    await userEvent.click(within(currentVerseCard).getByRole("button", { name: "编辑起初，神创造天地的标题和正文" }));
    expect(within(currentVerseCard).getByRole("form", { name: "编辑起初，神创造天地" })).toBeInTheDocument();
    const editCopyButton = within(currentVerseCard).queryByRole("button", { name: "打开起初，神创造天地复制菜单" });
    expect(currentVerseCard.querySelector(".resource-card__actions")).not.toContainElement(editCopyButton);

    await userEvent.click(within(currentVerseCard).getByRole("button", { name: "折叠 起初，神创造天地" }));
    expect(within(currentVerseCard).queryByRole("form", { name: "编辑起初，神创造天地" })).not.toBeInTheDocument();

    await userEvent.click(within(currentVerseCard).getByRole("button", { name: "展开 起初，神创造天地" }));
    expect(within(currentVerseCard).queryByRole("form", { name: "编辑起初，神创造天地" })).not.toBeInTheDocument();
    const copyButton = within(currentVerseCard).getByRole("button", { name: "打开起初，神创造天地复制菜单" });
    expect(currentVerseCard.querySelector(".resource-card__body-actions")).toContainElement(copyButton);
    expect(currentVerseCard.querySelector(".resource-card__actions")).not.toContainElement(copyButton);
  });

  it("uses a single sticky category bar to jump across right-side resource sections", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const jumpBar = within(rightDock).getByLabelText("资料类别快捷跳转");
    const mediaSection = within(rightDock).getByRole("region", { name: "媒体" });
    const mediaJump = within(jumpBar).getByRole("button", { name: /跳转到媒体/ });

    expect(within(jumpBar).getByRole("button", { name: /跳转到注释/ })).toBeInTheDocument();
    expect(mediaJump).toBeInTheDocument();
    expect(mediaSection.querySelector(":scope > .resource-module__header")).not.toBeInTheDocument();
    expect(getResourceArticleByTitle(mediaSection, genesisMathImageTitle)).toBeInTheDocument();

    const scrollIntoView = vi.fn();
    Object.defineProperty(mediaSection, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    await userEvent.click(mediaJump);
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
  });

  it("keeps every right-side resource category reachable from the sticky jump bar", () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const jumpBar = within(rightDock).getByLabelText("资料类别快捷跳转");
    for (const categoryName of ["注释", "媒体", "百科", "笔记"]) {
      expect(within(rightDock).getByRole("region", { name: categoryName })).toBeInTheDocument();
      expect(within(jumpBar).getByRole("button", { name: new RegExp(`跳转到${categoryName}`) })).toBeInTheDocument();
      expect(within(rightDock).getByRole("region", { name: categoryName }).querySelector(":scope > .resource-module__header")).not.toBeInTheDocument();
    }
  });

  it("groups visible right-side resources without exposing raw types", () => {
    const resourcesWithBacklink = [
      {
        id: "gen-1-1-note",
        title: "读经笔记",
        type: "note",
        verses: ["Gen.1.1"],
        body: "个人观察。",
        source: "用户笔记",
      },
      {
        id: "gen-1-1-note-without-source",
        title: "无来源笔记",
        type: "note",
        verses: ["Gen.1.1"],
        body: "没有来源字段时也要保持书名号格式。",
      },
      {
        id: "gen-1-1-commentary",
        title: "创世记 1:1 综合解读",
        type: "commentary",
        verses: ["Gen.1.1"],
        body: "注释内容。",
        source: "圣经综合解读·创世记",
      },
      {
        id: "gen-1-1-study-bible",
        title: "创世记 1:1 研修本注释：起初",
        type: "commentary",
        verses: ["Gen.1.1"],
        body: "研修本内容。",
        source: "圣经研修本 01_创世记-v3",
      },
      {
        id: "gen-1-1-image",
        title: "创造图像",
        type: "image",
        verses: ["Gen.1.1"],
        body: "图像内容。",
      },
      {
        id: "gen-1-1-video",
        title: "创造视频",
        type: "video",
        verses: ["Gen.1.1"],
        body: "视频内容。",
      },
      {
        id: "gen-1-1-html",
        title: "互动资料",
        type: "html",
        verses: ["Gen.1.1"],
        body: "互动内容。",
      },
      {
        id: "gen-1-1-link",
        title: "相关回链",
        type: "link",
        verses: ["Gen.1.1"],
        body: "链接内容。",
      },
    ] as const;

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={resourcesWithBacklink}
        initialLayout={{
          ...dualCenterLayout,
          modules: [
            { id: "notes", title: "我的笔记", side: "right", visible: true },
            { id: "commentary", title: "注释时间线", side: "right", visible: true },
            { id: "media", title: "媒体", side: "right", visible: true },
            { id: "backlinks", title: "回链", side: "right", visible: true },
          ],
        }}
      />,
    );

    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const notesSection = within(rightDock).getByRole("region", { name: "笔记" });
    const commentarySection = within(rightDock).getByRole("region", { name: "注释" });
    const mediaSection = within(rightDock).getByRole("region", { name: "媒体" });
    const backlinksSection = within(rightDock).getByRole("region", { name: "百科" });

    const noteSourcePill = within(notesSection).getByRole("article", { name: "读经笔记" }).querySelector(".resource-card__source-pill");
    const fallbackNoteSourcePill = within(notesSection).getByRole("article", { name: "无来源笔记" }).querySelector(".resource-card__source-pill");
    const commentarySourcePill = within(commentarySection)
      .getByRole("article", { name: "创世记 1:1 综合解读" })
      .querySelector(".resource-card__source-pill");

    expect(noteSourcePill).toHaveTextContent("用户笔记");
    expect(fallbackNoteSourcePill).toHaveTextContent("笔记");
    expect(commentarySourcePill).toHaveTextContent("综合解读");
    expect(within(commentarySection).queryByRole("article", { name: "创世记 1:1 研修本注释：起初" })).not.toBeInTheDocument();
    expect(commentarySection).not.toHaveTextContent("《综合解读》");
    expect(notesSection).not.toHaveTextContent("《用户笔记》");
    expect(within(commentarySection).queryByRole("article", { name: "相关回链" })).not.toBeInTheDocument();
    expect(within(mediaSection).getByRole("article", { name: "创造图像" }).querySelector(".resource-card__source-pill")).toHaveTextContent("媒体");
    expect(within(mediaSection).getByRole("article", { name: "创造视频" }).querySelector(".resource-card__source-pill")).toHaveTextContent("媒体");
    expect(within(mediaSection).getByRole("article", { name: "互动资料" }).querySelector(".resource-card__source-pill")).toHaveTextContent("媒体");
    expect(within(backlinksSection).getByRole("article", { name: "相关回链" }).querySelector(".resource-card__source-pill")).toHaveTextContent("百科");
    expect(within(commentarySection).queryByText("注释", { selector: ".resource-card__type" })).not.toBeInTheDocument();
    expect(rightDock).not.toHaveTextContent("commentary");
    expect(rightDock).not.toHaveTextContent("image");
    expect(rightDock).not.toHaveTextContent("video");
    expect(rightDock).not.toHaveTextContent("html");
    expect(rightDock).not.toHaveTextContent("note");
    expect(rightDock).not.toHaveTextContent("link");
  });

  it("keeps the right-side category jump bar sticky inside the scroll panel", () => {
    expect(styles).toMatch(/\.resource-dock__panel\s*{[^}]*overflow:\s*auto/s);
    expect(styles).toMatch(/\.resource-dock__jump-bar\s*{[^}]*position:\s*sticky/s);
    expect(styles).toMatch(/\.resource-dock__jump-bar\s*{[^}]*top:\s*0/s);
    expect(styles).toMatch(/\.resource-dock__jump-bar\s*{[^}]*z-index:\s*16/s);
    expect(styles).toMatch(/\.resource-dock__jump-bar-actions\s*{[^}]*grid-template-columns:\s*repeat\(4,/s);
  });

  it("restores older center layouts into the fixed three-module locator model", () => {
    const { activeCenterModules: _activeCenterModules, ...legacyLayout } = defaultWorkbenchLayout;
    localStorage.setItem(
      layoutStorageKey,
      JSON.stringify({
        ...legacyLayout,
        centerModules: ["cuv", "kjv"],
        activeCenterModule: "kjv",
      }),
    );

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const center = screen.getByRole("region", { name: "中间工作区" });
    expect(screen.getAllByTestId("center-module-button").map((element) => element.getAttribute("data-module-id"))).toEqual(["kjv", "cuv", "card"]);
    expect(screen.getByRole("button", { name: "KJV" })).toHaveAttribute("aria-pressed", "true");
    expect(within(center).getByRole("region", { name: "KJV阅读" })).toBeInTheDocument();
    expect(within(center).queryByRole("region", { name: "和合本阅读" })).not.toBeInTheDocument();
  });

  it("restores an intentionally blank persisted center workspace", () => {
    localStorage.setItem(
      layoutStorageKey,
      JSON.stringify({
        ...defaultWorkbenchLayout,
        activeCenterModules: [],
      }),
    );

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    expect(screen.queryAllByTestId("center-module")).toHaveLength(0);
    expect(screen.getByLabelText("未开启中间模块")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "KJV" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "和合本" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "卡片" })).toHaveAttribute("aria-pressed", "false");
  });

  it("merges older book-scoped saved cards into the newer verse-scoped library", () => {
    localStorage.setItem(
      layoutStorageKey,
      JSON.stringify({
        ...defaultWorkbenchLayout,
        savedCardsByVerse: {},
        savedCardsByBook: {
          Gen: [
            {
              resourceId: "gen-1-1-creation-note",
              sourceVerseId: "Gen.1.1",
            },
          ],
        },
      }),
    );

    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    expect(getLeftOrganizedCardStack()).toHaveTextContent("起初，神创造天地");
  });

  it("migrates older flat center cards into the resource chapter instead of forcing Genesis", async () => {
    localStorage.setItem(
      layoutStorageKey,
      JSON.stringify({
        ...defaultWorkbenchLayout,
        activeCenterModules: ["cuv", "card"],
        centerCardResourceIds: ["exod-1-1-note"],
        centerCardResourceIdsByBook: {},
      }),
    );

    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={multiBookResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    let cardModule = getLeftOrganizedCardStack();
    expect(within(cardModule).queryByRole("article", { name: "埃及名单" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择书卷 创世记" }));
    await userEvent.click(screen.getByRole("button", { name: "出埃及记" }));

    cardModule = getLeftOrganizedCardStack();
    expect(within(cardModule).getByRole("article", { name: "埃及名单" })).toBeInTheDocument();
  });

  it("reorders center modules from a dragged toolbar module pill", () => {
    const layout = {
      ...defaultWorkbenchLayout,
      centerModules: ["cuv", "kjv"],
      activeCenterModules: ["kjv"],
    };

    const reordered = reorderCenterModulesByDrag(layout, "kjv", "cuv");
    expect(reordered.centerModules).toEqual(["kjv", "cuv", "card"]);
    expect(reordered.activeCenterModules).toEqual(["kjv"]);

    const cardInserted = reorderCenterModulesByDrag(layout, "card", "kjv");
    expect(cardInserted.centerModules).toEqual(["cuv", "card", "kjv"]);
    expect(cardInserted.activeCenterModules).toEqual(["kjv"]);
  });

  it("reorders center Cards only inside the current scope", () => {
    const layout = {
      ...defaultWorkbenchLayout,
      centerCardResourceIds: ["genesis-cmc-01-p014-img002-669x195", "gen-1-1-video"],
      centerCardResourceIdsByBook: {
        "Gen.1": ["genesis-cmc-01-p014-img002-669x195", "gen-1-1-video"],
        "Exod.1": ["exod-1-1-note"],
      },
    };

    const reordered = reorderCenterCardsByDrag(layout, "Gen.1", "genesis-cmc-01-p014-img002-669x195", "gen-1-1-video");
    expect(reordered.centerCardResourceIds).toEqual(["gen-1-1-video", "genesis-cmc-01-p014-img002-669x195"]);
    expect(reordered.centerCardResourceIdsByBook).toEqual({
      "Gen.1": ["gen-1-1-video", "genesis-cmc-01-p014-img002-669x195"],
      "Exod.1": ["exod-1-1-note"],
    });

    const unchanged = reorderCenterCardsByDrag(layout, "Gen.1", "missing", "gen-1-1-video");
    expect(unchanged.centerCardResourceIdsByBook).toEqual(layout.centerCardResourceIdsByBook);
  });

  it("accepts the visible left organized-card browser as a resource-card drop target", () => {
    expect(acceptsResourceCardDropTarget("left-dock")).toBe(true);
    expect(acceptsResourceCardDropTarget("center-card-drop")).toBe(true);
    expect(acceptsResourceCardDropTarget("right-dock")).toBe(false);
    expect(acceptsResourceCardDropTarget(null)).toBe(false);
  });

  it("anchors the resource drag preview to the pointer instead of the source-card offset", () => {
    const transform = anchorDragOverlayToCursor({
      active: {
        data: {
          current: {
            kind: "resource-card",
          },
        },
        id: "resource:gen-1-1-video",
        rect: {
          current: {
            initial: null,
            translated: null,
          },
        },
      },
      activeNodeRect: {
        bottom: 360,
        height: 240,
        left: 820,
        right: 1120,
        top: 120,
        width: 300,
      },
      activatorEvent: new MouseEvent("pointerdown", { clientX: 900, clientY: 260 }),
      containerNodeRect: null,
      draggingNodeRect: null,
      over: null,
      overlayNodeRect: {
        bottom: 120,
        height: 120,
        left: 0,
        right: 232,
        top: 0,
        width: 232,
      },
      scrollableAncestorRects: [],
      scrollableAncestors: [],
      transform: { x: -40, y: 0, scaleX: 1, scaleY: 1 },
      windowRect: null,
    });

    expect(transform).toMatchObject({
      x: 54,
      y: 154,
    });
  });

  it.each(["loaded", "public"])("stage2 pages %s search results and resets query/filter/scope", async (source) => {
    const verses: BibleVersion["verses"] = Array.from({ length: 245 }, (_, i) => ({
      id: `Gen.${Math.floor(i / 25) + 1}.${i % 25 + 1}`,
      book: "Gen", chapter: Math.floor(i / 25) + 1, verse: i % 25 + 1,
      text: `光 起初 测试 ${i + 1}`,
    }));
    const version = { ...navigationCuv, verses };
    const onRequestSearchResult = vi.fn();
    render(<Workbench versions={[version]} resources={[]} initialLayout={defaultWorkbenchLayout}
      onRequestSearchResult={onRequestSearchResult}
      wholeBibleSearchIndex={source === "public" ? verses.map((v) => ({
        ...v, verseId: v.id, versionId: "cuv", versionLabel: "和合本",
      })) : undefined} />);
    const input = screen.getByRole("searchbox", { name: "搜索经文" });
    await userEvent.type(input, "光{Enter}");
    let panel = screen.getByRole("region", { name: "经文搜索结果" });
    const results = () => within(panel).getAllByRole("button", { name: /^和合本 Gen\./ });
    const more = () => within(panel).getByRole("button", { name: "加载更多结果" });
    expect(results()).toHaveLength(120);
    expect(panel).toHaveTextContent("已显示 120 / 共 245 处结果");
    await userEvent.click(more());
    expect(results()).toHaveLength(240);
    await userEvent.clear(input);
    await userEvent.type(input, "起初{Enter}");
    panel = screen.getByRole("region", { name: "经文搜索结果" });
    expect(results()).toHaveLength(120);
    await userEvent.click(more());
    await userEvent.click(within(panel).getByRole("button", { name: "搜索译本 KJV" }));
    expect(within(panel).queryByRole("button", { name: "加载更多结果" })).not.toBeInTheDocument();
    expect(screen.getByText("搜索到 0 处经文")).toHaveClass("workbench-status");
    await userEvent.click(within(panel).getByRole("button", { name: "全部译本" }));
    expect(results()).toHaveLength(120);
    await userEvent.click(more());
    await userEvent.click(within(panel).getByRole("button", { name: "旧约", exact: true }));
    expect(results()).toHaveLength(120);
    expect(screen.getByText("搜索到 245 处经文")).toHaveClass("workbench-status");
    expect(screen.queryByText("已显示 240 / 共 245 处经文")).not.toBeInTheDocument();
    await userEvent.click(more());
    await userEvent.click(more());
    expect(results()).toHaveLength(245);
    expect(new Set(results().map((r) => r.getAttribute("aria-label"))).size).toBe(245);
    expect(panel).toHaveTextContent("已显示 245 / 共 245 处结果");
    expect(within(panel).queryByRole("button", { name: "加载更多结果" })).not.toBeInTheDocument();
    await userEvent.click(results()[244]);
    expect(onRequestSearchResult).toHaveBeenCalledWith(expect.objectContaining({ verseId: "Gen.10.20" }));
    expect(screen.queryByRole("region", { name: "经文搜索结果" })).not.toBeInTheDocument();
  });

  it("stage2 keeps lightbox keyboard focus and restores its exact image trigger on every close path", async () => {
    render(<Workbench versions={[cuvBible, kjvBible]} resources={sampleResources}
      initialLayout={dualCenterLayout} />);
    const dock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const opener = within(dock).getByRole("button", { name: `放大${genesisMathImageTitle}` });
    opener.focus();
    await userEvent.keyboard("{Enter}");
    let dialog = screen.getByRole("dialog", { name: `图片预览：${genesisMathImageTitle}` });
    const close = within(dialog).getByRole("button", { name: "关闭图片预览" });
    expect(close).toHaveFocus();
    await userEvent.click(within(dialog).getByRole("img"));
    expect(dialog).toBeInTheDocument();
    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(close).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(dialog).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    await userEvent.click(opener);
    dialog = screen.getByRole("dialog", { name: `图片预览：${genesisMathImageTitle}` });
    await userEvent.click(within(dialog).getByRole("button", { name: "关闭图片预览" }));
    expect(opener).toHaveFocus();
    await userEvent.click(opener);
    await userEvent.click(screen.getByRole("dialog", { name: `图片预览：${genesisMathImageTitle}` }));
    expect(screen.queryByRole("dialog", { name: `图片预览：${genesisMathImageTitle}` })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "选择书卷 创世记" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "书卷选择" })).not.toBeInTheDocument();
  });

  it("keeps a failed lightbox image retry reachable by keyboard", async () => {
    render(<Workbench versions={[cuvBible, kjvBible]} resources={sampleResources} initialLayout={dualCenterLayout} />);
    await userEvent.click(within(screen.getByRole("complementary", { name: "右侧资料栏" })).getByRole("button", { name: `放大${genesisMathImageTitle}` }));
    const dialog = screen.getByRole("dialog", { name: `图片预览：${genesisMathImageTitle}` });
    fireEvent.error(within(dialog).getByRole("img"));
    await userEvent.tab();
    expect(within(dialog).getByRole("button", { name: `重试加载图片：${genesisMathImageTitle}` })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(within(dialog).getByRole("img")).toBeInTheDocument();
    expect(dialog).toBeInTheDocument();
  });

  it("stage2 closes copy menus with Escape or outside clicks and restores keyboard entry", async () => {
    render(<Workbench versions={[cuvBible, kjvBible]} resources={sampleResources} initialLayout={dualCenterLayout} />);
    const dock = screen.getByRole("complementary", { name: "右侧资料栏" });
    const opener = within(dock).getByRole("button", { name: "打开起初，神创造天地复制菜单" });
    opener.focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("menuitem", { name: "复制标题" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    await userEvent.click(opener);
    await userEvent.click(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.click(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("stage2 closes focused search results with Escape and outside clicks without clearing the query", async () => {
    render(<Workbench versions={[navigationCuv, navigationKjv]} resources={[]} initialLayout={dualCenterLayout} />);
    const input = screen.getByRole("searchbox", { name: "搜索经文" });
    await userEvent.type(input, "created{Enter}");
    const result = screen.getByRole("button", { name: /KJV Gen\.1\.1/ });
    result.focus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "经文搜索结果" })).not.toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(input).toHaveValue("created");
    await userEvent.keyboard("{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "搜索译本 KJV" }));
    expect(screen.getByRole("region", { name: "经文搜索结果" })).toBeInTheDocument();
    await userEvent.click(screen.getByText("资源库", { exact: true }));
    expect(screen.queryByRole("region", { name: "经文搜索结果" })).not.toBeInTheDocument();
    expect(input).toHaveValue("created");
  });

  it("stage2 restores the settings trigger after Escape from a setting", async () => {
    render(<Workbench versions={[navigationCuv, navigationKjv]} resources={[]} initialLayout={dualCenterLayout} />);
    const opener = screen.getByRole("button", { name: "打开设置" });
    await userEvent.click(opener);
    within(screen.getByRole("dialog", { name: "阅读台设置" })).getByRole("button", { name: "关闭纸张模式" }).focus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "阅读台设置" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("stage2 visibly reports copy failure and keeps the retry menu", async () => {
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    const execDescriptor = Object.getOwnPropertyDescriptor(document, "execCommand");
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: vi.fn().mockRejectedValue(new Error("clipboard denied")),
    } });
    Object.defineProperty(document, "execCommand", { configurable: true, value: vi.fn().mockReturnValue(false) });
    try {
      render(<Workbench versions={[cuvBible, kjvBible]} resources={sampleResources} initialLayout={dualCenterLayout} />);
      const dock = screen.getByRole("complementary", { name: "右侧资料栏" });
      const card = within(dock).getByRole("article", { name: "起初，神创造天地" });
      await userEvent.click(within(card).getByRole("button", { name: "打开起初，神创造天地复制菜单" }));
      await userEvent.click(within(card).getByRole("menuitem", { name: "复制标题" }));
      expect(screen.getByText("复制失败：标题")).toHaveClass("workbench-status", "toolbar-refresh-status--error");
      expect(within(card).getByRole("menuitem", { name: "复制标题" })).toBeInTheDocument();
    } finally {
      if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
      else Reflect.deleteProperty(navigator, "clipboard");
      if (execDescriptor) Object.defineProperty(document, "execCommand", execDescriptor);
      else Reflect.deleteProperty(document, "execCommand");
    }
  });

  it("stage2 exposes existing operation feedback without adding implicit save callbacks", async () => {
    const onSaveLayout = vi.fn();
    render(<Workbench versions={[navigationCuv, navigationKjv]} resources={sampleResources}
      initialLayout={dualCenterLayout} onSaveLayout={onSaveLayout} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "搜索经文" }), "created{Enter}");
    const status = screen.getByText("搜索到 1 处经文");
    expect(status).toHaveAttribute("role", "status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).not.toHaveClass("sr-only");
    expect(status).toHaveClass("workbench-status");
    await userEvent.click(screen.getByRole("button", { name: "清除搜索" }));
    await userEvent.click(screen.getByRole("button", { name: "KJV", exact: true }));
    expect(onSaveLayout).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "保存布局" }));
    expect(onSaveLayout).toHaveBeenCalledTimes(1);
    expect(status).toHaveTextContent("布局已保存");
  });

  it("searches Bible text and jumps to a result", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const searchRegion = screen.getByRole("search", { name: "经文与卡片搜索" });
    await userEvent.type(within(searchRegion).getByRole("searchbox", { name: "搜索经文" }), "created");
    await userEvent.click(within(searchRegion).getByRole("button", { name: "搜索" }));
    await userEvent.click(screen.getByRole("button", { name: "KJV Gen.1.1 In the beginning God created the heaven and the earth." }));
    expect(screen.getByRole("button", { name: "KJV" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("kjv-Gen.1.1")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("cuv-Gen.1.1")).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByTestId("center-module").map((element) => element.getAttribute("data-module-id"))).toEqual(["kjv", "cuv"]);
  });

  it("shows deliberate scripture search controls and highlighted results", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    const searchRegion = screen.getByRole("search", { name: "经文与卡片搜索" });
    await userEvent.type(within(searchRegion).getByRole("searchbox", { name: "搜索经文" }), "created");
    await userEvent.click(within(searchRegion).getByRole("button", { name: "搜索" }));

    const searchPanel = screen.getByRole("region", { name: "经文搜索结果" });
    expect(within(searchPanel).getByRole("button", { name: "全部译本" })).toHaveAttribute("aria-pressed", "true");
    expect(within(searchPanel).getByRole("button", { name: "搜索译本 和合本" })).toBeInTheDocument();
    expect(within(searchPanel).getByRole("button", { name: "搜索译本 KJV" })).toBeInTheDocument();
    expect(within(searchPanel).getByRole("button", { name: "整本" })).toHaveAttribute("aria-pressed", "true");
    expect(within(searchPanel).getByRole("button", { name: "旧约" })).toBeInTheDocument();
    expect(within(searchPanel).getByRole("button", { name: "新约" })).toBeInTheDocument();
    expect(within(searchPanel).getByRole("button", { name: "当前书卷" })).toBeInTheDocument();
    expect(searchPanel).toHaveTextContent("1 处结果");
    expect(within(searchPanel).getByRole("mark")).toHaveTextContent("created");
    expect(within(searchPanel).getByRole("button", { name: /KJV Gen\.1\.1/ })).toBeInTheDocument();

    await userEvent.click(within(searchRegion).getByRole("button", { name: "清除搜索" }));
    expect(screen.queryByRole("region", { name: "经文搜索结果" })).not.toBeInTheDocument();
    expect(within(searchRegion).getByRole("searchbox", { name: "搜索经文" })).toHaveValue("");
  });

  it("does not show stale results after the query changes before a new search", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    const searchRegion = screen.getByRole("search", { name: "经文与卡片搜索" });
    const searchInput = within(searchRegion).getByRole("searchbox", { name: "搜索经文" });

    await userEvent.type(searchInput, "created");
    await userEvent.click(within(searchRegion).getByRole("button", { name: "搜索" }));

    const searchPanel = screen.getByRole("region", { name: "经文搜索结果" });
    expect(within(searchPanel).getByRole("button", { name: /KJV Gen\.1\.1/ })).toBeInTheDocument();

    await userEvent.type(searchInput, "x");

    expect(within(searchPanel).getByText("待搜索")).toBeInTheDocument();
    expect(within(searchPanel).getAllByText("输入已改变，点击搜索更新结果。")).toHaveLength(1);
    expect(within(searchPanel).queryByText("点击搜索更新结果", { exact: true })).not.toBeInTheDocument();
    expect(within(searchPanel).queryByRole("button", { name: /KJV Gen\.1\.1/ })).not.toBeInTheDocument();
  });

  it("filters scripture search by version and scope", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    const searchRegion = screen.getByRole("search", { name: "经文与卡片搜索" });
    const searchInput = within(searchRegion).getByRole("searchbox", { name: "搜索经文" });
    await userEvent.click(searchInput);
    await userEvent.type(searchInput, "God");
    await userEvent.click(within(searchRegion).getByRole("button", { name: "搜索" }));
    const searchPanel = screen.getByRole("region", { name: "经文搜索结果" });
    await userEvent.click(within(searchPanel).getByRole("button", { name: "搜索译本 KJV" }));
    await userEvent.click(within(searchPanel).getByRole("button", { name: "新约" }));
    await userEvent.keyboard("{Enter}");

    expect(searchPanel).toHaveTextContent("2 处结果");
    expect(within(searchPanel).getByRole("button", { name: /KJV John\.1\.1/ })).toBeInTheDocument();
    expect(within(searchPanel).getByRole("button", { name: /KJV John\.3\.16/ })).toBeInTheDocument();
    expect(within(searchPanel).queryByRole("button", { name: /KJV Gen\.1\.1/ })).not.toBeInTheDocument();

    await userEvent.click(within(searchPanel).getByRole("button", { name: "当前书卷" }));
    expect(searchPanel).toHaveTextContent("1 处结果");
    expect(within(searchPanel).getByRole("button", { name: /KJV Gen\.1\.1/ })).toBeInTheDocument();
    expect(within(searchPanel).queryByRole("button", { name: /KJV John\.1\.1/ })).not.toBeInTheDocument();
    expect(within(searchPanel).getByRole("button", { name: "当前书卷" })).toHaveAttribute("aria-pressed", "true");
  });

  it("persists dragged left and right separator widths in the saved layout", async () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
      writable: true,
    });

    const onSaveLayout = vi.fn();
    try {
      render(
        <Workbench
          versions={[cuvBible, kjvBible]}
          resources={sampleResources}
          initialLayout={defaultWorkbenchLayout}
          onSaveLayout={onSaveLayout}
        />,
      );

      const leftSeparator = screen.getByRole("separator", { name: "调整左侧资料栏宽度" });
      const rightSeparator = screen.getByRole("separator", { name: "调整右侧资料栏宽度" });
      const initialLeftWidth = separatorValue(leftSeparator);
      const initialRightWidth = separatorValue(rightSeparator);
      expect(initialLeftWidth).toBe(300);
      expect(initialRightWidth).toBe(320);
      const expectedLeftWidth = initialLeftWidth + 40;
      const expectedRightWidth = initialRightWidth + 40;

      dragSeparator(leftSeparator, 220, 260);
      expect(leftSeparator).toHaveAttribute("aria-valuenow", String(expectedLeftWidth));

      dragSeparator(rightSeparator, 900, 860);
      expect(rightSeparator).toHaveAttribute("aria-valuenow", String(expectedRightWidth));

      expect(JSON.parse(localStorage.getItem(layoutStorageKey) ?? "{}")).toEqual(
        expect.objectContaining({
          leftWidth: expectedLeftWidth,
          rightWidth: expectedRightWidth,
        }),
      );

      await waitForDndClickSuppressionCleanup();
      await userEvent.click(screen.getByRole("button", { name: "保存布局" }));
      expect(onSaveLayout).toHaveBeenCalledWith(
        expect.objectContaining({
          leftWidth: expectedLeftWidth,
          rightWidth: expectedRightWidth,
        }),
      );
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalInnerWidth,
        writable: true,
      });
    }
  });

  it("allows keyboard resizing of the side docks", async () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
      writable: true,
    });

    try {
      render(
        <Workbench
          versions={[cuvBible, kjvBible]}
          resources={sampleResources}
          initialLayout={defaultWorkbenchLayout}
        />,
      );

      const leftSeparator = screen.getByRole("separator", { name: "调整左侧资料栏宽度" });
      const rightSeparator = screen.getByRole("separator", { name: "调整右侧资料栏宽度" });

      leftSeparator.focus();
      expect(leftSeparator).toHaveFocus();
      await userEvent.keyboard("{ArrowRight}");
      expect(leftSeparator).toHaveAttribute("aria-valuenow", "320");

      rightSeparator.focus();
      await userEvent.keyboard("{ArrowLeft}");
      expect(rightSeparator).toHaveAttribute("aria-valuenow", "340");
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalInnerWidth,
        writable: true,
      });
    }
  });

  it("does not render the old reader translation split when a single module is active", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    expect(screen.queryByRole("separator", { name: "调整中间阅读区译本占比" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "KJV" }));
    expect(screen.queryByRole("separator", { name: "调整中间阅读区译本占比" })).not.toBeInTheDocument();
    expect(screen.getByRole("separator", { name: "调整中间模块占比" })).toBeInTheDocument();
  });

  it("opens the card capsule next to an existing center module", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    const center = screen.getByRole("region", { name: "中间工作区" });
    expect(screen.getAllByTestId("center-module")).toHaveLength(1);
    expect(screen.getByTestId("center-module")).toHaveAttribute("data-module-id", "cuv");

    await userEvent.click(screen.getByRole("button", { name: "卡片" }));
    expect(screen.getAllByTestId("center-module")).toHaveLength(2);
    expect(within(center).getByRole("region", { name: "当前经文已有卡片" })).toBeInTheDocument();
    expect(screen.getAllByTestId("center-module").map((element) => element.getAttribute("data-module-id"))).toEqual(["cuv", "card"]);
    expect(within(center).getByRole("region", { name: "和合本阅读" })).toBeInTheDocument();
    expect(within(center).queryByRole("region", { name: "KJV阅读" })).not.toBeInTheDocument();
  });

  it("uses translation buttons as additive center module controls", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={dualCenterLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "KJV" }));

    const center = screen.getByRole("region", { name: "中间工作区" });
    expect(within(center).getByRole("region", { name: "KJV阅读" })).toBeInTheDocument();
    expect(within(center).getByRole("region", { name: "和合本阅读" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "KJV" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "和合本" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("请选择至少一个译本。")).not.toBeInTheDocument();
  });

  it("opens book and chapter capsule panels with only data-backed chapters", async () => {
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "选择书卷 创世记" }));
    expect(screen.getByRole("dialog", { name: "书卷选择" })).toBeInTheDocument();
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[workbench] navigation panel opened",
      expect.objectContaining({ panel: "book" }),
    );

    await userEvent.click(screen.getByRole("button", { name: "创世记" }));
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[workbench] navigation book selected",
      expect.objectContaining({ book: "Gen" }),
    );

    await userEvent.click(screen.getByRole("button", { name: "选择章节 序" }));
    const chapterPanel = screen.getByRole("dialog", { name: "章节选择" });
    expect(within(chapterPanel).getAllByRole("button")).toHaveLength(51);
    expect(within(chapterPanel).getByRole("button", { name: "创世记 序" })).not.toBeDisabled();
    expect(within(chapterPanel).getByRole("button", { name: "第 1 章" })).not.toBeDisabled();
    expect(within(chapterPanel).getByRole("button", { name: "第 2 章" })).not.toBeDisabled();
    expect(within(chapterPanel).queryByRole("button", { name: /暂无数据/ })).not.toBeInTheDocument();
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[workbench] navigation panel opened",
      expect.objectContaining({ panel: "chapter" }),
    );

    await userEvent.click(within(chapterPanel).getByRole("button", { name: "第 1 章" }));
    expect(screen.getByTestId("cuv-Gen.1.1")).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByText("Gen.1.1").length).toBeGreaterThan(0);
    expect(consoleInfoSpy).not.toHaveBeenCalledWith(
      "[workbench] navigation chapter selected",
      expect.objectContaining({ requestedChapter: 2 }),
    );
  });

  it("closes book and chapter panels when clicking outside the navigation picker", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "选择书卷 创世记" }));
    expect(screen.getByRole("dialog", { name: "书卷选择" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("region", { name: "中间工作区" }));
    expect(screen.queryByRole("dialog", { name: "书卷选择" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择章节 第 1 章" }));
    expect(screen.getByRole("dialog", { name: "章节选择" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("region", { name: "中间工作区" }));
    expect(screen.queryByRole("dialog", { name: "章节选择" })).not.toBeInTheDocument();
  });

  it("navigates across Old and New Testament books with current-chapter verse rendering", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={sampleResources}
        initialLayout={{
          ...defaultWorkbenchLayout,
          centerModules: ["cuv", "kjv", "card"],
          activeCenterModules: ["cuv", "kjv"],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "创世记 Genesis 1" })).toBeInTheDocument();
    expect(screen.getByTestId("cuv-Gen.1.1")).toBeInTheDocument();
    expect(screen.queryByTestId("cuv-Gen.2.1")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择书卷 创世记" }));
    const bookPanel = screen.getByRole("dialog", { name: "书卷选择" });
    expect(within(bookPanel).getByText("旧约")).toBeInTheDocument();
    expect(within(bookPanel).getByText("新约")).toBeInTheDocument();
    expect(within(bookPanel).getByRole("button", { name: "出埃及记" })).toBeInTheDocument();
    await userEvent.click(within(bookPanel).getByRole("button", { name: "约翰福音" }));

    expect(screen.getByRole("button", { name: "选择书卷 约翰福音" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择章节 第 1 章" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "约翰福音 John 1" })).toBeInTheDocument();
    expect(screen.getByTestId("cuv-John.1.1")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("kjv-John.1.1")).toHaveAttribute("aria-current", "true");
    expect(screen.queryByTestId("cuv-Gen.1.1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cuv-John.3.16")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择章节 第 1 章" }));
    const chapterPanel = screen.getByRole("dialog", { name: "章节选择" });
    expect(within(chapterPanel).getAllByRole("button")).toHaveLength(3);
    expect(within(chapterPanel).getByRole("button", { name: "约翰福音 序" })).toBeInTheDocument();
    await userEvent.click(within(chapterPanel).getByRole("button", { name: "第 3 章" }));

    expect(screen.getByRole("heading", { name: "约翰福音 John 3" })).toBeInTheDocument();
    expect(screen.getByTestId("cuv-John.3.16")).toHaveAttribute("aria-current", "true");
    expect(screen.queryByTestId("cuv-John.1.1")).not.toBeInTheDocument();
  });

  it("search results can jump to a non-Genesis book and synchronize both Bible modules", async () => {
    render(
      <Workbench
        versions={[navigationCuv, navigationKjv]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    const searchRegion = screen.getByRole("search", { name: "经文与卡片搜索" });
    await userEvent.type(within(searchRegion).getByRole("searchbox", { name: "搜索经文" }), "only begotten");
    await userEvent.click(within(searchRegion).getByRole("button", { name: "搜索" }));
    await userEvent.click(screen.getByRole("button", { name: /KJV John\.3\.16/ }));

    expect(screen.getByRole("button", { name: "选择书卷 约翰福音" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择章节 第 3 章" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "KJV" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("kjv-John.3.16")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("cuv-John.3.16")).toHaveAttribute("aria-current", "true");
  });

  it("requests an unloaded book before changing the visible text-only content", async () => {
    const onRequestBook = vi.fn();
    render(
      <Workbench
        activeBookId="Gen"
        versions={[{ ...navigationCuv, verses: navigationCuv.verses.filter((verse) => verse.book === "Gen") }, { ...navigationKjv, verses: navigationKjv.verses.filter((verse) => verse.book === "Gen") }]}
        resources={[{ id: "text-card", title: "公开文字解读", type: "commentary", verses: ["Gen.1.1"], body: "只有文字。" }]}
        initialLayout={defaultWorkbenchLayout}
        onRequestBook={onRequestBook}
      />,
    );

    expect(screen.getByRole("article", { name: "公开文字解读" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /图片预览/ })).not.toBeInTheDocument();
    expect(screen.queryByText("图片 / 地图 / 图表")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "选择书卷 创世记" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "书卷选择" })).getByRole("button", { name: "出埃及记" }));

    expect(onRequestBook).toHaveBeenCalledWith("Exod");
    expect(screen.getByRole("button", { name: "选择书卷 创世记" })).toBeInTheDocument();
  });

  it("requests a cross-book search result before selecting its verse", async () => {
    const onRequestBook = vi.fn().mockResolvedValue(undefined);
    const onRequestSearchResult = vi.fn();
    const wholeBibleSearchIndex: PublicScriptureSearchEntry[] = [{
      verseId: "John.3.16", versionId: "kjv", versionLabel: "KJV", book: "John", chapter: 3, verse: 16,
      text: "For God so loved the world",
    }];
    render(
      <Workbench
        activeBookId="Gen"
        versions={[{ ...navigationCuv, verses: navigationCuv.verses.filter((verse) => verse.book === "Gen") }, { ...navigationKjv, verses: navigationKjv.verses.filter((verse) => verse.book === "Gen") }]}
        resources={[]}
        initialLayout={defaultWorkbenchLayout}
        wholeBibleSearchIndex={wholeBibleSearchIndex}
        onRequestBook={onRequestBook}
        onRequestSearchResult={onRequestSearchResult}
      />,
    );

    const searchRegion = screen.getByRole("search", { name: "经文与卡片搜索" });
    await userEvent.type(within(searchRegion).getByRole("searchbox", { name: "搜索经文" }), "loved");
    await userEvent.click(within(searchRegion).getByRole("button", { name: "搜索" }));
    await userEvent.click(screen.getByRole("button", { name: /KJV John\.3\.16/ }));

    expect(onRequestBook).toHaveBeenCalledWith("John");
    expect(onRequestSearchResult).toHaveBeenCalledWith(expect.objectContaining({ verseId: "John.3.16", book: "John" }));
    expect(onRequestBook.mock.invocationCallOrder[0]).toBeLessThan(onRequestSearchResult.mock.invocationCallOrder[0]);
  });

  it("clears a failed cross-book search target when ordinary book navigation starts", async () => {
    const onRequestBook = vi.fn();
    const wholeBibleSearchIndex: PublicScriptureSearchEntry[] = [{
      verseId: "John.3.16", versionId: "kjv", versionLabel: "KJV", book: "John", chapter: 3, verse: 16,
      text: "For God so loved the world",
    }];

    function Harness() {
      const [activeBookId, setActiveBookId] = useState("Gen");
      const [failedJohnSearch, setFailedJohnSearch] = useState(false);
      const versions = [navigationCuv, navigationKjv].map((version) => ({
        ...version,
        verses: version.verses.filter((verse) => verse.book === activeBookId),
      }));

      return (
        <Workbench
          activeBookId={activeBookId}
          versions={versions}
          resources={[]}
          initialLayout={defaultWorkbenchLayout}
          wholeBibleSearchIndex={wholeBibleSearchIndex}
          onRequestBook={async (bookId) => {
            onRequestBook(bookId);
            if (bookId === "John" && !failedJohnSearch) {
              setFailedJohnSearch(true);
              return;
            }
            setActiveBookId(bookId);
          }}
        />
      );
    }

    render(<Harness />);
    const searchRegion = screen.getByRole("search", { name: "经文与卡片搜索" });
    await userEvent.type(within(searchRegion).getByRole("searchbox", { name: "搜索经文" }), "loved");
    await userEvent.click(within(searchRegion).getByRole("button", { name: "搜索" }));
    await userEvent.click(screen.getByRole("button", { name: /KJV John\.3\.16/ }));
    expect(onRequestBook).toHaveBeenLastCalledWith("John");
    expect(screen.getByRole("button", { name: "选择书卷 创世记" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择书卷 创世记" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "书卷选择" })).getByRole("button", { name: "出埃及记" }));
    expect(await screen.findByRole("button", { name: "选择书卷 出埃及记" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "选择书卷 出埃及记" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "书卷选择" })).getByRole("button", { name: "约翰福音" }));

    expect(await screen.findByRole("button", { name: "选择书卷 约翰福音" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择章节 第 1 章" })).toBeInTheDocument();
    expect(screen.getByTestId("cuv-John.1.1")).toHaveAttribute("aria-current", "true");
    expect(screen.queryByTestId("cuv-John.3.16")).not.toBeInTheDocument();
  });

  it("keeps module controls quiet so cards are the draggable surface", () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    expect(screen.queryByText("移到左侧")).not.toBeInTheDocument();
    expect(screen.queryByText("移到右侧")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "拖动 注释时间线" })).not.toBeInTheDocument();
    const rightDock = screen.getByRole("complementary", { name: "右侧资料栏" });
    expect(within(rightDock).getByRole("article", { name: "起初，神创造天地" })).toBeInTheDocument();
  });

  it("collapses and expands both docks while preserving layout state", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    await userEvent.click(screen.getAllByRole("button", { name: "收起左侧资料栏" })[0]);
    expect(screen.getByRole("button", { name: "展开左侧资料栏" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "展开左侧资料栏" }));
    expect(screen.getByRole("button", { name: "收起左侧资料栏" })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "收起右侧资料栏" })[0]);
    expect(screen.getByRole("button", { name: "展开右侧资料栏" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "展开右侧资料栏" }));
    expect(screen.getByRole("button", { name: "收起右侧资料栏" })).toBeInTheDocument();
  });

  it("keeps dock toggles reachable in both states", async () => {
    render(
      <Workbench
        versions={[cuvBible, kjvBible]}
        resources={sampleResources}
        initialLayout={defaultWorkbenchLayout}
      />,
    );

    expect(screen.getAllByRole("button", { name: "收起左侧资料栏" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "收起右侧资料栏" }).length).toBeGreaterThan(0);
  });
});
