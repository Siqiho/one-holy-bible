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
  "study-bible-josh-1-13-p007-n025",
  "study-bible-josh-3-17-p010-n039",
  "study-bible-josh-4-20-p034-n139",
  "study-bible-josh-5-15-p012-n055-2-2-2-2",
  "study-bible-josh-7-26-p034-n140",
  "study-bible-josh-10-27-p034-n142",
  "study-bible-josh-20-3-p031-n130",
  "study-bible-josh-22-34-p034-n143-2-2-2-2",
  "study-bible-josh-24-1-p035-n146",
  "study-bible-josh-intro-p001-n001",
  "study-bible-josh-intro-p001-n004",
];

const forbiddenFragments = [
  "四境平书1:1-9可作为全书其余部分",
  "之前《圣这个词开始用在他们身上",
  "谨记以色列人有可能不信",
  "的描述和出3:5相似",
  "在亚干身上实，而不信实会带来可怕的后果",
  "人与一个迦南城镇之间的埋亚摩利五王约",
  "就成了报血责任\"杀那故意杀人的\"",
  "侍奉上帝的在示剑重申圣",
  "巴力比利土的敬拜\n",
  "此外，作者在早记录。",
  "和平渗透模迦南人的灭亡",
  "夺取迎南地",
  "泛指迎南地的居民",
  "一个迎南人敢说",
  "成为迎南地上的第五堆",
  "迎南妓女喇合",
  "六个迎南族群",
  "可能是迎南众多",
  "进人迎南地",
  "坚称\"迎南人虽有铁车",
  "导论：迎南人的灭",
  "上帝亲自盼咐的",
  "住在约且河东",
  "已经在约且河中立起",
  "竭力进人那安息",
  "渡过了约旦河，进人应许",
  "象征人生进人一个重要",
  "5:4-5和5:7解祥了",
  "所代表的耋辱",
  "失去他们疆士",
  "这种誓言必须避守",
  "但耶和华起暂说",
  "百姓竞会容忍",
  "攀受耶和华的赐福",
  "《土师记》",
  "耶T:1",
  "见1314注",
  "见61-2注",
  "归入了以色列（6:125）",
  "出13：|9",
  "把产业拈阉的方法",
  "意思是\"皂荬树\"",
  "杜德摩西士三世",
  "耶宾是夏现诸王",
  "泥石流堵塞丁河道",
  "即'esous'",
  "或其他书写材（希伯来原文",
  "中28章记载了祝福咒诅",
  "（中28:1，7",
  "（中7:1-6）",
  "参中12:5",
  "而是力了宗教上的洁净",
  "所预备的那十二个人刀",
  "节］［7节14:11",
  "36:217:511节；本书13:30",
  "住在我们9:20°［民1:53］",
  "21:39K［见38节］",
  "玛基大营中7",
  "（《和修》\"成为诅咒而遭受灾祸）",
  "（《和修》\"失去他们疆士\"",
  "见\"导论：迦南人的灭",
  "12:718:18:12［本书16:1］",
  "12:718:12［本书16:1］",
  "将水远",
  "太老们",
  "性行力",
  "已经酒去",
  "无宰受刑",
  "道责作假见证",
  "门徒员性",
  "生来膳眼",
  "满有良普",
  "整卷《徒行传》",
  "得罪们的主",
  "使用腊文）",
  "这个词（腊原文",
  "主人体，公是",
  "这里的腊原文",
  "因行为称（",
  "（教养…的人》",
  "拣选了我们》和其他",
  "多罗买的儿子\"》",
  "\"现在\"》，表明",
  "以色列记》人",
  "《创世前几章",
  "五句节",
  "圣吴",
  "察乡",
  "坐船刦",
  "以色列才民",
  "骆驼果要",
  "提后3！1",
  "约14.：27",
  "代上11.：1",
  "弗1.：13",
  "林后1.：1",
  "何4.：1",
  "哀1.：19",
  "该1.：10",
  "参来1.：14",
  "见1.：1",
  "和1.：12",
  "51.：14",
  "（1.：12-18）",
  "22」39",
  "凡有血气的的预言",
  "伺候的的妇人",
  "仗赖的的希伯来文",
  "踹葡萄的的人",
  "理解的的枝子",
  "掳来的的诱惑",
  "最后几位旧知",
  "不再知说话",
  "犹9节：后12",
  "列国中说各种语言的人\"中出来",
  "罪摩和过犯",
  "可僧的",
  "就不再谤了",
  "扶行教会纪律",
  "（《和修》\"他同胞》",
  "（《和修》\"翘角》",
  "（《和修》\"已蒙洁净》",
  "（《和修》\"火的城墙》",
  "崇拜行力",
  "一万他他连得",
  "他他所有的家人",
  "（《和修》至圣所》",
  "（徒行传讲道集》",
  "（《和修》\"有话说\"\"）",
  "（《和修》\"祸哉）",
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

describe("Joshua public card audit and isolation hold-queue", () => {
  const payload = loadBook("Josh");

  it("keeps the public Joshua package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Josh");
    expect(payload.textCards).toHaveLength(136);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Josh");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 131, ocr: 5, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Joshua cards", () => {
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

    const joshIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-josh-\d/.test(id));
    expect(joshIsolation).toHaveLength(220);
    expect(joshIsolation.some((id) => publicIds.has(id))).toBe(false);

    const nehIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-neh-\d/.test(id));
    expect(nehIsolation).toHaveLength(317);
    expect(nehIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
