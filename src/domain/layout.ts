import type { VerseId } from "./verse";

export type DockSide = "left" | "right";

export type ResourceModuleId = "commentary" | "media" | "notes" | "backlinks";

export type CenterModuleId = "cuv" | "kjv" | "card";

export type ResourceSourceId = VerseId | `book-intro:${string}`;

export interface ResourceModuleLayout {
  id: ResourceModuleId;
  title: string;
  side: DockSide;
  visible: boolean;
}

export interface SavedCardRef {
  resourceId: string;
  sourceVerseId: ResourceSourceId;
}

export interface WorkbenchLayout {
  leftWidth: number;
  rightWidth: number;
  readerSplitPercent: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  showCuv: boolean;
  showKjv: boolean;
  modules: ResourceModuleLayout[];
  savedCardsByBook: Record<string, SavedCardRef[]>;
  savedCardsByVerse: Record<string, SavedCardRef[]>;
  centerModules: CenterModuleId[];
  activeCenterModules: CenterModuleId[];
  cardBrowserSplitPercent: number;
  activeResourceId: string | null;
  centerCardResourceIds: string[];
  centerCardResourceIdsByBook: Record<string, string[]>;
}

export const defaultWorkbenchLayout: WorkbenchLayout = {
  leftWidth: 300,
  rightWidth: 320,
  readerSplitPercent: 50,
  leftCollapsed: false,
  rightCollapsed: false,
  showCuv: true,
  showKjv: true,
  savedCardsByBook: {},
  savedCardsByVerse: {},
  centerModules: ["kjv", "cuv", "card"],
  activeCenterModules: ["cuv"],
  cardBrowserSplitPercent: 44,
  activeResourceId: null,
  centerCardResourceIds: [],
  centerCardResourceIdsByBook: {},
  modules: [
    { id: "notes", title: "笔记", side: "right", visible: true },
    { id: "commentary", title: "注释", side: "right", visible: true },
    { id: "media", title: "媒体", side: "right", visible: true },
    { id: "backlinks", title: "百科和字典", side: "right", visible: true },
  ],
};
