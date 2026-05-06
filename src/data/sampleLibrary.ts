import type { BibleVersion } from "../domain/bible";
import type { StudyResource } from "../domain/resources";

export const cuvGenesis1: BibleVersion = {
  id: "cuv",
  label: "和合本",
  language: "zh",
  verses: [
    { id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "起初，神创造天地。" },
    {
      id: "Gen.1.2",
      book: "Gen",
      chapter: 1,
      verse: 2,
      text: "地是空虚混沌，渊面黑暗；神的灵运行在水面上。",
    },
    { id: "Gen.1.3", book: "Gen", chapter: 1, verse: 3, text: "神说：“要有光”，就有了光。" },
  ],
};

export const kjvGenesis1: BibleVersion = {
  id: "kjv",
  label: "KJV",
  language: "en",
  verses: [
    {
      id: "Gen.1.1",
      book: "Gen",
      chapter: 1,
      verse: 1,
      text: "In the beginning God created the heaven and the earth.",
    },
    {
      id: "Gen.1.2",
      book: "Gen",
      chapter: 1,
      verse: 2,
      text: "And the earth was without form, and void; and darkness was upon the face of the deep.",
    },
    {
      id: "Gen.1.3",
      book: "Gen",
      chapter: 1,
      verse: 3,
      text: "And God said, Let there be light: and there was light.",
    },
  ],
};

export const sampleResources: StudyResource[] = [
  {
    id: "gen-1-1-creation-note",
    title: "起初，神创造天地",
    type: "commentary",
    verses: ["Gen.1.1"],
    source: "用户笔记",
    body: "“起初”声明时间、宇宙和历史都在神的创造中开始。相关引用：[[Gen.1.1]]、[[约 1:1]]",
  },
  {
    id: "gen-1-1-map",
    title: "古代近东背景图",
    type: "image",
    verses: ["Gen.1.1"],
    body: "地图与背景资料占位。",
  },
  {
    id: "gen-1-1-video",
    title: "创世记导论视频",
    type: "video",
    verses: ["Gen.1.1"],
    body: "视频资源占位。",
  },
  {
    id: "gen-1-1-html",
    title: "创世记 1:1 互动关系图",
    type: "html",
    verses: ["Gen.1.1"],
    body: "互动 HTML：词语关系图。",
  },
  {
    id: "gen-1-2-note",
    title: "空虚混沌",
    type: "note",
    verses: ["Gen.1.2"],
    body: "记录创 1:2 的关键词观察。也可以从正文引用 [[创 1:2]]。",
  },
];
