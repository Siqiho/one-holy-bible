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
  "study-bible-rev-2-26-p016-n050",
  "study-bible-rev-2-28-p016-n066",
  "study-bible-rev-3-5-p016-n052",
  "study-bible-rev-5-6-p028-n177",
  "study-bible-rev-8-12-p022-n127",
  "study-bible-rev-16-3-p020-n109",
  "study-bible-rev-intro-p004-n010",
  "study-bible-rev-intro-p006-n011",
];

const forbiddenFragments = [
  "在基督的宝座上与他一同20:427",
  "获赐晨星 21:23.22:5,163:5",
  "21:27312 21:22-23要在上帝的殿中作柱子",
  "一个受了致命伤，13:3是被杀过的",
  "第五枝号（第",
  "所有受造的活物杀害是一场",
  "未来论（历史性前干禧年论）",
  "无于禧年论",
  "吩附约翰",
  "差遭使者",
  "在约输时期",
  "像全的声音",
  "永恒的上这与",
  "关于基督的复活，见林前",
  "参但10:13-",
  "在教义上的离弃了起",
  "力要预先警告",
  "不沾污秒",
  "一点每拿信徒",
  "（《和修》\"撒但会堂的；",
  "尹时上帝的忿怒",
  "出士的铭刻",
  "\"始*与：\"终\"",
  "上帝的荣羅",
  "称力大卫的根",
  "5:120本书4:115:139",
  "使他脱离他的忿餐",
  "约有二刻（《和修》\"半小时\"的短暂寂静暂时取代了活物（4:8）、长老",
  "撒但被称为，这正是",
  "撒迎利亚的异象",
  "米迎勒与魔龙",
  "\"大艰难\"也就是",
  "攻击会（20:7-10）",
  "魔龙和曾（12:11",
  "十四万四干人",
  "以基督弥赛亚的犹太信徒",
  "《启七个福念这书",
  "犯好淫背叛",
  "异象…样（12:1,3）",
  "在1作\"发尽》",
  "遭夾的不是地本身",
  "无法次耶稣作见证",
  "愚味偶像文化",
  "2本书19:218:210本书5:2",
  "烟往上買",
  "不断亵读他",
  "盼咐众人说出",
  "无可匹敌11:8.无人",
  "信徒将进人\"新天新地\"",
  "取而代之的是新的宇\"叹息",
  "改有水域",
  "凡\"析坏\"的都会复活",
  "因力羔羊住在中间",
  "作祭司侍",
  "既是大卫的也是他的主",
  "第20节\"我愿你来\"申的",
  "《《驳异端》",
  "都是名作品",
  "认沩现世",
  "供而用文字形式",
  "忍受患难悔和忠心",
  "见《圣经文集的《〈圣经〉概述》",
  "3540.45 55 70 809095",
  "指给你看\"后在灵里",
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

describe("Revelation public card audit and isolation hold-queue", () => {
  const payload = loadBook("Rev");

  it("keeps the public Revelation package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Rev");
    expect(payload.textCards).toHaveLength(140);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Rev");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 140, ocr: 0, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Revelation cards", () => {
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

    const revIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-rev-\d/.test(id));
    expect(revIsolation).toHaveLength(232);
    expect(revIsolation.some((id) => publicIds.has(id))).toBe(false);

    const kgsIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-1kgs-\d/.test(id));
    expect(kgsIsolation).toHaveLength(601);
    expect(kgsIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
