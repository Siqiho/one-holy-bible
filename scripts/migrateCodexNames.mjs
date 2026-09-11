import { execFileSync } from "node:child_process";
import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const leftBracket = "\u3010";
const rightBracket = "\u3011";
const exactMarker = `${leftBracket}codex${rightBracket}`;
const versionMarkerPattern = new RegExp(`${leftBracket}codex-v(\\d+)${rightBracket}`, "g");
const versionMarkerTestPattern = new RegExp(`${leftBracket}codex-v\\d+${rightBracket}`);
const encodedLeftBracket = "%E3%80%90";
const encodedRightBracket = "%E3%80%91";
const encodedExactMarker = `${encodedLeftBracket}codex${encodedRightBracket}`;
const encodedExactMarkerPattern = new RegExp(encodedExactMarker, "gi");
const encodedVersionMarkerPattern = new RegExp(`${encodedLeftBracket}codex-v(\\d+)${encodedRightBracket}`, "gi");
const encodedVersionMarkerTestPattern = new RegExp(`${encodedLeftBracket}codex-v\\d+${encodedRightBracket}`, "i");
const legacyResourceName = `workbenchSyncedResources${exactMarker}.json`;
const normalizedLegacyResourceName = "workbenchSyncedResources-legacy.json";

export function normalizeCodexBasename(name) {
  if (name === legacyResourceName) return normalizedLegacyResourceName;
  return name.replace(versionMarkerPattern, "-v$1").replaceAll(exactMarker, "");
}

export function rewriteCodexReferences(text, options = {}) {
  const protectedExternalPaths = [];
  const protectedText = options.includeExternalHistory
    ? text
    : text.replace(/\/(?:Users\/simon|tmp)\/[^"'`\n\r<>,)}\]]+/g, (matchedPath) => {
        if (matchedPath.startsWith("/Users/simon/OHB/")) return matchedPath;
        if (
          !matchedPath.includes(exactMarker) &&
          !versionMarkerTestPattern.test(matchedPath) &&
          !matchedPath.toUpperCase().includes(encodedExactMarker.toUpperCase()) &&
          !encodedVersionMarkerTestPattern.test(matchedPath)
        ) return matchedPath;
        const placeholder = `\u0001OHB_EXTERNAL_PATH_${protectedExternalPaths.length}\u0002`;
        protectedExternalPaths.push(matchedPath);
        return placeholder;
      });

  let rewritten = protectedText
    .replaceAll(legacyResourceName, normalizedLegacyResourceName)
    .replace(versionMarkerPattern, "-v$1")
    .replaceAll(exactMarker, "")
    .replace(encodedVersionMarkerPattern, "-v$1")
    .replace(encodedExactMarkerPattern, "");

  for (let index = 0; index < protectedExternalPaths.length; index += 1) {
    rewritten = rewritten.replace(`\u0001OHB_EXTERNAL_PATH_${index}\u0002`, protectedExternalPaths[index]);
  }
  return rewritten;
}

function pathDepth(value) {
  return value.split(path.sep).filter(Boolean).length;
}

function immediateTarget(source) {
  return path.join(path.dirname(source), normalizeCodexBasename(path.basename(source)));
}

function finalTarget(source) {
  const parsed = path.parse(source);
  const relativeParts = source.slice(parsed.root.length).split(path.sep).map(normalizeCodexBasename);
  return path.join(parsed.root, ...relativeParts);
}

export function buildRenamePlan(sources, options = {}) {
  const targetExists = options.targetExists ?? existsSync;
  const uniqueSources = [...new Set(sources)];
  const plan = uniqueSources.map((source) => ({
    finalTarget: finalTarget(source),
    source,
    target: immediateTarget(source),
  }));

  for (const entry of plan) {
    if (entry.source === entry.target) continue;
    if (targetExists(entry.target)) {
      throw new Error(`collision: ${entry.source} -> ${entry.target}`);
    }
  }

  const finalTargets = new Map();
  for (const entry of plan) {
    const previousSource = finalTargets.get(entry.finalTarget);
    if (previousSource && previousSource !== entry.source) {
      throw new Error(`duplicate final target: ${previousSource} and ${entry.source} -> ${entry.finalTarget}`);
    }
    finalTargets.set(entry.finalTarget, entry.source);
  }

  return plan.sort((left, right) => {
    const depthDifference = pathDepth(right.source) - pathDepth(left.source);
    return depthDifference || right.source.localeCompare(left.source);
  });
}

async function walkTaggedNames(root) {
  const matches = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.name.includes(exactMarker) || versionMarkerTestPattern.test(entry.name)) matches.push(absolutePath);
      if (entry.isDirectory() && !entry.isSymbolicLink()) await visit(absolutePath);
    }
  }

  await visit(root);
  return matches;
}

function findTextReferences(root) {
  let output;
  try {
    output = execFileSync(
      "rg",
      [
        "-uuu",
        "-l",
        "-0",
        "--glob",
        "!**/node_modules/**",
        "--glob",
        "!**/.git/objects/**",
        "--glob",
        "!**/.git/index",
        "--glob",
        "!**/.git/logs/**",
        "--glob",
        "!**/.git/refs/**",
        "--glob",
        "!**/.git/packed-refs",
        "--glob",
        "!**/.git/worktrees/**",
        `${leftBracket}codex(?:-v[0-9]+)?${rightBracket}|${encodedLeftBracket}codex(?:-v[0-9]+)?${encodedRightBracket}`,
        root,
      ],
      { encoding: "buffer", maxBuffer: 128 * 1024 * 1024 },
    );
  } catch (error) {
    if (error?.status === 1) return [];
    throw error;
  }
  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function decodeUtf8(buffer, filePath) {
  if (buffer.includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new Error(`matched file is not valid UTF-8: ${filePath}`);
  }
}

async function rewriteFileAtomically(filePath, options = {}) {
  const originalStat = await stat(filePath);
  const originalBuffer = await readFile(filePath);
  const originalText = decodeUtf8(originalBuffer, filePath);
  if (originalText === null) return { changed: false, skippedBinary: true };

  const rewrittenText = rewriteCodexReferences(originalText, options);
  if (rewrittenText === originalText) return { changed: false, skippedBinary: false };

  const temporaryPath = `${filePath}.ohb-name-migration-${process.pid}`;
  await writeFile(temporaryPath, rewrittenText, { flag: "wx", mode: originalStat.mode });
  try {
    await chmod(temporaryPath, originalStat.mode);
    await utimes(temporaryPath, originalStat.atime, originalStat.mtime);
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
  return { changed: true, skippedBinary: false };
}

function parseArguments(argv) {
  const options = {
    apply: false,
    dryRun: false,
    includeExternalHistory: false,
    reportPath: undefined,
    root: undefined,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--include-external-history") options.includeExternalHistory = true;
    else if (argument === "--root") options.root = argv[++index];
    else if (argument === "--report") options.reportPath = argv[++index];
    else throw new Error(`unknown argument: ${argument}`);
  }
  if (!options.root) throw new Error("--root is required");
  if (options.apply === options.dryRun) throw new Error("choose exactly one of --dry-run or --apply");
  if (!options.reportPath) throw new Error("--report is required");
  return options;
}

async function writeReport(reportPath, report) {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export async function runMigration(options) {
  const root = path.resolve(options.root);
  const rootInfo = await lstat(root);
  if (!rootInfo.isDirectory()) throw new Error(`root is not a directory: ${root}`);

  const taggedPaths = await walkTaggedNames(root);
  const renamePlan = buildRenamePlan(taggedPaths);
  const textFiles = findTextReferences(root);
  const report = {
    applied: Boolean(options.apply),
    generatedAt: new Date().toISOString(),
    root,
    rules: {
      exact: `${exactMarker} -> empty`,
      legacyCollision: `${legacyResourceName} -> ${normalizedLegacyResourceName}`,
      stableAsciiIds: "unchanged",
      versioned: `${leftBracket}codex-vN${rightBracket} -> -vN`,
    },
    includeExternalHistory: Boolean(options.includeExternalHistory),
    taggedPathCount: taggedPaths.length,
    textReferenceFileCount: textFiles.length,
    renamePlan,
  };

  if (!options.apply) {
    await writeReport(options.reportPath, report);
    return report;
  }

  let rewrittenFileCount = 0;
  let skippedBinaryCount = 0;
  for (const filePath of textFiles) {
    const result = await rewriteFileAtomically(filePath, {
      includeExternalHistory: options.includeExternalHistory,
    });
    if (result.changed) rewrittenFileCount += 1;
    if (result.skippedBinary) skippedBinaryCount += 1;
  }

  for (const entry of renamePlan) await rename(entry.source, entry.target);

  report.rewrittenFileCount = rewrittenFileCount;
  report.skippedBinaryCount = skippedBinaryCount;
  await writeReport(options.reportPath, report);
  return report;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const options = parseArguments(process.argv.slice(2));
  const report = await runMigration(options);
  process.stdout.write(
    `${options.apply ? "applied" : "dry-run"}: ${report.taggedPathCount} tagged paths, ${report.textReferenceFileCount} text files\n`,
  );
}
