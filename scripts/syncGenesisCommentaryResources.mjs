#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptPath), "..");
const ledgerPath = resolve(
  repoRoot,
  "../Resources/01_创世记/无图经文注释卡片台账_20260514_181756/资源审计台账.jsonl",
);
const outputPath = join(repoRoot, "src/data/genesisCommentaryResources.ts");
const jsonOutputPath = join(repoRoot, "src/data/generated/genesisCommentaryResources.json");
const expectedCardCount = 1625;
const sourceGeneratedAt = "2026-05-14T18:17:56+08:00";
const scriptureOnlyCmcSummaryPattern = /^圣经综合解读中创世记 .* 的经文注释。$/;
const genesisVerseCounts = [
  31, 25, 24, 26, 32, 22, 24, 22, 29, 32,
  32, 20, 18, 24, 21, 16, 27, 33, 38, 18,
  34, 24, 20, 67, 34, 35, 46, 22, 35, 43,
  55, 32, 20, 31, 29, 43, 36, 30, 23, 23,
  57, 38, 34, 34, 28, 34, 31, 22, 33, 26,
];

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${path}:${index + 1}: ${error.message}`);
      }
    });
}

function parseGenesisVerseId(verseId) {
  const match = String(verseId).match(/^Gen\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid Genesis verse id: ${verseId}`);

  const chapter = Number(match[1]);
  const verse = Number(match[2]);
  const chapterVerseCount = genesisVerseCounts[chapter - 1];
  if (!chapterVerseCount || verse < 1 || verse > chapterVerseCount) {
    throw new Error(`Genesis verse id is outside the canonical verse table: ${verseId}`);
  }

  return { chapter, verse };
}

function compareVerseIds(left, right) {
  const leftParts = parseGenesisVerseId(left);
  const rightParts = parseGenesisVerseId(right);
  if (leftParts.chapter !== rightParts.chapter) {
    return leftParts.chapter - rightParts.chapter;
  }
  return leftParts.verse - rightParts.verse;
}

function expandGenesisRange(range) {
  const start = parseGenesisVerseId(range.start);
  const endVerseId = range.end ?? range.start;
  const end = parseGenesisVerseId(endVerseId);
  if (compareVerseIds(range.start, endVerseId) > 0) {
    throw new Error(`Range start is after end: ${range.start}-${endVerseId}`);
  }

  const verses = [];
  for (let chapter = start.chapter; chapter <= end.chapter; chapter += 1) {
    const firstVerse = chapter === start.chapter ? start.verse : 1;
    const lastVerse = chapter === end.chapter ? end.verse : genesisVerseCounts[chapter - 1];
    for (let verse = firstVerse; verse <= lastVerse; verse += 1) {
      verses.push(`Gen.${chapter}.${verse}`);
    }
  }
  return verses;
}

function unique(values) {
  return Array.from(new Set(values));
}

function truncateEvidence(text, maxLength = 700) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

function nonEmptyString(value, fieldName, id) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${fieldName} for ${id}`);
  }
  return value;
}

function optionalObjectValue(object, key) {
  return object && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined;
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function isScriptureOnlyCmcRow(row) {
  return row.source_stream === "cmc-comprehensive-commentary"
    && scriptureOnlyCmcSummaryPattern.test(row.card_draft?.summary ?? "");
}

function patchKnownStudyBibleBoundary(row) {
  if (row.commentary_key !== "study-note-gen-39-6-9") return row;

  const body = String(row.card_draft?.body ?? "");
  const boundary = body.indexOf("\n\n75 创世记 39:9");
  if (boundary === -1) return row;

  const patchedBody = body.slice(0, boundary).trim();
  return {
    ...row,
    card_draft: {
      ...row.card_draft,
      body: patchedBody,
      searchText: [
        row.card_draft?.title,
        row.card_draft?.summary,
        patchedBody,
      ].filter(Boolean).join("\n"),
    },
    debugMeta: {
      ...row.debugMeta,
      body_chars: [...patchedBody].length,
      repair_note: "App sync trimmed OCR spillover after the 39:6-9 note; the following 39:10-12 note is published as a separate verified override.",
    },
  };
}

function verifiedStudyBibleOverrideRows() {
  return [
    {
      audit: {
        content_status: "verified-override",
        navigation_status: "verified",
        reader_inclusion: "reader-facing",
        review_status: "verified",
        risk_flags: ["manual-source-boundary-repair"],
        risk_level: "low",
      },
      card_draft: {
        body: "39:10-12 约瑟却不听从她，约瑟坚决拒绝波提乏妻子的挑逗。有一天他照常办事，波提乏的妻子拉住他的衣裳。约瑟无法挣脱，只好把衣裳丢在妇人手里，自己跑到外面。与37:31-33一样，约瑟的衣服在故事中扮演了重要角色，上次他的衣服也被用来欺骗人。",
        searchText: "创世记 39:10-12 研读本注释｜约瑟却不听从她\n39:10-12 约瑟坚决拒绝波提乏妻子的挑逗。\n39:10-12 约瑟却不听从她，约瑟坚决拒绝波提乏妻子的挑逗。有一天他照常办事，波提乏的妻子拉住他的衣裳。约瑟无法挣脱，只好把衣裳丢在妇人手里，自己跑到外面。与37:31-33一样，约瑟的衣服在故事中扮演了重要角色，上次他的衣服也被用来欺骗人。",
        subtype: "study-bible-note",
        summary: "39:10-12 约瑟坚决拒绝波提乏妻子的挑逗。",
        title: "创世记 39:10-12 研读本注释｜约瑟却不听从她",
        type: "commentary",
      },
      commentary_key: "study-note-gen-39-10-12",
      debugMeta: {
        body_chars: 123,
        generated_at: sourceGeneratedAt,
        heading: "39:10-12 约瑟却不听从她",
        repair_note: "Verified from pdftotext page 70 after the OCR ledger merged this block into study-note-gen-39-6-9.",
        subtype: "study-bible-note",
      },
      ledger_kind: "ohb_text_commentary_card_source",
      placement_draft: {
        basis: "Verified Study Bible note block on PDF page 70",
        confidence: "high",
        coverageRanges: [{ end: "Gen.39.12", start: "Gen.39.10" }],
        navigationRisk: "normal",
        primaryAnchor: "Gen.39.10",
        relatedRanges: [],
        scope: "range",
      },
      run_id: "verified-app-sync-overrides",
      schema_version: 1,
      source: {
        document_role: "primary_study_bible_notes",
        evidence_snippet: "39:10-12 约瑟却不听从她，约瑟坚决拒绝波提乏妻子的挑逗。有一天他照常办事，波提乏的妻子拉住他的衣裳。约瑟无法挣脱，只好把衣裳丢在妇人手里，自己跑到外面。与37:31-33一样，约瑟的衣服在故事中扮演了重要角色，上次他的衣服也被用来欺骗人。",
        evidence_type: "verified_pdftotext_note_block",
        heading: "39:10-12 约瑟却不听从她",
        page: 70,
        page_range: [70, 70],
        pdf: "01_创世记-v3_副本.pdf",
        pdf_path: "/Users/simon/OHB/文档/创世纪/01_创世记-v3_副本.pdf",
        pdf_sha256: "70af882c46632b4fe4ab470f1bfb6719e2847af1a754998ee353e0bb7f01f1c0",
        source_id: "study-bible-genesis-codex-v3-copy",
        source_label: "研读本圣经·创世记",
      },
      source_stream: "study-bible-notes",
      sync: {
        reason: "Verified manual boundary repair for app-facing StudyResource generation.",
        status: "verified",
        target_project: "/Users/simon/OHB/one-holy-bible",
      },
      sync_status: "verified",
    },
  ];
}

function normalizeDebugMeta(row, verses) {
  const source = row.source ?? {};
  const draftMeta = row.debugMeta ?? {};
  const placement = row.placement_draft ?? {};
  const audit = row.audit ?? {};
  const sync = row.sync ?? {};

  return compactObject({
    sourcePdf: source.pdf,
    sourcePdfPath: source.pdf_path,
    sourcePdfSha256: source.pdf_sha256,
    sourceTextSnippet: truncateEvidence(source.evidence_snippet),
    sourceEvidenceType: source.evidence_type,
    sourceEvidenceSnippet: truncateEvidence(source.evidence_snippet),
    page: source.page,
    pageRange: source.page_range,
    sourceId: source.source_id,
    sourceStream: row.source_stream,
    sourceLabel: source.source_label,
    documentRole: source.document_role,
    commentaryKey: row.commentary_key,
    runId: row.run_id,
    schemaVersion: row.schema_version,
    generatedAt: draftMeta.generated_at,
    bodyChars: draftMeta.body_chars,
    subtype: draftMeta.subtype ?? row.card_draft?.subtype,
    heading: draftMeta.heading ?? source.heading,
    estimatedSpan: draftMeta.estimated_span,
    displayRange: draftMeta.display_range,
    markerType: draftMeta.marker_type,
    rawMarker: draftMeta.raw_marker ?? source.raw_marker,
    repairNote: draftMeta.repair_note,
    navigationRepair: draftMeta.navigation_repair,
    confidence: placement.confidence,
    evidence: placement.basis,
    placementBasis: placement.basis,
    placementScope: placement.scope,
    primaryAnchor: placement.primaryAnchor,
    coverageRanges: placement.coverageRanges,
    relatedRanges: placement.relatedRanges,
    navigationRisk: placement.navigationRisk,
    riskLevel: audit.risk_level,
    riskFlags: audit.risk_flags,
    reviewStatus: audit.review_status,
    contentStatus: audit.content_status,
    navigationStatus: audit.navigation_status,
    readerInclusion: audit.reader_inclusion,
    syncStatus: row.sync_status ?? sync.status,
    sourceLedgerPath: ledgerPath,
    folderLabel: dirname(ledgerPath),
    pageCount: verses.length,
  });
}

function resourceFromLedgerRow(row) {
  const draft = row.card_draft ?? {};
  const placement = row.placement_draft ?? {};
  const id = nonEmptyString(row.commentary_key, "commentary_key", "unknown");
  const title = nonEmptyString(draft.title, "card_draft.title", id);
  const body = nonEmptyString(draft.body, "card_draft.body", id);
  const coverageRanges = placement.coverageRanges;
  if (!Array.isArray(coverageRanges) || coverageRanges.length === 0) {
    throw new Error(`Missing coverageRanges for ${id}`);
  }

  const primaryAnchor = nonEmptyString(placement.primaryAnchor, "placement_draft.primaryAnchor", id);
  parseGenesisVerseId(primaryAnchor);
  const verses = unique(coverageRanges.flatMap(expandGenesisRange));
  if (!verses.includes(primaryAnchor)) {
    throw new Error(`primaryAnchor is outside coverageRanges for ${id}: ${primaryAnchor}`);
  }

  const bodyChars = [...body].length;
  if (draft.body && optionalObjectValue(row.debugMeta, "body_chars") !== bodyChars) {
    throw new Error(`body_chars mismatch for ${id}: ${optionalObjectValue(row.debugMeta, "body_chars")} !== ${bodyChars}`);
  }

  return compactObject({
    id,
    title,
    type: "commentary",
    verses,
    primaryAnchor,
    body,
    summary: nonEmptyString(draft.summary, "card_draft.summary", id),
    searchText: nonEmptyString(draft.searchText, "card_draft.searchText", id),
    source: row.source?.source_label,
    createdAt: row.debugMeta?.generated_at,
    debugMeta: normalizeDebugMeta(row, verses),
  });
}

function validateResources(resources) {
  if (resources.length !== expectedCardCount) {
    throw new Error(`Expected ${expectedCardCount} Genesis commentary resources, received ${resources.length}`);
  }

  const ids = resources.map((resource) => resource.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate Genesis commentary ids: ${unique(duplicateIds).join(", ")}`);
  }

  for (const resource of resources) {
    if (resource.type !== "commentary") throw new Error(`Unexpected type for ${resource.id}: ${resource.type}`);
    if (!resource.verses.length) throw new Error(`Missing verses for ${resource.id}`);
    resource.verses.forEach(parseGenesisVerseId);
  }
}

function writeResources(resources) {
  const sourceLedgerPath = ledgerPath.replace(repoRoot, "<repo-root>");
  const sourceGeneratedAt = resources[0]?.debugMeta?.generatedAt ?? "unknown";
  const payload = {
    metadata: {
      sourceLedgerPath: ledgerPath,
      sourceGeneratedAt,
      totalResources: resources.length,
    },
    resources,
  };
  const content = [
    "import type { StudyResource } from \"../domain/resources\";",
    "import genesisCommentaryResourcesUrl from \"./generated/genesisCommentaryResources.json?url\";",
    "",
    `// Generated by scripts/syncGenesisCommentaryResources.mjs from ${sourceLedgerPath}.`,
    `// Source ledger generated at ${sourceGeneratedAt}. Do not hand-edit this file; update the Resources ledger and rerun the script.`,
    "interface GenesisCommentaryResourcesPayload {",
    "  metadata: {",
    "    sourceGeneratedAt: string;",
    "    sourceLedgerPath: string;",
    "    totalResources: number;",
    "  };",
    "  resources: StudyResource[];",
    "}",
    "",
    "let cachedPayload: Promise<GenesisCommentaryResourcesPayload> | null = null;",
    "",
    "export function loadGenesisCommentaryResourcePayload(): Promise<GenesisCommentaryResourcesPayload> {",
    "  cachedPayload ??= import.meta.env.MODE === \"test\"",
    "    ? import(\"./generated/genesisCommentaryResources.json\").then((module) => module.default as GenesisCommentaryResourcesPayload)",
    "    : fetch(genesisCommentaryResourcesUrl).then(async (response) => {",
    "      if (!response.ok) {",
    "        throw new Error(`Failed to load Genesis commentary resources JSON: ${response.status}`);",
    "      }",
    "      return await response.json() as GenesisCommentaryResourcesPayload;",
    "    }).catch((error: unknown) => {",
    "      cachedPayload = null;",
    "      throw error;",
    "    });",
    "  return cachedPayload;",
    "}",
    "",
    "export async function loadGenesisCommentaryResources(): Promise<StudyResource[]> {",
    "  const payload = await loadGenesisCommentaryResourcePayload();",
    "  return payload.resources;",
    "}",
    "",
  ].join("\n");

  mkdirSync(dirname(jsonOutputPath), { recursive: true });
  writeFileSync(jsonOutputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, "utf8");
}

const rows = [
  ...readJsonl(ledgerPath)
    .filter((row) => !isScriptureOnlyCmcRow(row))
    .map(patchKnownStudyBibleBoundary),
  ...verifiedStudyBibleOverrideRows(),
];
const resources = rows.map(resourceFromLedgerRow);
validateResources(resources);
writeResources(resources);

const sourceStreams = resources.reduce((counts, resource) => {
  const key = resource.debugMeta?.sourceStream ?? "unknown";
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {});
const longBodyCount = resources.filter((resource) => (resource.debugMeta?.bodyChars ?? 0) > 3000).length;

console.log(JSON.stringify({
  outputPath,
  totalResources: resources.length,
  totalVerseLinks: resources.reduce((sum, resource) => sum + resource.verses.length, 0),
  sourceStreams,
  longBodyCount,
}, null, 2));
