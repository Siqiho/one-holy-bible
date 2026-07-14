#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const MAX_PUBLIC_FILE_BYTES = 50 * 1024 * 1024;

const personalHome = ["", "Users", "simon"].join("/");
const loopbackHost = [127, 0, 0, 1].join(".");
const privateNames = [
  ["source", "Workbench", "Path"].join(""),
  ["source", "Workbench", "CardId"].join(""),
  ["source", "Api", "Base"].join(""),
  ["source", "Api", "Url"].join(""),
  ["workbench", "Synced", "Resources"].join(""),
  ["bible", "Everyone", "Image", "Resources"].join(""),
  ["stored", "Absolute", "Path"].join(""),
  ["source", "Pdf", "Path"].join(""),
  ["source", "Asset", "Path"].join(""),
];
const privateAssetRoots = [
  ["", "src", "assets", "resources", ""].join("/"),
  ["", "resources", "workbench", ""].join("/"),
  ["", "resources", "bibleeveryone", ""].join("/"),
];
const forbiddenText = [
  personalHome,
  `http://${loopbackHost}:${5127}`,
  `http://${loopbackHost}:${5179}`,
  ...privateNames,
  ...privateAssetRoots,
];
const forbiddenPaths = [
  /^AGENTS\.md$/,
  /^\.superpowers\//,
  /^docs\/superpowers\//,
  /^public\/resources\//,
  /^src\/assets\/resources\//,
  /^src\/data\/generated\//,
  /(?:^|\/)\.env(?:\.|$)/,
];
const highConfidenceSecrets = [
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /\bghp_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bnpm_[A-Za-z0-9]{30,}\b/,
];

function assertSafePath(path) {
  if (forbiddenPaths.some((pattern) => pattern.test(path))) {
    throw new Error(`Forbidden public-release path: ${path}`);
  }
}

function assertSafeContent(bytes, path) {
  if (bytes.includes(0)) return;
  const text = bytes.toString("utf8");
  if (forbiddenText.some((value) => text.includes(value))) {
    throw new Error(`Forbidden public-release content in ${path}`);
  }
  if (highConfidenceSecrets.some((pattern) => pattern.test(text))) {
    throw new Error(`High-confidence credential pattern in ${path}`);
  }
}

export async function validatePublicReleaseFiles(root, files) {
  let totalBytes = 0;
  for (const path of files) {
    assertSafePath(path);
    const absolutePath = resolve(root, path);
    const fileStats = await stat(absolutePath);
    if (!fileStats.isFile()) continue;
    if (fileStats.size > MAX_PUBLIC_FILE_BYTES) {
      throw new Error(`Public file exceeds 50 MiB: ${path}`);
    }
    totalBytes += fileStats.size;
    assertSafeContent(await readFile(absolutePath), path);
  }
  return { fileCount: files.length, totalBytes, oversizedFileCount: 0, forbiddenMatchCount: 0 };
}

export async function trackedFiles(root = process.cwd()) {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], { cwd: root, encoding: "buffer" });
  return stdout.toString("utf8").split("\0").filter(Boolean);
}

async function main() {
  const root = process.cwd();
  const files = await trackedFiles(root);
  const result = await validatePublicReleaseFiles(root, files);
  process.stdout.write(
    `Public release hygiene valid: ${result.fileCount} files, ${result.totalBytes} bytes, 0 oversized files, 0 forbidden matches\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
