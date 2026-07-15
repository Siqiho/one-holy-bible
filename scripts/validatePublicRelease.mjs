#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const MAX_PUBLIC_FILE_BYTES = 50 * 1024 * 1024;
const LOCAL_PATH = /(?:\/Users\/|\/Volumes\/|file:\/\/|(?:^|[\s"'(])[A-Za-z]:[\\/])/i;
const PRIVATE_URL = /https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})(?=[:/\s"'<>),.;!?]|$)/i;
const PRIVATE_FIELD = /(?:sourceWorkbench(?:CardId|Path|Url|Api)?|sourceApi(?:Base|Url)?|sourceAssetPath|sourcePdfPath|sourceManifestPath|sourceLedgerPath|stored(?:Absolute|Relative)Path)/i;
const SECRET = [/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/, /\b(?:ghp|github_pat)_[A-Za-z0-9_]{30,}\b/, /\bAKIA[0-9A-Z]{16}\b/, /\bnpm_[A-Za-z0-9]{30,}\b/];
const FORBIDDEN_PATHS = [/^AGENTS\.md$/, /^\.superpowers\//, /^docs\/superpowers\//, /^public\/resources\//, /^src\/assets\/resources\//, /^src\/data\/generated\//, /(?:^|\/)\.env(?:\.|$)/];
const PRIVATE_DATA_PATH = /^(?:public\/data\/|PUBLIC_RELEASE\.json$|DATA_SOURCES\.md$|THIRD_PARTY_NOTICES\.md$|README\.md$|CONTRIBUTING\.md$|docs\/releases\/|docs\/verification\/)/;

function assertSafePath(filePath) {
  if (FORBIDDEN_PATHS.some((pattern) => pattern.test(filePath))) throw new Error(`Forbidden public-release path: ${filePath}`);
}

function assertSafeContent(bytes, filePath) {
  if (bytes.includes(0)) return;
  const text = bytes.toString("utf8");
  if (LOCAL_PATH.test(text)) throw new Error(`Local path found in ${filePath}`);
  if (PRIVATE_URL.test(text)) throw new Error(`Private service URL found in ${filePath}`);
  if (SECRET.some((pattern) => pattern.test(text))) throw new Error(`Credential pattern found in ${filePath}`);
  if (PRIVATE_DATA_PATH.test(filePath) && PRIVATE_FIELD.test(text)) throw new Error(`Private data field found in ${filePath}`);
}

export async function validatePublicReleaseFiles(root, files) {
  let totalBytes = 0;
  for (const filePath of files) {
    assertSafePath(filePath);
    const absolutePath = resolve(root, filePath);
    const fileStats = await stat(absolutePath);
    if (!fileStats.isFile()) continue;
    if (fileStats.size > MAX_PUBLIC_FILE_BYTES) throw new Error(`Public file exceeds 50 MiB: ${filePath}`);
    totalBytes += fileStats.size;
    assertSafeContent(await readFile(absolutePath), filePath);
  }
  return { fileCount: files.length, totalBytes, oversizedFileCount: 0, forbiddenMatchCount: 0 };
}

export async function trackedFiles(root = process.cwd()) {
  const { stdout } = await execFileAsync("git", ["-C", root, "ls-files", "-z"], { encoding: "buffer" });
  return stdout.toString("utf8").split("\0").filter(Boolean);
}

async function main() {
  const root = process.cwd();
  const files = await trackedFiles(root);
  const result = await validatePublicReleaseFiles(root, files);
  process.stdout.write(`Public release hygiene valid: ${result.fileCount} files, ${result.totalBytes} bytes, 0 oversized files, 0 forbidden matches\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
