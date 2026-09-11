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

describe("comprehensive commentary scripture coverage (all CMC books stages 1-5)", () => {
  const extracted = JSON.parse(
    readFileSync(resolve(__dirname, "../data/generated/comprehensiveCommentaryResources.json"), "utf8"),
  ) as { metadata: { totalResources: number; byBook: Record<string, number> }; resources: CommentaryResource[] };

  const genesis = JSON.parse(
    readFileSync(resolve(__dirname, "../data/generated/genesisCommentaryResources.json"), "utf8"),
  ) as { resources: CommentaryResource[] };

  const genesisComprehensive = genesis.resources.filter((resource) =>
    (resource.source ?? "").startsWith("圣经综合解读"),
  );

  const cards = [...genesisComprehensive, ...extracted.resources];

  it("includes extracted multi-book comprehensive cards plus genesis comprehensive cards", () => {
    expect(extracted.metadata.totalResources).toBeGreaterThan(28000);
    expect(Object.keys(extracted.metadata.byBook).length).toBeGreaterThanOrEqual(60);
    expect(genesisComprehensive.length).toBeGreaterThan(800);
    expect(cards.length).toBeGreaterThan(28000);
  });

  it("covers scripture-like parentheses at high rate across all CMC books stages 1-5 comprehensive cards", () => {
    let scriptureLike = 0;
    let detected = 0;
    const misses: string[] = [];
    const byBook = new Map<string, { like: number; hit: number }>();

    for (const card of cards) {
      const body = card.body ?? "";
      const context = contextFromCard(card);
      const book = context.sourceBookId ?? "?";
      if (!byBook.has(book)) byBook.set(book, { like: 0, hit: 0 });
      const row = byBook.get(book)!;
      const refs = detectScriptureRefs(body, context);

      for (const match of body.matchAll(/[（(]([^（）()]{1,120})[）)]/g)) {
        const inner = (match[1] ?? "").replace(/\s+/g, " ").trim();
        if (!looksLikeScriptureParen(inner)) continue;
        scriptureLike += 1;
        row.like += 1;
        const start = match.index ?? 0;
        const end = start + match[0].length;
        if (refs.some((ref) => ref.start < end && ref.end > start)) {
          detected += 1;
          row.hit += 1;
        } else if (misses.length < 30) {
          misses.push(`${card.id}:${inner}`);
        }
      }
    }

    const ratio = scriptureLike === 0 ? 1 : detected / scriptureLike;
    const weak = [...byBook.entries()]
      .map(([book, stats]) => ({
        book,
        ratio: stats.like ? stats.hit / stats.like : 1,
        like: stats.like,
        hit: stats.hit,
      }))
      .filter((row) => row.like >= 20)
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 8);

    expect(scriptureLike).toBeGreaterThan(40000);
    expect(
      ratio,
      `coverage ${detected}/${scriptureLike}=${(ratio * 100).toFixed(2)}% weak=${JSON.stringify(weak)} misses=${misses.join(" | ")}`,
    ).toBeGreaterThanOrEqual(0.96);
  });
});

function contextFromCard(card: CommentaryResource) {
  const anchor = card.primaryAnchor ?? card.verses?.[0];
  if (anchor) {
    try {
      const parsed = parseVerseId(anchor);
      return { sourceBookId: parsed.book, sourceChapter: parsed.chapter };
    } catch {
      // fall through
    }
  }
  return { sourceBookId: "Gen" as const };
}

function looksLikeScriptureParen(inner: string): boolean {
  if (!inner) return false;
  if (
    /Nuzi|Hammurabi|Perfect Number|Triangular|Pythagoras|Amenemhat|Akhenaten|主\s*前|年龄|可以被观测|犹太古史记|卷\s*\d|中文也是|三位一体|七日创造|原文是|即「|为他|即比拉/.test(
      inner,
    )
  ) {
    return false;
  }
  if (
    /[太可路约徒罗加弗腓西帖提前后提多门来雅彼约壹贰叁犹启创出利民申书士得撒王代拉尼斯伯诗箴传歌赛耶哀结但何珥摩俄拿弥鸿哈番该亚玛林]/.test(
      inner,
    ) &&
    /\d/.test(inner)
  ) {
    return true;
  }
  if (/^[一二三四五六七八九十廿卅百千零〇○两兩0-9]+\s+\d/.test(inner)) return true;
  if (
    /^\d+\s*节$/.test(inner) ||
    /^\d+\s*[-–—]\s*\d+\s*节$/.test(inner) ||
    /^\d+(?:\s*[、,，]\s*\d+)+\s*节$/.test(inner)
  ) {
    return true;
  }
  if (/[；;]/.test(inner) && /\d/.test(inner)) return true;
  return false;
}
