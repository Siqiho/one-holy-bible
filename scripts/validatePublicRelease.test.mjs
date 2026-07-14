import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { validatePublicReleaseFiles } from "./validatePublicRelease.mjs";

async function fixture(files) {
  const root = await mkdtemp(join(tmpdir(), "ohb-release-hygiene-"));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}

describe("validatePublicReleaseFiles", () => {
  it("accepts a small public-only tree", async () => {
    const root = await fixture({ "README.md": "# Public project\n", "src/App.tsx": "export default function App() {}\n" });
    await expect(validatePublicReleaseFiles(root, ["README.md", "src/App.tsx"])).resolves.toMatchObject({
      fileCount: 2,
      oversizedFileCount: 0,
      forbiddenMatchCount: 0,
    });
  });

  it.each([
    ["personal path", ["", "Users", "simon", "private.txt"].join("/")],
    ["local service", `http://${[127, 0, 0, 1].join(".")}:${5127}/api`],
    ["private field", ["source", "Workbench", "Path"].join("")],
    ["private payload", ["workbench", "Synced", "Resources"].join("")],
    ["image library", ["", "resources", "workbench", "card.png"].join("/")],
  ])("rejects %s content without echoing its value", async (_label, unsafeValue) => {
    const root = await fixture({ "src/unsafe.txt": `prefix ${unsafeValue} suffix` });
    await expect(validatePublicReleaseFiles(root, ["src/unsafe.txt"])).rejects.toThrow(/forbidden public-release content/i);
  });

  it.each(["AGENTS.md", "docs/superpowers/plan.md", "src/data/generated/private.json", "public/resources/card.png"])(
    "rejects forbidden tracked path %s",
    async (path) => {
      const root = await fixture({ [path]: "fixture\n" });
      await expect(validatePublicReleaseFiles(root, [path])).rejects.toThrow(/forbidden public-release path/i);
    },
  );

  it("rejects files larger than 50 MiB", async () => {
    const root = await fixture({ "public/data/large.bin": Buffer.alloc(50 * 1024 * 1024 + 1) });
    await expect(validatePublicReleaseFiles(root, ["public/data/large.bin"])).rejects.toThrow(/50 MiB/i);
  });
});
