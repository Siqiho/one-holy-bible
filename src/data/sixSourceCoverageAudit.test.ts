import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Six-source coverage lock for the user UI inventory:
 * 《综合解读》 / 《圣经研修本》 / 《圣经启导本》 / 《OCR 转文字》 / 《圣经的故事》 / 《圣经信息系列》
 *
 * Classification mirrors Workbench displayableSourceName + ledger id/stream prefixes.
 * OCR is classified before 综合解读 so 「综合解读·图注」 does not leak into CMC.
 */
export const UI_SOURCE_TOTALS = {
  zonghe: 29476,
  yanxiu: 16270,
  qidaben: 9521,
  ocr: 254,
  story: 98,
  xinxi: 8,
} as const;

export type SixSourceId = keyof typeof UI_SOURCE_TOTALS | "other";

interface Classifiable {
  id?: string;
  source?: string;
  sourceLabel?: string;
  sourceStream?: string;
  title?: string;
}

export function classifySixSource(card: Classifiable): SixSourceId {
  const id = card.id ?? "";
  const source = card.source ?? "";
  const sourceLabel = card.sourceLabel ?? "";
  const sourceStream = card.sourceStream ?? "";
  const title = card.title ?? "";
  const blob = [id, source, sourceLabel, sourceStream, title].join("\n");

  if (
    /image[-_ ]?text[-_ ]?ocr[-_ ]?conversion|综合解读[·・]图注|(?<![A-Za-z])ocr(?![A-Za-z])|OCR\s*转文字|image-text-/i.test(blob)
  ) {
    return "ocr";
  }
  if (
    source.includes("综合解读")
    || sourceLabel.includes("综合解读")
    || title.includes("综合解读")
    || id.startsWith("cmc-")
    || sourceStream.includes("cmc-comprehensive")
  ) {
    return "zonghe";
  }
  if (
    source.includes("圣经研修本")
    || source.includes("研修本")
    || sourceLabel.includes("圣经研修本")
    || sourceLabel.includes("研修本")
    || id.startsWith("study-bible-")
    || /study-bible/.test(sourceStream)
  ) {
    return "yanxiu";
  }
  if (
    source.includes("启导本")
    || sourceLabel.includes("启导本")
    || id.startsWith("qidaben-")
    || /qidaben/.test(sourceStream)
  ) {
    return "qidaben";
  }
  if (
    source.includes("圣经的故事")
    || sourceLabel.includes("圣经的故事")
    || source.includes("Hurlbut")
    || sourceLabel.includes("Hurlbut")
    || id.startsWith("hurlbut-")
    || /hurlbut/.test(sourceStream)
  ) {
    return "story";
  }
  if (
    source.includes("圣经信息系列")
    || source.includes("信息系列")
    || sourceLabel.includes("圣经信息系列")
    || sourceLabel.includes("信息系列")
    || id.startsWith("message-")
    || /message-/.test(sourceStream)
  ) {
    return "xinxi";
  }
  return "other";
}

interface PublicCard {
  id: string;
  title?: string;
  source?: string;
  debugMeta?: { sourceLabel?: string };
}

interface PublicBookPayload {
  bookId: string;
  textCards: PublicCard[];
}

const booksDir = resolve(__dirname, "../../public/data/books");
const isolationPath = resolve(__dirname, "../../local-audit-pack/no-explain-isolation-20260731/card候选清单.jsonl");
const johnPackDir = resolve(__dirname, "../../local-audit-pack/john-gospel-20260909");
const genesisPath = resolve(__dirname, "./generated/genesisCommentaryResources.json");

function emptyCounts() {
  return { ocr: 0, zonghe: 0, yanxiu: 0, qidaben: 0, story: 0, xinxi: 0, other: 0 };
}

function loadJsonl(path: string): Array<Record<string, unknown>> {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function classifyLedgerRow(row: Record<string, unknown>) {
  const audit = (row.audit ?? {}) as Record<string, unknown>;
  const stableDebug = (audit.stable_debug_meta ?? {}) as Record<string, unknown>;
  const stableSource = (row.stable_source ?? {}) as Record<string, unknown>;
  const stableMeta = (stableSource.debugMeta ?? {}) as Record<string, unknown>;
  const draft = (row.card_draft ?? {}) as Record<string, unknown>;
  return classifySixSource({
    id: String(row.commentary_key ?? row.id ?? ""),
    source: String(stableSource.source ?? draft.source ?? row.source ?? ""),
    sourceLabel: String(stableDebug.sourceLabel ?? stableMeta.sourceLabel ?? row.source_label ?? ""),
    sourceStream: String(row.source_stream ?? stableDebug.sourceStream ?? ""),
    title: String(draft.title ?? row.title ?? ""),
  });
}

function loadPublicCards() {
  const cards: Array<PublicCard & { bookId: string }> = [];
  for (const file of readdirSync(booksDir).filter((name) => name.endsWith(".json"))) {
    const payload = JSON.parse(readFileSync(resolve(booksDir, file), "utf8")) as PublicBookPayload;
    for (const card of payload.textCards) {
      cards.push({ ...card, bookId: payload.bookId });
    }
  }
  return cards;
}

describe("OHB six-source coverage audit", () => {
  const publicCards = loadPublicCards();

  it("maps the six user UI labels onto id / source / stream prefixes without leftovers in the public package", () => {
    expect(classifySixSource({ source: "圣经综合解读·创世记", title: "创世记 1:1 综合解读" })).toBe("zonghe");
    expect(classifySixSource({ id: "cmc-jer-1-1", sourceStream: "cmc-comprehensive-commentary" })).toBe("zonghe");
    expect(classifySixSource({ source: "圣经研修本 24_耶利米书-v3", id: "study-bible-jer-1-1-p007-n013" })).toBe("yanxiu");
    expect(classifySixSource({ id: "qidaben-john-1-4-p1487-n001", sourceStream: "qidaben-commentary-pilot", title: "启导本注释" })).toBe("qidaben");
    expect(classifySixSource({ source: "image-text-ocr-conversion", id: "image-text-01-创世记-codex-pdf-p102-img057" })).toBe("ocr");
    expect(classifySixSource({ source: "visible-image-text-ocr-conversion" })).toBe("ocr");
    expect(classifySixSource({ source: "综合解读·图注" })).toBe("ocr");
    expect(classifySixSource({ id: "hurlbut-story-068", sourceStream: "hurlbut-bible-story-zh-2013", title: "圣经的故事" })).toBe("story");
    expect(classifySixSource({ source: "圣经信息系列·创世记1-11章", id: "message-gen-4-1-26-jealousy-gratitude" })).toBe("xinxi");

    const mix = emptyCounts();
    const prefix = { cmc: 0, study: 0, image: 0, message: 0, other: 0 };
    for (const card of publicCards) {
      mix[classifySixSource({
        id: card.id,
        source: card.source,
        sourceLabel: card.debugMeta?.sourceLabel,
        title: card.title,
      })] += 1;
      const head = card.id.split("-")[0] ?? "other";
      if (head === "cmc" || head === "study" || head === "image" || head === "message") prefix[head] += 1;
      else prefix.other += 1;
    }

    expect(publicCards).toHaveLength(10410);
    expect(mix).toEqual({
      ocr: 146,
      zonghe: 858,
      yanxiu: 9403,
      qidaben: 0,
      story: 0,
      xinxi: 3,
      other: 0,
    });
    expect(prefix).toEqual({ cmc: 858, study: 9403, image: 146, message: 3, other: 0 });
  });

  it("reconciles isolation and John ledgers to the six sources and keeps isolation out of public", () => {
    if (!existsSync(isolationPath) || !existsSync(johnPackDir)) return;

    const publicIds = new Set(publicCards.map((card) => card.id));
    const isolation = loadJsonl(isolationPath);
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnPlacement = loadJsonl(resolve(johnPackDir, "placement候选清单.jsonl"));

    const isolationMix = emptyCounts();
    const isolationStreams: Record<string, number> = {};
    const leaked: string[] = [];
    for (const row of isolation) {
      isolationMix[classifyLedgerRow(row)] += 1;
      const stream = String(row.source_stream ?? "unknown");
      isolationStreams[stream] = (isolationStreams[stream] ?? 0) + 1;
      const id = String(row.commentary_key ?? "");
      if (publicIds.has(id)) leaked.push(id);
    }

    expect(isolation).toHaveLength(18397);
    expect(isolationMix).toEqual({
      ocr: 0,
      zonghe: 18387,
      yanxiu: 10,
      qidaben: 0,
      story: 0,
      xinxi: 0,
      other: 0,
    });
    expect(isolationStreams).toEqual({
      "cmc-comprehensive-commentary": 17879,
      "圣经综合解读·创世记": 508,
      "圣经研修本 52_帖撒罗尼迦前书-v3": 5,
      "圣经研修本 54_提摩太前书-v3": 1,
      "圣经研修本 44_使徒行传-v3": 1,
      "圣经研修本 51_歌罗西书-v3": 1,
      "圣经研修本 50_腓立比书-v3": 2,
    });
    expect(leaked).toEqual([]);

    const johnMix = emptyCounts();
    const johnStreams: Record<string, number> = {};
    const johnInPublic = emptyCounts();
    for (const row of johnCards) {
      const key = classifyLedgerRow(row);
      johnMix[key] += 1;
      const stream = String(row.source_stream ?? "unknown");
      johnStreams[stream] = (johnStreams[stream] ?? 0) + 1;
      if (publicIds.has(String(row.commentary_key ?? ""))) johnInPublic[key] += 1;
    }

    expect(johnCards).toHaveLength(1533);
    expect(johnMix).toEqual({
      ocr: 1,
      zonghe: 765,
      yanxiu: 495,
      qidaben: 267,
      story: 5,
      xinxi: 0,
      other: 0,
    });
    expect(johnStreams).toEqual({
      "image-text-ocr-conversion": 1,
      "study-bible-commentary-v3": 495,
      "hurlbut-bible-story-zh-2013": 5,
      "qidaben-commentary-pilot": 267,
      "cmc-comprehensive-commentary": 765,
    });
    expect(johnInPublic).toEqual({
      ocr: 0,
      zonghe: 0,
      yanxiu: 409,
      qidaben: 0,
      story: 0,
      xinxi: 0,
      other: 0,
    });

    const orphan = johnPlacement
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => id.startsWith("qidaben-") && !johnCards.some((row) => row.commentary_key === id));
    expect(orphan).toEqual(["qidaben-john-15-18-p1496-n001"]);
  });

  it("matches the information-series UI total in the Genesis stable inventory and records UI deltas", () => {
    expect(Object.values(UI_SOURCE_TOTALS).reduce((sum, count) => sum + count, 0)).toBe(55627);

    if (!existsSync(genesisPath)) return;
    const payload = JSON.parse(readFileSync(genesisPath, "utf8")) as {
      metadata?: { totalResources?: number };
      resources: Array<{
        id: string;
        source?: string;
        title?: string;
        debugMeta?: { sourceStream?: string; sourceLabel?: string };
      }>;
    };

    const genesisMix = emptyCounts();
    const streams: Record<string, number> = {};
    for (const resource of payload.resources) {
      const stream = resource.debugMeta?.sourceStream ?? "unknown";
      streams[stream] = (streams[stream] ?? 0) + 1;
      genesisMix[classifySixSource({
        id: resource.id,
        source: resource.source,
        sourceLabel: resource.debugMeta?.sourceLabel,
        sourceStream: stream,
        title: resource.title,
      })] += 1;
    }

    expect(payload.resources).toHaveLength(1625);
    expect(payload.metadata?.totalResources).toBe(1625);
    expect(streams).toEqual({
      "cmc-comprehensive-commentary": 866,
      "study-bible-notes": 751,
      "message-genesis-1-11-supplemental": 8,
    });
    expect(genesisMix.xinxi).toBe(UI_SOURCE_TOTALS.xinxi);
    expect(genesisMix).toEqual({
      ocr: 0,
      zonghe: 866,
      yanxiu: 751,
      qidaben: 0,
      story: 0,
      xinxi: 8,
      other: 0,
    });

    const publicXinxi = publicCards.filter((card) => card.id.startsWith("message-")).map((card) => card.id).sort();
    expect(publicXinxi).toEqual([
      "message-gen-10-1-11-31-hope-strength",
      "message-gen-4-1-26-jealousy-gratitude",
      "message-gen-5-1-8-22-eye-of-storm",
    ]);
  });
});
