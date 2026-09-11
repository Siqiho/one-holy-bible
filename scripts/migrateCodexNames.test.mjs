import { describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildRenamePlan,
  normalizeCodexBasename,
  rewriteCodexReferences,
  runMigration,
} from "./migrateCodexNames.mjs";

const tag = (value) => `\u3010${value}\u3011`;

describe("normalizeCodexBasename", () => {
  test("removes the complete exact marker", () => {
    expect(normalizeCodexBasename(`说明${tag("codex")}.md`)).toBe("说明.md");
  });

  test("normalizes version markers without leaving full-width brackets", () => {
    expect(normalizeCodexBasename(`文字卡内容修复${tag("codex-v5")}.json`)).toBe("文字卡内容修复-v5.json");
  });

  test("preserves the colliding historical resource under a distinct marker-free name", () => {
    expect(normalizeCodexBasename(`workbenchSyncedResources${tag("codex")}.json`)).toBe(
      "workbenchSyncedResources-legacy.json",
    );
  });
});

describe("rewriteCodexReferences", () => {
  test("rewrites exceptional, versioned, and exact path components", () => {
    const source = [
      `/Users/simon/OHB/workbenchSyncedResources${tag("codex")}.json`,
      `/Users/simon/OHB/workbenchSyncedResources${tag("codex-v4")}.json`,
      `card候选清单${tag("codex")}.jsonl`,
    ].join("\n");

    expect(rewriteCodexReferences(source)).toBe(
      [
        "/Users/simon/OHB/workbenchSyncedResources-legacy.json",
        "/Users/simon/OHB/workbenchSyncedResources-v4.json",
        "card候选清单.jsonl",
      ].join("\n"),
    );
  });

  test("does not rewrite stable bare ASCII resource ids", () => {
    expect(rewriteCodexReferences("document-image-01-创世记-codex-pdf-p008-img001")).toBe(
      "document-image-01-创世记-codex-pdf-p008-img001",
    );
  });

  test("preserves tagged absolute paths outside the OHB workspace", () => {
    const source = [
      `/tmp/report${tag("codex")}.json`,
      `/Users/simon/✝️/source${tag("codex-v3")}.pdf`,
      `/Users/simon/备份/codex/README${tag("codex")}.md`,
    ].join("\n");

    expect(rewriteCodexReferences(source)).toBe(source);
  });

  test("can explicitly normalize tagged external history paths", () => {
    const source = [
      `/tmp/report${tag("codex")}.json`,
      `/private/tmp/source${tag("codex-v3")}.pdf`,
      `/Users/simon/备份/codex/README${tag("codex")}.md`,
    ].join("\n");

    expect(rewriteCodexReferences(source, { includeExternalHistory: true })).toBe(
      [
        "/tmp/report.json",
        "/private/tmp/source-v3.pdf",
        "/Users/simon/备份/codex/README.md",
      ].join("\n"),
    );
  });

  test("rewrites percent-encoded workspace path markers", () => {
    const encodedLeft = "%E3%80%90";
    const encodedRight = "%E3%80%91";
    expect(
      rewriteCodexReferences(
        `/Users/simon/OHB/file${encodedLeft}codex-v3${encodedRight}.json?source=manifest${encodedLeft}codex${encodedRight}.jsonl`,
      ),
    ).toBe("/Users/simon/OHB/file-v3.json?source=manifest.jsonl");
  });
});

describe("buildRenamePlan", () => {
  test("orders nested paths deepest-first", () => {
    const plan = buildRenamePlan([
      `/tmp/目录${tag("codex")}`,
      `/tmp/目录${tag("codex")}/文件${tag("codex-v1")}.json`,
    ]);

    expect(plan.map((entry) => entry.source)).toEqual([
      `/tmp/目录${tag("codex")}/文件${tag("codex-v1")}.json`,
      `/tmp/目录${tag("codex")}`,
    ]);
  });

  test("rejects unresolved target collisions", () => {
    expect(() =>
      buildRenamePlan([`/tmp/说明${tag("codex")}.md`], {
        targetExists: (target) => target === "/tmp/说明.md",
      }),
    ).toThrow(/collision.*说明\.md/i);
  });

  test("rejects duplicate final targets created by nested renames", () => {
    expect(() =>
      buildRenamePlan([
        `/tmp/目录${tag("codex")}/文件${tag("codex")}.json`,
        `/tmp/目录/文件${tag("codex")}.json`,
      ], { targetExists: () => false }),
    ).toThrow(/duplicate final target/i);
  });
});

describe("runMigration", () => {
  test("is a no-op on an already-clean tree", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ohb-clean-migration-"));
    const reportPath = path.join(root, "report.json");
    try {
      const report = await runMigration({ apply: false, root, reportPath });
      expect(report.taggedPathCount).toBe(0);
      expect(report.textReferenceFileCount).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
