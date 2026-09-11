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

/**
 * Coverage audit for 圣经综合解读·创世记 parenthesis citations.
 * Goal: almost all scripture-like parentheses become clickable/hoverable refs.
 */
describe("Genesis comprehensive commentary scripture coverage", () => {
  const payload = JSON.parse(
    readFileSync(resolve(__dirname, "../data/generated/genesisCommentaryResources.json"), "utf8"),
  ) as { resources: CommentaryResource[] };

  const cards = payload.resources.filter((resource) => (resource.source ?? "").startsWith("圣经综合解读"));

  it("loads all comprehensive genesis cards", () => {
    expect(cards.length).toBeGreaterThan(800);
  });

  it("covers the majority of scripture-like parentheses across all 50 chapters", () => {
    let scriptureLike = 0;
    let detected = 0;
    const misses: Array<{ id: string; chapter: number; inner: string }> = [];

    for (const card of cards) {
      const body = card.body ?? "";
      const context = contextFromCard(card);
      const refs = detectScriptureRefs(body, context);
      const covered = new Set(refs.map((ref) => `${ref.start}:${ref.end}`));

      for (const match of body.matchAll(/[（(]([^（）()]{1,120})[）)]/g)) {
        const inner = (match[1] ?? "").replace(/\s+/g, " ").trim();
        if (!looksLikeScriptureParen(inner)) continue;
        scriptureLike += 1;

        const start = match.index ?? 0;
        const end = start + match[0].length;
        const hit = refs.some((ref) => ref.start < end && ref.end > start);
        if (hit) {
          detected += 1;
          void covered;
        } else {
          misses.push({ id: card.id, chapter: context.sourceChapter ?? 0, inner });
        }
      }
    }

    const ratio = scriptureLike === 0 ? 1 : detected / scriptureLike;
    // Keep a short miss sample in assertion message for debugging regressions.
    const sample = misses
      .slice(0, 25)
      .map((miss) => `${miss.id}#${miss.chapter}（${miss.inner}）`)
      .join(" | ");

    expect(scriptureLike).toBeGreaterThan(1500);
    expect(
      ratio,
      `coverage ${detected}/${scriptureLike}=${(ratio * 100).toFixed(1)}% misses: ${sample}`,
    ).toBeGreaterThanOrEqual(0.99);
  });

  it("detects refs on representative cards from early, middle, and late Genesis", () => {
    const samples = [
      "cmc-gen-1-1",
      "cmc-gen-3-15",
      "cmc-gen-12-2",
      "cmc-gen-22-1",
      "cmc-gen-49-10",
    ];

    for (const id of samples) {
      const card = cards.find((item) => item.id === id);
      expect(card, id).toBeTruthy();
      const refs = detectScriptureRefs(card!.body ?? "", contextFromCard(card!));
      expect(refs.length, id).toBeGreaterThan(0);
    }
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

  const titleMatch = (card.title ?? "").match(/(\d+):(\d+)/);
  if (titleMatch) {
    return { sourceBookId: "Gen", sourceChapter: Number(titleMatch[1]) };
  }

  return { sourceBookId: "Gen" as const };
}

function looksLikeScriptureParen(inner: string): boolean {
  if (!inner) return false;
  if (/Nuzi|Hammurabi|Perfect Number|Triangular|Pythagoras|Amenemhat|Akhenaten|主\s*前|年龄|可以被观测|犹太古史记|卷\s*\d|中文也是|三位一体|七日创造|原文是|即「|为他|即比拉/.test(inner)) {
    return false;
  }
  if (/[太可路约徒罗加弗腓西帖提前后提多门来雅彼约壹贰叁犹启创出利民申书士得撒王代拉尼斯伯诗箴传歌赛耶哀结但何珥摩俄拿弥鸿哈番该亚玛林]/.test(inner) && /\d/.test(inner)) {
    return true;
  }
  if (/^[一二三四五六七八九十百千零〇○两兩0-9]+\s+\d/.test(inner)) return true;
  if (/^\d+\s*节$/.test(inner) || /^\d+\s*[-–—]\s*\d+\s*节$/.test(inner) || /^\d+(?:\s*[、,，]\s*\d+)+\s*节$/.test(inner)) return true;
  if (/[；;]/.test(inner) && /\d/.test(inner)) return true;
  return false;
}
