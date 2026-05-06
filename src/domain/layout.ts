export type DockSide = "left" | "right";

export type ResourceModuleId = "commentary" | "media" | "notes" | "backlinks";

export interface ResourceModuleLayout {
  id: ResourceModuleId;
  title: string;
  side: DockSide;
  visible: boolean;
}

export interface WorkbenchLayout {
  leftWidth: number;
  rightWidth: number;
  showCuv: boolean;
  showKjv: boolean;
  modules: ResourceModuleLayout[];
}

export const defaultWorkbenchLayout: WorkbenchLayout = {
  leftWidth: 220,
  rightWidth: 240,
  showCuv: true,
  showKjv: true,
  modules: [
    { id: "notes", title: "我的笔记", side: "left", visible: true },
    { id: "commentary", title: "注释时间线", side: "right", visible: true },
    { id: "media", title: "媒体", side: "right", visible: true },
    { id: "backlinks", title: "回链", side: "right", visible: true },
  ],
};
