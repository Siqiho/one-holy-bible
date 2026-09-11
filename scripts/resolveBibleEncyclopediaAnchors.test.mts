import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

import {
  normalizeBibleEncyclopediaCitationText,
  resolveBibleEncyclopediaAnchors,
} from "./resolveBibleEncyclopediaAnchors.mts";

const temporaryRoots = new Set<string>();
const resolver = join(process.cwd(), "scripts/resolveBibleEncyclopediaAnchors.mts");

afterEach(async () => {
  await Promise.all([...temporaryRoots].map((root) => rm(root, { recursive: true, force: true })));
  temporaryRoots.clear();
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "ohb-baike-anchors-"));
  temporaryRoots.add(root);
  return root;
}

describe("resolveBibleEncyclopediaAnchors", () => {
  it("keeps high-confidence absolute refs, ranges, and traditional Chinese book tokens", () => {
    const result = resolveBibleEncyclopediaAnchors({
      entries: [
        {
          id: "god",
          title: "神",
          body: "单数是 Eloah（申三十二 15）或 El（创三十五 1），光也见（約壹一 5）。",
          provenance: { pdfPages: [12] },
        },
        {
          id: "range",
          title: "使徒",
          body: "职分名单见太10:2-4，也可参徒1:20。",
          provenance: { pdfPages: [13] },
        },
      ],
    });

    expect(result.anchored.entries).toHaveLength(2);
    expect(result.anchored.entries[0]).toMatchObject({
      id: "god",
      primaryAnchor: "Deut.32.15",
      verses: ["Deut.32.15", "Gen.35.1", "1John.1.5"],
      provenance: { pdfPages: [12] },
    });
    expect(result.anchored.entries[1]?.verses).toEqual([
      "Matt.10.2",
      "Matt.10.3",
      "Matt.10.4",
      "Acts.1.20",
    ]);
  });

  it("normalizes dictionary full-book citations and only whitelisted OCR book-name errors", () => {
    expect(normalizeBibleEncyclopediaCitationText("见《约伯记》第38章8至11节。"))
      .toBe("见（约伯记38:8-11）。");

    const result = resolveBibleEncyclopediaAnchors({
      entries: [
        {
          id: "incarnation",
          title: "道成肉身",
          body: "这就是《约輸福音》第\n1章1、14节所载。",
        },
        {
          id: "job",
          title: "到此为止",
          body: "出自《约伯记》第38章8至11节。",
        },
        {
          id: "unknown",
          title: "未知 OCR 书名",
          body: "见《约某福音》第1章1节。",
        },
      ],
    });

    expect(result.anchored.entries.map((entry) => ({
      id: entry.id,
      verses: entry.verses,
    }))).toEqual([
      { id: "incarnation", verses: ["John.1.1", "John.1.14"] },
      { id: "job", verses: ["Job.38.8", "Job.38.9", "Job.38.10", "Job.38.11"] },
    ]);
    expect(result.qa.noAnchorEntries[0]?.entry.id).toBe("unknown");
  });

  it("normalizes line-wrapped book tokens and expands trustworthy chapter-only citations", () => {
    const result = resolveBibleEncyclopediaAnchors({
      entries: [
        {
          id: "line-wrapped",
          title: "变水为酒",
          body: "见《约\n翰福音》第2章1至3节，也见（代\n上27:6）。",
        },
        {
          id: "chapter",
          title: "埃及的肉锅",
          body: "出自《出埃\n及记》第16章。",
        },
        {
          id: "chapter-range",
          title: "巴比伦的大淫妇",
          body: "出自《启示录》第17至18章。",
        },
        {
          id: "unknown-chapter",
          title: "非正典",
          body: "见《某某经》第2章。",
        },
      ],
    });

    expect(result.anchored.entries[0]?.verses).toEqual([
      "John.2.1",
      "John.2.2",
      "John.2.3",
      "1Chr.27.6",
    ]);
    expect(result.anchored.entries[1]?.primaryAnchor).toBe("Exod.16.1");
    expect(result.anchored.entries[1]?.verses).toHaveLength(36);
    expect(result.anchored.entries[1]?.verses.at(-1)).toBe("Exod.16.36");
    expect(result.anchored.entries[2]?.verses).toHaveLength(42);
    expect(result.anchored.entries[2]?.verses.at(-1)).toBe("Rev.18.24");
    expect(result.qa.noAnchorEntries.map((entry) => entry.entry.id)).toEqual(["unknown-chapter"]);
  });

  it("accepts valid carried-book chains but rejects relative-only fragments", () => {
    const result = resolveBibleEncyclopediaAnchors({
      entries: [
        {
          id: "chain",
          title: "蛇",
          body: "蛇的话也像（太三 7；十二 34；二十三 33），都在同一组引文中承接马太。",
          provenance: { pdfPages: [20] },
        },
        {
          id: "fragment",
          title: "巴别",
          body: "这里只残留 OCR 片段（十二 34），没有绝对书卷上下文。",
          provenance: { pdfPages: [21] },
        },
      ],
    });

    expect(result.anchored.entries.map((entry) => entry.id)).toEqual(["chain"]);
    expect(result.anchored.entries[0]?.verses).toEqual(["Matt.3.7", "Matt.12.34", "Matt.23.33"]);
    expect(result.qa.noAnchorEntries).toHaveLength(1);
    expect(result.qa.noAnchorEntries[0]).toMatchObject({
      reason: "no_scripture_refs_detected",
      entry: { id: "fragment" },
    });
  });

  it("dedupes verse IDs and uses the first accepted citation as primaryAnchor", () => {
    const result = resolveBibleEncyclopediaAnchors({
      entries: [
        {
          id: "dedupe",
          title: "重复引文（创一 1）",
          body: "正文又一次说（创一 1），随后才说（约一 1）。",
          provenance: { pdfPages: [30] },
        },
      ],
    });

    expect(result.anchored.entries[0]).toMatchObject({
      primaryAnchor: "Gen.1.1",
      verses: ["Gen.1.1", "John.1.1"],
    });
  });

  it("does not infer anchors from entity names or invalid coordinates", () => {
    const result = resolveBibleEncyclopediaAnchors({
      entries: [
        {
          id: "abraham",
          title: "亚伯拉罕",
          body: "这条只提到人物名，没有明确经文坐标。",
          provenance: { pdfPages: [40] },
        },
        {
          id: "invalid",
          title: "错误坐标",
          body: "这个 OCR 坐标越界（弗六 99），不能被收录。",
          provenance: { pdfPages: [41] },
        },
      ],
    });

    expect(result.anchored.entries).toEqual([]);
    expect(result.qa.noAnchorEntries.map((entry) => entry.entry.id)).toEqual(["abraham", "invalid"]);
  });

  it("quarantines medium-confidence bare comprehensive refs instead of promoting them", () => {
    const result = resolveBibleEncyclopediaAnchors({
      entries: [
        {
          id: "bare",
          title: "散落经文",
          body: "申三十二 15。OCR 行里缺少括号或明确边界。",
          provenance: { pdfPages: [50] },
        },
      ],
    });

    expect(result.anchored.entries).toEqual([]);
    expect(result.qa.noAnchorEntries[0]).toMatchObject({
      reason: "no_trustworthy_anchor",
      rejectedRefs: [
        {
          raw: "申三十二 15",
          reason: "not_high_confidence",
          verseIds: ["Deut.32.15"],
        },
      ],
    });
  });

  it("writes anchored and QA reports from CLI path arguments", async () => {
    const root = await temporaryRoot();
    const input = join(root, "entries-candidate.json");
    const output = join(root, "entries-anchored.json");
    const qa = join(root, "anchors-qa.json");

    await writeFile(input, JSON.stringify({
      entries: [
        {
          id: "cli-ok",
          title: "光",
          body: "神就是光（约壹一 5）。",
          provenance: { pdfPages: [60] },
        },
        {
          id: "cli-qa",
          title: "无锚点",
          body: "没有经文。",
          provenance: { pdfPages: [61] },
        },
      ],
    }));

    const result = spawnSync(process.execPath, [resolver, "--input", input, "--output", output, "--qa", qa], {
      encoding: "utf8",
    });

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("1/2 anchored");
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({
      metadata: { entryCount: 2, anchoredCount: 1, noAnchorCount: 1 },
      entries: [{ id: "cli-ok", primaryAnchor: "1John.1.5", verses: ["1John.1.5"] }],
    });
    expect(JSON.parse(await readFile(qa, "utf8"))).toMatchObject({
      noAnchorEntries: [{ entry: { id: "cli-qa" }, reason: "no_scripture_refs_detected" }],
    });
  });
});
