import { describe, expect, it } from "vitest";

import { validatePublicRepository } from "./validatePublicRepository.mjs";
import { validatePublicReleaseFiles, trackedFiles } from "./validatePublicRelease.mjs";

describe("public repository release metadata", () => {
  it("identifies the v0.2.0 public checkout", async () => {
    await expect(validatePublicRepository(process.cwd())).resolves.toMatchObject({
      packageVersion: "0.2.0",
      nodeVersion: "24",
    });
  });

  it("passes tracked-file release hygiene", async () => {
    const files = await trackedFiles(process.cwd());
    await expect(validatePublicReleaseFiles(process.cwd(), files)).resolves.toMatchObject({
      fileCount: expect.any(Number),
      totalBytes: expect.any(Number),
      forbiddenMatchCount: 0,
      oversizedFileCount: 0,
    });
  });
});
