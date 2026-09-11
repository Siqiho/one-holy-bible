import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

import {
  generatedAtFromOptions,
  generateBibleEncyclopediaResourcePayload,
  normalizeOcrBody,
} from "./generateBibleEncyclopediaResources.mts";
import { validateBibleEncyclopediaResourcePayload } from "../src/data/bibleEncyclopediaResources";

const generator = join(process.cwd(), "scripts/generateBibleEncyclopediaResources.mts");
const temporaryRoots = new Set<string>();
const validVerseIds = new Set(["Gen.1.1", "Gen.1.2", "Exod.3.14", "John.1.1", "John.3.16"]);

afterEach(async () => {
  await Promise.all([...temporaryRoots].map((root) => rm(root, { recursive: true, force: true })));
  temporaryRoots.clear();
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "ohb-baike-resources-"));
  temporaryRoots.add(root);
  return root;
}

function anchoredInput() {
  return {
    metadata: {
      anchoredCount: 2,
      entryCount: 2,
    },
    entries: [
      {
        id: "anchor-god",
        title: "神",
        english: "God",
        body: "神启示自己，也见出三 14。",
        sourcePdfPages: [120, 121],
        headingPdfPage: 120,
        match: { inventoryTitle: "神", page: 57 },
        debugMeta: {
          section: "神名与三一",
          subsection: "上帝圣父",
          userParts: ["神名与三一（上帝/基督/圣灵）", "高频教义词"],
        },
        verses: ["Exod.3.14", "John.1.1"],
        primaryAnchor: "Exod.3.14",
        anchorRefs: [
          { field: "body", raw: "出三 14", verseIds: ["Exod.3.14"], confidence: "high" },
        ],
      },
      {
        id: "anchor-abraham",
        title: "亚伯拉罕",
        english: "Abraham",
        body: "亚伯拉罕的故事始于创一 1 测试锚点。",
        sourcePdfPages: [80],
        headingPdfPage: 80,
        match: { inventoryTitle: "亚伯拉罕", page: 17 },
        debugMeta: {
          section: "人名族名",
          subsection: "重要人名",
          userParts: ["全部新旧约人名", "重要人名族名"],
        },
        verses: ["Gen.1.1", "Gen.1.2"],
        primaryAnchor: "Gen.1.1",
        anchorRefs: [
          { field: "body", raw: "创一 1", verseIds: ["Gen.1.1"], confidence: "high" },
        ],
      },
    ],
  };
}

describe("generateBibleEncyclopediaResources", () => {
  it("removes OCR line wraps while preserving intentional paragraph breaks", () => {
    expect(normalizeOcrBody("第一行被\n扫描切开。\n\n第二段仍然\n连续。"))
      .toBe("第一行被扫描切开。\n\n第二段仍然连续。");
  });

  it("converts anchored entries into the validated Reader resource schema", () => {
    const payload = generateBibleEncyclopediaResourcePayload(anchoredInput(), {
      generatedAt: "2026-08-01T12:00:00.000Z",
    });
    const validated = validateBibleEncyclopediaResourcePayload(payload, validVerseIds);

    expect(validated.metadata).toMatchObject({
      category: "百科",
      generatedAt: "2026-08-01T12:00:00.000Z",
      resourceType: "link",
      source: "圣经百科辞典",
      totalResources: 2,
      version: "bible-encyclopedia-resources-v1",
    });
    expect(validated.metadata.categoryCounts).toMatchObject({
      "全部新旧约人名": 1,
      "重要人名族名": 1,
      "神名与三一（上帝/基督/圣灵）": 1,
      "高频教义词": 1,
    });
    expect(validated.resources[0]).toMatchObject({
      id: "bible-encyclopedia-0120-神",
      title: "神",
      type: "link",
      verses: ["Exod.3.14", "John.1.1"],
      primaryAnchor: "Exod.3.14",
      source: "圣经百科辞典",
      category: "百科",
      debugMeta: {
        english: "God",
        headingPdfPage: 120,
        page: 57,
        pageEnd: 58,
        pageLabel: "p.57-58",
        pdfPage: 120,
        pdfPageEnd: 121,
        sourceEntryId: "anchor-god",
        sourcePdfPath: "/Users/simon/OHB/圣经百科辞典.pdf",
        userParts: ["神名与三一（上帝/基督/圣灵）", "高频教义词"],
      },
    });
    expect(validated.resources[0].summary).toBe("神启示自己，也见出三 14。");
    expect(validated.resources[0].searchText).toContain("God");
    expect(validated.resources[0].searchText).toContain("神名与三一（上帝/基督/圣灵）");
  });

  it("keeps duplicate title/page IDs deterministic by appending stable occurrence suffixes", () => {
    const input = anchoredInput();
    input.entries = [input.entries[1], { ...input.entries[1], id: "anchor-abraham-copy" }];

    const first = generateBibleEncyclopediaResourcePayload(input, { generatedAt: "2026-08-01T12:00:00.000Z" });
    const second = generateBibleEncyclopediaResourcePayload(input, { generatedAt: "2026-08-01T12:00:00.000Z" });

    expect(first.resources.map((resource) => resource.id)).toEqual([
      "bible-encyclopedia-0080-亚伯拉罕",
      "bible-encyclopedia-0080-亚伯拉罕-2",
    ]);
    expect(first).toEqual(second);
  });

  it("requires a deterministic generatedAt from CLI args or SOURCE_DATE_EPOCH", () => {
    expect(generatedAtFromOptions("2026-08-01T12:00:00.000Z", {})).toBe("2026-08-01T12:00:00.000Z");
    expect(generatedAtFromOptions(undefined, { SOURCE_DATE_EPOCH: "1785585600" })).toBe("2026-08-01T12:00:00.000Z");
    expect(() => generatedAtFromOptions(undefined, {})).toThrow(/generated-at|SOURCE_DATE_EPOCH/i);
  });

  it("rejects unsupported categories before writing invalid Reader resources", () => {
    const input = anchoredInput();
    input.entries[0].debugMeta.userParts = ["历史人物"];

    expect(() => generateBibleEncyclopediaResourcePayload(input, {
      generatedAt: "2026-08-01T12:00:00.000Z",
    })).toThrow(/unsupported category/i);
  });

  it("rejects anchors whose primaryAnchor is not part of verses", () => {
    const input = anchoredInput();
    input.entries[0].primaryAnchor = "John.3.16";

    expect(() => generateBibleEncyclopediaResourcePayload(input, {
      generatedAt: "2026-08-01T12:00:00.000Z",
    })).toThrow(/primaryAnchor must be included in verses/i);
  });

  it("writes generated resources from CLI path arguments", async () => {
    const root = await temporaryRoot();
    const input = join(root, "entries-anchored.json");
    const output = join(root, "bibleEncyclopediaResources-v1.json");

    await writeFile(input, JSON.stringify(anchoredInput()));

    const result = spawnSync(process.execPath, [
      generator,
      "--input",
      input,
      "--output",
      output,
      "--generated-at",
      "2026-08-01T12:00:00.000Z",
    ], { encoding: "utf8" });

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Generated 2 Bible encyclopedia resources");

    const payload = JSON.parse(await readFile(output, "utf8"));
    expect(validateBibleEncyclopediaResourcePayload(payload, validVerseIds).resources).toHaveLength(2);
  });
});
