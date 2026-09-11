import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { detectScriptureRefs } from "./scriptureRef";
import { parseVerseId } from "./verse";

interface CommentaryResource {
  id: string;
  title?: string;
  body?: string;
  source?: string;
  primaryAnchor?: string;
  verses?: string[];
}

const STAGE1 = new Set([
  "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth",
  "1Sam", "2Sam", "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra",
]);

const STAGE2 = new Set([
  "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song",
  "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos",
]);

const STAGE3 = new Set([
  "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal",
  "Matt", "Mark", "Luke", "John", "Acts", "Rom",
]);

const STAGE4 = new Set([
  "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess", "2Thess",
  "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet",
]);

const STAGE5 = new Set([
  "2Pet", "1John", "2John", "3John", "Jude", "Rev",
]);

function loadStudyCards(stageBooks: Set<string>) {
  const workbench = JSON.parse(
    readFileSync(resolve(__dirname, "../data/generated/workbenchSyncedResources-v4.json"), "utf8"),
  ) as { resources: CommentaryResource[] };
  const genesis = JSON.parse(
    readFileSync(resolve(__dirname, "../data/generated/genesisCommentaryResources.json"), "utf8"),
  ) as { resources: CommentaryResource[] };

  const map = new Map<string, CommentaryResource>();
  for (const resource of [...genesis.resources, ...workbench.resources]) {
    const source = resource.source ?? "";
    if (!/研修|研读/.test(source)) continue;
    const book = bookOf(resource);
    if (!book || !stageBooks.has(book)) continue;
    map.set(resource.id, resource);
  }
  return [...map.values()];
}

function coverage(cards: CommentaryResource[]) {
  let like = 0;
  let hit = 0;
  const misses: string[] = [];
  const byBook = new Map<string, { like: number; hit: number }>();

  for (const card of cards) {
    const body = card.body ?? "";
    const context = contextFromCard(card);
    const book = context.sourceBookId ?? "?";
    if (!byBook.has(book)) byBook.set(book, { like: 0, hit: 0 });
    const row = byBook.get(book)!;
    const refs = detectScriptureRefs(body, context);

    for (const match of body.matchAll(/[（(]([^（）()]{1,100})[）)]/g)) {
      const inner = (match[1] ?? "").replace(/\s+/g, " ").trim();
      if (!looksLikeStudyParen(inner)) continue;
      like += 1;
      row.like += 1;
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (refs.some((ref) => ref.start < end && ref.end > start)) {
        hit += 1;
        row.hit += 1;
      } else if (misses.length < 25) {
        misses.push(`${card.id}:(${inner})`);
      }
    }

    for (const match of body.matchAll(
      /(?<![\w\u4e00-\u9fff])([太可路约徒罗加弗腓西帖提前后提多门来雅彼约壹贰叁犹启创出利民申书士得撒王代拉尼斯伯诗箴传歌赛耶哀结但何珥摩俄拿弥鸿哈番该亚玛林][前后上下壹贰叁]?)\s*\d+\s*[:：]\s*\d+(?:[-–—]\d+)?(?:注)?/g,
    )) {
      like += 1;
      row.like += 1;
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (refs.some((ref) => ref.start < end && ref.end > start)) {
        hit += 1;
        row.hit += 1;
      } else if (misses.length < 40) {
        misses.push(`${card.id}:${match[0]}`);
      }
    }

    // chapter-only and 见N节
    for (const match of body.matchAll(
      /(?<![\w\u4e00-\u9fff])([太可路约徒罗加弗腓西帖提前后提多门来雅彼约壹贰叁犹启创出利民申书士得撒王代拉尼斯伯诗箴传歌赛耶哀结但何珥摩俄拿弥鸿哈番该亚玛林][前后上下壹贰叁]?)\s*\d+(?:\s*[-–—]\s*\d+)?\s*章/g,
    )) {
      like += 1;
      row.like += 1;
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (refs.some((ref) => ref.start < end && ref.end > start)) {
        hit += 1;
        row.hit += 1;
      } else if (misses.length < 50) {
        misses.push(`${card.id}:${match[0]}`);
      }
    }
    for (const match of body.matchAll(/(?:见|参|另见|参见)\s*第?\s*\d+\s*节/g)) {
      like += 1;
      row.like += 1;
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (refs.some((ref) => ref.start < end && ref.end > start)) {
        hit += 1;
        row.hit += 1;
      } else if (misses.length < 55) {
        misses.push(`${card.id}:${match[0]}`);
      }
    }
    for (const match of body.matchAll(/(?<![\w\u4e00-\u9fff])\d+\s*[:：]\s*\d+\s*[-–—]\s*\d+\s*[:：]\s*\d+/g)) {
      like += 1;
      row.like += 1;
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (refs.some((ref) => ref.start < end && ref.end > start)) {
        hit += 1;
        row.hit += 1;
      } else if (misses.length < 60) {
        misses.push(`${card.id}:${match[0]}`);
      }
    }
  }

  const ratio = like === 0 ? 1 : hit / like;
  const weak = [...byBook.entries()]
    .map(([book, stats]) => ({
      book,
      ratio: stats.like ? stats.hit / stats.like : 1,
      like: stats.like,
      hit: stats.hit,
    }))
    .filter((row) => row.like >= 15)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 8);

  return { like, hit, ratio, misses, weak, cards: cards.length };
}

describe("study-bible scripture coverage", () => {
  it("covers stage 1 books 01-15", () => {
    const cards = loadStudyCards(STAGE1);
    expect(cards.length).toBeGreaterThan(1500);
    const result = coverage(cards);
    expect(result.like).toBeGreaterThan(800);
    expect(
      result.ratio,
      `stage1 ${result.hit}/${result.like}=${(result.ratio * 100).toFixed(2)}% weak=${JSON.stringify(result.weak)} misses=${result.misses.join(" | ")}`,
    ).toBeGreaterThanOrEqual(0.9);
  });

  it("covers stage 2 books 16-30", () => {
    const cards = loadStudyCards(STAGE2);
    expect(cards.length).toBeGreaterThan(1500);
    const result = coverage(cards);
    expect(result.like).toBeGreaterThan(800);
    expect(
      result.ratio,
      `stage2 ${result.hit}/${result.like}=${(result.ratio * 100).toFixed(2)}% weak=${JSON.stringify(result.weak)} misses=${result.misses.join(" | ")}`,
    ).toBeGreaterThanOrEqual(0.9);
  });

  it("covers stage 3 books 31-45", () => {
    const cards = loadStudyCards(STAGE3);
    expect(cards.length).toBeGreaterThan(1500);
    const result = coverage(cards);
    expect(result.like).toBeGreaterThan(800);
    expect(
      result.ratio,
      `stage3 ${result.hit}/${result.like}=${(result.ratio * 100).toFixed(2)}% weak=${JSON.stringify(result.weak)} misses=${result.misses.join(" | ")}`,
    ).toBeGreaterThanOrEqual(0.9);
  });

  it("covers stage 4 books 46-60", () => {
    const cards = loadStudyCards(STAGE4);
    expect(cards.length).toBeGreaterThan(800);
    const result = coverage(cards);
    expect(result.like).toBeGreaterThan(500);
    expect(
      result.ratio,
      `stage4 ${result.hit}/${result.like}=${(result.ratio * 100).toFixed(2)}% weak=${JSON.stringify(result.weak)} misses=${result.misses.join(" | ")}`,
    ).toBeGreaterThanOrEqual(0.9);
  });

  it("covers stage 5 books 61-66", () => {
    const cards = loadStudyCards(STAGE5);
    expect(cards.length).toBeGreaterThan(200);
    const result = coverage(cards);
    expect(result.like).toBeGreaterThan(400);
    expect(
      result.ratio,
      `stage5 ${result.hit}/${result.like}=${(result.ratio * 100).toFixed(2)}% weak=${JSON.stringify(result.weak)} misses=${result.misses.join(" | ")}`,
    ).toBeGreaterThanOrEqual(0.9);
  });

  it("parses representative study-bible stage4 citation styles", () => {
    const body =
      "（见徒19:21，20:1-3）见赛43:18-19,65:17-23，66:22-23。约14.：27注。结构（13章）（14章）（主要是1-7章）。";
    const refs = detectScriptureRefs(body, { sourceBookId: "1Cor", sourceChapter: 12 });
    const ids = refs.flatMap((ref) => ref.verseIds);
    expect(ids).toContain("Acts.19.21");
    expect(ids).toContain("Acts.20.1");
    expect(ids).toContain("Isa.43.18");
    expect(ids).toContain("Isa.65.17");
    expect(ids).toContain("John.14.27");
    expect(ids).toContain("1Cor.13.1");
    expect(ids).toContain("1Cor.14.1");
    expect(ids).toContain("1Cor.1.1");
  });

  it("parses representative study-bible stage3 citation styles", () => {
    const jonah = detectScriptureRefs("结构：（1:17-2:10）（3:3b-10）", {
      sourceBookId: "Jonah",
      sourceChapter: 1,
    });
    expect(jonah.map((ref) => ref.verseIds[0])).toEqual(
      expect.arrayContaining(["Jonah.1.17", "Jonah.3.3"]),
    );

    const nah = detectScriptureRefs("（见第9节）参第7节", {
      sourceBookId: "Nah",
      sourceChapter: 1,
    });
    expect(nah.map((ref) => ref.verseIds[0])).toEqual(
      expect.arrayContaining(["Nah.1.9", "Nah.1.7"]),
    );

    const mixed = detectScriptureRefs("俄巴底亚（俄15b节）。弥迦（4:8-5:15）。", {
      sourceBookId: "Mic",
      sourceChapter: 4,
    });
    expect(mixed.map((ref) => ref.verseIds[0])).toEqual(
      expect.arrayContaining(["Obad.1.15", "Mic.4.8"]),
    );
  });

  it("parses representative study-bible stage2 citation styles", () => {
    const body =
      "尼希米记注释：（出7-15章）（见9节）（王下17章）（拉9-10章）另见17节。利23:24-25.27，34。见出30:11-16。诗23:1：赛40:1。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Neh", sourceChapter: 13 });
    const ids = refs.map((ref) => ref.verseIds[0]);
    expect(ids).toContain("Exod.7.1");
    expect(ids).toContain("Neh.13.9");
    expect(ids).toContain("2Kgs.17.1");
    expect(ids).toContain("Ezra.9.1");
    expect(ids).toContain("Neh.13.17");
    expect(ids).toContain("Lev.23.24");
    expect(ids).toContain("Exod.30.11");
    expect(ids).toContain("Ps.23.1");
    expect(ids).toContain("Isa.40.1");
  });

  it("parses representative study-bible stage5 citation styles", () => {
    const rev = detectScriptureRefs(
      "（呼应赛21.9）20:7-22:5。1:3，22:7。创1：.1。",
      { sourceBookId: "Rev", sourceChapter: 20 },
    );
    const revIds = rev.flatMap((ref) => ref.verseIds);
    expect(revIds).toEqual(
      expect.arrayContaining(["Isa.21.9", "Rev.20.7", "Rev.1.3", "Rev.22.7", "Gen.1.1"]),
    );

    const pet = detectScriptureRefs("（大前提，9b-10a节）（尤见2章）（2:10b-22，尤其是22节）见犹6节注。", {
      sourceBookId: "2Pet",
      sourceChapter: 2,
    });
    expect(pet.flatMap((ref) => ref.verseIds)).toEqual(
      expect.arrayContaining(["2Pet.2.9", "2Pet.2.10", "2Pet.2.1", "Jude.1.6"]),
    );

    const john = detectScriptureRefs("（13-15节）", {
      sourceBookId: "3John",
      sourceChapter: 1,
    });
    expect(john.flatMap((ref) => ref.verseIds)).toEqual(
      expect.arrayContaining(["3John.1.13", "3John.1.14"]),
    );

    const complex = detectScriptureRefs("（见约14:16-18.26,15:26,16:7-14.20:22）", {
      sourceBookId: "1John",
      sourceChapter: 3,
    });
    expect(complex.flatMap((ref) => ref.verseIds)).toEqual(
      expect.arrayContaining(["John.14.16", "John.14.26", "John.15.26", "John.16.7", "John.20.22"]),
    );
  });
});

function bookOf(card: CommentaryResource) {
  const anchor = card.primaryAnchor ?? card.verses?.[0];
  if (!anchor) return undefined;
  return String(anchor).split(".")[0];
}

function contextFromCard(card: CommentaryResource) {
  const anchor = card.primaryAnchor ?? card.verses?.[0];
  if (!anchor) return {};
  try {
    const parsed = parseVerseId(anchor);
    return { sourceBookId: parsed.book, sourceChapter: parsed.chapter };
  } catch {
    return {};
  }
}

function looksLikeStudyParen(inner: string) {
  if (!inner) return false;
  if (
    /导论|地图|页|和修|Nuzi|原文|拉丁|ex nihilo|Tiamat|美索不达米亚|摘要|天后|山顶|吨|公历|在位|约等于/.test(inner) &&
    !/[:：]/.test(inner) &&
    !/章$/.test(inner)
  ) {
    return false;
  }
  if (/主前/.test(inner)) return false;
  if (/^[一二三四五六七八九十百]+$/.test(inner) || /^\d+$/.test(inner)) return false;
  if (/^\d+\s*[:：]\s*\d+/.test(inner)) return true;
  if (
    /[太可路约徒罗加弗腓西帖提前后提多门来雅彼约壹贰叁犹启创出利民申书士得撒王代拉尼斯伯诗箴传歌赛耶哀结但何珥摩俄拿弥鸿哈番该亚玛林]/.test(
      inner,
    ) &&
    /\d/.test(inner)
  ) {
    return true;
  }
  if (/章$/.test(inner) && /\d/.test(inner)) return true;
  if (
    /^\d+(?:\s*[、,，]\s*\d+)*\s*节$/.test(inner) ||
    /^\d+\s*[-–—]\s*\d+\s*节$/.test(inner) ||
    /^\d+\s*节$/.test(inner) ||
    /^(?:见|参|另见|参见)\s*\d+\s*节$/.test(inner)
  ) {
    return true;
  }
  return false;
}
