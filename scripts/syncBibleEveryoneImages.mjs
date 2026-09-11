#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const defaultSourceUrl = "https://bibleeveryone.com/imagedb.php";
const outputJsonPath = path.join(repoRoot, "src/data/generated/bibleEveryoneImageResources.json");
const publicResourceRoot = path.join(repoRoot, "public/resources/bibleeveryone");
const publicResourceUrlRoot = "/resources/bibleeveryone";
const downloadConcurrency = 16;

const navigationMappings = {
  "亞伯拉罕生平旅程": {
    primaryAnchor: "Gen.12.1",
    coverageRanges: [{ start: "Gen.12.1", end: "Gen.25.11" }],
    placementScope: "patriarch-journey",
    riskLevel: "medium",
  },
  "亞伯拉罕與神的聖約": {
    primaryAnchor: "Gen.15.18",
    coverageRanges: [{ start: "Gen.15.1", end: "Gen.17.27" }],
    placementScope: "covenant",
    riskLevel: "medium",
  },
  "先祖生平時序": {
    primaryAnchor: "Gen.12.1",
    bookIntro: "Gen",
    coverageRanges: [{ start: "Gen.12.1", end: "Gen.50.26" }],
    placementScope: "patriarch-timeline",
    riskLevel: "high",
  },
  "先祖家族歷史與六大族裔的產生": {
    primaryAnchor: "Gen.10.1",
    bookIntro: "Gen",
    coverageRanges: [{ start: "Gen.10.1", end: "Gen.36.43" }],
    placementScope: "genealogy-overview",
    riskLevel: "high",
  },
  "寄居及曠野時期文物時間軸": {
    primaryAnchor: "Exod.1.1",
    bookIntro: "Exod",
    coverageRanges: [{ start: "Exod.1.1", end: "Num.36.13" }],
    placementScope: "archaeology-timeline",
    riskLevel: "high",
  },
  "西奈山位置": {
    primaryAnchor: "Exod.19.1",
    coverageRanges: [{ start: "Exod.19.1", end: "Exod.19.25" }],
    placementScope: "location",
    riskLevel: "high",
  },
  "摩西早年旅程": {
    primaryAnchor: "Exod.2.11",
    coverageRanges: [{ start: "Exod.2.1", end: "Exod.4.31" }],
    placementScope: "biography-journey",
    riskLevel: "medium",
  },
  "摩西出埃及之旅": {
    primaryAnchor: "Exod.13.17",
    coverageRanges: [{ start: "Exod.13.17", end: "Num.33.49" }],
    placementScope: "exodus-route",
    riskLevel: "medium",
  },
  "摩西出埃及、生平時序": {
    primaryAnchor: "Exod.2.1",
    bookIntro: "Exod",
    coverageRanges: [{ start: "Exod.2.1", end: "Deut.34.12" }],
    placementScope: "biography-timeline",
    riskLevel: "high",
  },
  "神與人的聖約": {
    primaryAnchor: "Gen.3.15",
    bookIntro: "Gen",
    coverageRanges: [{ start: "Gen.3.15" }],
    placementScope: "canonical-covenant",
    riskLevel: "high",
    contextOnly: true,
  },
  "列王先知時間軸": {
    primaryAnchor: "1Kgs.1.1",
    bookIntro: "1Kgs",
    coverageRanges: [{ start: "1Kgs.1.1", end: "2Kgs.25.30" }],
    placementScope: "kings-prophets-timeline",
    riskLevel: "high",
  },
  "掃羅生平時序": {
    primaryAnchor: "1Sam.9.1",
    coverageRanges: [{ start: "1Sam.9.1", end: "1Sam.31.13" }],
    placementScope: "biography-timeline",
    riskLevel: "medium",
  },
  "掃羅封王及首兩場戰役": {
    primaryAnchor: "1Sam.11.15",
    coverageRanges: [{ start: "1Sam.9.1", end: "1Sam.13.23" }],
    placementScope: "battle-sequence",
    riskLevel: "medium",
  },
  "掃羅第三及第四場戰役": {
    primaryAnchor: "1Sam.14.47",
    coverageRanges: [{ start: "1Sam.14.1", end: "1Sam.15.35" }],
    placementScope: "battle-sequence",
    riskLevel: "medium",
  },
  "掃羅最後戰役": {
    primaryAnchor: "1Sam.31.1",
    coverageRanges: [{ start: "1Sam.31.1", end: "1Sam.31.13" }],
    placementScope: "battle",
    riskLevel: "medium",
  },
  "掃羅最後戰役 / 大衛登基之路": {
    primaryAnchor: "2Sam.2.1",
    coverageRanges: [{ start: "1Sam.31.1", end: "2Sam.5.5" }],
    relatedRanges: [{ start: "1Sam.31.1", end: "1Sam.31.13" }],
    placementScope: "transition-sequence",
    riskLevel: "high",
  },
  "大衛逃亡之旅": {
    primaryAnchor: "1Sam.21.1",
    coverageRanges: [{ start: "1Sam.21.1", end: "1Sam.30.31" }],
    placementScope: "biography-journey",
    riskLevel: "medium",
  },
  "大衛接回約櫃": {
    primaryAnchor: "2Sam.6.1",
    coverageRanges: [{ start: "2Sam.6.1", end: "2Sam.6.23" }],
    relatedRanges: [{ start: "1Chr.13.1", end: "1Chr.16.43" }],
    placementScope: "event",
    riskLevel: "medium",
  },
  "大衛國土的擴展": {
    primaryAnchor: "2Sam.8.1",
    coverageRanges: [{ start: "2Sam.8.1", end: "2Sam.10.19" }],
    placementScope: "geopolitical-overview",
    riskLevel: "medium",
  },
  "耶路撒冷的古今": {
    primaryAnchor: "2Sam.5.6",
    bookIntro: "2Sam",
    coverageRanges: [{ start: "2Sam.5.6", end: "2Sam.5.12" }],
    placementScope: "city-overview",
    riskLevel: "high",
  },
  "聖經書卷時間軸": {
    primaryAnchor: "Gen.1.1",
    bookIntro: "Gen",
    coverageRanges: [{ start: "Gen.1.1" }],
    placementScope: "canon-timeline",
    riskLevel: "high",
    contextOnly: true,
  },
  "耶穌童年旅程": {
    primaryAnchor: "Matt.2.13",
    coverageRanges: [{ start: "Matt.2.1", end: "Matt.2.23" }],
    relatedRanges: [{ start: "Luke.2.1", end: "Luke.2.52" }],
    placementScope: "gospel-journey",
    riskLevel: "high",
  },
  "耶穌童年時序": {
    primaryAnchor: "Luke.2.1",
    coverageRanges: [{ start: "Luke.2.1", end: "Luke.2.52" }],
    relatedRanges: [{ start: "Matt.1.18", end: "Matt.2.23" }],
    placementScope: "gospel-timeline",
    riskLevel: "high",
  },
  "耶穌事奉旅程": {
    primaryAnchor: "Matt.4.12",
    coverageRanges: [{ start: "Matt.4.12", end: "Matt.28.20" }],
    relatedRanges: [
      { start: "Mark.1.14", end: "Mark.16.20" },
      { start: "Luke.4.14", end: "Luke.24.53" },
      { start: "John.1.19", end: "John.21.25" },
    ],
    placementScope: "gospel-ministry",
    riskLevel: "high",
  },
  "撒馬利亞人": {
    primaryAnchor: "2Kgs.17.24",
    coverageRanges: [{ start: "2Kgs.17.24", end: "2Kgs.17.41" }],
    relatedRanges: [{ start: "John.4.1", end: "John.4.42" }],
    placementScope: "people-background",
    riskLevel: "high",
  },
  "羅馬帝國：簡介、政治架構": {
    primaryAnchor: "Luke.2.1",
    bookIntro: "Luke",
    coverageRanges: [{ start: "Luke.2.1" }],
    placementScope: "historical-background",
    riskLevel: "high",
  },
  "羅馬帝國：皇帝時間軸": {
    primaryAnchor: "Luke.2.1",
    bookIntro: "Luke",
    coverageRanges: [{ start: "Luke.2.1" }],
    placementScope: "historical-background",
    riskLevel: "high",
  },
  "羅馬帝國：大希律家譜": {
    primaryAnchor: "Matt.2.1",
    coverageRanges: [{ start: "Matt.2.1", end: "Matt.2.23" }],
    placementScope: "historical-background",
    riskLevel: "high",
  },
  "歷史文獻 (新約)": {
    primaryAnchor: "Luke.1.1",
    bookIntro: "Luke",
    coverageRanges: [{ start: "Luke.1.1", end: "Luke.1.4" }],
    placementScope: "external-history-background",
    riskLevel: "high",
  },
  "祭司、猶太公議會 (新約)": {
    primaryAnchor: "Matt.26.57",
    coverageRanges: [{ start: "Matt.26.57", end: "Matt.27.2" }],
    placementScope: "institution-background",
    riskLevel: "high",
  },
  "初期教會簡介": {
    primaryAnchor: "Acts.2.42",
    bookIntro: "Acts",
    coverageRanges: [{ start: "Acts.2.42", end: "Acts.2.47" }],
    placementScope: "church-overview",
    riskLevel: "medium",
  },
  "保羅簡介": {
    primaryAnchor: "Acts.9.1",
    bookIntro: "Acts",
    coverageRanges: [{ start: "Acts.9.1", end: "Acts.28.31" }],
    placementScope: "biography-background",
    riskLevel: "medium",
  },
  "保羅第1次旅程": {
    primaryAnchor: "Acts.13.4",
    coverageRanges: [{ start: "Acts.13.4", end: "Acts.14.28" }],
    placementScope: "missionary-journey",
    riskLevel: "medium",
  },
  "保羅第2次旅程": {
    primaryAnchor: "Acts.15.36",
    coverageRanges: [{ start: "Acts.15.36", end: "Acts.18.22" }],
    placementScope: "missionary-journey",
    riskLevel: "medium",
  },
  "保羅第3次旅程": {
    primaryAnchor: "Acts.18.23",
    coverageRanges: [{ start: "Acts.18.23", end: "Acts.21.17" }],
    placementScope: "missionary-journey",
    riskLevel: "medium",
  },
  "保羅受審之旅": {
    primaryAnchor: "Acts.27.1",
    coverageRanges: [{ start: "Acts.27.1", end: "Acts.28.31" }],
    placementScope: "trial-journey",
    riskLevel: "medium",
  },
};

function parseArgs(argv) {
  const options = {
    sourceUrl: defaultSourceUrl,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source-url") {
      const value = argv[index + 1];
      if (!value) throw new Error("--source-url requires a value");
      options.sourceUrl = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null));
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";
}

function uniqueId(baseId, usedIds) {
  let candidate = baseId;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function extensionFromUrl(url) {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return ext && /^[.][a-z0-9]+$/.test(ext) ? ext : ".jpg";
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

function absoluteUrl(url, baseUrl) {
  return new URL(url, baseUrl).toString();
}

function extractImageCards(html, sourceUrl) {
  const dom = new JSDOM(html, { url: sourceUrl });
  const { document, Node } = dom.window;

  return Array.from(document.querySelectorAll(".cell-thumbnail"))
    .map((cell) => {
      const image = cell.querySelector(".crop-thumbnail img.responsive-image");
      const imageSrc = image?.getAttribute("src");
      if (!imageSrc) return undefined;

      const title = normalizeText(
        Array.from(cell.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? "")
          .join(" "),
      );
      const links = Array.from(cell.querySelectorAll("span.verse a"))
        .map((link) => ({
          href: absoluteUrl(link.getAttribute("href") ?? "", sourceUrl),
          label: normalizeText(link.textContent ?? ""),
        }))
        .filter((link) => link.href && link.label);

      return {
        title,
        description: normalizeText(cell.querySelector(".imagedb-desc")?.textContent ?? ""),
        imageAlt: image.getAttribute("alt") ?? "",
        sourceImageUrl: absoluteUrl(imageSrc, sourceUrl),
        navigationLinks: links,
      };
    })
    .filter((card) => card && card.title)
    .map((card) => card);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  ));
  return results;
}

async function downloadImage(card, index, usedFileNames) {
  const response = await fetch(card.sourceImageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${card.sourceImageUrl}: ${response.status} ${response.statusText}`);
  }

  const extension = extensionFromUrl(card.sourceImageUrl);
  const baseFileName = `${String(index + 1).padStart(3, "0")}-${slugify(card.title)}${extension}`;
  const fileName = uniqueId(baseFileName, usedFileNames);
  const targetAbsolutePath = path.join(publicResourceRoot, fileName);
  const bytes = Buffer.from(await response.arrayBuffer());

  await mkdir(publicResourceRoot, { recursive: true });
  await writeFile(targetAbsolutePath, bytes);

  return {
    assetPath: `${publicResourceUrlRoot}/${fileName}`,
    downloadedBytes: bytes.length,
    storedAbsolutePath: targetAbsolutePath,
    storedRelativePath: `public/resources/bibleeveryone/${fileName}`,
  };
}

function navigationBody(navigationLinks) {
  if (navigationLinks.length === 0) return "";

  return [
    "",
    "所属网页：",
    ...navigationLinks.map((link) => `- [${link.label}](${link.href})`),
  ].join("\n");
}

function uniqueRanges(ranges) {
  const seen = new Set();
  return ranges.filter((range) => {
    const key = `${range.start}-${range.end ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function navigationPlacement(navigationLinks) {
  const mappings = navigationLinks
    .map((link) => navigationMappings[link.label])
    .filter(Boolean);
  const anchorMappings = mappings.filter((mapping) => !mapping.contextOnly);
  const primaryMapping = anchorMappings[0];
  const primaryAnchors = Array.from(new Set(anchorMappings.map((mapping) => mapping.primaryAnchor).filter(Boolean)));
  const coverageRanges = uniqueRanges(anchorMappings.flatMap((mapping) => mapping.coverageRanges ?? []));
  const relatedRanges = uniqueRanges(anchorMappings.flatMap((mapping) => mapping.relatedRanges ?? []));
  const riskLevels = anchorMappings.map((mapping) => mapping.riskLevel);
  const riskLevel = anchorMappings.length === 0 && mappings.length > 0
    ? "unanchored-overview"
    : riskLevels.includes("high") ? "high" : riskLevels.includes("medium") ? "medium" : "low";

  return compactObject({
    primaryAnchor: primaryMapping?.primaryAnchor,
    primaryAnchors,
    bookIntro: primaryMapping?.bookIntro,
    verses: primaryAnchors,
    coverageRanges,
    relatedRanges,
    placementScopes: Array.from(new Set(mappings.map((mapping) => mapping.placementScope).filter(Boolean))),
    riskLevel,
    unmappedNavigationLabels: navigationLinks
      .map((link) => link.label)
      .filter((label) => !navigationMappings[label]),
  });
}

function normalizeResource(card, index, assetInfo, usedIds, sourceUrl) {
  const id = uniqueId(`bibleeveryone-${slugify(card.title)}`, usedIds);
  const navigationLabels = card.navigationLinks.map((link) => link.label);
  const navigationHrefs = card.navigationLinks.map((link) => link.href);
  const placement = navigationPlacement(card.navigationLinks);
  const body = [card.description, navigationBody(card.navigationLinks)].filter(Boolean).join("\n");

  return compactObject({
    id,
    title: card.title,
    type: "image",
    verses: placement.verses ?? [],
    primaryAnchor: placement.primaryAnchor,
    bookIntro: placement.bookIntro,
    body,
    summary: card.description,
    searchText: normalizeText([
      card.title,
      card.description,
      card.imageAlt,
      ...navigationLabels,
    ].join(" ")),
    source: "BibleEveryone 聖經圖庫",
    assetPath: assetInfo.assetPath,
    debugMeta: compactObject({
      sourceUrl,
      sourceImageUrl: card.sourceImageUrl,
      sourceImageAlt: card.imageAlt,
      sourceIndex: index + 1,
      sourceNavigationLinks: card.navigationLinks,
      navigationLabels,
      navigationHrefs,
      coverageRanges: placement.coverageRanges,
      relatedRanges: placement.relatedRanges,
      primaryAnchor: placement.primaryAnchor,
      navigationPrimaryAnchors: placement.primaryAnchors,
      navigationMappedBookIntro: placement.bookIntro,
      navigationPlacementScopes: placement.placementScopes,
      navigationRisk: placement.riskLevel,
      unmappedNavigationLabels: placement.unmappedNavigationLabels,
      storedAbsolutePath: assetInfo.storedAbsolutePath,
      storedRelativePath: assetInfo.storedRelativePath,
      downloadedBytes: assetInfo.downloadedBytes,
      syncSelection: "bibleeveryone-image",
      sourceLabel: "BibleEveryone 聖經圖庫",
    }),
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const html = await fetchText(options.sourceUrl);
  const cards = extractImageCards(html, options.sourceUrl);

  if (cards.length !== 512) {
    throw new Error(`Expected 512 BibleEveryone image cards, found ${cards.length}`);
  }

  const usedFileNames = new Set();
  const assetInfos = await mapWithConcurrency(cards, downloadConcurrency, async (card, index) => {
    return await downloadImage(card, index, usedFileNames);
  });
  const usedIds = new Set();
  const resources = cards.map((card, index) => normalizeResource(card, index, assetInfos[index], usedIds, options.sourceUrl));
  const navigationLabelCounts = {};

  for (const resource of resources) {
    for (const label of resource.debugMeta?.navigationLabels ?? []) {
      navigationLabelCounts[label] = (navigationLabelCounts[label] ?? 0) + 1;
    }
  }

  const payload = {
    metadata: {
      downloadedImageCount: resources.length,
      generatedAt: new Date().toISOString(),
      navigationLabelCounts,
      sourceUrl: options.sourceUrl,
      totalImages: resources.length,
    },
    resources,
  };

  await mkdir(path.dirname(outputJsonPath), { recursive: true });
  await writeFile(outputJsonPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`[syncBibleEveryoneImages] wrote ${resources.length} resources to ${outputJsonPath}`);
  console.log(`[syncBibleEveryoneImages] downloaded ${assetInfos.length} images to ${publicResourceRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
