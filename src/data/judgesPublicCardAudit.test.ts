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
  "study-bible-judg-13-23-p011-n049",
  "study-bible-judg-17-6-p030-n185",
  "study-bible-judg-17-9-p030-n188",
  "study-bible-judg-intro-p001-n001",
  "study-bible-judg-intro-p003-n004",
];

const forbiddenFragments = [
  "的\"巴力夏琐\"，歌8:11的\"巴力哈们\"",
  "见\"导论：写作目的、缘起和背景（参18:1.19:1.21:25）。任意",
  "这个利未人一直寄居在犹利未支派没有地业",
  "没有任何经时间事件发生的时间",
  "社会普遍11-13,17.19,3:6,7,12,4：",
  "关34:4：书15:3系一直友好",
  "背道并陷人困境",
  "雅各在这里傲梦",
  "概因为曾有警告",
  "书24;31",
  "迎南文献中很少提及",
  "代表迎南宗教",
  "正如耶和华 所起的醬",
  "上帝曾響告以色列人",
  "应当受到严历斥责",
  "《和修》\"怜悯他们》",
  "《和修》\"这国通常用来形容异教徒",
  "巴力被公认为是迎南诸神中能力最大的",
  "赋子它不同的形象",
  "盖一间有墻的小阁楼）",
  "最杰出的士师竟是个女人底波拉和巴拉打败迦南人",
  "《和修》\"唱歌\"，这个希伯来文动词",
  "字面意思的主\"",
  "《和修》\"面对面\"遇见上帝",
  "意思力为自己争论",
  "自姓都认为是他扔救了他们",
  "基一直心里害怕",
  "将夜间分为三个次",
  "影响，间分为四个更次",
  "以色列人刚进人迦南地时",
  "非利士人 亚扣人",
  "打击亚打人和非利士人",
  "心里焦急，许多学者认为",
  "不是出于上帝师记》中第一次",
  "做事又很愚識",
  "他的愚超过他的信靠",
  "始于主前约1400年，那（见王上6:1注）",
  "《和修》\"了口，不能收回\"，许愿",
  "希伯来文宁面意思",
  "意思是一条流动的溪\"",
  "扫罗和大工的时期",
  "参中6:18.12:25",
  "描述圣灵俄陀聂（3:10）、耶弗\"降在\"他",
  "狐狸的生活习参孙展示",
  "所用的2onah",
  "再次暴簬出软弱",
  "希望上帝介人为自己报仇",
  "与迎南人的神庙",
  "后面的几章记截以色列人",
  "米迎让自己的一个儿子",
  "而是侍大众的",
  "《和修》\"寄居在基比亚\"，这个对比",
  "\"彼列'用来描述堕落",
  "是来人惯用的委婉说法",
  "上帝依然介人这件事",
  "曾起苷，应该是指",
  "大卫被称合上帝心意的人",
  "一片宁静详和",
  "为君王的行制定了许多准则",
  "当人离开上帝生命和人性",
  "狐狸的生活习参孙展示",
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
  "排尼基",
  "后餅",
  "干万人",
  "宜称",
  "好儿里",
  "儿个墓室",
  "参后21:27",
  "流人加利利",
  "目已",
  "膜责",
  "壁宛",
  "l0Culi",
  "干代，",
  "审判的目子",
  "宜认的信仰",
  "诗赛43:3",
  "后1:17.19:10.22:8",
  "21：.4",
  "太11：.27",
  "林前11：.9",
  "51：.64",
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

describe("Judges public card audit and isolation hold-queue", () => {
  const payload = loadBook("Judg");

  it("keeps the public Judges package text-only, verse-mapped, and isolation-filtered", () => {
    expect(payload.bookId).toBe("Judg");
    expect(payload.textCards).toHaveLength(117);
    expect(payload.textCards.every((card) => card.type === "commentary" || card.type === "note")).toBe(true);

    const mix = { studyBible: 0, ocr: 0, cmc: 0, other: 0 };
    const verseIds = verseIdsFor("Judg");
    for (const card of payload.textCards) {
      const anchors = [card.primaryAnchor, ...(card.verses ?? [])].filter((value): value is string => Boolean(value));
      expect(anchors.length, card.id).toBeGreaterThan(0);
      expect(anchors.every((anchor) => verseIds.has(anchor)), card.id).toBe(true);
      if (card.id.startsWith("study-bible-")) mix.studyBible += 1;
      else if (card.id.startsWith("image-text-")) mix.ocr += 1;
      else if (card.id.startsWith("cmc-")) mix.cmc += 1;
      else mix.other += 1;
    }
    expect(mix).toEqual({ studyBible: 114, ocr: 3, cmc: 0, other: 0 });
  });

  it("does not republish confirmed mid-cut or garbage Judges cards", () => {
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

    const judgIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-judg-\d/.test(id));
    expect(judgIsolation).toHaveLength(449);
    expect(judgIsolation.some((id) => publicIds.has(id))).toBe(false);

    const chrIsolation = isolation
      .map((row) => String(row.commentary_key ?? ""))
      .filter((id) => /^cmc-2chr-\d/.test(id));
    expect(chrIsolation).toHaveLength(590);
    expect(chrIsolation.some((id) => publicIds.has(id))).toBe(false);

    if (!existsSync(johnPackDir)) return;
    const johnCards = loadJsonl(resolve(johnPackDir, "card候选清单.jsonl"));
    const johnOcr = johnCards
      .filter((row) => String(row.commentary_key).startsWith("image-text-"))
      .map((row) => String(row.commentary_key));
    expect(johnOcr).toEqual(["image-text-43-约翰福音-codex-pdf-p019-img004"]);
    expect(publicIds.has(johnOcr[0])).toBe(false);
  });
});
