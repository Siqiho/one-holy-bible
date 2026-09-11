import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const scriptPath = join(repoRoot, "scripts/auditGenesisResourceCards.mjs");

function runAudit(args = []) {
  return execFileSync("node", [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

describe("auditGenesisResourceCards", () => {
  it("prints a complete Genesis card audit JSON report to stdout by default", () => {
    const report = JSON.parse(runAudit());

    expect(report.schemaVersion).toBe(1);
    expect(report.generatedAt).toEqual(expect.any(String));
    expect(report.summary.totalCards).toBeGreaterThan(200);
    expect(report.summary.cardsWithManifestTrace).toBe(report.summary.totalCards);
    expect(report.summary.cardsByRiskLevel).toEqual(expect.objectContaining({
      low: expect.any(Number),
      medium: expect.any(Number),
      high: expect.any(Number),
    }));
    expect(Array.isArray(report.cards)).toBe(true);
    expect(report.cards).toHaveLength(report.summary.totalCards);

    const introCard = report.cards.find((card) => card.filename === "p001_img000_670x452.png");
    expect(introCard).toEqual(expect.objectContaining({
      id: "genesis-cmc-01-p001-img000-670x452",
      title: "创世记",
      filename: "p001_img000_670x452.png",
      visualSubtype: "cover-or-title",
      navigationRisk: "book-intro",
      riskLevel: "low",
    }));
    expect(introCard.riskFlags).toContain("book-intro");
    expect(introCard.sourceTrace).toEqual(expect.objectContaining({
      sourcePdf: "CMC-01_副本.pdf",
      sourcePdfPath: "/Users/simon/OHB/文档/创世纪/CMC-01_副本.pdf",
      manifestPath: "/Users/simon/OHB/Resources/01_创世记/文档图片内容提取_20260515_121143/manifest.jsonl",
      ledgerPath: "/Users/simon/OHB/Resources/01_创世记/文档图片内容提取_20260515_121143/资源审计台账.jsonl",
      manifestLine: 13,
      manifestDecision: "keep",
      sourceEvidenceType: "page_text",
      sourceEvidencePage: 1,
      sourceEvidenceOrigin: "same-page",
    }));

    const lowConfidenceCard = report.cards.find((card) => card.filename === "p063_img035_650x465.png");
    expect(lowConfidenceCard.riskFlags).toContain("low-placement-confidence");
    expect(lowConfidenceCard.riskLevel).toBe("high");
  });

  it("writes only when --output is provided", () => {
    const dir = mkdtempSync(join(tmpdir(), "ohb-audit-"));
    const outputPath = join(dir, "report.json");
    try {
      const stdout = runAudit(["--output", outputPath]);
      expect(stdout.trim()).toBe("");
      expect(existsSync(outputPath)).toBe(true);
      const report = JSON.parse(readFileSync(outputPath, "utf8"));
      expect(report.summary.totalCards).toBeGreaterThan(200);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
