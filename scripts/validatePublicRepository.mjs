#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED_FILES = [
  "README.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "DATA_SOURCES.md",
  "PUBLIC_RELEASE.json",
  "public/data/manifest.json",
  "public/data/asset-manifest.json",
  "scripts/validatePublicData.mjs",
  "scripts/validatePublicRepository.mjs",
  "scripts/validatePublicRelease.mjs",
  ".github/workflows/ci.yml",
  ".node-version",
];
const REPOSITORY_URL = "git+https://github.com/Siqiho/one-holy-bible.git";
const ISSUES_URL = "https://github.com/Siqiho/one-holy-bible/issues";
const HOMEPAGE_URL = "https://github.com/Siqiho/one-holy-bible#readme";
const LOCAL_PATH = /(?:\/Users\/|\/Volumes\/|file:\/\/|(?:^|[\s"'(])[A-Za-z]:[\\/])/i;

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} must be ${JSON.stringify(expected)}`);
}

export async function validatePublicRepository(root = process.cwd()) {
  await Promise.all(REQUIRED_FILES.map(async (file) => {
    try {
      await access(resolve(root, file));
    } catch {
      throw new Error(`Required public repository file is missing: ${file}`);
    }
  }));

  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  assertEqual(packageJson.name, "one-holy-bible", "package.json name");
  assertEqual(packageJson.version, "0.2.0", "package.json version");
  assertEqual(packageJson.license, "MIT", "package.json license");
  assertEqual(packageJson.repository?.url, REPOSITORY_URL, "package.json repository.url");
  assertEqual(packageJson.bugs?.url, ISSUES_URL, "package.json bugs.url");
  assertEqual(packageJson.homepage, HOMEPAGE_URL, "package.json homepage");
  assertEqual(packageJson.engines?.node, ">=24 <25", "package.json engines.node");
  for (const script of ["validate:public-data", "validate:public-repository", "validate:public-release"]) {
    if (typeof packageJson.scripts?.[script] !== "string") throw new Error(`package.json is missing ${script}`);
  }
  if (packageJson.scripts?.["generate:public-data"] !== undefined) {
    throw new Error("package.json must not expose the removed private-data generator");
  }

  const nodeVersion = (await readFile(resolve(root, ".node-version"), "utf8")).trim();
  assertEqual(nodeVersion, "24", ".node-version");

  const readme = await readFile(resolve(root, "README.md"), "utf8");
  if (!readme.includes("v0.2.0") || !readme.includes("one-holy-bible-assets")) {
    throw new Error("README must describe the v0.2.0 release and its asset repository");
  }
  if (/v0\.1\.0 scope|text-first|all image-card payloads are excluded/i.test(readme)) {
    throw new Error("README contains stale v0.1.0/text-first release claims");
  }
  const commandBlocks = [...readme.matchAll(/```(?:bash|sh|shell|zsh)\s*\n([\s\S]*?)```/gi)].map((match) => match[1]);
  if (commandBlocks.some((commands) => LOCAL_PATH.test(commands))) {
    throw new Error("README command blocks must not contain a local-only path");
  }

  return { requiredFileCount: REQUIRED_FILES.length, nodeVersion, packageVersion: packageJson.version };
}

async function main() {
  const result = await validatePublicRepository();
  process.stdout.write(`Public repository metadata valid: ${result.requiredFileCount} required files, version ${result.packageVersion}, Node ${result.nodeVersion}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
