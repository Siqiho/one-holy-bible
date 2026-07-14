import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { validatePublicRepository } from "./validatePublicRepository.mjs";

const requiredFiles = [
  "README.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "DATA_SOURCES.md",
  ".github/workflows/ci.yml",
  ".node-version",
];

async function fixture({ readme = "# One Holy Bible\n\n```bash\nnpm ci\n```\n", packageOverrides = {} } = {}) {
  const root = await mkdtemp(join(tmpdir(), "ohb-public-repository-"));
  await mkdir(join(root, ".github/workflows"), { recursive: true });
  await Promise.all(requiredFiles.map((file) => writeFile(join(root, file), file === "README.md" ? readme : "fixture\n")));
  await writeFile(join(root, ".node-version"), "24\n");
  await writeFile(join(root, "package.json"), JSON.stringify({
    name: "one-holy-bible",
    version: "0.1.0",
    license: "MIT",
    repository: { type: "git", url: "git+https://github.com/Siqiho/one-holy-bible.git" },
    bugs: { url: "https://github.com/Siqiho/one-holy-bible/issues" },
    homepage: "https://github.com/Siqiho/one-holy-bible#readme",
    engines: { node: ">=24 <25" },
    ...packageOverrides,
  }));
  return root;
}

describe("validatePublicRepository", () => {
  it("accepts complete GitHub metadata", async () => {
    await expect(validatePublicRepository(await fixture())).resolves.toEqual({ requiredFileCount: 8, nodeVersion: "24" });
  });

  it("rejects missing standard files", async () => {
    const root = await fixture();
    await writeFile(join(root, "README.md"), "# present\n");
    await expect(validatePublicRepository(root, [...requiredFiles, "MISSING.md"])).rejects.toThrow(/MISSING\.md/);
  });

  it.each([`/${"Users"}/example/private-project`, `file:${"///"}tmp/project`, `C:${"\\"}Users\\example\\project`])(
    "rejects a local-only README command containing %s",
    async (localPath) => {
      const root = await fixture({ readme: `# One Holy Bible\n\n\`\`\`bash\ncd ${localPath}\nnpm ci\n\`\`\`\n` });
      await expect(validatePublicRepository(root)).rejects.toThrow(/local-only path/i);
    },
  );

  it("rejects repository metadata for another GitHub project", async () => {
    const root = await fixture({ packageOverrides: { homepage: "https://github.com/example/other#readme" } });
    await expect(validatePublicRepository(root)).rejects.toThrow(/homepage/);
  });
});
