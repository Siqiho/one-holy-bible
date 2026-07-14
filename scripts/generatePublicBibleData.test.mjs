import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const BOOK_IDS = [
  "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal", "Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John", "2John", "3John", "Jude", "Rev",
];

const generator = join(process.cwd(), "scripts/generatePublicBibleData.mjs");
const temporaryRoots = new Set();

afterEach(async () => {
  await Promise.all([...temporaryRoots].map((root) => rm(root, { recursive: true, force: true })));
  temporaryRoots.clear();
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function runGenerator(args) {
  return spawnSync(process.execPath, [generator, ...args], { encoding: "utf8" });
}

async function fixture({ verseExtras = {} } = {}) {
  const root = await mkdtemp(join(tmpdir(), "ohb-public-data-"));
  temporaryRoots.add(root);
  const biblePath = join(root, "bible.json");
  const resourcesPath = join(root, "resources.json");
  const outputPath = join(root, "public-data");
  const verses = BOOK_IDS.map((book) => ({ id: `${book}.1.1`, book, chapter: 1, verse: 1, text: `${book} text`, ...(book === "Gen" ? verseExtras : {}) }));
  await writeFile(biblePath, JSON.stringify({
    cuvBible: { id: "cuv", label: "和合本", language: "zh", verses },
    kjvBible: { id: "kjv", label: "KJV", language: "en", verses },
  }));
  const localService = `http://${[127, 0, 0, 1].join(".")}:${5127}`;
  const privateHomeFile = ["", "Users", "simon", "private.pdf"].join("/");
  const sourceApiField = ["source", "Api", "Base"].join("");
  const privatePathField = ["source", "Pdf", "Path"].join("");
  await writeFile(resourcesPath, JSON.stringify({
    metadata: { [sourceApiField]: localService, reviewStatus: "needs_review" },
    resources: [
      {
        id: "gen-text", type: "commentary", title: "Genesis", body: "Safe body", verses: ["Gen.1.1"], primaryAnchor: "Gen.1.1", source: "Safe source",
        debugMeta: { sourceLabel: "Safe source", page: 3, [privatePathField]: privateHomeFile, reviewStatus: "needs_review", sourceEvidenceSnippet: "private" },
      },
      { id: "gen-image", type: "image", title: "Private image", body: "", verses: ["Gen.1.1"], assetPath: "/resources/private.png" },
    ],
  }));
  return { biblePath, resourcesPath, outputPath };
}

async function generateFixture(options) {
  const paths = await fixture(options);
  const result = runGenerator(["--bible", paths.biblePath, "--resources", paths.resourcesPath, "--output", paths.outputPath, "--release-version", "0.1.0"]);
  return { ...paths, result };
}

async function rewriteBook(outputPath, bookId, mutate) {
  const bookPath = join(outputPath, `books/${bookId}.json`);
  const payload = JSON.parse(await readFile(bookPath, "utf8"));
  mutate(payload);
  const bytes = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(bookPath, bytes);
  const manifestPath = join(outputPath, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const entry = manifest.books.find((book) => book.id === bookId);
  entry.bytes = bytes.length;
  entry.sha256 = sha256(bytes);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function rewriteSearchIndex(outputPath, mutate) {
  const searchPath = join(outputPath, "search-index.json");
  const searchIndex = JSON.parse(await readFile(searchPath, "utf8"));
  mutate(searchIndex);
  await writeFile(searchPath, `${JSON.stringify(searchIndex, null, 2)}\n`);
}

describe("public Bible data generator", () => {
  it("writes exactly 66 safe text-only book packages with exact hashes", async () => {
    const { biblePath, resourcesPath, outputPath } = await fixture();
    const result = runGenerator(["--bible", biblePath, "--resources", resourcesPath, "--output", outputPath, "--release-version", "0.1.0"]);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);

    const manifest = JSON.parse(await readFile(join(outputPath, "manifest.json"), "utf8"));
    const genesisBytes = await readFile(join(outputPath, "books/Gen.json"));
    const genesis = JSON.parse(genesisBytes);
    expect(manifest.books).toHaveLength(66);
    expect(manifest.books.map((book) => book.id)).toEqual(BOOK_IDS);
    expect(genesis.textCards.every((card) => card.type !== "image")).toBe(true);
    expect(JSON.stringify(genesis)).not.toMatch(/\/Users\/|127\.0\.0\.1|localhost/);
    expect(manifest.books.find((book) => book.id === "Gen").textCardCount).toBe(1);
    expect(sha256(genesisBytes)).toBe(manifest.books.find((book) => book.id === "Gen").sha256);
  });

  it("is deterministic, removes stale output, and validates generated bytes", async () => {
    const { biblePath, resourcesPath, outputPath } = await fixture();
    const args = ["--bible", biblePath, "--resources", resourcesPath, "--output", outputPath, "--release-version", "0.1.0"];
    expect(runGenerator(args).status).toBe(0);
    const firstManifest = await readFile(join(outputPath, "manifest.json"));
    await writeFile(join(outputPath, "stale.json"), "stale");
    expect(runGenerator(args).status).toBe(0);
    expect(await readFile(join(outputPath, "manifest.json"))).toEqual(firstManifest);
    await expect(readFile(join(outputPath, "stale.json"))).rejects.toThrow();
    expect(runGenerator(["--validate-only", outputPath]).status).toBe(0);
  });

  it("publishes scripture through an exact field allowlist", async () => {
    const sourceApiField = ["source", "Api", "Base"].join("");
    const verseExtras = {
      privateLedger: "internal-ledger",
      [sourceApiField]: "http://10.0.0.8/api",
      volumePath: "/Volumes/Private/source.json",
      windowsPath: "C:\\private\\source.json",
      lanUrl: "http://192.168.1.20/api",
    };
    const { outputPath, result } = await generateFixture({ verseExtras });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const genesis = JSON.parse(await readFile(join(outputPath, "books/Gen.json"), "utf8"));
    expect(Object.keys(genesis.cuvVerses[0]).sort()).toEqual(["book", "chapter", "id", "text", "verse"]);
    expect(Object.keys(genesis.kjvVerses[0]).sort()).toEqual(["book", "chapter", "id", "text", "verse"]);
  });

  it.each([
    ["private ledger verse field", (payload) => { payload.cuvVerses[0].privateLedger = "internal"; }],
    ["source API verse field", (payload) => { payload.cuvVerses[0].sourceApi = "https://example.com"; }],
    ["Volumes path", (payload) => { payload.cuvVerses[0].path = "/Volumes/Private/source.json"; }],
    ["Windows path", (payload) => { payload.cuvVerses[0].path = "C:\\private\\source.json"; }],
    ["LAN API host", (payload) => { payload.cuvVerses[0].api = "http://172.16.5.4/data"; }],
    ["review key", (payload) => { payload.textCards[0].reviewStatus = "approved"; }],
    ["sync key", (payload) => { payload.textCards[0].syncState = "published"; }],
    ["evidence key", (payload) => { payload.textCards[0].evidence = "internal"; }],
    ["ledger key", (payload) => { payload.textCards[0].ledgerId = "private"; }],
    ["unsupported card type", (payload) => { payload.textCards[0].type = "article"; }],
  ])("validate-only rejects %s even when the manifest hash is recomputed", async (_label, mutate) => {
    const { outputPath, result } = await generateFixture();
    expect(result.status).toBe(0);
    await rewriteBook(outputPath, "Gen", mutate);
    const validation = runGenerator(["--validate-only", outputPath]);
    expect(validation.status).not.toBe(0);
  });

  it.each([
    ["cross-book search coordinates", (entry) => { entry.book = "Exod"; }],
    ["malformed search verse ID", (entry) => { entry.verseId = "Gen.one.1"; }],
    ["tampered search text", (entry) => { entry.text = "tampered"; }],
    ["extra search field", (entry) => { entry.privateLedger = "internal"; }],
  ])("validate-only rejects %s", async (_label, mutate) => {
    const { outputPath, result } = await generateFixture();
    expect(result.status).toBe(0);
    await rewriteSearchIndex(outputPath, (searchIndex) => mutate(searchIndex[0]));
    const validation = runGenerator(["--validate-only", outputPath]);
    expect(validation.status).not.toBe(0);
  });
});
