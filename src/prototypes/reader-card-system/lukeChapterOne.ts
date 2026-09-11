import { useEffect, useMemo, useState } from "react";

export type LukeChapterVerse = {
  id: string;
  verse: number;
  text: string;
};

export type LukeChapterSection = {
  id: string;
  title: string;
  range: string;
  startVerse: number;
  endVerse: number;
  shortExcerpt: string;
  summary: string;
  movement: string;
  cue: string;
  refs: number[];
};

export type LukeChapterCard = {
  id: string;
  source: string;
  title: string;
  body: string;
  reference: string;
  kind: "note" | "media" | "study";
};

export type LukeChapterStatus = "loading" | "ready" | "fallback";

type LukeBookPayload = {
  bookId?: string;
  cuvVerses?: Array<{
    id?: string;
    chapter?: number;
    verse?: number;
    text?: string;
  }>;
};

export const lukeChapterSections: LukeChapterSection[] = [
  {
    id: "preface",
    title: "序言：确实之道",
    range: "Luke.1.1–4",
    startVerse: 1,
    endVerse: 4,
    shortExcerpt: "按着次序写给你",
    summary: "路加说明自己详细查考传承，要把所学之道有次序地交给提阿非罗，使读者知道这些事的确实。",
    movement: "从见证传承到有序书写。",
    cue: "先把 1–4 节读成整卷福音书的阅读契约：不是零散轶事，而是经查考后的确实叙述。",
    refs: [1, 3, 4],
  },
  {
    id: "john-announced",
    title: "约翰出生预告",
    range: "Luke.1.5–25",
    startVerse: 5,
    endVerse: 25,
    shortExcerpt: "你的祈祷已经被听见",
    summary: "撒迦利亚在殿中听见约翰出生的预告；不信带来静默，伊利沙伯却在隐藏中经历主除去羞耻。",
    movement: "从多年不育到祷告被听见。",
    cue: "留意圣殿、祭司班次、静默与欢喜如何把个人家庭故事推向主为百姓预备道路。",
    refs: [13, 17, 25],
  },
  {
    id: "jesus-announced",
    title: "耶稣出生预告",
    range: "Luke.1.26–38",
    startVerse: 26,
    endVerse: 38,
    shortExcerpt: "我没有出嫁，怎么有这事呢",
    summary: "加百列到拿撒勒向马利亚宣告圣子降生；马利亚从惊惶追问走向顺服领受。",
    movement: "从恩典临到到仆人回应。",
    cue: "把 32–33 节的王权应许与 38 节的顺服并读：至高者的作为临到卑微仆人。",
    refs: [31, 35, 38],
  },
  {
    id: "mary-elizabeth",
    title: "马利亚探访伊利沙伯",
    range: "Luke.1.39–56",
    startVerse: 39,
    endVerse: 56,
    shortExcerpt: "我心尊主为大",
    summary: "马利亚与伊利沙伯相遇，腹中婴孩欢喜跳动；马利亚的颂歌把个人蒙恩扩展为神记念怜悯。",
    movement: "从两位母亲相认到救恩颂赞展开。",
    cue: "读尊主颂时追踪翻转动词：降卑、升高、饱足、空手，形成路加的国度节奏。",
    refs: [41, 46, 55],
  },
  {
    id: "john-born",
    title: "约翰出生与命名",
    range: "Luke.1.57–66",
    startVerse: 57,
    endVerse: 66,
    shortExcerpt: "他的名字是约翰",
    summary: "伊利沙伯生产，邻里同乐；命名时撒迦利亚恢复开口，众人惧怕并思想这孩子将来如何。",
    movement: "从隐藏怀孕到公开见证。",
    cue: "观察名字、开口、惧怕与传遍山地的连锁反应：神的怜悯变成社区共同记忆。",
    refs: [58, 63, 66],
  },
  {
    id: "zechariah-prophecy",
    title: "撒迦利亚预言",
    range: "Luke.1.67–80",
    startVerse: 67,
    endVerse: 80,
    shortExcerpt: "清晨的日光从高天临到我们",
    summary: "撒迦利亚被圣灵充满，称颂神眷顾救赎；约翰被定位为预备道路的先知，结尾转向旷野成长。",
    movement: "从重获声音到救恩黎明。",
    cue: "把 76–79 节作为约翰使命与弥赛亚光照的交汇点，连接全章两次出生预告。",
    refs: [68, 76, 79],
  },
];

export const lukeChapterCards: LukeChapterCard[] = [
  {
    id: "luke-note-preface",
    source: "用户笔记",
    title: "确实之道需要有次序地读",
    body: "Luke 1 先给出阅读方法：把亲眼见证、传承与详细查考放在一起，帮助读者不是只收集亮点，而是进入整章推进。",
    reference: "Luke.1.1–4",
    kind: "note",
  },
  {
    id: "luke-study-annunciation",
    source: "综合解读",
    title: "两次预告并排显明恩典主动临到",
    body: "约翰与耶稣的出生预告都从神的主动差遣开始；不同回应形成张力，却共同指向主为百姓预备救恩。",
    reference: "Luke.1.5–38",
    kind: "study",
  },
  {
    id: "luke-media-dawn",
    source: "媒体",
    title: "Luke 1 叙事流：从确据到日光",
    body: "用六段叙事线浏览 80 节：序言、约翰预告、耶稣预告、两位母亲相遇、约翰出生、撒迦利亚预言。",
    reference: "Luke.1.1–80",
    kind: "media",
  },
];

function normalizeLukeChapterOne(payload: LukeBookPayload): LukeChapterVerse[] {
  if (payload.bookId !== "Luke") {
    throw new Error(`Expected Luke book payload, received ${payload.bookId ?? "unknown"}`);
  }

  const verses = (payload.cuvVerses ?? [])
    .filter((verse): verse is Required<Pick<LukeChapterVerse, "id" | "verse" | "text">> & { chapter: number } => (
      verse.chapter === 1
      && typeof verse.id === "string"
      && typeof verse.verse === "number"
      && typeof verse.text === "string"
    ))
    .map((verse) => ({
      id: verse.id,
      verse: verse.verse,
      text: verse.text.replace(/\s+/g, " ").trim(),
    }))
    .sort((left, right) => left.verse - right.verse);

  if (verses.length !== 80) {
    throw new Error(`Expected 80 Luke 1 verses, received ${verses.length}`);
  }

  verses.forEach((verse, index) => {
    const expectedVerse = index + 1;
    if (verse.verse !== expectedVerse || verse.id !== `Luke.1.${expectedVerse}`) {
      throw new Error(`Unexpected Luke 1 sequence at index ${index}: ${verse.id}`);
    }
  });

  return verses;
}

export function useLukeChapterOne() {
  const [verses, setVerses] = useState<LukeChapterVerse[]>([]);
  const [status, setStatus] = useState<LukeChapterStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/data/books/Luke.json")
      .then((response) => {
        if (!response.ok) throw new Error(`Luke source request failed: ${response.status}`);
        return response.json() as Promise<LukeBookPayload>;
      })
      .then((payload) => normalizeLukeChapterOne(payload))
      .then((nextVerses) => {
        if (!cancelled) {
          setVerses(nextVerses);
          setStatus("ready");
          setError(null);
        }
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setVerses([]);
          setStatus("fallback");
          setError(caughtError instanceof Error ? caughtError.message : "Luke source request failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const versesBySection = useMemo(() => new Map(
    lukeChapterSections.map((section) => [
      section.id,
      verses.filter((verse) => verse.verse >= section.startVerse && verse.verse <= section.endVerse),
    ]),
  ), [verses]);

  return {
    sections: lukeChapterSections,
    cards: lukeChapterCards,
    verses,
    versesBySection,
    status,
    error,
  };
}
