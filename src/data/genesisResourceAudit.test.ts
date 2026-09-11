import { describe, expect, it } from "vitest";

import { buildGenesisResourceAuditReport } from "../../scripts/auditGenesisResourceCards.mjs";

describe("buildGenesisResourceAuditReport", () => {
  it("summarizes Genesis audit coverage and risk buckets", () => {
    const report = buildGenesisResourceAuditReport();

    expect(report.summary).toMatchObject({
      visibleCards: 238,
      sourceMeta: 244,
      placements: 244,
      nonReader: 6,
    });

    expect(report.riskSummary).toEqual(
      expect.objectContaining({
        high: expect.any(Number),
        medium: expect.any(Number),
        low: expect.any(Number),
        excluded: expect.any(Number),
      }),
    );
    expect(report.summary.riskSummary).toEqual(report.riskSummary);
    expect(report.summary.totalCards).toBe(238);
    expect(report.summary.candidateCards).toBe(244);
    expect(report.cards).toHaveLength(238);
  });

  it("surfaces representative broad and multi-verse navigation risks", () => {
    const report = buildGenesisResourceAuditReport();
    const navigationRiskIds = report.navigationRisks.map((entry) => entry.fileName);

    expect(navigationRiskIds).toEqual(expect.arrayContaining([
      "p397_img217_720x891.png",
      "p420_img231_692x901.png",
    ]));

    expect(report.navigationRisks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "p397_img217_720x891.png",
          navigationRisk: "multi-range",
        }),
        expect.objectContaining({
          fileName: "p420_img231_692x901.png",
          navigationRisk: "multi-range",
        }),
      ]),
    );
  });

  it("reports explicit primary anchors for broad and multi-range navigation review", () => {
    const report = buildGenesisResourceAuditReport();

    expect(report.navigationRisks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "p212_img120_720x989.png",
          navigationRisk: "multi-range",
          primaryAnchor: "Gen.16.7",
        }),
        expect.objectContaining({
          fileName: "p397_img217_720x891.png",
          navigationRisk: "multi-range",
          primaryAnchor: "Gen.27.43",
        }),
        expect.objectContaining({
          fileName: "p420_img231_692x901.png",
          navigationRisk: "multi-range",
          primaryAnchor: "Gen.37.28",
        }),
      ]),
    );
  });

  it("audits the reader-facing title and copy source used by runtime cards", () => {
    const report = buildGenesisResourceAuditReport();
    const babelPainting = report.cards.find((card) => card.fileName === "p131_img071_720x527.png");
    const beerLahaiRoi = report.cards.find((card) => card.fileName === "p179_img105_720x989.png");

    expect(babelPainting).toMatchObject({
      title: "勃鲁盖尔《巴别塔》",
      copy: expect.objectContaining({
        source: "generatedTitleOverrideByFilename",
      }),
    });
    expect(beerLahaiRoi).toMatchObject({
      title: "庇耳·拉海·莱井",
      copy: expect.objectContaining({
        source: "manualReaderCopyByFilename",
        summary: expect.stringContaining("加低斯和巴列中间"),
      }),
    });
  });

  it("carries next-page caption provenance into the p046 source trace", () => {
    const report = buildGenesisResourceAuditReport();
    const lifeTree = report.cards.find((card) => card.fileName === "p046_img031_720x383.png");

    expect(report.summary.manifest.path).toBe(
      "/Users/simon/OHB/Resources/01_创世记/文档图片内容提取_20260515_121143/manifest.jsonl",
    );
    expect(lifeTree).toMatchObject({
      title: "苏美尔生命树的壁画",
      sourceTrace: expect.objectContaining({
        sourceEvidenceType: "figure_caption",
        sourceEvidencePage: 47,
        sourceEvidenceOrigin: "next-page",
        captionRiskFlags: ["caption-boundary-truncated", "caption-from-next-page"],
      }),
    });
  });

  it("serializes cards in deterministic sorted order", () => {
    const report = buildGenesisResourceAuditReport();
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json) as {
      cards: Array<{ fileName: string }>;
    };

    expect(parsed.cards.map((card) => card.fileName)).toEqual([
      ...parsed.cards.map((card) => card.fileName).sort((left, right) => left.localeCompare(right)),
    ]);
    expect(JSON.stringify(parsed)).toBe(json);
  });

  it("keeps excluded non-reader files out of visible cards while preserving candidate audit counts", () => {
    const report = buildGenesisResourceAuditReport();
    const visibleFileNames = new Set(report.cards.map((card) => card.fileName));

    expect(visibleFileNames).not.toContain("p165_img097_53x23.png");
    expect(visibleFileNames).not.toContain("p247_img135_211x23.png");
    expect(report.candidateCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ fileName: "p165_img097_53x23.png", riskLevel: "excluded" }),
      expect.objectContaining({ fileName: "p381_img210_720x712.png", riskLevel: "excluded" }),
    ]));
  });
});
