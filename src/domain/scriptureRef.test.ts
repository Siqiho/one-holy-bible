import { describe, expect, it } from "vitest";
import {
  detectScriptureRefs,
  parseChineseNumeral,
  parseCitationUnit,
  parseComprehensiveAbsoluteRef,
  parseVerseSequence,
  resolveBookToken,
} from "./scriptureRef";

describe("parseChineseNumeral", () => {
  it("parses simple and compound Chinese chapter numbers from comprehensive commentary", () => {
    expect(parseChineseNumeral("一")).toBe(1);
    expect(parseChineseNumeral("六")).toBe(6);
    expect(parseChineseNumeral("十")).toBe(10);
    expect(parseChineseNumeral("十一")).toBe(11);
    expect(parseChineseNumeral("十五")).toBe(15);
    expect(parseChineseNumeral("二十")).toBe(20);
    expect(parseChineseNumeral("二十二")).toBe(22);
    expect(parseChineseNumeral("三十二")).toBe(32);
    expect(parseChineseNumeral("三十五")).toBe(35);
    expect(parseChineseNumeral("一百")).toBe(100);
    expect(parseChineseNumeral("一百一十六")).toBe(116);
    expect(parseChineseNumeral("一百零五")).toBe(105);
    expect(parseChineseNumeral("一百十一")).toBe(111);
    expect(parseChineseNumeral("一百十八")).toBe(118);
    expect(parseChineseNumeral("廿四")).toBe(24);
    expect(parseChineseNumeral("廿")).toBe(20);
  });

  it("accepts arabic digits and rejects empty noise", () => {
    expect(parseChineseNumeral("12")).toBe(12);
    expect(parseChineseNumeral("")).toBeNull();
    expect(parseChineseNumeral("甲")).toBeNull();
  });
});

describe("resolveBookToken", () => {
  it("resolves common Chinese short names used in commentary cards", () => {
    expect(resolveBookToken("申")).toBe("Deut");
    expect(resolveBookToken("创")).toBe("Gen");
    expect(resolveBookToken("弗")).toBe("Eph");
    expect(resolveBookToken("来")).toBe("Heb");
    expect(resolveBookToken("來")).toBe("Heb");
    expect(resolveBookToken("诗")).toBe("Ps");
    expect(resolveBookToken("林后")).toBe("2Cor");
    expect(resolveBookToken("约壹")).toBe("1John");
    expect(resolveBookToken("约一")).toBe("1John");
    expect(resolveBookToken("启")).toBe("Rev");
    expect(resolveBookToken("犹")).toBe("Jude");
  });

  it("prefers longer tokens over shorter ambiguous prefixes", () => {
    expect(resolveBookToken("约壹")).toBe("1John");
    expect(resolveBookToken("约")).toBe("John");
    expect(resolveBookToken("彼前")).toBe("1Pet");
    expect(resolveBookToken("林前")).toBe("1Cor");
  });
});

describe("parseVerseSequence", () => {
  it("parses lists and ranges", () => {
    expect(parseVerseSequence("1、21、27")).toEqual([1, 21, 27]);
    expect(parseVerseSequence("26-27")).toEqual([26, 27]);
    expect(parseVerseSequence("2、9-10")).toEqual([2, 9, 10]);
    expect(parseVerseSequence("3-4")).toEqual([3, 4]);
  });
});

describe("parseCitationUnit", () => {
  it("parses absolute, relative, and same-chapter units", () => {
    expect(parseCitationUnit("出十九 6")?.verseIds).toEqual(["Exod.19.6"]);
    expect(parseCitationUnit("罗一 26-27")?.verseIds).toEqual(["Rom.1.26", "Rom.1.27"]);
    expect(parseCitationUnit("犹 7")?.verseIds).toEqual(["Jude.1.7"]);
    expect(parseCitationUnit("十七 5", { sourceBookId: "Gen" })?.verseIds).toEqual(["Gen.17.5"]);
    expect(parseCitationUnit("十八 2、9-10", { sourceBookId: "Gen" })?.verseIds).toEqual([
      "Gen.18.2",
      "Gen.18.9",
      "Gen.18.10",
    ]);
    expect(parseCitationUnit("7 节", { sourceBookId: "Gen", sourceChapter: 12 })?.verseIds).toEqual([
      "Gen.12.7",
    ]);
    expect(parseCitationUnit("3-4 节", { sourceBookId: "Gen", sourceChapter: 1 })?.verseIds).toEqual([
      "Gen.1.3",
      "Gen.1.4",
    ]);
    expect(parseCitationUnit("1、21、27 节", { sourceBookId: "Gen", sourceChapter: 1 })?.verseIds).toEqual([
      "Gen.1.1",
      "Gen.1.21",
      "Gen.1.27",
    ]);
  });
});

describe("parseComprehensiveAbsoluteRef", () => {
  it("parses the screenshot golden samples", () => {
    expect(parseComprehensiveAbsoluteRef("申三十二 15")).toBe("Deut.32.15");
    expect(parseComprehensiveAbsoluteRef("创三十五 1")).toBe("Gen.35.1");
    expect(parseComprehensiveAbsoluteRef("弗六 12")).toBe("Eph.6.12");
  });

  it("parses parenthesized forms and neighboring comprehensive samples", () => {
    expect(parseComprehensiveAbsoluteRef("（申三十二 15）")).toBe("Deut.32.15");
    expect(parseComprehensiveAbsoluteRef("(创三十五 1)")).toBe("Gen.35.1");
    expect(parseComprehensiveAbsoluteRef("（弗六 12）")).toBe("Eph.6.12");
    expect(parseComprehensiveAbsoluteRef("来十一 3")).toBe("Heb.11.3");
    expect(parseComprehensiveAbsoluteRef("诗三十三 6")).toBe("Ps.33.6");
    expect(parseComprehensiveAbsoluteRef("林后四 6")).toBe("2Cor.4.6");
    expect(parseComprehensiveAbsoluteRef("约壹一 5")).toBe("1John.1.5");
    expect(parseComprehensiveAbsoluteRef("启二十二 2")).toBe("Rev.22.2");
  });

  it("rejects invalid chapters/verses", () => {
    expect(parseComprehensiveAbsoluteRef("弗六 99")).toBeNull();
    expect(parseComprehensiveAbsoluteRef("创九十九 1")).toBeNull();
    expect(parseComprehensiveAbsoluteRef("不是经文")).toBeNull();
  });
});

describe("detectScriptureRefs", () => {
  it("detects the Gen 1:1 comprehensive commentary screenshot refs", () => {
    const body =
      "希伯来语的「神」在两河流域泛指各种神明，单数是 Eloah（申三十二 15）或 El（创三十五 1），双数是 Eloahi，三个以上的众数是 Elohim。";

    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 1 });

    expect(refs).toEqual([
      {
        raw: "申三十二 15",
        start: expect.any(Number),
        end: expect.any(Number),
        verseIds: ["Deut.32.15"],
        confidence: "high",
        pattern: "comprehensive-absolute",
      },
      {
        raw: "创三十五 1",
        start: expect.any(Number),
        end: expect.any(Number),
        verseIds: ["Gen.35.1"],
        confidence: "high",
        pattern: "comprehensive-absolute",
      },
    ]);

    expect(body.slice(refs[0]!.start, refs[0]!.end)).toBe("（申三十二 15）");
    expect(body.slice(refs[1]!.start, refs[1]!.end)).toBe("（创三十五 1）");
  });

  it("detects the Gen 1:8 comprehensive commentary screenshot ref", () => {
    const body =
      "惟有第二日，神未说「好」，有人认为是因为天空中有属灵气的恶魔居住的缘故（弗六 12）。";

    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 1 });

    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({
      raw: "弗六 12",
      verseIds: ["Eph.6.12"],
      confidence: "high",
      pattern: "comprehensive-absolute",
    });
    expect(body.slice(refs[0]!.start, refs[0]!.end)).toBe("（弗六 12）");
  });

  it("detects multiple absolute refs in one Gen 1:3 style paragraph", () => {
    const body =
      "「我们因着信，就知道诸世界是借神话造成的」（来十一 3）。「诸天借耶和华的命而造」（诗三十三 6）。「那吩咐光从黑暗里照出来的神……」（林后四 6）。「神就是光，在祂毫无黑暗」（约壹一 5）。「神就是光」（启二十二 2）。";

    const refs = detectScriptureRefs(body);

    expect(refs.map((ref) => ref.verseIds[0])).toEqual([
      "Heb.11.3",
      "Ps.33.6",
      "2Cor.4.6",
      "1John.1.5",
      "Rev.22.2",
    ]);
  });

  it("keeps wiki links working for sample notes", () => {
    const body = "相关引用：[[Gen.1.1]]、[[约 1:1]]";
    const refs = detectScriptureRefs(body);

    expect(refs.map((ref) => ({ raw: ref.raw, verseIds: ref.verseIds, pattern: ref.pattern }))).toEqual([
      { raw: "[[Gen.1.1]]", verseIds: ["Gen.1.1"], pattern: "wiki" },
      { raw: "[[约 1:1]]", verseIds: ["John.1.1"], pattern: "wiki" },
    ]);
  });

  it("does not treat non-scripture parentheses as refs", () => {
    const body = "第 1 节的希伯来原文由 7 个词（中文也是 7 个字）、28 个字母组成，隐含数学特性（三位一体）（七日创造）。";
    expect(detectScriptureRefs(body)).toEqual([]);
  });

  it("uses card book context for relative chapter refs in Gen 12:2 comprehensive commentary", () => {
    const body =
      "神所应许「必叫你成为大国」，就是神「祭司的国度」（出十九 6）。后来神把他的名字改为「亚伯拉罕」（十七 5），意思是「多国的父」，又赐给他「先知」（二十 7）、「尊大的王子」（二十三 6）、「神的仆人」（诗一百零五 5）、「神的朋友」（雅二 23）等尊称。那些离弃神的人想靠建造巴别塔、「传扬我们的名」（十一 4）。亚伯兰行事为人正是「凭着信心，不是凭着眼见」（林后五 7），「因为他等候那座有根基的城」（来十一 10）。";

    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 12 });
    const pairs = refs.map((ref) => [ref.raw, ref.verseIds[0], ref.pattern] as const);

    expect(pairs).toEqual([
      ["出十九 6", "Exod.19.6", "comprehensive-absolute"],
      ["十七 5", "Gen.17.5", "comprehensive-relative-chapter"],
      ["二十 7", "Gen.20.7", "comprehensive-relative-chapter"],
      ["二十三 6", "Gen.23.6", "comprehensive-relative-chapter"],
      ["诗一百零五 5", "Ps.105.5", "comprehensive-absolute"],
      ["雅二 23", "Jas.2.23", "comprehensive-absolute"],
      ["十一 4", "Gen.11.4", "comprehensive-relative-chapter"],
      ["林后五 7", "2Cor.5.7", "comprehensive-absolute"],
      ["来十一 10", "Heb.11.10", "comprehensive-absolute"],
    ]);
  });

  it("does not invent relative chapter refs without card book context", () => {
    const body = "后来神把他的名字改为「亚伯拉罕」（十七 5）。";
    expect(detectScriptureRefs(body)).toEqual([]);
    expect(detectScriptureRefs(body, { sourceBookId: "Gen" })[0]?.verseIds).toEqual(["Gen.17.5"]);
  });

  it("detects same-chapter verse lists and single verse 节 refs", () => {
    const body =
      "「创造」是指从无到有的创造（1、21、27 节），而不是在已有材料基础上的「制造」（16、25、26、31 节）。第 1 节是摘要（1 节），接着是对照（3-4 节）。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 1 });
    expect(refs.map((ref) => ref.verseIds)).toEqual([
      ["Gen.1.1", "Gen.1.21", "Gen.1.27"],
      ["Gen.1.16", "Gen.1.25", "Gen.1.26", "Gen.1.31"],
      ["Gen.1.1"],
      ["Gen.1.3", "Gen.1.4"],
    ]);
  });

  it("detects chained absolute citations inside one parenthesis", () => {
    const body = "女人的后裔必要伤蛇的头（罗十六 20；来二 14；启十二 4）。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 3 });
    expect(refs.map((ref) => ref.verseIds[0])).toEqual(["Rom.16.20", "Heb.2.14", "Rev.12.4"]);
  });

  it("carries book context across comma-separated relative chapter lists", () => {
    const body = "后来果然应验了（十二 2；十七 16）。蛇的话也像（太三 7；十二 34；二十三 33）。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 21 });
    expect(refs.map((ref) => [ref.raw, ref.verseIds[0]])).toEqual([
      ["十二 2", "Gen.12.2"],
      ["十七 16", "Gen.17.16"],
      ["太三 7", "Matt.3.7"],
      ["十二 34", "Matt.12.34"],
      ["二十三 33", "Matt.23.33"],
    ]);
  });

  it("parses same-book multi verse relative units like （十八 2、9-10）", () => {
    const body = "有三位客人来访（十八 2、9-10）。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 1 });
    expect(refs).toHaveLength(1);
    expect(refs[0]?.verseIds).toEqual(["Gen.18.2", "Gen.18.9", "Gen.18.10"]);
  });

  it("parses single-chapter books like Jude", () => {
    const body = "所多玛的结局是警戒（犹 7）。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 19 });
    expect(refs[0]?.verseIds).toEqual(["Jude.1.7"]);
  });

  it("resolves 约一 as John when 1John verse is impossible", () => {
    const body = "雅各梦见天梯（约一 51）。殿也被理解为身体（约二 19-21）。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 28 });
    expect(refs.map((ref) => ref.verseIds[0])).toEqual(["John.1.51", "John.2.19"]);
  });

  it("parses 廿 numerals and relative chapter with 节 suffix", () => {
    const body = "约书亚记也提到先祖（书廿四 2）。亚伯拉罕筑坛（十二 7 节）。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 33 });
    expect(refs.map((ref) => [ref.raw, ref.verseIds[0]])).toEqual([
      ["书廿四 2", "Josh.24.2"],
      ["十二 7 节", "Gen.12.7"],
    ]);
  });

  it("splits same-book chapter lists joined by 、", () => {
    const body = "应许重复出现（三十五 11、四十八 4）。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 28 });
    expect(refs.map((ref) => ref.verseIds[0])).toEqual(["Gen.35.11", "Gen.48.4"]);
  });

  it("parses same-book cross-chapter ranges and Titus short form 提", () => {
    const body = "他先下埃及（十二 10-十三 4），后来生以实玛利（十六 1-十七 17）。要远避无知的辩论（提三 9）。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 22 });
    expect(refs.map((ref) => ref.raw)).toEqual(["十二 10-十三 4", "十六 1-十七 17", "提三 9"]);
    // Long ranges are capped for preview, but should start at the first verse and continue into the next chapter.
    expect(refs[0]?.verseIds[0]).toBe("Gen.12.10");
    expect(refs[0]?.verseIds).toContain("Gen.13.1");
    expect(refs[0]?.verseIds.length).toBeGreaterThan(1);
    expect(refs[1]?.verseIds[0]).toBe("Gen.16.1");
    expect(refs[1]?.verseIds.length).toBeGreaterThan(1);
    expect(refs[2]?.verseIds).toEqual(["Titus.3.9"]);
  });
});


describe("study-bible scripture refs", () => {
  it("parses study-bible absolute and chained refs", () => {
    const body =
      "万物是从无到有的（来11:3：启4:11）。见约14:27注：罗1:7注。关于使徒身份：太10:2：徒1:20；罗1:1。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Gal", sourceChapter: 1 });
    expect(refs.map((ref) => ref.verseIds[0])).toEqual([
      "Heb.11.3",
      "Rev.4.11",
      "John.14.27",
      "Rom.1.7",
      "Matt.10.2",
      "Acts.1.20",
      "Rom.1.1",
    ]);
  });

  it("parses study-bible relative chapter:verse with card context", () => {
    const body = "假教师质疑保罗的使徒身份（2:7-9）。他在1:11-12、16-17、19节也强调这点。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Gal", sourceChapter: 1 });
    expect(refs.some((ref) => ref.verseIds[0] === "Gal.2.7")).toBe(true);
    expect(refs.some((ref) => ref.verseIds.includes("Gal.1.11") && ref.verseIds.includes("Gal.1.19"))).toBe(true);
  });

  it("still detects comprehensive absolute refs", () => {
    const body = "单数是 Eloah（申三十二 15）或 El（创三十五 1）。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Gen", sourceChapter: 1 });
    expect(refs.map((ref) => ref.verseIds[0])).toEqual(["Deut.32.15", "Gen.35.1"]);
  });
});

describe("study-bible chapter and see-verse refs", () => {
  it("parses chapter-only refs and 见N节 pointers", () => {
    const body = "背景见（出7-15章）和（王下17章）。营中布置（见9节），又可另见17节。";
    const refs = detectScriptureRefs(body, { sourceBookId: "Neh", sourceChapter: 4 });
    expect(refs.map((ref) => ref.verseIds[0])).toEqual(
      expect.arrayContaining(["Exod.7.1", "2Kgs.17.1", "Neh.4.9", "Neh.4.17"]),
    );
  });
});

describe("study-bible stage3 outline styles", () => {
  it("parses cross-chapter ranges, 第N节, and letter suffixes", () => {
    const body = "（1:17-2:10）（3:3b-10）（见第9节）参第7节。（俄15b节）";
    const refs = detectScriptureRefs(body, { sourceBookId: "Jonah", sourceChapter: 1 });
    expect(refs.map((ref) => ref.verseIds[0])).toEqual(
      expect.arrayContaining(["Jonah.1.17", "Jonah.3.3", "Jonah.1.9", "Jonah.1.7", "Obad.1.15"]),
    );
  });
});

describe("study-bible stage4 multi-chunk refs", () => {
  it("parses multi chapter:verse lists and OCR colon forms", () => {
    const body =
      "（见徒19:21，20:1-3）见赛43:18-19,65:17-23。约14.：27注。（13章）（14章）";
    const refs = detectScriptureRefs(body, { sourceBookId: "1Cor", sourceChapter: 12 });
    const ids = refs.flatMap((ref) => ref.verseIds);
    expect(ids).toEqual(
      expect.arrayContaining([
        "Acts.19.21",
        "Acts.20.1",
        "Isa.43.18",
        "Isa.65.17",
        "John.14.27",
        "1Cor.13.1",
        "1Cor.14.1",
      ]),
    );
  });
});

describe("study-bible stage5 polish", () => {
  it("parses prose-prefixed, dotted, OCR and single-chapter forms", () => {
    expect(
      detectScriptureRefs("（大前提，9b-10a节）", { sourceBookId: "2Pet", sourceChapter: 2 }).map(
        (ref) => ref.verseIds[0],
      ),
    ).toContain("2Pet.2.9");

    expect(
      detectScriptureRefs("（呼应赛21.9）", { sourceBookId: "Rev", sourceChapter: 14 }).map(
        (ref) => ref.verseIds[0],
      ),
    ).toContain("Isa.21.9");

    expect(
      detectScriptureRefs("赛21.9", { sourceBookId: "Rev", sourceChapter: 14 }).map(
        (ref) => ref.verseIds[0],
      ),
    ).toContain("Isa.21.9");

    expect(
      detectScriptureRefs("（尤见2章）", { sourceBookId: "2Pet", sourceChapter: 1 }).map(
        (ref) => ref.verseIds[0],
      ),
    ).toContain("2Pet.2.1");

    expect(
      detectScriptureRefs("创1：.1", { sourceBookId: "Jude", sourceChapter: 1 }).map(
        (ref) => ref.verseIds[0],
      ),
    ).toContain("Gen.1.1");

    expect(
      detectScriptureRefs("见犹6节注", { sourceBookId: "2Pet", sourceChapter: 2 }).map(
        (ref) => ref.verseIds[0],
      ),
    ).toContain("Jude.1.6");

    expect(
      detectScriptureRefs("20:7-22:5", { sourceBookId: "Rev", sourceChapter: 1 }).some((ref) =>
        ref.verseIds.includes("Rev.20.7"),
      ),
    ).toBe(true);

    expect(
      detectScriptureRefs("（13-15节）", { sourceBookId: "3John", sourceChapter: 1 }).map(
        (ref) => ref.verseIds,
      )[0],
    ).toEqual(["3John.1.13", "3John.1.14"]);

    expect(
      detectScriptureRefs("1:3，22:7", { sourceBookId: "Rev", sourceChapter: 1 }).map(
        (ref) => ref.verseIds,
      )[0],
    ).toEqual(expect.arrayContaining(["Rev.1.3", "Rev.22.7"]));
  });
});

