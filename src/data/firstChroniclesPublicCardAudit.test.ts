import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { BIBLE_BOOKS } from "../domain/bibleBooks";

interface PublicCard {
  id: string;
  body?: string;
  title?: string;
  primaryAnchor?: string;
  verses?: string[];
  type?: string;
}

interface PublicBookPayload {
  bookId: string;
  textCards: PublicCard[];
}

const booksDir = resolve(__dirname, "../../public/data/books");
const isolationPath = resolve(__dirname, "../../local-audit-pack/no-explain-isolation-20260731/card候选清单.jsonl");
const johnPackDir = resolve(__dirname, "../../local-audit-pack/john-gospel-20260909");

const heldStudyBible = [
  "study-bible-1chr-intro-p002-n005",
];

const forbiddenFragments = [
  "事件大卫王国建立从王国分裂到南国犹大灭亡的历史被掳到巴比伦",
  "兵时间（主前） 经文约1010-931年",
  "大卫苗裔力将来盼望的核心",
  "\"弟续兄孀*婚姻",
  "或者\"迎米\"是\"基路拜\"",
  "（《和修》\"西罗非哈只有女儿，见民26:33",
  "《和修》\"背叛\"被掳到巴比伦",
  "（《和修》\"玛他提雅…他受托做烤饼），",
  "-代下9:31大卫和所罗门的联合王国",
  "志》作者非常强调大卫和所罗门作王的宗教意义",
  "这种关注点的不同，清括增删材料",
  "而是上帝在增强他的实",
  "受商作王",
  "（关于他们带领以色列人敬拜的意义，及注释）",
  "战车一干，马兵七干",
  "两个词的意有细微差别",
  "摩押、亚扣、亚兰和琐巴",
  "的顺序来陈述，而是从传统资料中选取材料来支持他的观点。",
  "见犹9节：后12:7-9",
  "作者在撒下24:3的材料上增加了这个字，以强调大卫的罪",
  "三万八干",
  "是否顾服上帝的命令",
  "其中的服待和人员",
  "仓促地受离为王",
  "撒母耳、章单和迦得",
  "主前539一主前332年",
  "马丁路德采纳了这在把拉丁文译本翻译成德文时",
  "见《圣经文的《〈圣经》概述》",
  "代34上28:4",
  "经常在敬拜中此称谢上帝",
  "（代下29:3-19，:8-13）",
  "包括司和平民以及南北各个支派",
  "慷慨地力圣殿奉献",
];

function loadBook(bookId: string): PublicBookPayload {
  return JSON.parse(readFileSync(resolve(booksDir, `${bookId}.json`), "utf8")) as PublicBookPayload;
}

function loadJsonl(path: string): Array<Record<string, unknown>> {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function verseIdsFor(bookId: string): Set<string> {
  const book = BIBLE_BOOKS.find((item) => item.id === bookId);
  return new Set(
    (book?.verseCounts ?? []).flatMap((verseCount, chapterIndex) => (
      Array.from({ length: verseCount }, (_, verseIndex) => `${bookId}.${chapterIndex + 1}.${verseIndex + 1}`)
    )),
  );
}

describe("1 Chronicles public card audit and isolation hold-queue", () => {
  const payload = loadBook("1Chr");

  it("keeps the public 1 Chronicles package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("1Chr");
    expect(payload.textCards).toHaveLength(70);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("1Chr");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 62, ocr: 8, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage 1 Chronicles cards", () => {
    const ids = new Set(payload.textCards.map((card) => card.id));
    for (const id of heldStudyBible) {
      expect(ids.has(id), id).toBe(false);
    }

    const blob = payload.textCards.map((card) => `${card.title ?? ""}\n${card.body ?? ""}`).join("\n");
    for (const fragment of forbiddenFragments) {
      expect(blob.includes(fragment), fragment).toBe(false);
    }
  });

  it("keeps isolation CMC and John leftover streams out of the public package when audit packs are present", () => {
    if (!existsSync(isolationPath)) return;

    const publicIds = new Set<string>();
    for (const file of readdirSync(booksDir).filter((name) => name.endsWith(".json"))) {
      const book = JSON.parse(readFileSync(resolve(booksDir, file), "utf8")) as PublicBookPayload;
      for (const card of book.textCards) publicIds.add(card.id);
    }

    const isolation = loadJsonl(isolationPath);
    const leaked = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => publicIds.has(id));
    expect(leaked).toEqual([]);

    const chrIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-1chr-\d/.test(id));
    expect(chrIsolation).toHaveLength(657);
    expect(chrIsolation.some((id) => publicIds.has(id))).toBe(false);

    const ephIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-eph-\d/.test(id));
    expect(ephIsolation).toHaveLength(51);
    expect(ephIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
