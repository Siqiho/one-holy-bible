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
  "study-bible-eph-4-5-p012-n074",
  "study-bible-eph-4-22-p009-n044",
  "study-bible-eph-intro-p002-n005",
  "study-bible-eph-intro-p004-n007",
];

const forbiddenFragments = [
  "全蕭委動點油里企匯港量饰码",
  "罗9:4-5）。关于国民",
  "主后30 3540455055606570文集",
  "《《圣经",
  "所有人生下来在灵性上都是死的，违犯了上帝2.上帝按照自己的旨意",
  "因徒将来的、在不朽荣光中的居所",
  "叫人话的灵",
  "随3:8.4:12.意或难以捉摸",
  "自始至的计划",
  "\"无有瑕指脱离",
  "《和修》\"满有爱心），是在描述",
  "名着救赎得着称赞",
  "过犯得以救免",
  "按照自己的旨意堂管一切",
  "\"今世之子）来自希伯来文",
  "《和修》\"生来就是》，亚当",
  "\"你们救……因着信\"",
  "\"没受礼的\"是犹太人",
  "救恩是从犹太人出来的\"（约",
  "将要被纳人教会的奥秘",
  "在以弗所（4:M1）和其他教会",
  "归人现实世界中的教会",
  "类似移）。为你们外邦人",
  "关于使徒和先见2:20注",
  "也与基督合一（罗8:17：加",
  "看作上帝的恩因为他自己",
  "关注上帝的救败旨意",
  "和好、彰昆爱的状态",
  "（《利修》\"俘虏\"",
  "基督成从最高的天",
  "复活40天一不是信徒之后",
  "《和修》\"远超越刀",
  "腓利思貨使開着买型靈",
  "用于彼此服待",
  "威熟的基督徒",
  "爱主和侍奉主6:5.10:12.13:3",
  "开始做正经事《《和修》",
  "在这份清\"苦毒\"居首位",
  "见了节），人若是把注意力",
  "感谢赐的美好事物上",
  "完全进人那永恒的领域",
  "拜偶像，婪使人一心",
  "见约量1:5-7",
  "不是引用《旧日约》某-处经文",
  "耶和华的苯耀发现照耀你",
  "对我们生命的-般准则",
  "指信徒被杀灵充满",
  "以舍已之爱爱妻子",
  "阐述顺服的原則",
  "这里按露了邪恶的源头",
  "写的，思那人可能跟随过保罗",
  "刚信主的人，保不可能都认识",
  "（一）向候（1:1-2）",
  "（一）己之爱（5:1-2*）",
  "七、基督身体的合（4:1-16）",
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

describe("Ephesians public card audit and isolation hold-queue", () => {
  const payload = loadBook("Eph");

  it("keeps the public Ephesians package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Eph");
    expect(payload.textCards).toHaveLength(105);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Eph");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 105, ocr: 0, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Ephesians cards", () => {
    const ids = new Set(payload.textCards.map((card) => card.id));
    for (const id of heldStudyBible) {
      expect(ids.has(id), id).toBe(false);
    }

    const blob = payload.textCards.map((card) => `${card.title ?? ""}\n${card.body ?? ""}\n${card.summary ?? ""}\n${card.searchText ?? ""}`).join("\n");
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

    const ephIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-eph-\d/.test(id));
    expect(ephIsolation).toHaveLength(51);
    expect(ephIsolation.some((id) => publicIds.has(id))).toBe(false);

    const judgIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-judg-\d/.test(id));
    expect(judgIsolation).toHaveLength(449);
    expect(judgIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
