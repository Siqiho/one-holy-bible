import { describe, expect, it } from "vitest";

import { BIBLE_BOOKS } from "../domain/bibleBooks";
import type { StudyResource } from "../domain/resources";
import type { VerseId } from "../domain/verse";
import { cuvBible, kjvBible } from "./bibleLibrary";
import { genesisResources } from "./genesisResources";
import { sampleResources } from "./sampleLibrary";

const genesisResourceById = (id: string) => {
  const resource = genesisResources.find((candidate) => candidate.id === id);
  expect(resource, `Missing Genesis resource ${id}`).toBeDefined();
  return resource!;
};

type GenesisRefRange = {
  start: VerseId;
  end?: VerseId;
};

const unstructuredReaderCopyResourceIds = new Set([
  "genesis-cmc-01-p220-img124-720x405",
]);

const manuallyAuditedSourceChapterExceptions = new Set([
  "genesis-cmc-01-p200-img116-720x439",
]);

const chineseDigits = new Map<string, number>(Object.entries({
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}));

function parseChineseNumber(text: string) {
  const compactText = text.replace(/\s+/g, "");
  if (/^\d+$/.test(compactText)) return Number(compactText);
  if (compactText === "十") return 10;
  if (compactText === "廿") return 20;
  if (compactText === "卅") return 30;
  if (compactText.startsWith("廿")) {
    return 20 + (chineseDigits.get(compactText.slice(1)) ?? 0);
  }
  if (compactText.startsWith("卅")) {
    return 30 + (chineseDigits.get(compactText.slice(1)) ?? 0);
  }

  const tensIndex = compactText.indexOf("十");
  if (tensIndex >= 0) {
    const tensText = compactText.slice(0, tensIndex);
    const onesText = compactText.slice(tensIndex + 1);
    const tens = tensText ? chineseDigits.get(tensText) ?? Number(tensText) : 1;
    const ones = onesText ? chineseDigits.get(onesText) ?? Number(onesText) : 0;
    return tens * 10 + ones;
  }

  return chineseDigits.get(compactText) ?? Number.NaN;
}

function compareVerseIds(left: VerseId, right: VerseId) {
  const leftParts = left.match(/^Gen\.(\d+)\.(\d+)$/);
  const rightParts = right.match(/^Gen\.(\d+)\.(\d+)$/);
  if (!leftParts || !rightParts) {
    throw new Error(`Expected Genesis verse ids, received ${left} and ${right}`);
  }

  const leftChapter = Number(leftParts[1]);
  const leftVerse = Number(leftParts[2]);
  const rightChapter = Number(rightParts[1]);
  const rightVerse = Number(rightParts[2]);

  return leftChapter === rightChapter ? leftVerse - rightVerse : leftChapter - rightChapter;
}

function verseChapter(verseId: VerseId) {
  const match = verseId.match(/^Gen\.(\d+)\.\d+$/);
  return match?.[1] ?? "";
}

function rangeCoversVerse(range: GenesisRefRange, verseId: VerseId) {
  return range.end
    ? compareVerseIds(range.start, verseId) <= 0 && compareVerseIds(verseId, range.end) <= 0
    : range.start === verseId;
}

function bodyReferenceLine(resource: StudyResource) {
  return resource.body.split("\n").find((line) => line.startsWith("关联经文："));
}

function parseGenesisBodyRefRanges(resource: StudyResource) {
  const line = bodyReferenceLine(resource);
  if (!line) {
    return {
      ranges: [] as GenesisRefRange[],
      invalidParts: ["missing 关联经文 line"],
      payload: "",
    };
  }

  const payload = line.replace(/^关联经文：/, "").trim();
  if (payload === "创世记导论") {
    return {
      ranges: [] as GenesisRefRange[],
      invalidParts: [] as string[],
      payload,
    };
  }

  const ranges: GenesisRefRange[] = [];
  const invalidParts: string[] = [];
  for (const part of payload.split("；")) {
    const range = part.match(/^(Gen\.\d+\.\d+)-(Gen\.\d+\.\d+)$/);
    const single = part.match(/^(Gen\.\d+\.\d+)$/);
    if (range) {
      ranges.push({ start: range[1] as VerseId, end: range[2] as VerseId });
    } else if (single) {
      ranges.push({ start: single[1] as VerseId });
    } else {
      invalidParts.push(part);
    }
  }

  return { ranges, invalidParts, payload };
}

function sourceRefPositions(text: string) {
  const refs: Array<{ id: VerseId; index: number; source: string }> = [];

  for (const match of text.matchAll(/【创\s*([一二两三四五六七八九十廿卅零〇\d]+)\s*([一二两三四五六七八九十廿卅零〇\d]+)】/g)) {
    const chapter = parseChineseNumber(match[1]);
    const verse = parseChineseNumber(match[2]);
    if (Number.isFinite(chapter) && Number.isFinite(verse)) {
      refs.push({
        id: `Gen.${chapter}.${verse}` as VerseId,
        index: match.index ?? 0,
        source: match[0],
      });
    }
  }

  for (const match of text.matchAll(/创世记第\s*(\d+)\s*章第\s*(\d+)\s*节/g)) {
    refs.push({
      id: `Gen.${match[1]}.${match[2]}` as VerseId,
      index: match.index ?? 0,
      source: match[0],
    });
  }

  return refs.sort((left, right) => left.index - right.index);
}

function firstFigureCueIndex(text: string) {
  return text.match(/(?:上|下|左|右)?图[:：]/)?.index ?? -1;
}

function nearestSourceRefForImage(resource: StudyResource) {
  const sourceTextSnippet = resource.debugMeta?.sourceTextSnippet ?? "";
  const sourceEvidenceSnippet = resource.debugMeta?.sourceEvidenceSnippet ?? "";
  const refs = sourceRefPositions(sourceTextSnippet);
  if (refs.length === 0) return null;

  const normalizedText = sourceTextSnippet.replace(/\s+/g, " ");
  const evidenceCue = sourceEvidenceSnippet.replace(/\s+/g, " ").slice(0, 32).trim();
  let cueIndex = evidenceCue.length >= 8 ? normalizedText.indexOf(evidenceCue) : -1;
  if (cueIndex < 0) {
    cueIndex = firstFigureCueIndex(sourceTextSnippet);
  }
  if (cueIndex < 0) return null;

  return refs.filter((ref) => ref.index <= cueIndex).at(-1) ?? refs.find((ref) => ref.index > cueIndex) ?? null;
}

describe("Bible library data", () => {
  it("defines canonical metadata for all 66 books", () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    expect(new Set(BIBLE_BOOKS.map((book) => book.id)).size).toBe(66);
    expect(BIBLE_BOOKS.reduce((total, book) => total + book.chapterCount, 0)).toBe(1189);
    expect(BIBLE_BOOKS[0]).toMatchObject({
      id: "Gen",
      chineseName: "创世记",
      englishName: "Genesis",
      testament: "old",
      chapterCount: 50,
    });
    expect(BIBLE_BOOKS.at(-1)).toMatchObject({
      id: "Rev",
      chineseName: "启示录",
      englishName: "Revelation",
      testament: "new",
      chapterCount: 22,
    });
  });

  it("exports full CUV and KJV Bible versions with expected chapters and unique verse ids", () => {
    for (const version of [cuvBible, kjvBible]) {
      expect(new Set(version.verses.map((verse) => verse.id)).size).toBe(version.verses.length);

      const books = new Set(version.verses.map((verse) => verse.book));
      expect(books).toEqual(new Set(BIBLE_BOOKS.map((book) => book.id)));

      const chapters = new Set(version.verses.map((verse) => `${verse.book}.${verse.chapter}`));
      expect(chapters.size).toBe(1189);

      for (const book of BIBLE_BOOKS) {
        const bookVerses = version.verses.filter((verse) => verse.book === book.id);
        const chapterNumbers = new Set(bookVerses.map((verse) => verse.chapter));
        expect(chapterNumbers.size).toBe(book.chapterCount);

        for (let chapter = 1; chapter <= book.chapterCount; chapter += 1) {
          const chapterVerses = bookVerses.filter((verse) => verse.chapter === chapter);
          expect(chapterVerses.map((verse) => verse.verse)).toEqual(
            Array.from({ length: book.verseCounts[chapter - 1] }, (_, index) => index + 1),
          );
        }
      }
    }
  });

  it("includes known verses from Genesis, John, and Revelation", () => {
    expect(cuvBible.verses.find((verse) => verse.id === "Gen.1.1")?.text).toContain("起初");
    expect(kjvBible.verses.find((verse) => verse.id === "Gen.1.1")?.text).toContain("In the beginning");
    expect(cuvBible.verses.find((verse) => verse.id === "John.3.16")?.text).toContain("神爱世人");
    expect(kjvBible.verses.find((verse) => verse.id === "John.3.16")?.text).toContain("For God so loved the world");
    expect(cuvBible.verses.find((verse) => verse.id === "Rev.22.21")?.text).toContain("愿主耶稣的恩惠");
    expect(kjvBible.verses.find((verse) => verse.id === "Rev.22.21")?.text).toBe(
      "The grace of our Lord Jesus Christ be with you all. Amen.",
    );
  });

  it("keeps CUV structural headings and page headers out of verse text", () => {
    expect(cuvBible.verses.find((verse) => verse.id === "Gen.1.31")?.text).not.toContain("旧约");
    expect(cuvBible.verses.find((verse) => verse.id === "Gen.2.3")?.text).not.toContain("伊甸园");
    expect(cuvBible.verses.find((verse) => verse.id === "Gen.4.26")?.text).not.toContain("亚当的后代");
    expect(cuvBible.verses.find((verse) => verse.id === "John.7.39")?.text).not.toContain("约翰福音");
    expect(cuvBible.verses.find((verse) => verse.id === "John.7.39")?.text).not.toContain("群众因耶稣起纷争");
    expect(cuvBible.verses.find((verse) => verse.id === "Gal.4.31")?.text).not.toContain("基督徒的自由");
  });

  it("keeps KJV next-book and testament headings out of verse text", () => {
    expect(kjvBible.verses.find((verse) => verse.id === "Ruth.4.22")?.text).not.toContain(
      "The First Book of Samuel",
    );
    expect(kjvBible.verses.find((verse) => verse.id === "Mal.4.6")?.text).not.toContain("New Testament");
    expect(kjvBible.verses.find((verse) => verse.id === "Mal.4.6")?.text).not.toContain("The Gospel According");
    expect(kjvBible.verses.find((verse) => verse.id === "Titus.3.15")?.text).not.toContain(
      "The Epistle of Paul to Philemon",
    );
    expect(kjvBible.verses.find((verse) => verse.id === "Phlm.1.25")?.text).not.toContain(
      "The Epistle to the Hebrews",
    );
  });

  it("includes sample resources linked to Genesis verses", () => {
    expect(sampleResources.length).toBeGreaterThanOrEqual(2);
    expect(sampleResources.flatMap((resource) => resource.verses)).toContain("Gen.1.1");
  });

  it("includes all Genesis image resources with type-specific asset folders", () => {
    const cmcResources = genesisResources.filter((resource) => resource.id.startsWith("genesis-cmc-01-"));
    const codexV2Resources = genesisResources.filter((resource) => (
      resource.id.startsWith("genesis-ohb-genesis-codex-v2-")
    ));

    expect(genesisResources).toHaveLength(238);
    expect(cmcResources).toHaveLength(226);
    expect(codexV2Resources).toHaveLength(12);
    expect(new Set(genesisResources.map((resource) => resource.id)).size).toBe(238);
    expect(new Set(genesisResources.flatMap((resource) => resource.verses)).size).toBeGreaterThan(20);
    expect(cmcResources.filter((resource) => resource.verses.includes("Gen.1.1"))).toHaveLength(9);
    expect(cmcResources.find((resource) => resource.id === "genesis-cmc-01-p029-img018-572x552")?.verses).toEqual([
      "Gen.1.17",
    ]);
    expect(codexV2Resources.find((resource) => resource.id === "genesis-ohb-genesis-codex-v2-p014-img013-1888x2777")?.verses).toEqual([
      "Gen.2.10",
      "Gen.2.11",
      "Gen.2.12",
      "Gen.2.13",
      "Gen.2.14",
    ]);
    expect(cmcResources.find((resource) => resource.id === "genesis-cmc-01-p420-img231-692x901")?.verses).toEqual(
      expect.arrayContaining([
        "Gen.37.13",
        "Gen.37.25",
        "Gen.37.36",
        "Gen.38.1",
        "Gen.38.30",
        "Gen.46.1",
        "Gen.47.12",
        "Gen.50.7",
        "Gen.50.14",
      ]),
    );
    expect(cmcResources.find((resource) => resource.id === "genesis-cmc-01-p397-img217-720x891")?.verses).toEqual(
      expect.arrayContaining(["Gen.27.43", "Gen.29.1", "Gen.31.3", "Gen.32.1", "Gen.47.12"]),
    );
    expect(cmcResources.find((resource) => resource.id === "genesis-cmc-01-p397-img217-720x891")?.verses).not.toContain("Gen.40.1");
    expect(cmcResources.find((resource) => resource.id === "genesis-cmc-01-p212-img120-720x989")?.primaryAnchor).toBe(
      "Gen.16.7",
    );
    expect(cmcResources.find((resource) => resource.id === "genesis-cmc-01-p397-img217-720x891")?.primaryAnchor).toBe(
      "Gen.27.43",
    );
    expect(cmcResources.find((resource) => resource.id === "genesis-cmc-01-p420-img231-692x901")?.primaryAnchor).toBe(
      "Gen.37.28",
    );
    const titlePage = cmcResources.find((resource) => resource.id === "genesis-cmc-01-p001-img000-670x452");
    const nearEastMap = codexV2Resources.find((resource) => resource.id === "genesis-ohb-genesis-codex-v2-p008-img007-1893x2778");
    expect(titlePage?.body).toContain("关联经文：创世记导论");
    expect(nearEastMap?.body).toContain("关联经文：创世记导论");
    expect(titlePage?.bookIntro).toBe("Gen");
    expect(nearEastMap?.bookIntro).toBe("Gen");
    expect(titlePage?.verses).toEqual([]);
    expect(nearEastMap?.verses).toEqual([]);
    expect(genesisResources.map((resource) => resource.id)).not.toEqual(expect.arrayContaining([
      "genesis-cmc-01-p165-img097-53x23",
      "genesis-cmc-01-p247-img135-211x23",
      "genesis-cmc-01-p255-img140-202x22",
      "genesis-cmc-01-p255-img141-77x19",
      "genesis-cmc-01-p301-img161-381x18",
      "genesis-cmc-01-p381-img210-720x712",
    ]));

    for (const resource of genesisResources) {
      expect(resource.type).toBe("image");
      expect(resource.primaryAnchor ?? resource.bookIntro, resource.id).toBeTruthy();
      if (resource.primaryAnchor) {
        expect(resource.verses, resource.id).toContain(resource.primaryAnchor);
      }
      expect(resource.assetPath).toMatch(/\/assets\/resources\/genesis\/images\/.+\.png$|\/src\/assets\/resources\/genesis\/images\/.+\.png$/);
    }

    expect(cmcResources[0].title).toBe("创世记");
    expect(codexV2Resources[0].title).toBe("《创世记》时期的近东世界");
    expect(cmcResources.find((resource) => resource.id === "genesis-cmc-01-p014-img002-669x195")?.title).toBe(
      "创世记第 1 章第 1 节的希伯来原文",
    );
  });

  it("uses source-supported titles for formerly high-risk Genesis cards", () => {
    expect(genesisResourceById("genesis-cmc-01-p131-img071-720x527").title).toBe("勃鲁盖尔《巴别塔》");
    expect(genesisResourceById("genesis-cmc-01-p131-img072-573x349").title).toBe("欧洲议会大厦");
    expect(genesisResourceById("genesis-cmc-01-p179-img105-720x989").title).toBe("庇耳·拉海·莱井");
    expect(genesisResourceById("genesis-cmc-01-p140-img077-720x314").title).toBe("吾珥城月神塔庙");
    expect(genesisResourceById("genesis-cmc-01-p140-img078-750x1231").title).toBe("吾珥城月神塔庙");
    expect(genesisResourceById("genesis-cmc-01-p142-img079-720x655").title).toBe("吾珥军旗两侧图案");
    expect(genesisResourceById("genesis-cmc-01-p156-img090-701x1024").title).toBe("族长们在应许之地的行踪");
  });

  it("keeps Genesis image reader copy free of source filenames and machine evidence", () => {
    const forbiddenReaderCopy = [
      /\.png/i,
      /\.pdf/i,
      /p\d{3}_img\d{3}/i,
      /src\/assets/i,
      /\/Users\/simon/,
      /CMC-01_副本/,
      /PDF图片截图清理版/,
      /文档图片内容提取/,
      /physical_chapter_only/,
      /ocr_page_ref/,
      /sourcePackage/,
      /sourceFolder/,
      /sourcePdfPath/,
      /sourcePdfSha256/,
      /sourceManifestPath/,
      /sourceLedgerPath/,
      /sourceTextSnippet/,
      /fileName/,
      /[a-f0-9]{64}/i,
    ];
    const forbiddenConfidenceCopy = [
      /置信度/,
      /confidence/i,
      /高置信/,
      /中置信/,
      /低置信/,
    ];
    const forbiddenInterpretiveCopy = [
      /帮助理解/,
      /辅助观察/,
      /适合作为/,
      /可作为/,
      /视觉参考/,
      /自然例证/,
      /主题相连/,
      /读经背景/,
      /导论入口/,
      /不作为/,
      /不强行作为/,
    ];

    for (const resource of genesisResources) {
      const visibleCopy = [resource.title, resource.source ?? "", resource.body].join("\n");
      const searchableCopy = resource.searchText ?? "";
      for (const forbidden of forbiddenReaderCopy) {
        expect(visibleCopy).not.toMatch(forbidden);
        expect(searchableCopy).not.toMatch(forbidden);
      }
      for (const forbidden of forbiddenConfidenceCopy) {
        expect(visibleCopy).not.toMatch(forbidden);
        expect(searchableCopy).not.toMatch(forbidden);
      }
      for (const forbidden of forbiddenInterpretiveCopy) {
        expect(visibleCopy).not.toMatch(forbidden);
      }
      if (resource.id !== "genesis-cmc-01-p220-img124-720x405") {
        expect(resource.body.split("\n").map((line) => line.split("：")[0])).toEqual([
          "摘要",
          "关联经文",
          "依据",
        ]);
      }
    }

    const map = genesisResourceById("genesis-cmc-01-p048-img032-720x525");
    expect(map.title).toBe("古代美索不达米亚平原");
    expect(map.body).toBe([
      "摘要：美索不达米亚（Mesopotamia）是古希腊人对两河流域的称呼，两条河指幼发拉底河（Euphrates）和底格里斯河（Tigris）。",
      "关联经文：Gen.2.10-Gen.2.14",
      "依据：上图：古代美索不达米亚平原。",
    ].join("\n"));

    const orchid = genesisResourceById("genesis-cmc-01-p033-img023-720x404");
    expect(orchid.title).toBe("水桶兰的授粉过程");
    expect(orchid.body).toBe([
      "摘要：产于热带美洲的「水桶兰」（Bucket Orchid）有非常独特的花粉传播和授精机制。",
      "关联经文：Gen.1.22",
      "依据：水桶兰复杂而精细的结构包括至少五项独立功能，并且必须按正确的次序运作：1、吸引蜜蜂；2、使蜜蜂掉进水桶；3、植物腺分泌液体注满水桶；4、提供隧道出口；5、在隧道内黏贴或除去花粉囊。",
    ].join("\n"));

    const notePage = genesisResourceById("genesis-ohb-genesis-codex-v2-p014-img013-1888x2777");
    expect(notePage.title).toBe("伊甸园位置示意图");
    expect(notePage.body).toBe([
      "摘要：《创世记》记载伊甸园位于四条河的汇合点，其中底格里斯河和幼发拉底河可与美索不达米亚相关联。",
      "关联经文：Gen.2.10-Gen.2.14",
      "依据：图示根据四条河的线索标出伊甸园可能位于两河流域北端或南端。",
    ].join("\n"));

    const jacob = genesisResourceById("genesis-cmc-01-p397-img217-720x891");
    expect(jacob.title).toBe("雅各生平行踪");
    expect(jacob.body).toBe([
      "摘要：雅各生平行踪：逃往哈兰，在哈兰娶妻生子；携眷返迦南；以扫从西珥来和雅各相会；迁往疏割、示剑、伯特利和希伯仑；全家迁往埃及，住在歌珊地。",
      "关联经文：Gen.27.43-Gen.29.1；Gen.31.3-Gen.32.1；Gen.33.1-Gen.33.16；Gen.33.17-Gen.35.27；Gen.46.1-Gen.46.7；Gen.47.11-Gen.47.12",
      "依据：上图：雅各生平行踪。",
    ].join("\n"));

    const josephAndJudah = genesisResourceById("genesis-cmc-01-p420-img231-692x901");
    expect(josephAndJudah.title).toBe("约瑟、犹大生平行踪");
    expect(josephAndJudah.body).toBe([
      "摘要：约瑟、犹大生平行踪：约瑟被差遣到示剑去查看他的兄长们牧羊，在多坍被丢在坑里；约瑟被他的兄长卖给米甸人，带去埃及为奴；犹大的故事；约瑟接雅各全家到埃及，并将雅各的遗体运回希伯伦。",
      "关联经文：Gen.37.13；Gen.37.25-Gen.37.36；Gen.38.1-Gen.38.30；Gen.46.1-Gen.47.12；Gen.50.7-Gen.50.14",
      "依据：图注续列：约瑟接父亲雅各全家到埃及；约瑟将雅各的遗体运回希伯伦。",
    ].join("\n"));
  });

  it("keeps Genesis image card titles short and caption-like", () => {
    expect(genesisResources).toHaveLength(238);

    const byFileName = (fileName: string) => {
      const resource = genesisResources.find((candidate) => candidate.debugMeta?.fileName === fileName);
      expect(resource, `Missing Genesis image resource for ${fileName}`).toBeDefined();
      return resource!;
    };
    const forbiddenTitleStart = /^(上图|下图|右图|左图|图：|图:|【创|创世记 9:12 30)/;
    const forbiddenTitleTail = /(现藏于|出土于|摄于|长\s*\d+\s*厘米|已发现|大都是)/;
    const titleLooksClipped = /[。，；]|\s[A-Z]?[a-z][A-Za-z]{0,3}$/;
    const countMatches = (text: string, pattern: RegExp) => text.match(pattern)?.length ?? 0;

    for (const resource of genesisResources) {
      expect(resource.title, resource.id).toBeTruthy();
      expect(resource.title.length, resource.id).toBeLessThanOrEqual(24);
      expect(resource.title, resource.id).not.toMatch(forbiddenTitleStart);
      expect(resource.title, resource.id).not.toMatch(/^[，。；：、？！,.;:]/);
      expect(resource.title, resource.id).not.toMatch(forbiddenTitleTail);
      expect(resource.title, resource.id).not.toMatch(titleLooksClipped);
      expect(resource.title, resource.id).not.toMatch(/[（(][^）)]*$/);
      expect(countMatches(resource.title, /[（(]/g), resource.id).toBe(countMatches(resource.title, /[）)]/g));
    }

    expect(byFileName("p234_img130_580x535.png").title).toBe("以色列金首饰");
    expect(byFileName("p262_img144_600x736.png").title).toBe("努斯石版");
    expect(byFileName("p407_img222_539x767.png").title).toBe("耶路撒冷市徽");
    expect(byFileName("p024_img023_1891x2777.png").title).not.toMatch(/^创世记 9:12 30/);
  });

  it("uses audited card copy and verse placement instead of page-position guesses", () => {
    const expectStructuredCard = (
      resourceId: string,
      expected: { body: string[]; title: string; verses: VerseId[]; confidence?: "high" | "medium" | "low" },
    ) => {
      const resource = genesisResourceById(resourceId);
      expect(resource.title).toBe(expected.title);
      expect(resource.verses).toEqual(expected.verses);
      expect(resource.body).toBe(expected.body.join("\n"));
      if (expected.confidence) {
        expect(resource.debugMeta?.confidence).toBe(expected.confidence);
      }
    };

    expectStructuredCard("genesis-cmc-01-p021-img011-720x574", {
      title: "金星、地球、火星磁场对比",
      verses: ["Gen.1.6"],
      confidence: "high",
      body: [
        "摘要：从上到下分别是金星、地球、火星的磁场对比，说明地球维持大气层和水环境所需的条件。",
        "关联经文：Gen.1.6",
        "依据：上图：从上到下分别是金星、地球、火星的磁场对比。",
      ],
    });
    expect(genesisResourceById("genesis-cmc-01-p017-img007-599x361").verses).toEqual(["Gen.1.1"]);
    expect(genesisResourceById("genesis-cmc-01-p017-img008-717x405").verses).toEqual(["Gen.1.1"]);

    expectStructuredCard("genesis-cmc-01-p077-img043-720x540", {
      title: "埃利都遗址",
      verses: ["Gen.4.17"],
      confidence: "high",
      body: [
        "摘要：埃利都是目前发现的美索不达米亚最早城市之一，古代城市的创建与贸易、文化、宗教和政治中心形成密切相关。",
        "关联经文：Gen.4.17",
        "依据：上图：主前 5400 年的埃利都遗址。埃利都是目前发现的美索不达米亚最早的城市，也是世界上最早的城市。",
      ],
    });
    expectStructuredCard("genesis-cmc-01-p127-img069-1445x1019", {
      title: "挪亚的后代分布图",
      verses: Array.from({ length: 32 }, (_, index) => `Gen.10.${index + 1}` as VerseId),
      confidence: "high",
      body: [
        "摘要：挪亚后代分布图展示雅弗、含、闪后代各族的领土与宁录所建之城。",
        "关联经文：Gen.10.1-Gen.10.32",
        "依据：上图：挪亚的后代分布图。",
      ],
    });
    expectStructuredCard("genesis-cmc-01-p212-img120-720x989", {
      title: "夏甲和以实玛利行踪",
      verses: [
        ...Array.from({ length: 16 }, (_, index) => `Gen.16.${index + 1}` as VerseId),
        ...Array.from({ length: 8 }, (_, index) => `Gen.21.${index + 14}` as VerseId),
      ],
      confidence: "high",
      body: [
        "摘要：夏甲和以实玛利行踪：夏甲怀孕后出走又回到亚伯兰家，后来与以实玛利被逐，在别是巴旷野蒙神看顾后去到巴兰旷野。",
        "关联经文：Gen.16.1-Gen.16.16；Gen.21.14-Gen.21.21",
        "依据：上图：夏甲和以实玛利行踪。",
      ],
    });
    expectStructuredCard("genesis-cmc-01-p255-img142-720x540", {
      title: "别是巴公共水井",
      verses: ["Gen.26.33"],
      confidence: "high",
      body: [
        "摘要：别是巴遗址城门口的公共水井深约 70 米，是南地已发现最深的水井，可能就是以撒所挖的井。",
        "关联经文：Gen.26.33",
        "依据：上图：别是巴遗址城门口的公共水井，深 70 米，是在南地已发现最深的水井。",
      ],
    });
    expectStructuredCard("genesis-cmc-01-p405-img221-720x599", {
      title: "以色列十二支派标志",
      verses: Array.from({ length: 28 }, (_, index) => `Gen.49.${index + 1}` as VerseId),
      confidence: "high",
      body: [
        "摘要：现代设计中的以色列十二支派标志，以图像方式对应雅各给众子的祝福。",
        "关联经文：Gen.49.1-Gen.49.28",
        "依据：图像展示十二支派标志，呼应雅各聚集众子并宣告祝福。",
      ],
    });
    expectStructuredCard("genesis-ohb-genesis-codex-v2-p045-img044-1890x2771", {
      title: "往巴旦亚兰之旅",
      verses: Array.from({ length: 58 }, (_, index) => `Gen.24.${index + 10}` as VerseId),
      confidence: "high",
      body: [
        "摘要：地图呈现亚伯拉罕仆人前往巴旦亚兰为以撒寻妻，并把利百加带回迦南的路线。",
        "关联经文：Gen.24.10-Gen.24.67",
        "依据：图注说明亚伯拉罕派老仆人回本族之地为以撒娶妻，老仆人找到利百加并把她带回迦南。",
      ],
    });
  });

  it("uses original document evidence and the correct verse for the fat-tailed sheep card", () => {
    const sheep = genesisResourceById("genesis-cmc-01-p222-img125-720x498");

    expect(sheep.verses).toEqual(["Gen.22.13"]);
    expect(sheep.body).toContain("摘要：以色列最常见的肥尾羊 Awassi sheep，角很容易被树枝卡住。");
    expect(sheep.body).toContain("关联经文：Gen.22.13");
    expect(sheep.body).toContain("依据：上图：以色列最常见的肥尾羊 Awassi sheep，角很容易被树枝卡住。");
    expect([sheep.title, sheep.source ?? "", sheep.body].join("\n")).not.toMatch(/Gen\.22\.14|创廿二 14|置信度/);
    expect(sheep.searchText).not.toMatch(/Gen\.22\.14|创廿二 14/);
    expect(sheep.debugMeta?.sourceEvidenceSnippet).toContain(
      "上图：以色列最常见的肥尾羊 Awassi sheep，角很容易被树枝卡住。",
    );
  });

  it("uses the next-page figure caption instead of nearby scripture commentary for the Sumerian life tree card", () => {
    const lifeTree = genesisResourceById("genesis-cmc-01-p046-img031-720x383");
    const visibleCopy = [lifeTree.title, lifeTree.source ?? "", lifeTree.body, lifeTree.searchText ?? ""].join("\n");

    expect(lifeTree.title).toBe("苏美尔生命树的壁画");
    expect(lifeTree.verses).toEqual(["Gen.2.9"]);
    expect(lifeTree.primaryAnchor).toBe("Gen.2.9");
    expect(lifeTree.body).toContain("摘要：苏美尔（Sumerian）生命树的壁画");
    expect(lifeTree.body).toContain("关联经文：Gen.2.9");
    expect(lifeTree.body).toContain("依据：上图：苏美尔（Sumerian）生命树的壁画");
    expect(visibleCopy).toContain("这从侧面佐证人类的祖先都来自伊甸园");
    expect(visibleCopy).not.toContain("神在伊甸园中所预备的一切");
    expect(visibleCopy).not.toContain("灵与魂与身子");
    expect(visibleCopy).not.toMatch(/【创二\s*9】/);
    expect(lifeTree.debugMeta).toMatchObject({
      fileName: "p046_img031_720x383.png",
      sourceEvidenceType: "figure_caption",
      sourceEvidencePage: 47,
      sourceEvidenceOrigin: "next-page",
      captionRiskFlags: ["caption-boundary-truncated", "caption-from-next-page"],
    });
    expect(lifeTree.debugMeta?.sourceTextSnippet).toContain("神在伊甸园中所预备的一切");
    expect(lifeTree.debugMeta?.sourceEvidenceSnippet).toContain("苏美尔（Sumerian）生命树的壁画");
  });

  it("keeps the p220 Khopesh image card reader copy concise while preserving source tracing", () => {
    const khopesh = genesisResourceById("genesis-cmc-01-p220-img124-720x405");
    const expectedReaderCopy = "耶路撒冷附近出土的主前 1500 年牛腿刀（Khopesh），长 58 厘米，主前 2500-1300 年在埃及和迦南地流行；早期用青铜制作，后期用铁制作。牛腿刀形状像牛腿，适合劈砍，是埃及中王国和新王国时期军队的标志性装备，以色列人征服迦南时也使用这种刀。";

    expect(khopesh.title).toBe("牛腿刀（Khopesh）");
    expect(khopesh.body).toBe(expectedReaderCopy);
    expect(khopesh.summary).toBe(expectedReaderCopy);
    expect(khopesh.body).not.toMatch(/摘要：|关联经文：|依据：/);
    expect(khopesh.summary).not.toMatch(/摘要：|关联经文：|依据：/);
    expect(khopesh.verses).toEqual(["Gen.22.10"]);
    expect(khopesh.searchText).toContain("牛腿刀（Khopesh）");
    expect(khopesh.searchText).toContain("Gen.22.10");
    expect(khopesh.searchText).toContain("耶路撒冷 附近出土的主前 1500 年 的 牛 腿 刀");
    expect(khopesh.debugMeta?.sourceEvidenceSnippet).toContain(
      "上图：耶路撒冷 附近出土的主前 1500 年 的 牛 腿 刀 （Khopesh）",
    );
  });

  it("uses the mandrake image with the correct Genesis 30 context", () => {
    const mandrake = genesisResourceById("genesis-cmc-01-p280-img151-1000x654");

    expect(mandrake.title).toBe("风茄（Mandrake）");
    expect(mandrake.verses).toEqual(["Gen.30.14", "Gen.30.15", "Gen.30.16"]);
    expect(mandrake.body).toBe([
      "摘要：风茄（Mandrake）是一种多年生茄参属植物，根部像人，产于地中海周围地区，在收割小麦时成熟。",
      "关联经文：Gen.30.14-Gen.30.16",
      "依据：上图：风茄（Mandrake）是一种多年生茄参属植物，根部像人，产于地中海周围地区，在收割小麦时成熟。在中东文化中认为它有帮助受孕的作用。",
    ].join("\n"));
    expect([mandrake.title, mandrake.source ?? "", mandrake.body].join("\n")).not.toMatch(/Gen\.30\.5|辟拉就怀孕|置信度/);
    expect(mandrake.searchText).toContain("风茄（Mandrake）");
    expect(mandrake.searchText).toContain("Gen.30.14-Gen.30.16");
    expect(mandrake.searchText).not.toMatch(/Gen\.30\.5|辟拉就怀孕/);
    expect(mandrake.debugMeta?.sourceTextSnippet).toContain("寻见风茄");
  });

  it("keeps audited high-evidence Genesis image verse relationships aligned with the source text", () => {
    const auditedVerseExpectations = [
      ["genesis-cmc-01-p093-img049-720x540", ["Gen.6.14"]],
      ["genesis-cmc-01-p157-img091-580x487", ["Gen.13.4"]],
      ["genesis-cmc-01-p161-img094-713x967", ["Gen.13.18"]],
      ["genesis-cmc-01-p186-img108-720x437", ["Gen.18.1"]],
      ["genesis-cmc-01-p191-img110-720x480", ["Gen.19.1"]],
      ["genesis-cmc-01-p222-img125-720x498", ["Gen.22.13"]],
      ["genesis-cmc-01-p280-img151-1000x654", ["Gen.30.14", "Gen.30.15", "Gen.30.16"]],
      ["genesis-cmc-01-p361-img197-334x314", ["Gen.41.42"]],
      ["genesis-cmc-01-p361-img198-224x367", ["Gen.41.42"]],
      ["genesis-cmc-01-p364-img201-312x208", ["Gen.41.48", "Gen.41.49"]],
    ] as const;

    for (const [resourceId, expectedVerses] of auditedVerseExpectations) {
      expect(genesisResourceById(resourceId).verses, resourceId).toEqual(expectedVerses);
    }
  });

  it("keeps Genesis image card verse links aligned with reader copy and source context", () => {
    const bodyRefAnomalies: Array<{
      id: string;
      title: string;
      reason: string;
      expectedVerse?: VerseId;
      extraVerse?: VerseId;
      payload?: string;
      invalidParts?: string[];
    }> = [];
    const chapterAnomalies: Array<{
      id: string;
      title: string;
      fileName?: string;
      verses: VerseId[];
      nearestSourceRef: string;
      source: string;
    }> = [];

    for (const resource of genesisResources) {
      if (!unstructuredReaderCopyResourceIds.has(resource.id)) {
        const parsedRefs = parseGenesisBodyRefRanges(resource);
        if (parsedRefs.invalidParts.length > 0) {
          bodyRefAnomalies.push({
            id: resource.id,
            title: resource.title,
            reason: "invalid 关联经文 format",
            payload: parsedRefs.payload,
            invalidParts: parsedRefs.invalidParts,
          });
        }

        if (resource.bookIntro === "Gen") {
          if (parsedRefs.payload !== "创世记导论" || resource.verses.length > 0) {
            bodyRefAnomalies.push({
              id: resource.id,
              title: resource.title,
              reason: "Genesis intro card must use 创世记导论 and have no verse ids",
              payload: parsedRefs.payload,
            });
          }
        } else {
          for (const verseId of resource.verses) {
            if (!parsedRefs.ranges.some((range) => rangeCoversVerse(range, verseId))) {
              bodyRefAnomalies.push({
                id: resource.id,
                title: resource.title,
                reason: "resource.verses not covered by reader 关联经文",
                expectedVerse: verseId,
                payload: parsedRefs.payload,
              });
            }
          }

          if (resource.debugMeta?.sourceEvidenceType === "figure_caption") {
            for (const range of parsedRefs.ranges) {
              if (range.end) continue;
              if (!resource.verses.includes(range.start)) {
                bodyRefAnomalies.push({
                  id: resource.id,
                  title: resource.title,
                  reason: "figure-caption reader 关联经文 exposes an unindexed verse",
                  extraVerse: range.start,
                  payload: parsedRefs.payload,
                });
              }
            }
          }
        }
      }

      const nearestSourceRef = nearestSourceRefForImage(resource);
      if (
        !nearestSourceRef
        || resource.bookIntro
        || resource.debugMeta?.confidence === "low"
        || manuallyAuditedSourceChapterExceptions.has(resource.id)
      ) {
        continue;
      }

      const nearestChapter = verseChapter(nearestSourceRef.id);
      if (!resource.verses.some((verseId) => verseChapter(verseId) === nearestChapter)) {
        chapterAnomalies.push({
          id: resource.id,
          title: resource.title,
          fileName: resource.debugMeta?.fileName,
          verses: resource.verses,
          nearestSourceRef: nearestSourceRef.id,
          source: nearestSourceRef.source,
        });
      }
    }

    expect(bodyRefAnomalies).toEqual([]);
    expect(chapterAnomalies).toEqual([]);
  });

  it("keeps Genesis image source details in debug metadata instead of reader copy", () => {
    const resource = genesisResourceById("genesis-cmc-01-p048-img032-720x525");

    expect(resource.debugMeta).toMatchObject({
      fileName: "p048_img032_720x525.png",
      sourceFolder: "CMC-01_副本",
      sourcePackage: "文档图片内容提取_20260515_121143",
      folderLabel: "src/assets/resources/genesis/images/cmc-01",
      page: 48,
      confidence: "high",
    });
    expect(resource.debugMeta?.evidence).toContain("physical_chapter_only");
    expect(resource.debugMeta?.sourcePdfPath).toBe("/Users/simon/OHB/文档/创世纪/CMC-01_副本.pdf");
    expect(resource.debugMeta?.sourcePdfSha256).toBe("43b34dd4c5758e14c9aa84f31bfe1cd6ed90879ee7f720e7ac361c6d42942e8d");
    expect(resource.debugMeta?.sourceManifestPath).toBe(
      "/Users/simon/OHB/Resources/01_创世记/文档图片内容提取_20260515_121143/manifest.jsonl",
    );
    expect(resource.debugMeta?.sourceLedgerPath).toBe(
      "/Users/simon/OHB/Resources/01_创世记/文档图片内容提取_20260515_121143/资源审计台账.jsonl",
    );
    expect(resource.debugMeta?.sourceTextSnippet).toContain("古代美索不达米亚平原");
    expect(resource.summary).toBeTruthy();
    expect(resource.searchText).toContain("古代美索不达米亚平原");
  });

  it("adds source-traceable metadata to every Genesis image card", () => {
    const sourcePdfPaths = new Set<string>();
    const sourcePdfHashes = new Set<string>();

    for (const resource of genesisResources) {
      expect(resource.summary, resource.id).toBeTruthy();
      expect(resource.searchText, resource.id).toBeTruthy();
      expect(resource.debugMeta?.sourcePdfPath, resource.id).toMatch(/^\/Users\/simon\/OHB\/文档\/.+\.pdf$/);
      expect(resource.debugMeta?.sourcePdfSha256, resource.id).toMatch(/^[a-f0-9]{64}$/);
      expect(resource.debugMeta?.sourceManifestPath, resource.id).toBe(
        "/Users/simon/OHB/Resources/01_创世记/文档图片内容提取_20260515_121143/manifest.jsonl",
      );
      expect(resource.debugMeta?.sourceLedgerPath, resource.id).toBe(
        "/Users/simon/OHB/Resources/01_创世记/文档图片内容提取_20260515_121143/资源审计台账.jsonl",
      );
      expect(resource.debugMeta?.sourceTextSnippet, resource.id).toBeTruthy();
      expect(resource.debugMeta?.sourceTextSnippet?.length, resource.id).toBeLessThanOrEqual(700);
      expect(resource.debugMeta?.sourceTextSource, resource.id).toBe("pdftotext");
      expect(resource.debugMeta?.sourceEvidenceType, resource.id).toBeTruthy();
      expect(resource.debugMeta?.sourceEvidencePage, resource.id).toEqual(expect.any(Number));
      expect(resource.debugMeta?.sourceEvidenceOrigin, resource.id).toMatch(/^(same-page|next-page)$/);
      expect(resource.debugMeta?.captionRiskFlags, resource.id).toEqual(expect.any(Array));
      expect(resource.debugMeta?.storedRelativePath, resource.id).toBeTruthy();
      expect(resource.debugMeta?.storedAbsolutePath, resource.id).toMatch(/^\/Users\/simon\/OHB\/Resources\/01_创世记\/文档图片内容提取_20260515_121143\/.+\.png$/);
      expect(resource.searchText).toContain(resource.title.replace(/\s+([，。；：、？！）】》」])/g, "$1"));

      sourcePdfPaths.add(resource.debugMeta!.sourcePdfPath!);
      sourcePdfHashes.add(resource.debugMeta!.sourcePdfSha256!);
    }

    expect(sourcePdfPaths).toEqual(new Set([
      "/Users/simon/OHB/文档/创世纪/CMC-01_副本.pdf",
      "/Users/simon/OHB/文档/圣经研修本_按卷分割可选文字-v3_20260507_2316/01_创世记-v3.pdf",
    ]));
    expect(sourcePdfHashes).toEqual(new Set([
      "43b34dd4c5758e14c9aa84f31bfe1cd6ed90879ee7f720e7ac361c6d42942e8d",
      "70af882c46632b4fe4ab470f1bfb6719e2847af1a754998ee353e0bb7f01f1c0",
    ]));
  });

  it("keeps Codex v2 Genesis resource ids stable while loading cropped replacement assets", () => {
    const map = genesisResourceById("genesis-ohb-genesis-codex-v2-p008-img007-1893x2778");
    const notePage = genesisResourceById("genesis-ohb-genesis-codex-v2-p014-img013-1888x2777");

    expect(map.assetPath).toMatch(
      /\/src\/assets\/resources\/genesis\/images\/ohb-genesis-codex-v2-crops\/p008_img007_\d+x\d+\.png$/,
    );
    expect(notePage.assetPath).toMatch(
      /\/src\/assets\/resources\/genesis\/images\/ohb-genesis-codex-v2-crops\/p014_img013_\d+x\d+\.png$/,
    );
    expect(map.debugMeta).toMatchObject({
      fileName: "p008_img007_1893x2778.png",
      originalFileName: "p008_img007_1893x2778.png",
      replacementFileName: expect.stringMatching(/^p008_img007_\d+x\d+\.png$/),
      sourceFolder: "01_创世记-v3",
      folderLabel: "src/assets/resources/genesis/images/ohb-genesis-codex-v2-crops",
    });
    expect(notePage.debugMeta).toMatchObject({
      fileName: "p014_img013_1888x2777.png",
      originalFileName: "p014_img013_1888x2777.png",
      replacementFileName: expect.stringMatching(/^p014_img013_\d+x\d+\.png$/),
    });
    expect(map.bookIntro).toBe("Gen");
    expect(map.verses).toEqual([]);
    expect(notePage.verses).toEqual([
      "Gen.2.10",
      "Gen.2.11",
      "Gen.2.12",
      "Gen.2.13",
      "Gen.2.14",
    ]);
  });

  it("appends Genesis image resources without replacing the starter sample resources", () => {
    expect(sampleResources.map((resource) => resource.id)).toEqual(expect.arrayContaining([
      "gen-1-1-creation-note",
      "gen-1-1-video",
      "gen-1-1-html",
      "gen-1-2-note",
    ]));
    expect(sampleResources.map((resource) => resource.id)).not.toContain("gen-1-1-map");
    const sampleResourceIds = new Set(sampleResources.map((resource) => resource.id));
    for (const resource of genesisResources) {
      expect(sampleResourceIds.has(resource.id), resource.id).toBe(true);
    }
    expect(sampleResources).toHaveLength(genesisResources.length + 4);
    expect(sampleResources.find((resource) => resource.id === "cmc-gen-1-1")).toBeUndefined();
    expect(sampleResources.find((resource) => resource.id === "gen-1-1-video")).toMatchObject({
      bookIntro: "Gen",
      verses: [],
    });
  });
});
