import type { StudyResource } from "../domain/resources";
import { genesisResources } from "./genesisResources";

export const starterResources: StudyResource[] = [
  {
    id: "gen-1-1-creation-note",
    title: "起初，神创造天地",
    type: "commentary",
    verses: ["Gen.1.1"],
    source: "用户笔记",
    body: "“起初”声明时间、宇宙和历史都在神的创造中开始。相关引用：[[Gen.1.1]]、[[约 1:1]]",
  },
  {
    id: "gen-1-1-video",
    title: "创世记导论视频",
    type: "video",
    verses: [],
    bookIntro: "Gen",
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
  ...genesisResources,
];

export const sampleResources: StudyResource[] = starterResources;
