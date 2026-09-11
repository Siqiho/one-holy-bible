#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptPath), "..");
const genesisResourcesPath = join(repoRoot, "src/data/genesisResources.ts");
const placementsPath = join(repoRoot, "src/data/genesisResourcePlacements.ts");
const sourceMetaPath = join(repoRoot, "src/data/genesisResourceSourceMeta.ts");
const cmcAssetDir = join(repoRoot, "src/assets/resources/genesis/images/cmc-01");

function parseOutputPath(args) {
  if (args.length === 0) return null;
  if (args.length === 2 && args[0] === "--output" && args[1]) {
    return resolve(args[1]);
  }
  throw new Error("Usage: node scripts/auditGenesisResourceCards.mjs [--output <path>]");
}

function readSourceFile(path) {
  return ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function unwrapExpression(node) {
  let current = node;
  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isSatisfiesExpression?.(current)
    || ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function literalToValue(node, constants = new Map()) {
  const expression = unwrapExpression(node);
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (expression.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isIdentifier(expression) && constants.has(expression.text)) return constants.get(expression.text);
  if (ts.isArrayLiteralExpression(expression)) return expression.elements.map((element) => literalToValue(element, constants));
  if (ts.isObjectLiteralExpression(expression)) {
    const value = {};
    for (const property of expression.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name = propertyName(property.name);
      value[name] = literalToValue(property.initializer, constants);
    }
    return value;
  }
  return expression.getText();
}

function propertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return name.getText();
}

function collectTopLevelConstants(sourceFile) {
  const constants = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const initializer = unwrapExpression(declaration.initializer);
      if (
        ts.isStringLiteral(initializer)
        || ts.isNoSubstitutionTemplateLiteral(initializer)
        || ts.isNumericLiteral(initializer)
      ) {
        constants.set(declaration.name.text, literalToValue(initializer, constants));
      }
    }
  }
  return constants;
}

function findVariableInitializer(sourceFile, variableName) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === variableName) {
        return declaration.initializer;
      }
    }
  }
  throw new Error(`Unable to find ${variableName} in ${sourceFile.fileName}`);
}

function extractArray(sourceFile, variableName, constants = new Map()) {
  const initializer = unwrapExpression(findVariableInitializer(sourceFile, variableName));
  if (!ts.isArrayLiteralExpression(initializer)) {
    throw new Error(`${variableName} is not an array literal`);
  }
  return literalToValue(initializer, constants);
}

function extractNewMap(sourceFile, variableName, constants = new Map()) {
  const initializer = unwrapExpression(findVariableInitializer(sourceFile, variableName));
  if (!ts.isNewExpression(initializer) || initializer.expression.getText() !== "Map") {
    throw new Error(`${variableName} is not a Map literal`);
  }
  const entries = unwrapExpression(initializer.arguments?.[0]);
  if (!entries || !ts.isArrayLiteralExpression(entries)) {
    throw new Error(`${variableName} does not use an array literal initializer`);
  }
  return new Map(entries.elements.map((entry) => literalToValue(entry, constants)));
}

function extractNewSet(sourceFile, variableName, constants = new Map()) {
  const initializer = unwrapExpression(findVariableInitializer(sourceFile, variableName));
  if (!ts.isNewExpression(initializer) || initializer.expression.getText() !== "Set") {
    throw new Error(`${variableName} is not a Set literal`);
  }
  const entries = unwrapExpression(initializer.arguments?.[0]);
  if (!entries || !ts.isArrayLiteralExpression(entries)) {
    throw new Error(`${variableName} does not use an array literal initializer`);
  }
  return new Set(literalToValue(entries, constants));
}

function readManifest(manifestPath) {
  const byFilename = new Map();
  const byStoredRelativePath = new Map();
  let lineCount = 0;
  try {
    const lines = readFileSync(manifestPath, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!line.trim()) return;
      lineCount += 1;
      const entry = JSON.parse(line);
      entry.__line = index + 1;
      if (entry.stored_filename) byFilename.set(entry.stored_filename, entry);
      if (entry.stored_relative_path) byStoredRelativePath.set(entry.stored_relative_path, entry);
    });
  } catch (error) {
    return { exists: false, error: error.message, lineCount: 0, byFilename, byStoredRelativePath };
  }
  return { exists: true, error: null, lineCount, byFilename, byStoredRelativePath };
}

function fileStem(fileName) {
  return fileName.replace(/\.png$/i, "");
}

function resourceSlug(fileName) {
  return fileStem(fileName).replace(/_/g, "-").toLowerCase();
}

function rangeText(ranges = [], separator = ";") {
  return ranges.map((range) => range.end && range.end !== range.start ? `${range.start}-${range.end}` : range.start).join(separator);
}

function parseVerseId(verseId) {
  const match = String(verseId).match(/^Gen\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return { chapter: Number(match[1]), verse: Number(match[2]) };
}

function compareVerseIds(left, right) {
  const leftParts = parseVerseId(left);
  const rightParts = parseVerseId(right);
  if (!leftParts || !rightParts) return 0;
  return leftParts.chapter === rightParts.chapter
    ? leftParts.verse - rightParts.verse
    : leftParts.chapter - rightParts.chapter;
}

function estimatedVerseCount(ranges = []) {
  let count = 0;
  for (const range of ranges) {
    if (!range.end || range.end === range.start) {
      count += 1;
      continue;
    }
    const start = parseVerseId(range.start);
    const end = parseVerseId(range.end);
    if (!start || !end) {
      count += 1;
    } else if (start.chapter === end.chapter) {
      count += Math.max(1, end.verse - start.verse + 1);
    } else {
      count += 40;
    }
  }
  return count;
}

function guessVisualSubtype({ filename, placement, sourceMeta, manifestEntry, title = "" }) {
  const text = [
    title,
    sourceMeta?.sourceEvidenceSnippet,
    sourceMeta?.sourceTextSnippet,
    manifestEntry?.evidence_snippet,
    manifestEntry?.reason,
  ].filter(Boolean).join(" ");
  const width = Number(manifestEntry?.width ?? filename.match(/_(\d+)x(\d+)\.png$/)?.[1] ?? 0);
  const height = Number(manifestEntry?.height ?? filename.match(/_(\d+)x(\d+)\.png$/)?.[2] ?? 0);
  if (placement?.scope === "book-intro" && /封面|题名|创世记/.test(text)) return "cover-or-title";
  if (/地图|行踪|路线|分布|近东|美索不达米亚|迦南|埃及|吾珥|哈兰|谷/.test(text)) return "map-or-route";
  if (/表|图表|数码|三角|大卫星|比例|周期|谱|标志|徽记/.test(text)) return "diagram-or-chart";
  if (/画|艺术|照片|像|浮雕|雕像|遗址|城|庙塔|金字塔|泥版|印章|戒指|刀|车|木偶|首饰/.test(text)) return "artifact-or-photo";
  if (height > width * 1.35) return "portrait-figure";
  if (width > height * 1.45) return "wide-figure";
  return "figure";
}

function navigationRisk({ placement, verseCount, sourceMeta }) {
  if (!placement) return "missing-placement";
  if (placement.scope === "book-intro") return "book-intro";
  if ((placement.ranges?.length ?? 0) > 1) return "multi-range";
  if (placement.confidence === "low") return "low-confidence-placement";
  if (verseCount > 35) return "broad-range";
  if (sourceMeta?.sourceEvidenceType === "page_text") return "weak-source-cue";
  return "normal";
}

function cardRiskLevel(flags) {
  if (flags.includes("non-reader-filtered")) return "excluded";
  if (flags.some((flag) => [
    "missing-placement",
    "missing-source-meta",
    "missing-manifest-entry",
    "manifest-decision-not-keep",
    "low-placement-confidence",
  ].includes(flag))) return "high";
  if (flags.some((flag) => [
    "medium-placement-confidence",
    "broad-navigation-range",
    "multi-range-placement",
    "weak-source-evidence",
  ].includes(flag))) return "medium";
  return "low";
}

function buildRiskFlags({ placement, sourceMeta, manifestEntry, replacementFileName, verseCount }) {
  const flags = [];
  if (!placement) flags.push("missing-placement");
  if (!sourceMeta) flags.push("missing-source-meta");
  if (!manifestEntry) flags.push("missing-manifest-entry");
  if (manifestEntry && manifestEntry.decision !== "keep") flags.push("manifest-decision-not-keep");
  if (placement?.confidence === "low") flags.push("low-placement-confidence");
  if (placement?.confidence === "medium") flags.push("medium-placement-confidence");
  if (placement?.scope === "book-intro") flags.push("book-intro");
  if ((placement?.ranges?.length ?? 0) > 1) flags.push("multi-range-placement");
  if (verseCount > 35 || (placement?.ranges?.length ?? 0) > 3) flags.push("broad-navigation-range");
  if (sourceMeta?.sourceEvidenceType === "page_text" && placement?.scope !== "book-intro") flags.push("weak-source-evidence");
  if (sourceMeta?.sourceEvidenceOrigin === "next-page") flags.push("caption-from-next-page");
  for (const captionRiskFlag of sourceMeta?.captionRiskFlags ?? []) {
    if (!flags.includes(captionRiskFlag)) flags.push(captionRiskFlag);
  }
  if (replacementFileName) flags.push("uses-cropped-replacement");
  return flags;
}

function buildCandidateRiskFlags({ placement, sourceMeta, manifestEntry, replacementFileName, verseCount, isVisible }) {
  const flags = buildRiskFlags({ placement, sourceMeta, manifestEntry, replacementFileName, verseCount });
  if (!isVisible) flags.push("non-reader-filtered");
  if (sourceMeta?.sourceEvidenceType === "verse_context") flags.push("contextual-source-evidence");
  if (sourceMeta?.sourceEvidenceSnippet && figureCueCount(sourceMeta.sourceEvidenceSnippet) > 1) {
    flags.push("multi-caption-snippet");
  }
  if (manifestEntry) {
    const width = Number(manifestEntry.width ?? 0);
    const height = Number(manifestEntry.height ?? 0);
    if (width < 250 || height < 30) flags.push("tiny-or-narrow-visual");
  }
  return flags;
}

function figureCueCount(text) {
  return Array.from(String(text).matchAll(/(?:上|下|左|右)?图[:：]/g)).length;
}

function titleForCard(filename, manualCopy, sourceMeta, placement) {
  if (manualCopy?.title) return manualCopy.title;
  if (placement?.scope === "book-intro") return "创世记导论";
  const candidate = sourceMeta?.sourceEvidenceSnippet
    ?.replace(/^(?:上|下|左|右)?图[:：]\s*/, "")
    .split(/[。；，]/)[0]
    ?.replace(/[（(][^）)]*[A-Za-z][^）)]*[）)]/g, "")
    .replace(/\s+/g, "")
    .trim();
  return candidate && candidate.length <= 32 ? candidate : `创世记 ${rangeText(placement?.ranges ?? [])}`;
}

function primaryAnchorForPlacement(placement) {
  if (!placement || placement.scope === "book-intro") return null;
  return placement.primaryAnchor ?? placement.ranges?.[0]?.start ?? null;
}

function compactTrace({ sourceMeta, manifestEntry }) {
  return {
    sourcePdf: sourceMeta?.sourcePdf ?? manifestEntry?.source_pdf ?? null,
    sourcePdfPath: sourceMeta?.sourcePdfPath ?? manifestEntry?.source_pdf_path ?? null,
    sourcePdfSha256: sourceMeta?.sourcePdfSha256 ?? manifestEntry?.source_pdf_sha256 ?? null,
    manifestPath: sourceMeta?.sourceManifestPath ?? null,
    ledgerPath: sourceMeta?.sourceLedgerPath ?? null,
    manifestLine: manifestEntry?.__line ?? null,
    manifestDecision: manifestEntry?.decision ?? null,
    sourceEvidenceType: sourceMeta?.sourceEvidenceType ?? manifestEntry?.evidence_type ?? null,
    sourceEvidenceSnippet: sourceMeta?.sourceEvidenceSnippet ?? manifestEntry?.evidence_snippet ?? null,
    sourceEvidencePage: sourceMeta?.sourceEvidencePage ?? manifestEntry?.evidence_page ?? null,
    sourceEvidenceOrigin: sourceMeta?.sourceEvidenceOrigin ?? manifestEntry?.evidence_origin ?? null,
    captionRiskFlags: sourceMeta?.captionRiskFlags ?? manifestEntry?.caption_risk_flags ?? [],
    samePageImageCount: sourceMeta?.samePageImageCount ?? manifestEntry?.same_page_image_count ?? null,
    samePageCaptionCount: sourceMeta?.samePageCaptionCount ?? manifestEntry?.same_page_caption_count ?? null,
    sourceTextSource: sourceMeta?.sourceTextSource ?? manifestEntry?.text_source ?? null,
    sourceTextSnippet: sourceMeta?.sourceTextSnippet ?? manifestEntry?.text_snippet ?? null,
    storedRelativePath: sourceMeta?.storedRelativePath ?? manifestEntry?.stored_relative_path ?? null,
    storedAbsolutePath: sourceMeta?.storedAbsolutePath ?? manifestEntry?.stored_absolute_path ?? null,
    objectId: sourceMeta?.objectId ?? manifestEntry?.object_id ?? null,
    imageNum: sourceMeta?.imageNum ?? manifestEntry?.image_num ?? null,
    page: sourceMeta?.page ?? manifestEntry?.page ?? null,
    pageCount: sourceMeta?.pageCount ?? manifestEntry?.page_count ?? null,
  };
}

export function buildGenesisResourceAuditReport() {
  const resourcesSource = readSourceFile(genesisResourcesPath);
  const placementsSource = readSourceFile(placementsPath);
  const sourceMetaSource = readSourceFile(sourceMetaPath);
  const sourceMetaConstants = collectTopLevelConstants(sourceMetaSource);

  const manualCopyByFilename = extractNewMap(resourcesSource, "manualReaderCopyByFilename");
  const generatedTitleOverrideByFilename = extractNewMap(resourcesSource, "generatedTitleOverrideByFilename");
  const nonReaderCardFileNames = extractNewSet(resourcesSource, "nonReaderCardFileNames");
  const cropFileNamesByOriginal = extractNewMap(resourcesSource, "codexV2CropFileNamesByOriginal");
  const placements = extractArray(placementsSource, "genesisResourcePlacements");
  const placementByFilename = new Map(placements.map((placement) => [placement.filename, placement]));
  const sourceMetaByFilename = extractNewMap(sourceMetaSource, "genesisResourceSourceMetaByFilename", sourceMetaConstants);
  const manifestPath = sourceMetaConstants.get("GENESIS_RESOURCE_SOURCE_MANIFEST_PATH");
  const manifest = readManifest(manifestPath);

  const visibleGroups = [
    {
      folderLabel: "src/assets/resources/genesis/images/cmc-01",
      idPrefix: "genesis-cmc-01",
      sourceFolder: "CMC-01_副本",
      filenames: readdirSync(cmcAssetDir).filter((name) => name.endsWith(".png")).filter((name) => !nonReaderCardFileNames.has(name)),
    },
    {
      folderLabel: "src/assets/resources/genesis/images/ohb-genesis-codex-v2",
      replacementFolderLabel: "src/assets/resources/genesis/images/ohb-genesis-codex-v2-crops",
      idPrefix: "genesis-ohb-genesis-codex-v2",
      sourceFolder: "01_创世记-v3",
      filenames: Array.from(cropFileNamesByOriginal.keys()),
    },
  ];
  const visibleFilenames = new Set(visibleGroups.flatMap((group) => group.filenames));

  const candidateCards = Array.from(placementByFilename.keys()).sort((left, right) => left.localeCompare(right)).map((filename) => {
    const placement = placementByFilename.get(filename);
    const sourceMeta = sourceMetaByFilename.get(filename);
    const manifestEntry = sourceMeta
      ? manifest.byStoredRelativePath.get(sourceMeta.storedRelativePath) ?? manifest.byFilename.get(sourceMeta.storedFilename)
      : manifest.byFilename.get(filename);
    const replacementFileName = cropFileNamesByOriginal.get(filename);
    const verseCount = estimatedVerseCount(placement?.ranges);
    const manualCopy = manualCopyByFilename.get(filename);
    const generatedTitleOverride = generatedTitleOverrideByFilename.get(filename);
    const title = manualCopy?.title ?? generatedTitleOverride ?? titleForCard(filename, manualCopy, sourceMeta, placement);
    const copySource = manualCopy
      ? "manualReaderCopyByFilename"
      : generatedTitleOverride
        ? "generatedTitleOverrideByFilename"
        : "generated";
    const primaryAnchor = primaryAnchorForPlacement(placement);
    const isVisible = visibleFilenames.has(filename);
    const flags = buildCandidateRiskFlags({ placement, sourceMeta, manifestEntry, replacementFileName, verseCount, isVisible });
    const visibleGroup = visibleGroups.find((group) => group.filenames.includes(filename));

    return {
      id: visibleGroup ? `${visibleGroup.idPrefix}-${resourceSlug(filename)}` : null,
      fileName: filename,
      filename,
      isVisible,
      replacementFilename: replacementFileName ?? null,
      title,
      type: "image",
      sourceFolder: visibleGroup?.sourceFolder ?? null,
      folderLabel: visibleGroup ? (replacementFileName ? visibleGroup.replacementFolderLabel : visibleGroup.folderLabel) : null,
      placement: placement ? {
        scope: placement.scope ?? null,
        ranges: placement.ranges ?? [],
        confidence: placement.confidence,
        evidence: placement.evidence,
        verseCount,
        rangeText: placement.scope === "book-intro" ? "创世记导论" : rangeText(placement.ranges),
        firstVerse: placement.ranges?.[0]?.start ?? null,
        lastVerse: placement.ranges?.at(-1)?.end ?? placement.ranges?.at(-1)?.start ?? null,
        primaryAnchor,
        relatedRanges: placement.relatedRanges ?? [],
      } : null,
      copy: {
        source: copySource,
        summary: manualCopy?.summary ?? null,
        verseReference: manualCopy?.verseReference ?? (placement?.scope === "book-intro" ? "创世记导论" : rangeText(placement?.ranges ?? [])),
        confidence: manualCopy?.confidence ?? placement?.confidence ?? null,
      },
      visualSubtype: guessVisualSubtype({ filename, placement, sourceMeta, manifestEntry, title }),
      navigationRisk: navigationRisk({ placement, verseCount, sourceMeta }),
      primaryAnchor,
      riskFlags: flags,
      riskLevel: cardRiskLevel(flags),
      sourceTrace: compactTrace({ sourceMeta, manifestEntry }),
    };
  });

  const visibleCards = candidateCards.filter((card) => card.isVisible);
  const navigationRisks = visibleCards
    .filter((card) => card.navigationRisk !== "normal" && card.navigationRisk !== "book-intro")
    .map((card) => ({
      fileName: card.fileName,
      navigationRisk: card.navigationRisk,
      riskLevel: card.riskLevel,
      ranges: card.placement?.ranges ?? [],
      primaryAnchor: card.primaryAnchor,
      verseCount: card.placement?.verseCount ?? 0,
      confidence: card.placement?.confidence ?? null,
      sourceEvidenceType: card.sourceTrace.sourceEvidenceType,
    }));

  const riskSummary = countBy(candidateCards, "riskLevel");
  for (const key of ["high", "medium", "low", "excluded"]) {
    riskSummary[key] ??= 0;
  }

  const summary = {
    visibleCards: visibleCards.length,
    totalCards: visibleCards.length,
    candidateCards: candidateCards.length,
    sourceMeta: sourceMetaByFilename.size,
    placements: placements.length,
    nonReader: nonReaderCardFileNames.size,
    riskSummary,
    cardsByRiskLevel: countBy(visibleCards, "riskLevel"),
    cardsByNavigationRisk: countBy(visibleCards, "navigationRisk"),
    cardsByVisualSubtype: countBy(visibleCards, "visualSubtype"),
    cardsByCopySource: countBy(visibleCards, (card) => card.copy.source),
    cardsWithManifestTrace: visibleCards.filter((card) => card.sourceTrace.manifestLine).length,
    cardsWithSourceMeta: visibleCards.filter((card) => card.sourceTrace.sourcePdf).length,
    manifest: {
      path: manifestPath,
      exists: manifest.exists,
      lineCount: manifest.lineCount,
      error: manifest.error,
    },
  };

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    inputs: {
      genesisResourcesPath,
      placementsPath,
      sourceMetaPath,
      manifestPath,
    },
    summary,
    riskSummary,
    navigationRisks,
    cards: visibleCards,
    candidateCards,
  };
}

export function runCli(args = process.argv.slice(2)) {
  const outputPath = parseOutputPath(args);
  const json = `${JSON.stringify(buildGenesisResourceAuditReport(), null, 2)}\n`;
  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, json);
  } else {
    process.stdout.write(json);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  runCli();
}

function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = typeof selector === "function" ? selector(item) : item[selector];
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}
