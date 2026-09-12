#!/usr/bin/env node
// Maps workbench-synced Genesis image cards to the curated stable Genesis image
// cards that ship the byte-identical picture (both pipelines extracted the same PDF).
// The reader uses this map to show each picture once; see src/data/genesisImageTwins.ts.
//
// Usage: node scripts/generateGenesisImageTwins.mjs
//   reads  src/assets/resources/genesis/images/cmc-01/*.png
//          public/resources/workbench/01_创世记/*.png + workbenchSyncedResources-v4.json
//   writes src/data/generated/genesisImageTwins.json

import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const stableDir = new URL("src/assets/resources/genesis/images/cmc-01/", root);
const workbenchDir = new URL("public/resources/workbench/01_创世记/", root);
const payloadPath = new URL("src/data/generated/workbenchSyncedResources-v4.json", root);
const outputPath = new URL("src/data/generated/genesisImageTwins.json", root);
const stableIdPrefix = "genesis-cmc-01";

async function hashPngs(dir) {
  const byHash = new Map();
  for (const file of (await readdir(dir)).filter((name) => name.endsWith(".png")).sort()) {
    const hash = createHash("sha256").update(await readFile(join(fileURLToPath(dir), file))).digest("hex");
    byHash.set(hash, [...(byHash.get(hash) ?? []), file]);
  }
  return byHash;
}

function stableResourceId(fileName) {
  return `${stableIdPrefix}-${fileName.replace(/\.png$/i, "").replace(/_/g, "-").toLowerCase()}`;
}

// Files the curated pipeline deliberately never turns into reader cards (glyph strips etc.).
// They have no stable card to defer to, so they are left out of the map.
const genesisResourcesSource = await readFile(new URL("src/data/genesisResources.ts", root), "utf8");
const nonReaderCardBlock = genesisResourcesSource.match(/const nonReaderCardFileNames = new Set\(\[([\s\S]*?)\]\);/);
if (!nonReaderCardBlock) throw new Error("nonReaderCardFileNames not found in genesisResources.ts");
const nonReaderCardFileNames = new Set([...nonReaderCardBlock[1].matchAll(/"([^"]+\.png)"/g)].map((match) => match[1]));

const payload = JSON.parse(await readFile(payloadPath, "utf8"));
const workbenchIdByFile = new Map(
  payload.resources
    .filter((resource) => resource.type === "image" && typeof resource.assetPath === "string")
    .map((resource) => [basename(resource.assetPath), resource.id]),
);

const [stableByHash, workbenchByHash] = await Promise.all([hashPngs(stableDir), hashPngs(workbenchDir)]);
const twins = {};
for (const [hash, workbenchFiles] of workbenchByHash) {
  const stableFiles = stableByHash.get(hash)?.filter((file) => !nonReaderCardFileNames.has(file));
  if (!stableFiles?.length) continue;
  for (const workbenchFile of workbenchFiles) {
    const workbenchId = workbenchIdByFile.get(workbenchFile);
    if (!workbenchId) throw new Error(`workbench image without a synced card: ${workbenchFile}`);
    // Several curated cards may reuse one picture; keep the first (lowest page) as the canonical twin.
    twins[workbenchId] = stableResourceId(stableFiles[0]);
  }
}

const sorted = Object.fromEntries(Object.entries(twins).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(outputPath, `${JSON.stringify({ stableIdPrefix, twins: sorted }, null, 2)}\n`);
console.log(`stable=${[...stableByHash.values()].flat().length} workbench=${[...workbenchByHash.values()].flat().length} twins=${Object.keys(sorted).length}`);
