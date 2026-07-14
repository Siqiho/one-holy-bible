import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Columns3,
  Copy,
  Trash2,
  Images,
  Navigation2,
  Pencil,
  ArrowLeftRight,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { closestCenter, DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type DragCancelEvent, type DragEndEvent, type DragStartEvent, type Modifier } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BibleVersion } from "../domain/bible";
import type { PublicScriptureSearchEntry } from "../data/publicData";
import { bookTitle, englishBookTitle, newTestamentBooks, oldTestamentBooks } from "../domain/bibleBooks";
import { defaultWorkbenchLayout, type CenterModuleId, type DockSide, type ResourceModuleLayout, type ResourceSourceId, type SavedCardRef, type WorkbenchLayout } from "../domain/layout";
import type { StudyResource } from "../domain/resources";
import type { VerseId } from "../domain/verse";
import { parseVerseId } from "../domain/verse";
import { resourceMentionsVerse, resourcesForBookIntro, resourcesForVerse } from "../lib/backlinks";
import { createBibleSearchIndex, createPublicScriptureSearchIndex, type BibleSearchMatchRange, type IndexedBibleSearchResult } from "../lib/bibleSearch";
import { formatTextResourceBody } from "../lib/formatTextResourceBody";

export const layoutStorageKey = "one-holy-bible-layout";
const resourceEditsStorageKey = "one-holy-bible-resource-edits";
const deletedResourceIdsStorageKey = "one-holy-bible-deleted-resource-ids";
const dockCollapsedWidth = 40;
const dockResizeHandleWidth = 8;
const dockMinWidth = 180;
const dockMaxWidth = 560;
const readerColumnMinWidth = 220;
const splitMinPercent = 25;
const splitMaxPercent = 75;
const resourceDragPrefix = "resource:";
const centerModuleDragPrefix = "center-module:";
const centerCardDragPrefix = "center-card:";
const centerCardDropId = "center-card-drop";

export function acceptsResourceCardDropTarget(targetId: unknown) {
  return targetId === "left-dock" || targetId === centerCardDropId;
}

const maxVisibleCenterModules = 2;
const centerModuleIds: CenterModuleId[] = ["kjv", "cuv", "card"];
const toolbarCenterModuleIds: CenterModuleId[] = ["kjv", "cuv", "card"];
const searchResultLimit = 120;

export interface WorkbenchProps {
  activeBookId?: string;
  isBookLoading?: boolean;
  onRequestBook?: (bookId: string) => Promise<void> | void;
  onRequestSearchResult?: (result: WorkbenchSearchResult) => Promise<void> | void;
  wholeBibleSearchIndex?: PublicScriptureSearchEntry[];
  isRefreshingResources?: boolean;
  initialIntroBook?: string | null;
  onRefreshResources?: () => Promise<void> | void;
  onUnsyncResource?: (resourceId: string) => Promise<void> | void;
  onUpdateWorkbenchResource?: (resourceId: string, draft: { body: string; title: string }) => Promise<void> | void;
  unsyncingResourceId?: string | null;
  initialVerseId?: VerseId;
  versions: BibleVersion[];
  resources: StudyResource[];
  initialLayout: WorkbenchLayout;
  onSaveLayout?: (layout: WorkbenchLayout) => void;
}

type ResourceCardOrigin = DockSide | "center";
type ResourceEditDrafts = Record<string, {
  body?: string;
  summary?: string;
  title?: string;
}>;
type ResourceEditResult = { persisted: boolean };
type ResourceEditHandler = (resourceId: string, draft: { body: string; title: string }) => ResourceEditResult;
type WorkbenchResourceUpdateHandler = (resourceId: string, draft: { body: string; title: string }) => Promise<void> | void;
type ResourceNavigateHandler = (resource: StudyResource, sourceId?: ResourceSourceId) => void;
type ResourceDeleteHandler = (resourceId: string) => void;
type SearchVersionFilter = "all" | "cuv" | "kjv";
type SearchScope = "all" | "old" | "new" | "currentBook";

export interface WorkbenchSearchResult {
  verseId: VerseId;
  versionId: string;
  versionLabel: string;
  text: string;
  book: string;
  chapter: number;
  verse: number;
  matchRanges: Array<[number, number]>;
}

interface WorkbenchSearchResponse {
  totalCount: number;
  results: WorkbenchSearchResult[];
}

type SearchableStudyResource = StudyResource & {
  category?: string;
};

function upgradedDockWidth(value: unknown, defaultWidth: number) {
  return typeof value === "number" ? Math.max(value, defaultWidth) : defaultWidth;
}

function isCenterModuleId(value: unknown): value is CenterModuleId {
  return typeof value === "string" && centerModuleIds.includes(value as CenterModuleId);
}

function normalizeCenterModules(value: unknown): CenterModuleId[] {
  const nextModules = Array.isArray(value)
    ? value.filter(isCenterModuleId)
    : [];
  const uniqueModules = Array.from(new Set(nextModules));
  const withFallback = uniqueModules.length > 0 ? uniqueModules : defaultWorkbenchLayout.centerModules;
  return [
    ...withFallback,
    ...toolbarCenterModuleIds.filter((moduleId) => !withFallback.includes(moduleId)),
  ];
}

function normalizeActiveCenterModules(
  value: unknown,
  fallback: CenterModuleId[] = defaultWorkbenchLayout.activeCenterModules,
): CenterModuleId[] {
  const sourceModules = Array.isArray(value) ? value : fallback;
  const uniqueModules = Array.from(new Set(sourceModules.filter(isCenterModuleId)));
  return uniqueModules.slice(-maxVisibleCenterModules);
}

function normalizeSplitPercent(value: unknown, fallback: number) {
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(splitMaxPercent, Math.max(splitMinPercent, Math.round(numericValue)));
}

function uniqueStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === "string")))
    : [];
}

function normalizeSavedCardsByVerse(value: unknown): Record<string, SavedCardRef[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, refs]) => Array.isArray(refs))
      .map(([verseId, refs]) => [
        verseId,
        (refs as unknown[]).filter((ref): ref is SavedCardRef => (
          Boolean(ref)
          && typeof ref === "object"
          && typeof (ref as SavedCardRef).resourceId === "string"
          && typeof (ref as SavedCardRef).sourceVerseId === "string"
        )),
      ]),
  );
}

function normalizeCenterCardsByBook(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([book, resourceIds]) => [book, uniqueStringArray(resourceIds)])
      .filter(([, resourceIds]) => resourceIds.length > 0),
  );
}

function migrateSavedCardsByBookToVerse(value: unknown): Record<string, SavedCardRef[]> {
  const savedCardsByVerse: Record<string, SavedCardRef[]> = {};
  const savedCardsByBook = normalizeSavedCardsByVerse(value);

  Object.values(savedCardsByBook).forEach((refs) => {
    refs.forEach((ref) => {
      const currentRefs = savedCardsByVerse[ref.sourceVerseId] ?? [];
      if (!currentRefs.some((currentRef) => currentRef.resourceId === ref.resourceId)) {
        savedCardsByVerse[ref.sourceVerseId] = [...currentRefs, ref];
      }
    });
  });

  return savedCardsByVerse;
}

function mergeSavedCardsByVerse(
  primary: Record<string, SavedCardRef[]>,
  fallback: Record<string, SavedCardRef[]>,
): Record<string, SavedCardRef[]> {
  const merged: Record<string, SavedCardRef[]> = {};

  Object.entries({ ...fallback, ...primary }).forEach(([verseId]) => {
    const refs = [...(fallback[verseId] ?? []), ...(primary[verseId] ?? [])];
    merged[verseId] = refs.reduce<SavedCardRef[]>((nextRefs, ref) => {
      if (nextRefs.some((nextRef) => nextRef.resourceId === ref.resourceId)) {
        return nextRefs;
      }
      return [...nextRefs, ref];
    }, []);
  });

  return merged;
}

function chapterKeyFromVerseId(verseId: VerseId) {
  const verse = parseVerseId(verseId);
  return `${verse.book}.${verse.chapter}`;
}

function organizedCardScopeFromSourceId(sourceId: ResourceSourceId) {
  return isBookIntroSourceId(sourceId) ? sourceId : chapterKeyFromVerseId(sourceId);
}

function organizedCardScopeFromResourceId(resourceId: string, resources: StudyResource[]) {
  const resource = resources.find((item) => item.id === resourceId);
  const firstVerse = resource ? firstValidResourceVerse(resource) : null;
  if (!firstVerse && resource?.bookIntro) return bookIntroSourceId(resource.bookIntro);
  if (!firstVerse) return null;

  try {
    return chapterKeyFromVerseId(firstVerse);
  } catch {
    return null;
  }
}

function migrateCenterCardIdsToScopes(resourceIds: string[], resources: StudyResource[]): Record<string, string[]> {
  return resourceIds.reduce<Record<string, string[]>>((nextByBook, resourceId) => {
    const scope = organizedCardScopeFromResourceId(resourceId, resources) ?? "Gen.1";
    const currentIds = nextByBook[scope] ?? [];
    if (!currentIds.includes(resourceId)) {
      nextByBook[scope] = [...currentIds, resourceId];
    }
    return nextByBook;
  }, {});
}

function fallbackOrganizedCardScopeFromStorageKey(key: string) {
  if (key.startsWith("book-intro:")) {
    return key;
  }

  const parts = key.split(".");
  if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
    return `${parts[0]}.${parts[1]}`;
  }

  return `${key}.1`;
}

function migrateCenterCardScopes(value: unknown, resources: StudyResource[]): Record<string, string[]> {
  const storedCards = normalizeCenterCardsByBook(value);

  return Object.entries(storedCards).reduce<Record<string, string[]>>((nextByScope, [storageKey, resourceIds]) => {
    resourceIds.forEach((resourceId) => {
      const scope = organizedCardScopeFromResourceId(resourceId, resources)
        ?? fallbackOrganizedCardScopeFromStorageKey(storageKey);
      const currentIds = nextByScope[scope] ?? [];
      if (!currentIds.includes(resourceId)) {
        nextByScope[scope] = [...currentIds, resourceId];
      }
    });

    return nextByScope;
  }, {});
}

function mergeCenterCardsByBook(
  primary: Record<string, string[]>,
  fallback: Record<string, string[]>,
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};

  Object.entries({ ...fallback, ...primary }).forEach(([book]) => {
    const resourceIds = [...(fallback[book] ?? []), ...(primary[book] ?? [])];
    const uniqueResourceIds = Array.from(new Set(resourceIds));
    if (uniqueResourceIds.length > 0) {
      merged[book] = uniqueResourceIds;
    }
  });

  return merged;
}

function pruneCenterCardsByAvailableResources(
  layout: WorkbenchLayout,
  resources: StudyResource[],
): { layout: WorkbenchLayout; removedResourceIds: string[] } {
  const availableResourceIds = new Set(resources.map((resource) => resource.id));
  const removedResourceIds = new Set<string>();
  const nextCenterCardResourceIdsByBook = Object.fromEntries(
    Object.entries(layout.centerCardResourceIdsByBook)
      .map(([scope, resourceIds]) => [
        scope,
        resourceIds.filter((resourceId) => {
          if (availableResourceIds.has(resourceId)) return true;
          removedResourceIds.add(resourceId);
          return false;
        }),
      ])
      .filter(([, resourceIds]) => resourceIds.length > 0),
  );
  const nextCenterCardResourceIds = layout.centerCardResourceIds.filter((resourceId) => {
    if (availableResourceIds.has(resourceId)) return true;
    removedResourceIds.add(resourceId);
    return false;
  });
  const nextSavedCardsByVerse = Object.fromEntries(
    Object.entries(layout.savedCardsByVerse)
      .map(([verseId, refs]) => [
        verseId,
        refs.filter((ref) => {
          if (availableResourceIds.has(ref.resourceId)) return true;
          removedResourceIds.add(ref.resourceId);
          return false;
        }),
      ])
      .filter(([, refs]) => refs.length > 0),
  );
  const nextSavedCardsByBook = Object.fromEntries(
    Object.entries(layout.savedCardsByBook)
      .map(([book, refs]) => [
        book,
        refs.filter((ref) => {
          if (availableResourceIds.has(ref.resourceId)) return true;
          removedResourceIds.add(ref.resourceId);
          return false;
        }),
      ])
      .filter(([, refs]) => refs.length > 0),
  );

  if (removedResourceIds.size === 0) {
    return { layout, removedResourceIds: [] };
  }

  const activeResourceId = layout.activeResourceId && availableResourceIds.has(layout.activeResourceId)
    ? layout.activeResourceId
    : null;

  return {
    layout: {
      ...layout,
      activeResourceId,
      centerCardResourceIds: nextCenterCardResourceIds,
      centerCardResourceIdsByBook: nextCenterCardResourceIdsByBook,
      savedCardsByBook: nextSavedCardsByBook,
      savedCardsByVerse: nextSavedCardsByVerse,
    },
    removedResourceIds: Array.from(removedResourceIds),
  };
}

const workbenchCollisionDetection: CollisionDetection = (args) => {
  if (args.active.data.current?.kind !== "resource-card") {
    return closestCenter(args);
  }

  const pointerX = args.pointerCoordinates?.x ?? args.collisionRect.left + args.collisionRect.width / 2;
  const pointerY = args.pointerCoordinates?.y ?? args.collisionRect.top + args.collisionRect.height / 2;
  const geometricTarget = args.droppableContainers.find((container) => {
    if (container.id !== "left-dock" && container.id !== "right-dock" && container.id !== centerCardDropId) {
      return false;
    }

    const rect = container.node.current?.getBoundingClientRect();
    if (!rect || rect.width <= 1 || rect.height <= 1) {
      return false;
    }

    return rect.left <= pointerX && pointerX <= rect.right && rect.top <= pointerY && pointerY <= rect.bottom;
  });

  if (geometricTarget) {
    return [
      {
        id: geometricTarget.id,
        data: {
          droppableContainer: geometricTarget,
          value: 0,
        },
      },
    ];
  }

  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
  if (!Number.isFinite(pointerX) || viewportWidth <= 0) {
    return closestCenter(args);
  }

  const targetId = pointerX < viewportWidth * 0.32
    ? "left-dock"
    : pointerX > viewportWidth * 0.72
      ? "right-dock"
      : centerCardDropId;
  const droppableContainer = args.droppableContainers.find((container) => container.id === targetId);

  if (!droppableContainer) {
    return closestCenter(args);
  }

  return [
    {
      id: droppableContainer.id,
      data: {
        droppableContainer,
        value: 0,
      },
    },
  ];
};

function centerModuleLabel(moduleId: CenterModuleId) {
  if (moduleId === "cuv") return "和合本";
  if (moduleId === "kjv") return "KJV";
  return "卡片";
}

function centerModuleRegionLabel(moduleId: CenterModuleId) {
  if (moduleId === "cuv") return "和合本阅读";
  if (moduleId === "kjv") return "KJV阅读";
  return "当前经文已有卡片";
}

function centerModuleIcon(moduleId: CenterModuleId) {
  return moduleId === "card" ? Images : Columns3;
}

function isDevelopmentMode() {
  return typeof import.meta !== "undefined" && import.meta.env?.PROD !== true;
}

function logWorkbenchInfo(message: string, details?: unknown) {
  if (!isDevelopmentMode()) return;
  if (details === undefined) {
    console.info(message);
    return;
  }
  console.info(message, details);
}

function logSearchInteraction(message: string, details: Record<string, unknown>) {
  if (!isDevelopmentMode()) return;
  logWorkbenchInfo(`[workbench] search ${message}`, JSON.stringify(details));
}

function logCardSearchInteraction(message: string, details: Record<string, unknown>) {
  logWorkbenchInfo(`[workbench] card search ${message}`, details);
}

function normalizedSearchVersionLabel(versionFilter: SearchVersionFilter) {
  if (versionFilter === "cuv") return "和合本";
  if (versionFilter === "kjv") return "KJV";
  return "全部译本";
}

function normalizedSearchScopeLabel(scope: SearchScope, currentBook: string) {
  if (scope === "old") return "旧约";
  if (scope === "new") return "新约";
  if (scope === "currentBook") return bookTitle(currentBook);
  return "整本";
}

function searchScopeOption(scope: SearchScope, currentBook: string) {
  if (scope === "currentBook") return currentBook;
  return scope;
}

function normalizeSearchRange(range: BibleSearchMatchRange, textLength: number): [number, number] | null {
  const start = range.start;
  const end = range.end;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  const safeStart = Math.max(0, Math.min(textLength, Math.trunc(start)));
  const safeEnd = Math.max(safeStart, Math.min(textLength, Math.trunc(end)));
  return safeStart < safeEnd ? [safeStart, safeEnd] : null;
}

function normalizeSearchResult(result: IndexedBibleSearchResult): WorkbenchSearchResult {
  const matchRanges = (result.matchRanges ?? [])
    .map((range) => normalizeSearchRange(range, result.text.length))
    .filter((range): range is [number, number] => Boolean(range));

  return {
    verseId: result.verseId,
    versionId: result.versionId,
    versionLabel: result.versionLabel,
    text: result.text,
    book: result.book,
    chapter: result.chapter,
    verse: result.verse,
    matchRanges,
  };
}

function searchResultsForDisplay(
  versions: BibleVersion[],
  wholeBibleSearchIndex: PublicScriptureSearchEntry[] | undefined,
  query: string,
  versionFilter: SearchVersionFilter,
  scope: SearchScope,
  currentBook: string,
): WorkbenchSearchResponse {
  const response = (wholeBibleSearchIndex
    ? createPublicScriptureSearchIndex(wholeBibleSearchIndex)
    : createBibleSearchIndex(versions)).search(query, {
    maxResults: searchResultLimit,
    scope: searchScopeOption(scope, currentBook),
    version: versionFilter,
  });

  return {
    totalCount: response.totalCount,
    results: response.results.map(normalizeSearchResult),
  };
}

function highlightedSearchText(result: WorkbenchSearchResult) {
  if (result.matchRanges.length === 0) return result.text;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  result.matchRanges.forEach(([start, end], index) => {
    if (start > cursor) {
      nodes.push(result.text.slice(cursor, start));
    }
    nodes.push(
      <mark key={`${result.verseId}-${start}-${end}-${index}`} className="bible-search__mark" role="mark">
        {result.text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });

  if (cursor < result.text.length) {
    nodes.push(result.text.slice(cursor));
  }

  return nodes;
}

function openCenterModuleInLayout(
  layout: WorkbenchLayout,
  moduleId: CenterModuleId,
  activeResourceId = layout.activeResourceId,
): WorkbenchLayout {
  const activeCenterModules = normalizeActiveCenterModules(layout.activeCenterModules);
  const nextActiveCenterModules = [
    ...activeCenterModules.filter((activeModuleId) => activeModuleId !== moduleId),
    moduleId,
  ].slice(-maxVisibleCenterModules);

  return {
    ...layout,
    centerModules: normalizeCenterModules(layout.centerModules),
    activeCenterModules: nextActiveCenterModules,
    activeResourceId,
  };
}

function toggleCenterModuleInLayout(layout: WorkbenchLayout, moduleId: CenterModuleId): WorkbenchLayout {
  const activeCenterModules = normalizeActiveCenterModules(layout.activeCenterModules);
  const nextActiveCenterModules = activeCenterModules.includes(moduleId)
    ? activeCenterModules.filter((activeModuleId) => activeModuleId !== moduleId)
    : [...activeCenterModules, moduleId].slice(-maxVisibleCenterModules);

  return {
    ...layout,
    centerModules: normalizeCenterModules(layout.centerModules),
    activeCenterModules: nextActiveCenterModules,
  };
}

function visibleCenterModulesInToolbarOrder(layout: WorkbenchLayout) {
  const centerModules = normalizeCenterModules(layout.centerModules);
  const activeCenterModules = normalizeActiveCenterModules(layout.activeCenterModules);
  return centerModules.filter((moduleId) => activeCenterModules.includes(moduleId));
}

function centerModuleDragId(moduleId: CenterModuleId) {
  return `${centerModuleDragPrefix}${moduleId}`;
}

function centerModuleIdFromDragId(id: string) {
  const moduleId = id.startsWith(centerModuleDragPrefix) ? id.slice(centerModuleDragPrefix.length) : id;
  return isCenterModuleId(moduleId) ? moduleId : null;
}

function centerCardDragId(resourceId: string) {
  return `${centerCardDragPrefix}${resourceId}`;
}

function resourceIdFromCenterCardDragId(id: string) {
  return id.startsWith(centerCardDragPrefix) ? id.slice(centerCardDragPrefix.length) : null;
}

export function reorderCenterModulesByDrag(
  layout: WorkbenchLayout,
  activeModuleId: CenterModuleId,
  overModuleId: CenterModuleId,
): WorkbenchLayout {
  const centerModules = normalizeCenterModules(layout.centerModules);
  const activeIndex = centerModules.indexOf(activeModuleId);
  const overIndex = centerModules.indexOf(overModuleId);

  if (activeIndex >= 0 && overIndex >= 0) {
    if (activeIndex === overIndex) {
      return {
        ...layout,
        centerModules,
        activeCenterModules: normalizeActiveCenterModules(layout.activeCenterModules),
      };
    }

    const nextModules = [...centerModules] as CenterModuleId[];
    const [movedModule] = nextModules.splice(activeIndex, 1);
    nextModules.splice(overIndex, 0, movedModule);

    return {
      ...layout,
      centerModules: nextModules,
      activeCenterModules: normalizeActiveCenterModules(layout.activeCenterModules),
    };
  }

  if (activeIndex < 0 && overIndex >= 0) {
    const nextModules = [...centerModules] as CenterModuleId[];
    nextModules[overIndex] = activeModuleId;
    return {
      ...layout,
      centerModules: nextModules,
      activeCenterModules: normalizeActiveCenterModules(layout.activeCenterModules),
    };
  }

  if (activeIndex >= 0 && overIndex < 0) {
    const nextModules = [...centerModules] as CenterModuleId[];
    nextModules[activeIndex] = overModuleId;
    return {
      ...layout,
      centerModules: nextModules,
      activeCenterModules: normalizeActiveCenterModules(layout.activeCenterModules),
    };
  }

  return {
    ...layout,
    centerModules,
    activeCenterModules: normalizeActiveCenterModules(layout.activeCenterModules),
  };
}

export function reorderCenterCardsByDrag(
  layout: WorkbenchLayout,
  scope: string,
  activeResourceId: string,
  overResourceId: string,
): WorkbenchLayout {
  const currentScopeResourceIds = layout.centerCardResourceIdsByBook[scope] ?? [];
  const activeIndex = currentScopeResourceIds.indexOf(activeResourceId);
  const overIndex = currentScopeResourceIds.indexOf(overResourceId);

  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
    return layout;
  }

  const nextCenterCardResourceIds = [...currentScopeResourceIds];
  const [movedResourceId] = nextCenterCardResourceIds.splice(activeIndex, 1);
  nextCenterCardResourceIds.splice(overIndex, 0, movedResourceId);

  return {
    ...layout,
    centerCardResourceIds: nextCenterCardResourceIds,
    centerCardResourceIdsByBook: {
      ...layout.centerCardResourceIdsByBook,
      [scope]: nextCenterCardResourceIds,
    },
  };
}

function inferCenterCardOverResourceId(
  layout: WorkbenchLayout,
  scope: string,
  activeResourceId: string,
  deltaY: number,
) {
  const currentScopeResourceIds = layout.centerCardResourceIdsByBook[scope] ?? [];
  const activeIndex = currentScopeResourceIds.indexOf(activeResourceId);
  if (activeIndex < 0) return null;

  if (deltaY > 8) {
    return currentScopeResourceIds[Math.min(currentScopeResourceIds.length - 1, activeIndex + 1)] ?? null;
  }

  if (deltaY < -8) {
    return currentScopeResourceIds[Math.max(0, activeIndex - 1)] ?? null;
  }

  return null;
}

export const anchorDragOverlayToCursor: Modifier = ({
  active,
  activeNodeRect,
  activatorEvent,
  overlayNodeRect,
  transform,
}) => {
  if (
    active?.data.current?.kind !== "resource-card"
    || !activeNodeRect
    || !overlayNodeRect
    || !(activatorEvent instanceof MouseEvent || activatorEvent instanceof PointerEvent)
  ) {
    return transform;
  }

  const cursorGap = 14;
  const initialPointerX = activatorEvent.clientX;
  const initialPointerY = activatorEvent.clientY;

  return {
    ...transform,
    x: transform.x + initialPointerX - activeNodeRect.left + cursorGap,
    y: transform.y + initialPointerY - activeNodeRect.top + cursorGap,
  };
};

function storedLayout(initialLayout: WorkbenchLayout, resources: StudyResource[]): WorkbenchLayout {
  try {
    const raw = localStorage.getItem(layoutStorageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    const parsedModules = Array.isArray(parsed.modules) ? parsed.modules : [];
    const modules = initialLayout.modules.map((defaultModule) => {
      const storedModule = parsedModules.find((item: Partial<ResourceModuleLayout>) => item.id === defaultModule.id);
      return {
        ...defaultModule,
        title: resourceModuleTitle(defaultModule.id),
        visible: typeof storedModule?.visible === "boolean" ? storedModule.visible : defaultModule.visible,
        side: "right" as DockSide,
      };
    });
    const centerModules = Array.isArray(parsed.centerModules) && parsed.centerModules.length >= toolbarCenterModuleIds.length
      ? normalizeCenterModules(parsed.centerModules)
      : toolbarCenterModuleIds;
    const activeCenterModules = Array.isArray(parsed.activeCenterModules)
      ? normalizeActiveCenterModules(parsed.activeCenterModules)
      : isCenterModuleId(parsed.activeCenterModule)
        ? [parsed.activeCenterModule]
        : normalizeActiveCenterModules(initialLayout.activeCenterModules);
    const savedCardsByVerse = mergeSavedCardsByVerse(
      normalizeSavedCardsByVerse(parsed.savedCardsByVerse ?? initialLayout.savedCardsByVerse),
      migrateSavedCardsByBookToVerse(parsed.savedCardsByBook ?? initialLayout.savedCardsByBook),
    );
    const legacyCenterCardResourceIds = uniqueStringArray(
      parsed.centerCardResourceIds ?? initialLayout.centerCardResourceIds,
    );
    const centerCardResourceIdsByBook = mergeCenterCardsByBook(
      migrateCenterCardScopes(parsed.centerCardResourceIdsByBook ?? initialLayout.centerCardResourceIdsByBook, resources),
      mergeCenterCardsByBook(
        migrateCenterCardIdsToScopes(legacyCenterCardResourceIds, resources),
        migrateCenterCardIdsToScopes(
          Object.values(savedCardsByVerse).flatMap((refs) => refs.map((ref) => ref.resourceId)),
          resources,
        ),
      ),
    );

    return {
      ...initialLayout,
      ...parsed,
      leftWidth: upgradedDockWidth(parsed.leftWidth, initialLayout.leftWidth),
      rightWidth: upgradedDockWidth(parsed.rightWidth, initialLayout.rightWidth),
      readerSplitPercent: normalizeSplitPercent(parsed.readerSplitPercent, initialLayout.readerSplitPercent),
      cardBrowserSplitPercent: normalizeSplitPercent(
        parsed.cardBrowserSplitPercent,
        initialLayout.cardBrowserSplitPercent,
      ),
      modules,
      savedCardsByBook: normalizeSavedCardsByVerse(parsed.savedCardsByBook ?? initialLayout.savedCardsByBook),
      savedCardsByVerse,
      centerModules,
      activeCenterModules,
      activeResourceId: typeof parsed.activeResourceId === "string" ? parsed.activeResourceId : null,
      centerCardResourceIds: legacyCenterCardResourceIds,
      centerCardResourceIdsByBook,
    };
  } catch (error) {
    console.warn("[workbench] layout restore failed", error);
    return initialLayout;
  }
}

function compactResourceBody(resource: StudyResource) {
  return resource.body.replace(/\s+/g, " ").replace(/\[\[|\]\]/g, "").trim();
}

function imageResourceCaption(resource: StudyResource) {
  const summary = resource.summary?.trim();
  if (summary) {
    return summary;
  }

  const readerLines = resource.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .flatMap((line) => {
      if (!line || /^(关联经文|依据)：/.test(line)) {
        return [];
      }
      return [line.replace(/^摘要：/, "")];
    });

  return readerLines.join(" ").replace(/\[\[|\]\]/g, "").trim();
}

function editableResourceBody(resource: StudyResource) {
  if (resource.type === "image") {
    return imageResourceCaption(resource) || resource.body;
  }

  return resource.body;
}

function imageResourceAlt(resource: StudyResource) {
  return resource.title.trim() || "Image resource";
}

function imageDimensionsFromAssetPath(assetPath: string | undefined) {
  const match = assetPath?.match(/_(\d+)x(\d+)(?:-[^/]+)?\.png(?:$|\?)/);
  if (!match) return {};

  return {
    height: Number(match[2]),
    width: Number(match[1]),
  };
}

function editableResources(resources: StudyResource[], edits: ResourceEditDrafts) {
  return resources.map((resource) => {
    const edit = edits[resource.id];
    if (!edit) {
      return resource;
    }

    return {
      ...resource,
      body: edit.body ?? resource.body,
      summary: edit.summary ?? resource.summary,
      title: edit.title ?? resource.title,
    };
  });
}

function filterDeletedResources(resources: StudyResource[], deletedResourceIds: Set<string>) {
  if (deletedResourceIds.size === 0) {
    return resources;
  }

  return resources.filter((resource) => !deletedResourceIds.has(resource.id));
}

function storedResourceEdits(): ResourceEditDrafts {
  try {
    const raw = localStorage.getItem(resourceEditsStorageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => value && typeof value === "object" && !Array.isArray(value))
        .map(([resourceId, value]) => {
          const draft = value as { body?: unknown; summary?: unknown; title?: unknown };
          return [resourceId, {
            ...(typeof draft.body === "string" ? { body: draft.body } : {}),
            ...(typeof draft.summary === "string" ? { summary: draft.summary } : {}),
            ...(typeof draft.title === "string" ? { title: draft.title } : {}),
          }];
        }),
    );
  } catch (error) {
    console.warn("[workbench] resource edits restore failed", error);
    return {};
  }
}

function storedDeletedResourceIds() {
  try {
    const raw = localStorage.getItem(deletedResourceIdsStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set(parsed.filter((resourceId): resourceId is string => typeof resourceId === "string"));
  } catch (error) {
    console.warn("[workbench] deleted resource ids restore failed", error);
    return new Set<string>();
  }
}

function persistDeletedResourceIdsToStorage(deletedResourceIds: Set<string>) {
  try {
    if (deletedResourceIds.size > 0) {
      localStorage.setItem(deletedResourceIdsStorageKey, JSON.stringify(Array.from(deletedResourceIds)));
    } else {
      localStorage.removeItem(deletedResourceIdsStorageKey);
    }
    return true;
  } catch (error) {
    console.warn("[workbench] deleted resource ids persistence failed", error);
    return false;
  }
}

function persistResourceEditsToStorage(edits: ResourceEditDrafts) {
  try {
    if (Object.keys(edits).length > 0) {
      localStorage.setItem(resourceEditsStorageKey, JSON.stringify(edits));
    } else {
      localStorage.removeItem(resourceEditsStorageKey);
    }
    return true;
  } catch (error) {
    console.warn("[workbench] resource edits persistence failed", error);
    return false;
  }
}

function persistLayoutToStorage(layout: WorkbenchLayout) {
  try {
    localStorage.setItem(layoutStorageKey, JSON.stringify(layout));
    return true;
  } catch (error) {
    console.warn("[workbench] layout persistence failed", error);
    return false;
  }
}

function localPersistenceSuffix(persisted: boolean) {
  return persisted ? "" : "（本地持久化失败）";
}

function resourceDragId(resourceId: string) {
  return `${resourceDragPrefix}${resourceId}`;
}

function resourceIdFromDragId(id: string) {
  return id.startsWith(resourceDragPrefix) ? id.slice(resourceDragPrefix.length) : null;
}

function moduleResources(moduleId: ResourceModuleLayout["id"], resources: StudyResource[]) {
  if (moduleId === "commentary") {
    return resources.filter((resource) => resource.type === "commentary");
  }
  if (moduleId === "media") {
    return resources.filter((resource) => ["html", "image", "video"].includes(resource.type));
  }
  if (moduleId === "notes") {
    return resources.filter((resource) => resource.type === "note");
  }
  if (moduleId === "backlinks") {
    return resources.filter((resource) => resource.type === "link");
  }
  return [];
}

function resourceModuleTitle(moduleId: ResourceModuleLayout["id"]) {
  if (moduleId === "notes") return "笔记";
  if (moduleId === "commentary") return "注释";
  if (moduleId === "media") return "媒体";
  return "百科和字典";
}

function resourceVisibleTypeLabel(resource: StudyResource) {
  if (resource.type === "note") return "笔记";
  if (resource.type === "commentary") return "注释";
  if (resource.type === "link") return "百科和字典";
  return "媒体";
}

function isTextResource(resource: StudyResource) {
  return ["commentary", "note", "link"].includes(resource.type);
}

function isBookTitleWrapped(value: string) {
  return /^《[^《》]+》$/.test(value.trim());
}

function unwrapBookTitleLabel(value: string) {
  const trimmedValue = value.trim();
  return isBookTitleWrapped(trimmedValue) ? trimmedValue.slice(1, -1).trim() : trimmedValue;
}

function displayableSourceName(rawSource: string | undefined, title: string) {
  const source = rawSource?.trim();

  if (source) {
    if (isBookTitleWrapped(source)) {
      return { kind: "book-title", label: unwrapBookTitleLabel(source) };
    }

    const cleanedSource = source
      .replace(/【codex(?:-[^】]+)?】/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (/image-text-ocr-conversion/i.test(cleanedSource)) {
      return { kind: "plain", label: "OCR 转文字" };
    }
    if (cleanedSource === "用户笔记") {
      return { kind: "plain", label: cleanedSource };
    }
    if (cleanedSource.includes("综合解读")) {
      return { kind: "book-title", label: "综合解读" };
    }
    if (cleanedSource.includes("圣经研修本")) {
      return { kind: "book-title", label: "圣经研修本" };
    }
    if (cleanedSource.includes("研读本圣经")) {
      return { kind: "book-title", label: "研读本圣经" };
    }
    if (cleanedSource.includes("圣经信息系列")) {
      return { kind: "book-title", label: "圣经信息系列" };
    }

    const sourceName = cleanedSource
      .split(/[·・｜|]/)[0]
      .replace(/\s+\d+_.+$/, "")
      .trim();
    if (sourceName) {
      return { kind: "book-title", label: unwrapBookTitleLabel(sourceName) };
    }
  }

  if (/综合解读(?:$|[：:｜|])/.test(title)) {
    return { kind: "book-title", label: "综合解读" };
  }
  if (/研修本注释/.test(title)) {
    return { kind: "book-title", label: "圣经研修本" };
  }
  if (/研读本注释/.test(title)) {
    return { kind: "book-title", label: "研读本圣经" };
  }

  return null;
}

function resourceHeaderLabel(resource: StudyResource) {
  if (!isTextResource(resource)) {
    return resourceVisibleTypeLabel(resource);
  }

  const sourceName = displayableSourceName(
    resource.source
      ?? resource.debugMeta?.sourceLabel,
    resource.title,
  );

  if (!sourceName) {
    return resourceVisibleTypeLabel(resource);
  }

  return unwrapBookTitleLabel(sourceName.label);
}

function normalizedCardSearchQuery(query: string) {
  return unwrapBookTitleLabel(query).toLocaleLowerCase();
}

function cardSearchText(resource: StudyResource) {
  const searchableResource = resource as SearchableStudyResource;
  return [
    resource.title,
    resource.body,
    resource.summary,
    resource.searchText,
    resource.source,
    resource.type,
    resourceHeaderLabel(resource),
    resourceVisibleTypeLabel(resource),
    searchableResource.category,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase();
}

function filterResourcesByCardQuery(resources: StudyResource[], query: string) {
  const normalizedQuery = normalizedCardSearchQuery(query);
  if (!normalizedQuery) return resources;

  return resources.filter((resource) => cardSearchText(resource).includes(normalizedQuery));
}

function bookIntroSourceId(book: string): ResourceSourceId {
  return `book-intro:${book}`;
}

function bookFromSourceId(sourceId: ResourceSourceId) {
  if (sourceId.startsWith("book-intro:")) {
    return sourceId.slice("book-intro:".length);
  }

  return parseVerseId(sourceId).book;
}

function sourceIdLabel(sourceId: ResourceSourceId) {
  if (sourceId.startsWith("book-intro:")) {
    return `${bookTitle(bookFromSourceId(sourceId))}序`;
  }

  return sourceId;
}

function sourceIdChapterLabel(sourceId: ResourceSourceId) {
  if (sourceId.startsWith("book-intro:")) {
    return sourceIdLabel(sourceId);
  }

  const verse = parseVerseId(sourceId);
  return `${bookTitle(verse.book)} ${verse.chapter}章`;
}

function isBookIntroSourceId(sourceId: ResourceSourceId): sourceId is `book-intro:${string}` {
  return sourceId.startsWith("book-intro:");
}

function firstResourceVerse(resource: StudyResource): VerseId | null {
  return resource.primaryAnchor ?? resource.verses[0] ?? null;
}

function firstValidResourceVerse(resource: StudyResource): VerseId | null {
  const candidates = [resource.primaryAnchor, ...resource.verses];
  return candidates.find((candidate): candidate is VerseId => {
    if (!candidate) return false;
    try {
      const parsed = parseVerseId(candidate);
      return parsed.chapter > 0 && parsed.verse > 0;
    } catch {
      return false;
    }
  }) ?? null;
}

function verseFirstBookIntroResources(resources: StudyResource[], book: string) {
  return resourcesForBookIntro(resources, book).filter((resource) => !firstValidResourceVerse(resource));
}

function resourceWithValidatedVerseNavigation(resource: StudyResource, validVerseIds: Set<string>): StudyResource {
  const verses = resource.verses.filter((verseId) => validVerseIds.has(verseId));
  const primaryAnchor = resource.primaryAnchor && validVerseIds.has(resource.primaryAnchor)
    ? resource.primaryAnchor
    : undefined;
  if (primaryAnchor === resource.primaryAnchor && verses.length === resource.verses.length) return resource;

  const { primaryAnchor: _invalidPrimaryAnchor, ...resourceWithoutPrimaryAnchor } = resource;
  return {
    ...resourceWithoutPrimaryAnchor,
    ...(primaryAnchor ? { primaryAnchor } : {}),
    verses,
  };
}

function baseResourceNavigationTarget(resource: StudyResource): ResourceSourceId | null {
  const verseId = firstValidResourceVerse(resource);
  if (verseId) return verseId;
  if (resource.bookIntro) return bookIntroSourceId(resource.bookIntro);
  return null;
}

function resourceNavigationTarget(resource: StudyResource, sourceVerseId?: ResourceSourceId): ResourceSourceId | null {
  if (resource.type === "image" && sourceVerseId && isBookIntroSourceId(sourceVerseId)) {
    if (resource.bookIntro === bookFromSourceId(sourceVerseId)) {
      return sourceVerseId;
    }
  }

  return baseResourceNavigationTarget(resource);
}

function dockLabel(side: DockSide) {
  return side === "left" ? "左侧" : "右侧";
}

function dockTitle(side: DockSide) {
  return side === "left" ? "左侧资料栏" : "右侧资料栏";
}

function dockVisibleWidth(layout: WorkbenchLayout, side: DockSide) {
  const width = side === "left" ? layout.leftWidth : layout.rightWidth;
  const collapsed = side === "left" ? layout.leftCollapsed : layout.rightCollapsed;
  return collapsed ? dockCollapsedWidth : width;
}

function dockResizeMaxWidth(layout: WorkbenchLayout, side: DockSide, readerMinWidth: number, viewportWidth: number) {
  const otherSide = side === "left" ? "right" : "left";
  const currentWidth = dockVisibleWidth(layout, side);
  const otherWidth = dockVisibleWidth(layout, otherSide);
  return Math.min(
    dockMaxWidth,
    Math.max(currentWidth, dockMinWidth, viewportWidth - otherWidth - readerMinWidth - dockResizeHandleWidth * 2),
  );
}

function resizeDock(
  layout: WorkbenchLayout,
  side: DockSide,
  deltaX: number,
  readerMinWidth: number,
  viewportWidth: number,
): WorkbenchLayout {
  const baseWidth = dockVisibleWidth(layout, side);
  const maxWidth = dockResizeMaxWidth(layout, side, readerMinWidth, viewportWidth);
  const nextWidth = side === "left"
    ? Math.min(maxWidth, Math.max(dockMinWidth, baseWidth + deltaX))
    : Math.min(maxWidth, Math.max(dockMinWidth, baseWidth - deltaX));

  return side === "left"
    ? {
        ...layout,
        leftCollapsed: false,
        leftWidth: nextWidth,
      }
    : {
        ...layout,
        rightCollapsed: false,
        rightWidth: nextWidth,
      };
}

interface ResourceCardProps {
  resource: StudyResource;
  origin: ResourceCardOrigin;
  sourceVerseId: ResourceSourceId;
  leadingAction?: ReactNode;
  onEditResource: ResourceEditHandler;
  onDeleteResource?: ResourceDeleteHandler;
  onNavigateToResource?: ResourceNavigateHandler;
  onOpenImageResource?: (resource: StudyResource) => void;
  onOpenResource: (resourceId: string) => void;
  onUnsyncResource?: (resourceId: string) => void;
  onUpdateWorkbenchResource?: WorkbenchResourceUpdateHandler;
  onCopyStatus: (message: string) => void;
  draggable?: boolean;
  savedVariant?: boolean;
  centerVariant?: boolean;
  currentVerseVariant?: boolean;
  showDeleteAction?: boolean;
  isCollapsed?: boolean;
  isUnsyncing?: boolean;
  isUnsyncDisabled?: boolean;
  isUpdateInFlight?: boolean;
  unsyncFailedResourceId?: string | null;
}

type ResourceCopyKind = "标题" | "正文" | "Markdown";

function stopResourceActionEvent(event: React.SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function stopResourceTextSelectionEvent(event: React.SyntheticEvent) {
  event.stopPropagation();
}

function stopResourceEditorEvent(event: React.SyntheticEvent) {
  event.stopPropagation();
}

function fitEditorTextarea(textarea: HTMLTextAreaElement, options?: { force?: boolean }) {
  const minHeight = 180;
  const maxHeight = Math.max(minHeight, Math.floor(window.innerHeight * 0.55));
  const currentHeight = textarea.getBoundingClientRect().height;

  if (options?.force) {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight + 2, minHeight), maxHeight)}px`;
    return;
  }

  if (textarea.scrollHeight > currentHeight + 1) {
    textarea.style.height = `${Math.min(textarea.scrollHeight + 2, maxHeight)}px`;
  }
}

function resourceDisplayBody(resource: StudyResource) {
  if (resource.type === "image") {
    return resource.body;
  }

  return formatTextResourceBody(resource.body);
}

function resourceMarkdown(resource: StudyResource) {
  return `## ${resource.title}\n\n${resourceDisplayBody(resource)}`;
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch (clipboardError) {
    const fallbackTextarea = document.createElement("textarea");
    fallbackTextarea.dataset.resourceCopyFallback = "true";
    fallbackTextarea.value = text;
    fallbackTextarea.setAttribute("readonly", "");
    fallbackTextarea.style.position = "fixed";
    fallbackTextarea.style.top = "-9999px";
    fallbackTextarea.style.left = "-9999px";
    document.body.appendChild(fallbackTextarea);
    fallbackTextarea.select();

    try {
      if (!document.execCommand("copy")) {
        throw clipboardError;
      }
    } finally {
      fallbackTextarea.remove();
    }
  }
}

function ResourceCard({
  resource,
  origin,
  sourceVerseId,
  leadingAction,
  onEditResource,
  onDeleteResource,
  onNavigateToResource,
  onOpenImageResource,
  onOpenResource,
  onUnsyncResource,
  onUpdateWorkbenchResource,
  onCopyStatus,
  draggable = true,
  savedVariant = false,
  centerVariant = false,
  currentVerseVariant = false,
  showDeleteAction = false,
  isCollapsed = false,
  isUnsyncing = false,
  isUnsyncDisabled = false,
  isUpdateInFlight = false,
  unsyncFailedResourceId = null,
}: ResourceCardProps) {
  const visibleEditableBody = editableResourceBody(resource);
  const hasPinnedActions = isUnsyncing || isUpdateInFlight || unsyncFailedResourceId === resource.id;
  const [editBody, setEditBody] = useState(visibleEditableBody);
  const [editTitle, setEditTitle] = useState(resource.title);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [editSyncError, setEditSyncError] = useState<string | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyResizeRef = useRef<{ pointerId: number; startHeight: number; startY: number } | null>(null);
  const usesBodyCopyActions = centerVariant || currentVerseVariant;
  const canOpenImagePreview = Boolean(onOpenImageResource);
  const navigationTarget = resourceNavigationTarget(resource, sourceVerseId);
  const navigationTargetLabel = navigationTarget ? sourceIdLabel(navigationTarget) : null;
  const canNavigateToResource = Boolean(navigationTarget && onNavigateToResource);
  const canUnsyncResource = Boolean(resource.debugMeta?.externalResourceId && onUnsyncResource);
  const canDeleteResource = Boolean(showDeleteAction && onDeleteResource);
  const isResourceActionBusy = isUnsyncing || isUnsyncDisabled || isUpdateInFlight;
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: resourceDragId(resource.id),
    data: {
      kind: "resource-card",
      origin,
      resourceId: resource.id,
      sourceVerseId,
      title: resource.title,
    },
    disabled: !draggable,
  });

  useEffect(() => {
    if (isEditing) return;
    setEditBody(visibleEditableBody);
    setEditTitle(resource.title);
  }, [isEditing, visibleEditableBody, resource.title]);

  useEffect(() => {
    setIsEditing(false);
    setIsCopyMenuOpen(false);
  }, [isCollapsed]);

  useEffect(() => {
    if (!isEditing) return;
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    const frame = window.requestAnimationFrame(() => {
      fitEditorTextarea(textarea, { force: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isEditing]);

  function openEditor() {
    setEditBody(visibleEditableBody);
    setEditTitle(resource.title);
    setIsCopyMenuOpen(false);
    setEditSyncError(null);
    setIsEditing(true);
    onCopyStatus(`正在编辑卡片文字：${resource.title}`);
  }

  function startBodyResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    event.preventDefault();
    event.stopPropagation();
    bodyResizeRef.current = {
      pointerId: event.pointerId,
      startHeight: textarea.getBoundingClientRect().height,
      startY: event.clientY,
    };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic/test environments may not support pointer capture.
    }
  }

  function moveBodyResize(event: ReactPointerEvent<HTMLDivElement>) {
    const session = bodyResizeRef.current;
    const textarea = bodyTextareaRef.current;
    if (!session || session.pointerId !== event.pointerId || !textarea) return;

    event.preventDefault();
    const minHeight = 180;
    const maxHeight = Math.max(minHeight, Math.floor(window.innerHeight * 0.7));
    const nextHeight = Math.min(Math.max(session.startHeight + (event.clientY - session.startY), minHeight), maxHeight);
    textarea.style.height = `${Math.round(nextHeight)}px`;
  }

  function stopBodyResize(event: ReactPointerEvent<HTMLDivElement>) {
    const session = bodyResizeRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    bodyResizeRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may not have been acquired.
    }
  }

  function cancelEditor() {
    setEditBody(visibleEditableBody);
    setEditTitle(resource.title);
    setEditSyncError(null);
    setIsEditing(false);
    onCopyStatus(`已取消编辑：${resource.title}`);
  }

  async function saveEditor() {
    const nextTitle = editTitle.trim() || resource.title;
    const nextBody = editBody.trim();
    if (resource.debugMeta?.externalResourceId && onUpdateWorkbenchResource) {
      setEditSyncError(null);
      try {
        await onUpdateWorkbenchResource(resource.id, {
          body: nextBody,
          title: nextTitle,
        });
        setIsEditing(false);
        onCopyStatus(`已同步卡片修改：${nextTitle}`);
        return;
      } catch (error) {
        setEditSyncError("同步失败");
        onCopyStatus(`卡片修改同步失败：${resource.title}`);
        return;
      }
    }

    const result = onEditResource(resource.id, {
      body: nextBody,
      title: nextTitle,
    });
    setIsEditing(false);
    onCopyStatus(result.persisted
      ? `已更新卡片文字：${nextTitle}`
      : `已更新卡片文字：${nextTitle}（本地持久化失败）`);
  }

  async function copyResourceText(kind: ResourceCopyKind) {
    const text = kind === "标题"
      ? resource.title
      : kind === "正文"
        ? resourceDisplayBody(resource)
        : resourceMarkdown(resource);

    try {
      await copyTextToClipboard(text);
      onCopyStatus(`已复制：${kind}`);
      setIsCopyMenuOpen(false);
    } catch (error) {
      console.warn("[workbench] resource card copy failed", {
        resourceId: resource.id,
        title: resource.title,
        kind,
        error,
      });
      onCopyStatus(`复制失败：${kind}`);
    }
  }

  const copyMenu = isCopyMenuOpen ? (
    <div className="resource-card__copy-menu" role="menu" aria-label={`${resource.title}复制菜单`}>
      {(["标题", "正文", "Markdown"] as const).map((kind) => (
        <button
          className="resource-card__copy-menu-item"
          key={kind}
          role="menuitem"
          type="button"
          onClick={(event) => {
            stopResourceActionEvent(event);
            void copyResourceText(kind);
          }}
          onPointerDown={stopResourceActionEvent}
        >
          复制{kind}
        </button>
      ))}
    </div>
  ) : null;

  const copyButton = (
    <button
      aria-expanded={isCopyMenuOpen}
      aria-haspopup="menu"
      aria-label={`打开${resource.title}复制菜单`}
      className="resource-card__action-button resource-card__copy-button"
      title="复制"
      type="button"
      onClick={(event) => {
        stopResourceActionEvent(event);
        setIsCopyMenuOpen((isOpen) => !isOpen);
      }}
      onPointerDown={stopResourceActionEvent}
    >
      <Copy size={13} />
    </button>
  );

  const unsyncButton = canUnsyncResource ? (
    <button
      aria-label={`删除并退回未同步：${resource.title}`}
      className="resource-card__action-button resource-card__action-button--danger"
      disabled={isResourceActionBusy}
      title="删除并退回未同步"
      type="button"
      onClick={(event) => {
        stopResourceActionEvent(event);
        if (isResourceActionBusy) return;
        onUnsyncResource?.(resource.id);
      }}
      onPointerDown={stopResourceActionEvent}
    >
      <Trash2 size={13} />
    </button>
  ) : null;
  const deleteButton = canDeleteResource ? (
    <button
      aria-label={canUnsyncResource ? `删除并退回未同步：${resource.title}` : `删除：${resource.title}`}
      className="resource-card__action-button resource-card__action-button--danger"
      disabled={isResourceActionBusy}
      title={canUnsyncResource ? "删除并退回未同步" : "删除"}
      type="button"
      onClick={(event) => {
        stopResourceActionEvent(event);
        if (isResourceActionBusy) return;
        onDeleteResource?.(resource.id);
      }}
      onPointerDown={stopResourceActionEvent}
    >
      <Trash2 size={13} />
    </button>
  ) : null;

  const shouldShowCopyInBody = usesBodyCopyActions && !isCollapsed && !isEditing;
  const shouldShowCopyInHeader = !usesBodyCopyActions;

  return (
    <article
      ref={setNodeRef}
      aria-label={resource.title}
      className={`resource-card resource-card--${resource.type} ${savedVariant ? "resource-card--saved" : ""} ${centerVariant ? "resource-card--center" : ""} ${currentVerseVariant ? "resource-card--current-verse" : ""} ${isCollapsed ? "is-collapsed" : ""} ${isDragging ? "is-dragging" : ""} ${hasPinnedActions ? "resource-card--action-pinned" : ""}`}
      key={resource.id}
      style={{
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
      }}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      role="article"
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenResource(resource.id);
      }}
    >
      <header className="resource-card__header">
        {(!centerVariant || currentVerseVariant) ? <span className="drag-handle" aria-hidden="true" /> : null}
        {canNavigateToResource || leadingAction ? (
          <span className="resource-card__leading-action">
            {canNavigateToResource && navigationTargetLabel ? (
              <button
                aria-label={`跳转到 ${navigationTargetLabel}：${resource.title}`}
                className="resource-card__verse-nav"
                title={`跳转到 ${navigationTargetLabel}`}
                type="button"
                onClick={(event) => {
                  stopResourceActionEvent(event);
                  if (navigationTarget) {
                    onNavigateToResource?.(resource, navigationTarget);
                  }
                }}
                onPointerDown={stopResourceActionEvent}
              >
                <Navigation2 size={12} />
              </button>
            ) : null}
            {leadingAction}
          </span>
        ) : null}
        <div
          className="resource-card__title resource-card__selectable-title"
          data-selection-mode="text"
          onClick={stopResourceTextSelectionEvent}
          onDoubleClick={stopResourceTextSelectionEvent}
          onPointerDown={stopResourceTextSelectionEvent}
        >
          <span className="resource-card__type resource-card__source-pill">{resourceHeaderLabel(resource)}</span>
          <h3>{resource.title}</h3>
        </div>
        <div
          className="resource-card__actions"
          onClick={stopResourceActionEvent}
          onDoubleClick={stopResourceActionEvent}
          onPointerDown={stopResourceActionEvent}
        >
          <button
            aria-label={`编辑${resource.title}的标题和正文`}
            className="resource-card__action-button"
            disabled={isResourceActionBusy}
            title="编辑标题和正文"
            type="button"
            onClick={(event) => {
              stopResourceActionEvent(event);
              if (isResourceActionBusy) return;
              openEditor();
            }}
            onPointerDown={stopResourceActionEvent}
          >
            <Pencil size={13} />
          </button>
          {deleteButton ?? unsyncButton}
          {isUnsyncing ? (
            <span className="resource-card__action-status" role="status">删除中</span>
          ) : null}
          {shouldShowCopyInHeader ? copyButton : null}
          {shouldShowCopyInHeader ? copyMenu : null}
          {unsyncFailedResourceId === resource.id ? (
            <span className="resource-card__action-status resource-card__action-status--error" role="alert">删除失败</span>
          ) : null}
        </div>
      </header>
      {isEditing ? (
        <form
          aria-label={`编辑${resource.title}`}
          className="resource-card__editor"
          onClick={stopResourceEditorEvent}
          onDoubleClick={stopResourceEditorEvent}
          onPointerDown={stopResourceEditorEvent}
          onSubmit={(event) => {
            event.preventDefault();
            void saveEditor();
          }}
          role="form"
        >
          <label className="resource-card__editor-field">
            <span>标题</span>
            <input
              aria-label="标题"
              value={editTitle}
              onChange={(event) => setEditTitle(event.currentTarget.value)}
            />
          </label>
          <label className="resource-card__editor-field">
            <span>正文</span>
            <div className="resource-card__editor-body-wrap">
              <textarea
                ref={bodyTextareaRef}
                aria-label="正文"
                className="resource-card__editor-body"
                rows={8}
                value={editBody}
                onChange={(event) => {
                  setEditBody(event.currentTarget.value);
                  fitEditorTextarea(event.currentTarget);
                }}
              />
              <div
                aria-label="调整正文高度"
                aria-orientation="horizontal"
                className="resource-card__editor-resize-handle"
                role="separator"
                onPointerCancel={stopBodyResize}
                onPointerDown={startBodyResize}
                onPointerMove={moveBodyResize}
                onPointerUp={stopBodyResize}
              />
            </div>
          </label>
          <div className="resource-card__editor-actions">
            <button type="submit" disabled={isUpdateInFlight}>{isUpdateInFlight ? "保存中" : "保存卡片文字"}</button>
            <button type="button" disabled={isUpdateInFlight} onClick={cancelEditor}>取消</button>
          </div>
          {editSyncError ? (
            <span className="resource-card__editor-status resource-card__editor-status--error" role="alert">
              {editSyncError}
            </span>
          ) : null}
        </form>
      ) : !isCollapsed ? (
        <div className="resource-card__body">
          {resource.type === "html" ? (
            <div
              className="html-preview resource-card__selectable-text"
              data-selection-mode="text"
              data-testid="resource-selectable-text"
              onClick={stopResourceTextSelectionEvent}
              onDoubleClick={stopResourceTextSelectionEvent}
              onPointerDown={stopResourceTextSelectionEvent}
            >
              互动 HTML：词语关系图 / 时间轴 / 小测验
            </div>
          ) : resource.type === "video" ? (
            <div
              className="video-preview resource-card__selectable-text"
              data-selection-mode="text"
              data-testid="resource-selectable-text"
              onClick={stopResourceTextSelectionEvent}
              onDoubleClick={stopResourceTextSelectionEvent}
              onPointerDown={stopResourceTextSelectionEvent}
            >
              播放：{resource.title}
            </div>
          ) : resource.type === "image" ? (
            resource.assetPath ? (
              <figure
                className={`image-resource-preview ${canOpenImagePreview ? "image-resource-preview--zoomable" : ""}`}
                data-selection-mode="text"
                data-testid="resource-selectable-text"
                onClick={stopResourceTextSelectionEvent}
                onDoubleClick={stopResourceTextSelectionEvent}
                onPointerDown={stopResourceTextSelectionEvent}
              >
                {canOpenImagePreview ? (
                  <button
                    aria-label={`放大${resource.title}`}
                    className="image-resource-preview__zoom-button"
                    type="button"
                    onClick={(event) => {
                      stopResourceActionEvent(event);
                      onOpenImageResource?.(resource);
                    }}
                    onPointerDown={stopResourceActionEvent}
                  >
                    <img
                      src={resource.assetPath}
                      alt={imageResourceAlt(resource)}
                      loading="eager"
                      onError={() => {
                        console.warn("[workbench] image resource failed to load", {
                          resourceId: resource.id,
                          title: resource.title,
                          assetPath: resource.assetPath,
                        });
                      }}
                      {...imageDimensionsFromAssetPath(resource.assetPath)}
                    />
                  </button>
                ) : (
                  <img
                    src={resource.assetPath}
                    alt={imageResourceAlt(resource)}
                    loading="eager"
                    onError={() => {
                      console.warn("[workbench] image resource failed to load", {
                        resourceId: resource.id,
                        title: resource.title,
                        assetPath: resource.assetPath,
                      });
                    }}
                    {...imageDimensionsFromAssetPath(resource.assetPath)}
                  />
                )}
                <figcaption>
                  {resource.source ? <span className="image-resource-preview__source">{resource.source}</span> : null}
                  {imageResourceCaption(resource) ? <span>{imageResourceCaption(resource)}</span> : null}
                </figcaption>
              </figure>
            ) : (
              <div
                className="image-preview resource-card__selectable-text"
                data-selection-mode="text"
                data-testid="resource-selectable-text"
                onClick={stopResourceTextSelectionEvent}
                onDoubleClick={stopResourceTextSelectionEvent}
                onPointerDown={stopResourceTextSelectionEvent}
              >
                图片 / 地图 / 图表
              </div>
            )
          ) : (
            <div
              className="resource-card__selectable-text"
              data-selection-mode="text"
              data-testid="resource-selectable-text"
              onClick={stopResourceTextSelectionEvent}
              onDoubleClick={stopResourceTextSelectionEvent}
              onPointerDown={stopResourceTextSelectionEvent}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{resourceDisplayBody(resource)}</ReactMarkdown>
            </div>
          )}
          {shouldShowCopyInBody ? (
            <div
              className="resource-card__body-actions"
              onClick={stopResourceActionEvent}
              onDoubleClick={stopResourceActionEvent}
              onPointerDown={stopResourceActionEvent}
            >
              {copyButton}
              {copyMenu}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ResourceDragPreview({ resource }: { resource: StudyResource }) {
  return (
    <article className={`resource-card-drag-preview resource-card-drag-preview--compact resource-card-drag-preview--${resource.type}`} data-testid="resource-drag-overlay">
      <div className="resource-card-drag-preview__meta">{resourceVisibleTypeLabel(resource)}</div>
      <h3>{resource.title}</h3>
      <p>{compactResourceBody(resource) || "资源卡片"}</p>
    </article>
  );
}

interface CenterCardBrowserProps {
  activeResourceId: string | null;
  collapsedCardIds: Set<string>;
  label?: string;
  resources: StudyResource[];
  selectedSourceId: ResourceSourceId;
  onEditResource: ResourceEditHandler;
  onNavigateToResource: ResourceNavigateHandler;
  onOpenImageResource?: (resource: StudyResource) => void;
  onOpenResource: (resourceId: string) => void;
  onUnsyncResource?: (resourceId: string) => void;
  onUpdateWorkbenchResource?: WorkbenchResourceUpdateHandler;
  onRemoveResource: (resourceId: string) => void;
  onToggleResource: (resourceId: string) => void;
  onCopyStatus: (message: string) => void;
  unsyncingResourceId?: string | null;
  unsyncFailedResourceId?: string | null;
  hasAnyUnsyncInFlight?: boolean;
  updateInFlightResourceId?: string | null;
}

interface SortableCenterCardItemProps {
  activeResourceId: string | null;
  isCollapsed: boolean;
  resource: StudyResource;
  selectedSourceId: ResourceSourceId;
  onEditResource: ResourceEditHandler;
  onNavigateToResource: ResourceNavigateHandler;
  onOpenImageResource?: (resource: StudyResource) => void;
  onOpenResource: (resourceId: string) => void;
  onUnsyncResource?: (resourceId: string) => void;
  onUpdateWorkbenchResource?: WorkbenchResourceUpdateHandler;
  onRemoveResource: (resourceId: string) => void;
  onToggleResource: (resourceId: string) => void;
  onCopyStatus: (message: string) => void;
  unsyncingResourceId?: string | null;
  unsyncFailedResourceId?: string | null;
  hasAnyUnsyncInFlight?: boolean;
  updateInFlightResourceId?: string | null;
}

function SortableCenterCardItem({
  activeResourceId,
  isCollapsed,
  resource,
  selectedSourceId,
  onEditResource,
  onNavigateToResource,
  onOpenImageResource,
  onOpenResource,
  onUnsyncResource,
  onUpdateWorkbenchResource,
  onRemoveResource,
  onToggleResource,
  onCopyStatus,
  unsyncingResourceId = null,
  unsyncFailedResourceId = null,
  hasAnyUnsyncInFlight = false,
  updateInFlightResourceId = null,
}: SortableCenterCardItemProps) {
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({
    id: centerCardDragId(resource.id),
    data: {
      kind: "center-card",
      resourceId: resource.id,
      title: resource.title,
    },
  });
  const ToggleIcon = isCollapsed ? ChevronRight : ChevronDown;

  return (
    <div
      ref={setNodeRef}
      aria-expanded={!isCollapsed}
      className={`center-card-stack__item ${isCollapsed ? "is-collapsed" : "is-expanded"} ${activeResourceId === resource.id ? "is-active" : ""} ${isDragging ? "is-dragging" : ""}`}
      key={resource.id}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <ResourceCard
        origin="left"
        resource={resource}
        centerVariant
        draggable={false}
        isCollapsed={isCollapsed}
        leadingAction={(
          <button
            aria-expanded={!isCollapsed}
            aria-label={`${isCollapsed ? "展开" : "折叠"} ${resource.title}`}
            className="center-card-collapse"
            title={`${isCollapsed ? "展开" : "折叠"} ${resource.title}`}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleResource(resource.id);
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <ToggleIcon size={13} />
          </button>
        )}
        onEditResource={onEditResource}
        onNavigateToResource={onNavigateToResource}
        onOpenImageResource={onOpenImageResource}
        onOpenResource={onOpenResource}
        onUnsyncResource={onUnsyncResource}
        onUpdateWorkbenchResource={onUpdateWorkbenchResource}
        onCopyStatus={onCopyStatus}
        sourceVerseId={selectedSourceId}
        isUnsyncing={unsyncingResourceId === resource.id}
        isUnsyncDisabled={hasAnyUnsyncInFlight && unsyncingResourceId !== resource.id}
        isUpdateInFlight={updateInFlightResourceId === resource.id}
        unsyncFailedResourceId={unsyncFailedResourceId}
      />
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`拖动排序 ${resource.title}`}
        className="center-card-sort-handle"
        title={`拖动排序 ${resource.title}`}
        type="button"
      >
        <span className="drag-handle" aria-hidden="true" />
      </button>
      <button
        aria-label={`从左侧移除 ${resource.title}`}
        className="center-card-remove"
        title={`从左侧移除 ${resource.title}`}
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemoveResource(resource.id);
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

function CenterCardBrowser({
  activeResourceId,
  collapsedCardIds,
  label = "用户根据章节自行整理卡片",
  resources,
  selectedSourceId,
  onEditResource,
  onNavigateToResource,
  onOpenImageResource,
  onOpenResource,
  onUnsyncResource,
  onUpdateWorkbenchResource,
  onRemoveResource,
  onToggleResource,
  onCopyStatus,
  unsyncingResourceId = null,
  unsyncFailedResourceId = null,
  hasAnyUnsyncInFlight = false,
  updateInFlightResourceId = null,
}: CenterCardBrowserProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: centerCardDropId,
  });

  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={`resource-detail resource-detail--browser ${isOver ? "is-drop-target" : ""}`}
    >
      <div className="center-card-browser" aria-label="左侧整理卡片">
        <header className="center-card-browser__header">
          <span className="resource-card__type">整理卡片</span>
          <strong>{resources.length}</strong>
        </header>
        <div className="center-card-browser__stack">
          {resources.length > 0 ? (
            <SortableContext
              items={resources.map((resource) => centerCardDragId(resource.id))}
              strategy={verticalListSortingStrategy}
            >
              {resources.map((resource) => (
                <SortableCenterCardItem
                  activeResourceId={activeResourceId}
                  isCollapsed={collapsedCardIds.has(resource.id)}
                  key={resource.id}
                  resource={resource}
                  selectedSourceId={selectedSourceId}
                  onEditResource={onEditResource}
                  onNavigateToResource={onNavigateToResource}
                  onOpenImageResource={onOpenImageResource}
                  onOpenResource={onOpenResource}
                  onUnsyncResource={onUnsyncResource}
                  onUpdateWorkbenchResource={onUpdateWorkbenchResource}
                  onRemoveResource={onRemoveResource}
                  onToggleResource={onToggleResource}
                  onCopyStatus={onCopyStatus}
                  unsyncingResourceId={unsyncingResourceId}
                  unsyncFailedResourceId={unsyncFailedResourceId}
                  hasAnyUnsyncInFlight={hasAnyUnsyncInFlight}
                  updateInFlightResourceId={updateInFlightResourceId}
                />
              ))}
            </SortableContext>
          ) : (
            <p className="resource-dock__empty">还没有整理卡片。双击右侧卡片，或拖入左侧。</p>
          )}
        </div>
      </div>
    </section>
  );
}

interface CenterModuleButtonProps {
  moduleId: CenterModuleId;
  isActive: boolean;
  onActivate: (moduleId: CenterModuleId) => void;
}

function CenterModuleButton({ moduleId, isActive, onActivate }: CenterModuleButtonProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: centerModuleDragId(moduleId),
    data: {
      kind: "center-module",
      moduleId,
    },
  });
  const Icon = centerModuleIcon(moduleId);

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-pressed={isActive}
      className={`toolbar-button toolbar-button--module ${isActive ? "is-active" : ""} ${isDragging ? "is-dragging" : ""}`}
      data-module-id={moduleId}
      data-testid="center-module-button"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      type="button"
      onClick={() => onActivate(moduleId)}
    >
      <Icon size={16} />
      {centerModuleLabel(moduleId)}
    </button>
  );
}

interface ResourceModuleProps {
  module: ResourceModuleLayout;
  resources: StudyResource[];
  sourceIdForResource: (resource: StudyResource) => ResourceSourceId;
  onEditResource: ResourceEditHandler;
  onNavigateToResource: ResourceNavigateHandler;
  onOpenImageResource?: (resource: StudyResource) => void;
  onOpenResource: (resourceId: string) => void;
  onUnsyncResource?: (resourceId: string) => void;
  onUpdateWorkbenchResource?: WorkbenchResourceUpdateHandler;
  onCopyStatus: (message: string) => void;
  unsyncingResourceId?: string | null;
  unsyncFailedResourceId?: string | null;
  hasAnyUnsyncInFlight?: boolean;
  updateInFlightResourceId?: string | null;
}

function ResourceModule({
  module,
  resources,
  sourceIdForResource,
  onEditResource,
  onNavigateToResource,
  onOpenImageResource,
  onOpenResource,
  onUnsyncResource,
  onUpdateWorkbenchResource,
  onCopyStatus,
  unsyncingResourceId = null,
  unsyncFailedResourceId = null,
  hasAnyUnsyncInFlight = false,
  updateInFlightResourceId = null,
}: ResourceModuleProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const ToggleIcon = isCollapsed ? ChevronRight : ChevronDown;

  function toggleModuleCollapse() {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    logWorkbenchInfo("[workbench] right resource module collapsed state changed", {
      moduleId: module.id,
      title: module.title,
      collapsed: nextCollapsed,
    });
  }

  return (
    <section
      aria-expanded={!isCollapsed}
      aria-label={module.title}
      className={`resource-module resource-module--dock ${isCollapsed ? "is-collapsed" : ""}`}
      role="region"
    >
      <header className="resource-module__header">
        <div className="resource-module__title">
          <span className="resource-module__title-text">{module.title}</span>
        </div>
        <button
          aria-expanded={!isCollapsed}
          aria-label={`${isCollapsed ? "展开" : "折叠"} ${module.title}`}
          className="resource-module__collapse"
          title={`${isCollapsed ? "展开" : "折叠"} ${module.title}`}
          type="button"
          onClick={toggleModuleCollapse}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          <ToggleIcon size={13} />
        </button>
      </header>
      {!isCollapsed ? (
        resources.length > 0 ? (
          resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              origin={module.side}
              resource={resource}
              sourceVerseId={sourceIdForResource(resource)}
              onEditResource={onEditResource}
              onNavigateToResource={onNavigateToResource}
              onOpenImageResource={onOpenImageResource}
              onOpenResource={onOpenResource}
              onUnsyncResource={onUnsyncResource}
              onUpdateWorkbenchResource={onUpdateWorkbenchResource}
              onCopyStatus={onCopyStatus}
              isUnsyncing={unsyncingResourceId === resource.id}
              isUnsyncDisabled={hasAnyUnsyncInFlight && unsyncingResourceId !== resource.id}
              isUpdateInFlight={updateInFlightResourceId === resource.id}
              unsyncFailedResourceId={unsyncFailedResourceId}
            />
          ))
        ) : (
          <p className="resource-dock__empty">当前经节还没有资源。</p>
        )
      ) : null}
    </section>
  );
}

interface CurrentVerseCardListProps {
  selectedSourceId: ResourceSourceId;
  sourceIdForResource: (resource: StudyResource) => ResourceSourceId;
  verseResources: StudyResource[];
  onEditResource: ResourceEditHandler;
  onDeleteResource: ResourceDeleteHandler;
  onNavigateToResource: ResourceNavigateHandler;
  onOpenImageResource?: (resource: StudyResource) => void;
  onOpenResource: (resourceId: string) => void;
  onUnsyncResource?: (resourceId: string) => void;
  onUpdateWorkbenchResource?: WorkbenchResourceUpdateHandler;
  onCopyStatus: (message: string) => void;
  unsyncingResourceId?: string | null;
  unsyncFailedResourceId?: string | null;
  hasAnyUnsyncInFlight?: boolean;
  updateInFlightResourceId?: string | null;
  centerVariant?: boolean;
}

function CurrentVerseCardList({
  selectedSourceId,
  sourceIdForResource,
  verseResources,
  onEditResource,
  onDeleteResource,
  onNavigateToResource,
  onOpenImageResource,
  onOpenResource,
  onUnsyncResource,
  onUpdateWorkbenchResource,
  onCopyStatus,
  unsyncingResourceId = null,
  unsyncFailedResourceId = null,
  hasAnyUnsyncInFlight = false,
  updateInFlightResourceId = null,
  centerVariant = false,
}: CurrentVerseCardListProps) {
  const [collapsedCardIds, setCollapsedCardIds] = useState<Set<string>>(() => new Set());
  const isIntro = isBookIntroSourceId(selectedSourceId);

  function toggleVerseCard(resourceId: string) {
    setCollapsedCardIds((currentIds) => {
      const nextIds = new Set(currentIds);
      const nextCollapsed = !nextIds.has(resourceId);
      if (nextIds.has(resourceId)) {
        nextIds.delete(resourceId);
      } else {
        nextIds.add(resourceId);
      }
      const resource = verseResources.find((item) => item.id === resourceId);
      logWorkbenchInfo("[workbench] current verse resource card collapsed state changed", {
        selectedSourceId,
        resourceId,
        title: resource?.title,
        collapsed: nextCollapsed,
      });
      return nextIds;
    });
  }

  return (
    <section className="book-card-storage" aria-label={isIntro ? "当前序言卡片列表" : "当前经文卡片列表"}>
      {verseResources.length > 0 ? (
        <div className="book-card-storage__list">
          {verseResources.map((resource) => {
            const isCollapsed = collapsedCardIds.has(resource.id);
            const ToggleIcon = isCollapsed ? ChevronRight : ChevronDown;
            const sourceVerseId = isIntro ? sourceIdForResource(resource) : selectedSourceId;

            return (
              <div
                aria-expanded={!isCollapsed}
                className={`book-card-storage__item ${isCollapsed ? "is-collapsed" : ""}`}
                key={resource.id}
              >
                <ResourceCard
                  origin={centerVariant ? "center" : "left"}
                  resource={resource}
                  savedVariant
                  currentVerseVariant
                  centerVariant={centerVariant}
                  sourceVerseId={sourceVerseId}
                  isCollapsed={isCollapsed}
                  leadingAction={(
                    <button
                      aria-expanded={!isCollapsed}
                      aria-label={`${isCollapsed ? "展开" : "折叠"} ${resource.title}`}
                      className="saved-card-collapse"
                      title={`${isCollapsed ? "展开" : "折叠"} ${resource.title}`}
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleVerseCard(resource.id);
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      <ToggleIcon size={13} />
                    </button>
                  )}
                  onEditResource={onEditResource}
                  onDeleteResource={onDeleteResource}
                  onNavigateToResource={onNavigateToResource}
                  onOpenImageResource={onOpenImageResource}
                  onOpenResource={onOpenResource}
                  onUnsyncResource={onUnsyncResource}
                  onUpdateWorkbenchResource={onUpdateWorkbenchResource}
                  onCopyStatus={onCopyStatus}
                  showDeleteAction
                  isUnsyncing={unsyncingResourceId === resource.id}
                  isUnsyncDisabled={hasAnyUnsyncInFlight && unsyncingResourceId !== resource.id}
                  isUpdateInFlight={updateInFlightResourceId === resource.id}
                  unsyncFailedResourceId={unsyncFailedResourceId}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="resource-dock__empty">{isIntro ? "当前序言还没有卡片。" : "当前经文还没有卡片。"}</p>
      )}
    </section>
  );
}

interface ResourceDockProps {
  side: DockSide;
  layout: WorkbenchLayout;
  selectedSourceId: ResourceSourceId;
  rightResources: StudyResource[];
  organizedResources: StudyResource[];
  sourceIdForResource: (resource: StudyResource) => ResourceSourceId;
  onToggleDock: (side: DockSide) => void;
  onEditResource: ResourceEditHandler;
  onNavigateToResource: ResourceNavigateHandler;
  onOpenImageResource?: (resource: StudyResource) => void;
  onOpenResource: (resourceId: string) => void;
  onUnsyncResource?: (resourceId: string) => void;
  onUpdateWorkbenchResource?: WorkbenchResourceUpdateHandler;
  onRemoveOrganizedResource: (resourceId: string) => void;
  onToggleOrganizedResource: (resourceId: string) => void;
  collapsedOrganizedResourceIds: Set<string>;
  onCopyStatus: (message: string) => void;
  unsyncingResourceId?: string | null;
  unsyncFailedResourceId?: string | null;
  hasAnyUnsyncInFlight?: boolean;
  updateInFlightResourceId?: string | null;
}

function ResourceDock({
  side,
  layout,
  selectedSourceId,
  rightResources,
  organizedResources,
  sourceIdForResource,
  onToggleDock,
  onEditResource,
  onNavigateToResource,
  onOpenImageResource,
  onOpenResource,
  onUnsyncResource,
  onUpdateWorkbenchResource,
  onRemoveOrganizedResource,
  onToggleOrganizedResource,
  collapsedOrganizedResourceIds,
  onCopyStatus,
  unsyncingResourceId = null,
  unsyncFailedResourceId = null,
  hasAnyUnsyncInFlight = false,
  updateInFlightResourceId = null,
}: ResourceDockProps) {
  const modules = layout.modules.filter((module) => module.side === side && module.visible);
  const collapsed = side === "left" ? layout.leftCollapsed : layout.rightCollapsed;
  const collapseIcon = side === "left" ? (collapsed ? PanelLeftOpen : PanelLeftClose) : (collapsed ? PanelRightOpen : PanelRightClose);
  const { isOver, setNodeRef } = useDroppable({
    id: `${side}-dock`,
  });
  const CollapseIcon = collapseIcon;

  return (
    <aside
      ref={setNodeRef}
      aria-label={dockTitle(side)}
      className={`resource-dock resource-dock--${side} ${collapsed ? "is-collapsed" : ""} ${isOver ? "is-drop-target" : ""}`}
      role="complementary"
    >
      <div className="resource-dock__panel">
        <header className="resource-dock__header">
          {side === "left" ? (
            <div className="resource-dock__title resource-dock__title--book">
              <span>自行整理卡片</span>
              <strong>{sourceIdChapterLabel(selectedSourceId)}</strong>
            </div>
          ) : (
            <div className="resource-dock__title">
              <span>{isBookIntroSourceId(selectedSourceId) ? "当前序言卡片" : "当前章节卡片"}</span>
              <strong>{sourceIdChapterLabel(selectedSourceId)}</strong>
            </div>
          )}
          {!collapsed ? (
            <button
              aria-label={`收起${side === "left" ? "左侧" : "右侧"}资料栏`}
              className="dock-toggle"
              title={`收起${side === "left" ? "左侧" : "右侧"}资料栏`}
              type="button"
              onClick={() => onToggleDock(side)}
            >
              <CollapseIcon size={14} />
            </button>
          ) : null}
        </header>
        {side === "left" ? (
          <CenterCardBrowser
            activeResourceId={layout.activeResourceId}
            collapsedCardIds={collapsedOrganizedResourceIds}
            onEditResource={onEditResource}
            onNavigateToResource={onNavigateToResource}
            onOpenImageResource={onOpenImageResource}
            onOpenResource={onOpenResource}
            onUnsyncResource={onUnsyncResource}
            onUpdateWorkbenchResource={onUpdateWorkbenchResource}
            onRemoveResource={onRemoveOrganizedResource}
            onToggleResource={onToggleOrganizedResource}
            onCopyStatus={onCopyStatus}
            resources={organizedResources}
            selectedSourceId={selectedSourceId}
            unsyncingResourceId={unsyncingResourceId}
            unsyncFailedResourceId={unsyncFailedResourceId}
            hasAnyUnsyncInFlight={hasAnyUnsyncInFlight}
            updateInFlightResourceId={updateInFlightResourceId}
          />
        ) : (
          modules.map((module) => {
            const resourcesForModule = moduleResources(module.id, rightResources);
            return (
              <ResourceModule
                key={module.id}
                module={module}
                onEditResource={onEditResource}
                onNavigateToResource={onNavigateToResource}
                onOpenImageResource={onOpenImageResource}
                onOpenResource={onOpenResource}
                onUnsyncResource={onUnsyncResource}
                onUpdateWorkbenchResource={onUpdateWorkbenchResource}
                onCopyStatus={onCopyStatus}
                resources={resourcesForModule}
                sourceIdForResource={sourceIdForResource}
                unsyncingResourceId={unsyncingResourceId}
                unsyncFailedResourceId={unsyncFailedResourceId}
                hasAnyUnsyncInFlight={hasAnyUnsyncInFlight}
                updateInFlightResourceId={updateInFlightResourceId}
              />
            );
          })
        )}
      </div>
      {collapsed ? (
        <div className="resource-dock__rail">
          <button
            aria-label={`展开${side === "left" ? "左侧" : "右侧"}资料栏`}
            className="dock-toggle"
            title={`展开${side === "left" ? "左侧" : "右侧"}资料栏`}
            type="button"
            onClick={() => onToggleDock(side)}
          >
            <CollapseIcon size={14} />
          </button>
          <span className="resource-dock__rail-label">资料</span>
        </div>
      ) : null}
    </aside>
  );
}

export function Workbench({
  activeBookId,
  isBookLoading = false,
  isRefreshingResources = false,
  initialIntroBook = null,
  initialVerseId = "Gen.1.1",
  versions,
  resources,
  initialLayout,
  onRefreshResources,
  onRequestBook,
  onRequestSearchResult,
  onUnsyncResource,
  onUpdateWorkbenchResource,
  unsyncingResourceId = null,
  onSaveLayout,
  wholeBibleSearchIndex,
}: WorkbenchProps) {
  const validVerseIds = useMemo(
    () => new Set(versions.flatMap((version) => version.verses.map((verse) => verse.id))),
    [versions],
  );
  const navigationValidatedResources = useMemo(
    () => resources.map((resource) => resourceWithValidatedVerseNavigation(resource, validVerseIds)),
    [resources, validVerseIds],
  );
  const [layout, setLayout] = useState(() => storedLayout(initialLayout, navigationValidatedResources));
  const [activeResizeSide, setActiveResizeSide] = useState<DockSide | null>(null);
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [previewImageResource, setPreviewImageResource] = useState<StudyResource | null>(null);
  const [resourceEdits, setResourceEdits] = useState<ResourceEditDrafts>(() => storedResourceEdits());
  const [deletedResourceIds, setDeletedResourceIds] = useState<Set<string>>(() => storedDeletedResourceIds());
  const [selectedVerseId, setSelectedVerseId] = useState<VerseId>(initialVerseId);
  const [selectedIntroBook, setSelectedIntroBook] = useState<string | null>(initialIntroBook);
  const [openNavigationPanel, setOpenNavigationPanel] = useState<"book" | "chapter" | null>(null);
  const [query, setQuery] = useState("");
  const [cardQuery, setCardQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searchVersionFilter, setSearchVersionFilter] = useState<SearchVersionFilter>("all");
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [collapsedCenterCardIds, setCollapsedCenterCardIds] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState("工作台已加载");
  const [refreshStatus, setRefreshStatus] = useState<"idle" | "success" | "error">("idle");
  const [unsyncFailedResourceId, setUnsyncFailedResourceId] = useState<string | null>(null);
  const [locallyUnsyncingResourceId, setLocallyUnsyncingResourceId] = useState<string | null>(null);
  const [updateInFlightResourceId, setUpdateInFlightResourceId] = useState<string | null>(null);
  const resizeSessionRef = useRef<{
    side: DockSide;
    startLayout: WorkbenchLayout;
    startX: number;
  } | null>(null);
  const centerSplitResizeSessionRef = useRef<{
    startLayout: WorkbenchLayout;
    startX: number;
  } | null>(null);
  const layoutRef = useRef(layout);
  const refreshInFlightRef = useRef(false);
  const unsyncInFlightResourceIdRef = useRef<string | null>(null);
  const updateInFlightResourceIdRef = useRef<string | null>(null);
  const initialNavigationRef = useRef({ introBook: initialIntroBook, verseId: initialVerseId });
  const navigationPickerRef = useRef<HTMLDivElement>(null);
  const verseButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingBookRef = useRef<string | null>(null);
  const pendingSearchResultRef = useRef<WorkbenchSearchResult | null>(null);

  const cuv = versions.find((version) => version.id === "cuv");
  const kjv = versions.find((version) => version.id === "kjv");
  const resolvedActiveBookId = activeBookId ?? versions[0]?.verses[0]?.book ?? "Gen";
  const toolbarCenterModules = normalizeCenterModules(layout.centerModules);
  const activeCenterModules = normalizeActiveCenterModules(layout.activeCenterModules);
  const visibleCenterModules = visibleCenterModulesInToolbarOrder(layout);
  const visibleVersionIds = visibleCenterModules.filter((moduleId) => moduleId === "cuv" || moduleId === "kjv");
  const currentVerse = parseVerseId(selectedVerseId);
  const currentBook = selectedIntroBook ?? currentVerse.book;
  const currentChapter = currentVerse.book === currentBook ? currentVerse.chapter : 1;
  const currentBookTitle = bookTitle(currentBook);
  const currentEnglishBookTitle = englishBookTitle(currentBook);
  const currentChapterLabel = selectedIntroBook ? `${currentBookTitle} ${currentEnglishBookTitle} 序` : `${currentBookTitle} ${currentEnglishBookTitle} ${currentChapter}`;
  const visibleResources = useMemo(() => (
    filterDeletedResources(editableResources(navigationValidatedResources, resourceEdits), deletedResourceIds)
  ), [deletedResourceIds, navigationValidatedResources, resourceEdits]);
  const activeUnsyncingResourceId = unsyncingResourceId ?? locallyUnsyncingResourceId;
  const selectedSourceId = selectedIntroBook ? bookIntroSourceId(selectedIntroBook) : selectedVerseId;
  const currentChapterVerseIds = useMemo(() => {
    if (selectedIntroBook) return [];

    const verseIds = new Set<VerseId>();
    versions.forEach((version) => {
      version.verses
        .filter((verse) => verse.book === currentBook && verse.chapter === currentChapter)
        .sort((a, b) => a.verse - b.verse)
        .forEach((verse) => verseIds.add(verse.id));
    });
    return Array.from(verseIds);
  }, [currentBook, currentChapter, selectedIntroBook, versions]);
  const currentResources = useMemo(() => (
    selectedIntroBook
      ? verseFirstBookIntroResources(visibleResources, selectedIntroBook)
      : visibleResources.filter((resource) => (
        currentChapterVerseIds.some((verseId) => resourceMentionsVerse(resource, verseId))
      ))
  ), [currentChapterVerseIds, selectedIntroBook, visibleResources]);
  const hasAnyUnsyncInFlight = Boolean(activeUnsyncingResourceId || unsyncInFlightResourceIdRef.current);
  const filteredCurrentResources = useMemo(
    () => filterResourcesByCardQuery(currentResources, cardQuery),
    [cardQuery, currentResources],
  );
  const sourceIdForResource = (resource: StudyResource): ResourceSourceId => {
    if (selectedIntroBook && resource.bookIntro === selectedIntroBook && !firstValidResourceVerse(resource)) {
      return bookIntroSourceId(selectedIntroBook);
    }

    const inChapterVerse = resource.verses.find((verseId) => currentChapterVerseIds.includes(verseId));
    if (inChapterVerse) {
      return inChapterVerse;
    }

    const firstExplicitVerse = firstResourceVerse(resource);
    if (firstExplicitVerse) {
      return firstExplicitVerse;
    }

    return currentChapterVerseIds.find((verseId) => resourceMentionsVerse(resource, verseId))
      ?? (resource.bookIntro ? bookIntroSourceId(resource.bookIntro) : selectedSourceId);
  };
  const organizedCardScopeKey = organizedCardScopeFromSourceId(selectedSourceId);
  const centerCardResourceIdsForScope = layout.centerCardResourceIdsByBook[organizedCardScopeKey] ?? [];
  const centerCardResources = useMemo(() => (
    centerCardResourceIdsForScope
      .map((resourceId) => visibleResources.find((resource) => resource.id === resourceId))
      .filter((resource): resource is StudyResource => Boolean(resource))
  ), [centerCardResourceIdsForScope, visibleResources]);
  const cardSearchQuery = cardQuery.trim();
  const availableBooks = useMemo(() => {
    if (onRequestBook) return [...oldTestamentBooks, ...newTestamentBooks].map((book) => book.id);
    const loadedBooks = new Set(versions.flatMap((version) => version.verses.map((verse) => verse.book)));
    const canonicalBooks = [...oldTestamentBooks, ...newTestamentBooks]
      .map((book) => book.id)
      .filter((book) => loadedBooks.has(book));
    const extraBooks = Array.from(loadedBooks).filter((book) => !canonicalBooks.includes(book));
    return [...canonicalBooks, ...extraBooks];
  }, [onRequestBook, versions]);
  const availableChapters = useMemo(() => {
    const chapters = new Set<number>();
    versions.forEach((version) => {
      version.verses.forEach((verse) => {
        if (verse.book === currentBook) {
          chapters.add(verse.chapter);
        }
      });
    });
    return chapters;
  }, [currentBook, versions]);
  const currentChapterNumbers = useMemo(() => Array.from(availableChapters).sort((a, b) => a - b), [availableChapters]);
  const currentVerseResources = useMemo(() => (
    selectedIntroBook
      ? verseFirstBookIntroResources(visibleResources, selectedIntroBook)
      : resourcesForVerse(visibleResources, selectedVerseId)
  ), [selectedIntroBook, selectedVerseId, visibleResources]);
  const activeResource = activeResourceId ? visibleResources.find((resource) => resource.id === activeResourceId) ?? null : null;
  const pendingSearchQuery = query.trim();
  const searchQuery = submittedQuery.trim();
  const hasPendingSearchChange = Boolean(searchQuery && pendingSearchQuery && pendingSearchQuery !== searchQuery);
  const searchResponse = useMemo(() => searchResultsForDisplay(
    versions,
    wholeBibleSearchIndex,
    searchQuery,
    searchVersionFilter,
    searchScope,
    currentBook,
  ), [currentBook, searchQuery, searchScope, searchVersionFilter, versions, wholeBibleSearchIndex]);
  const searchResults = searchResponse.results;
  const shouldShowSearchPanel = isSearchPanelOpen && (pendingSearchQuery.length > 0 || searchQuery.length > 0);
  const searchStatusLabel = hasPendingSearchChange
    ? "点击搜索更新结果"
    : searchQuery
    ? `${searchResponse.totalCount} 处结果`
    : "输入关键词后搜索";
  const readerMinWidth = readerColumnMinWidth * 2;
  const leftDockWidth = dockVisibleWidth(layout, "left");
  const rightDockWidth = dockVisibleWidth(layout, "right");
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  );

  useEffect(() => {
    logWorkbenchInfo("[workbench] view ready", {
      resourceCount: resources.length,
      visibleVersionIds,
      centerModules: normalizeCenterModules(layoutRef.current.centerModules),
      activeCenterModules: normalizeActiveCenterModules(layoutRef.current.activeCenterModules),
    });
  }, []);

  useEffect(() => {
    const previous = initialNavigationRef.current;
    if (previous.verseId === initialVerseId && previous.introBook === initialIntroBook) return;
    initialNavigationRef.current = { introBook: initialIntroBook, verseId: initialVerseId };
    setSelectedVerseId(initialVerseId);
    setSelectedIntroBook(initialIntroBook);
    setStatus(initialIntroBook ? `已选择 ${bookTitle(initialIntroBook)}序` : `已选择 ${initialVerseId}`);
    logWorkbenchInfo("[workbench] external reader location applied", {
      selectedVerseId: initialVerseId,
      selectedIntroBook: initialIntroBook,
    });
  }, [initialIntroBook, initialVerseId]);

  useEffect(() => {
    if (!activeBookId) return;
    const pendingResult = pendingSearchResultRef.current;
    const requestedBook = pendingBookRef.current;
    if (pendingResult?.book === activeBookId) {
      const hasVerse = versions.some((version) => version.verses.some((verse) => verse.id === pendingResult.verseId));
      if (hasVerse) {
        setSelectedVerseId(pendingResult.verseId);
        setSelectedIntroBook(null);
        setStatus(`已选择 ${pendingResult.verseId}`);
      }
      pendingSearchResultRef.current = null;
      pendingBookRef.current = null;
      return;
    }
    if (requestedBook === activeBookId || currentVerse.book !== activeBookId) {
      const firstVerse = versions
        .flatMap((version) => version.verses)
        .filter((verse) => verse.book === activeBookId)
        .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse)[0];
      if (firstVerse) {
        setSelectedVerseId(firstVerse.id);
        setSelectedIntroBook(null);
        setStatus(`已选择 ${firstVerse.id}`);
      }
      pendingBookRef.current = null;
    }
  }, [activeBookId, currentVerse.book, versions]);

  useEffect(() => {
    logWorkbenchInfo("[workbench] selected verse changed", {
      selectedVerseId,
      selectedIntroBook,
      selectedSourceId,
      currentBook,
      organizedCardScopeKey,
      resourceIds: currentResources.map((resource) => resource.id),
      currentVerseResourceIds: currentVerseResources.map((resource) => resource.id),
      organizedCardResourceIds: centerCardResourceIdsForScope,
    });
  }, [centerCardResourceIdsForScope, currentBook, currentResources, currentVerseResources, organizedCardScopeKey, selectedIntroBook, selectedSourceId, selectedVerseId]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    const currentLayout = layoutRef.current;
    const rescopedCenterCards = migrateCenterCardScopes(currentLayout.centerCardResourceIdsByBook, visibleResources);
    if (JSON.stringify(rescopedCenterCards) === JSON.stringify(currentLayout.centerCardResourceIdsByBook)) return;

    changeLayout({
      ...currentLayout,
      centerCardResourceIds: rescopedCenterCards[organizedCardScopeKey] ?? [],
      centerCardResourceIdsByBook: rescopedCenterCards,
    }, "rescope_center_cards_after_refresh");
    logWorkbenchInfo("[workbench] organized resource scopes recalculated after refresh", {
      centerCardResourceIdsByBook: rescopedCenterCards,
    });
  }, [organizedCardScopeKey, visibleResources]);

  useEffect(() => {
    const { layout: prunedLayout, removedResourceIds } = pruneCenterCardsByAvailableResources(
      layoutRef.current,
      visibleResources,
    );
    if (removedResourceIds.length === 0) return;

    changeLayout(prunedLayout, "prune_stale_resource_refs_after_refresh");
    setCollapsedCenterCardIds((currentIds) => {
      const nextIds = new Set(currentIds);
      removedResourceIds.forEach((resourceId) => nextIds.delete(resourceId));
      return nextIds;
    });
    setStatus(`已移除 ${removedResourceIds.length} 张刷新后不存在的整理卡片`);
    logWorkbenchInfo("[workbench] stale organized resource references pruned after refresh", {
      removedResourceIds,
    });
  }, [visibleResources]);

  useEffect(() => {
    const visibleResourceIds = new Set(visibleResources.map((resource) => resource.id));
    const nextEdits = Object.fromEntries(
      Object.entries(resourceEdits).filter(([resourceId]) => visibleResourceIds.has(resourceId)),
    );
    const removedResourceIds = Object.keys(resourceEdits).filter((resourceId) => !visibleResourceIds.has(resourceId));
    if (removedResourceIds.length === 0) return;

    const persisted = persistResourceEditsToStorage(nextEdits);
    setResourceEdits(nextEdits);
    setStatus(`已清理 ${removedResourceIds.length} 条刷新后不存在的本地卡片编辑${localPersistenceSuffix(persisted)}`);
    logWorkbenchInfo("[workbench] stale resource edit drafts pruned after refresh", {
      removedResourceIds,
    });
  }, [resources]);

  useEffect(() => {
    if (deletedResourceIds.size === 0) return;

    const availableResourceIds = new Set(resources.map((resource) => resource.id));
    const staleDeletedResourceIds = Array.from(deletedResourceIds).filter((resourceId) => !availableResourceIds.has(resourceId));
    if (staleDeletedResourceIds.length === 0) return;

    const nextDeletedResourceIds = new Set(
      Array.from(deletedResourceIds).filter((resourceId) => availableResourceIds.has(resourceId)),
    );
    const persisted = persistDeletedResourceIdsToStorage(nextDeletedResourceIds);
    setDeletedResourceIds(nextDeletedResourceIds);
    logWorkbenchInfo("[workbench] stale deleted resource ids pruned after refresh", {
      removedResourceIds: staleDeletedResourceIds,
      persisted,
    });
  }, [deletedResourceIds, resources]);

  useEffect(() => {
    if (typeof HTMLElement === "undefined" || !("scrollIntoView" in HTMLElement.prototype)) return;
    if (selectedIntroBook) return;

    visibleVersionIds.forEach((versionId) => {
      const verseButton = verseButtonRefs.current.get(`${versionId}:${selectedVerseId}`);
      verseButton?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    });
    logWorkbenchInfo("[workbench] visible Bible modules synchronized to selected verse", {
      selectedVerseId,
      visibleVersionIds,
    });
  }, [selectedIntroBook, selectedVerseId, visibleVersionIds.join("|")]);

  useEffect(() => {
    if (!openNavigationPanel) return;

    function closeNavigationPanelOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (navigationPickerRef.current?.contains(target)) return;

      setOpenNavigationPanel(null);
      logWorkbenchInfo("[workbench] navigation panel closed", {
        panel: openNavigationPanel,
        reason: "outside_pointer_down",
      });
    }

    document.addEventListener("pointerdown", closeNavigationPanelOnOutsidePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", closeNavigationPanelOnOutsidePointerDown, true);
    };
  }, [openNavigationPanel]);

  useEffect(() => {
    const normalizedQuery = normalizedCardSearchQuery(cardQuery);
    if (!normalizedQuery) return;

    logCardSearchInteraction("updated", {
      query: normalizedQuery,
      total: filteredCurrentResources.length,
      currentBook,
      selectedSourceId,
    });
    setStatus(`卡片搜索：${filteredCurrentResources.length} 张匹配 ${cardQuery.trim()}`);
  }, [cardQuery, currentBook, filteredCurrentResources.length, selectedSourceId]);

  function selectVerse(verseId: VerseId) {
    setSelectedIntroBook(null);
    setSelectedVerseId(verseId);
    setStatus(`已选择 ${verseId}`);
  }

  function firstVerseInChapter(book: string, chapter: number) {
    const firstMatch = versions
      .flatMap((version) => version.verses)
      .filter((verse) => verse.book === book && verse.chapter === chapter)
      .sort((a, b) => a.verse - b.verse)[0];
    return firstMatch?.id ?? null;
  }

  function firstVerseInBook(book: string) {
    const firstMatch = versions
      .flatMap((version) => version.verses)
      .filter((verse) => verse.book === book)
      .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse)[0];
    return firstMatch?.id ?? null;
  }

  function openNavigation(kind: "book" | "chapter") {
    setOpenNavigationPanel(kind);
    setStatus(kind === "book" ? "书卷选择已打开" : "章节选择已打开");
    logWorkbenchInfo("[workbench] navigation panel opened", {
      panel: kind,
      selectedVerseId,
      currentBook,
      currentChapter,
    });
  }

  async function selectBook(book: string) {
    pendingSearchResultRef.current = null;
    if (onRequestBook && book !== resolvedActiveBookId) {
      pendingBookRef.current = book;
      setOpenNavigationPanel(null);
      setStatus(`正在加载 ${bookTitle(book)}`);
      logWorkbenchInfo("[workbench] navigation book requested", { book, activeBookId: resolvedActiveBookId });
      await onRequestBook(book);
      return;
    }
    const nextVerseId = firstVerseInChapter(book, currentChapter) ?? firstVerseInBook(book);
    const hasBookIntroResources = verseFirstBookIntroResources(visibleResources, book).length > 0;
    if (nextVerseId) {
      setSelectedVerseId(nextVerseId);
      setSelectedIntroBook(hasBookIntroResources ? book : null);
      setStatus(hasBookIntroResources ? `已选择 ${bookTitle(book)}序` : `已选择 ${nextVerseId}`);
    }
    setOpenNavigationPanel(null);
    logWorkbenchInfo("[workbench] navigation book selected", {
      book,
      selectedVerseId: nextVerseId ?? selectedVerseId,
      selectedIntroBook: hasBookIntroResources ? book : null,
    });
  }

  function selectBookIntro(book: string) {
    const nextVerseId = currentVerse.book === book ? selectedVerseId : firstVerseInBook(book);
    if (nextVerseId) {
      setSelectedVerseId(nextVerseId);
    }
    setSelectedIntroBook(book);
    setOpenNavigationPanel(null);
    setStatus(`已选择 ${bookTitle(book)}序`);
    logWorkbenchInfo("[workbench] navigation book intro selected", {
      book,
      selectedVerseId: nextVerseId ?? selectedVerseId,
      selectedSourceId: bookIntroSourceId(book),
      resourceIds: verseFirstBookIntroResources(visibleResources, book).map((resource) => resource.id),
    });
  }

  function selectChapter(chapter: number) {
    const nextVerseId = firstVerseInChapter(currentBook, chapter);
    if (!nextVerseId) return;
    selectVerse(nextVerseId);
    setOpenNavigationPanel(null);
    logWorkbenchInfo("[workbench] navigation chapter selected", {
      book: currentBook,
      requestedChapter: chapter,
      selectedVerseId: nextVerseId,
    });
  }

  function runSearch(nextQuery = query) {
    const normalizedQuery = nextQuery.trim();
    if (!normalizedQuery) {
      setSubmittedQuery("");
      setIsSearchPanelOpen(false);
      logSearchInteraction("cleared_empty_submit", {
        queryLength: 0,
        versionFilter: searchVersionFilter,
        scope: searchScope,
      });
      return;
    }

    const startedAt = performance.now();
    const nextSearchResponse = searchResultsForDisplay(
      versions,
      wholeBibleSearchIndex,
      normalizedQuery,
      searchVersionFilter,
      searchScope,
      currentBook,
    );
    setSubmittedQuery(normalizedQuery);
    setIsSearchPanelOpen(true);
    setStatus(`搜索到 ${nextSearchResponse.totalCount} 处经文`);
    logSearchInteraction("submitted", {
      queryLength: normalizedQuery.length,
      resultCount: nextSearchResponse.totalCount,
      durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
      versionFilter: searchVersionFilter,
      scope: searchScope,
      currentBook,
    });
  }

  function clearSearch() {
    const previousQueryLength = query.trim().length;
    setQuery("");
    setSubmittedQuery("");
    setIsSearchPanelOpen(false);
    setStatus("搜索已清除");
    logSearchInteraction("cleared", {
      queryLength: previousQueryLength,
      resultCount: 0,
      versionFilter: searchVersionFilter,
      scope: searchScope,
    });
  }

  function updateCardSearchQuery(value: string) {
    setCardQuery(value);
  }

  function clearCardSearch() {
    const previousQuery = cardQuery.trim();
    setCardQuery("");
    setStatus("卡片搜索已清除");
    logCardSearchInteraction("cleared", {
      query: previousQuery,
      total: currentResources.length,
      currentBook,
      selectedSourceId,
    });
  }

  function updateSearchQuery(value: string) {
    setQuery(value);
    setIsSearchPanelOpen(true);
    if (!value.trim()) {
      setSubmittedQuery("");
    }
  }

  function updateSearchVersionFilter(nextFilter: SearchVersionFilter) {
    setSearchVersionFilter(nextFilter);
    setIsSearchPanelOpen(true);
    const nextSearchResponse = searchResultsForDisplay(
      versions,
      wholeBibleSearchIndex,
      searchQuery,
      nextFilter,
      searchScope,
      currentBook,
    );
    logSearchInteraction("version_filter_changed", {
      queryLength: searchQuery.length || query.trim().length,
      resultCount: nextSearchResponse.totalCount,
      versionFilter: nextFilter,
      scope: searchScope,
    });
  }

  function updateSearchScope(nextScope: SearchScope) {
    setSearchScope(nextScope);
    setIsSearchPanelOpen(true);
    const nextSearchResponse = searchResultsForDisplay(
      versions,
      wholeBibleSearchIndex,
      searchQuery,
      searchVersionFilter,
      nextScope,
      currentBook,
    );
    logSearchInteraction("scope_changed", {
      queryLength: searchQuery.length || query.trim().length,
      resultCount: nextSearchResponse.totalCount,
      versionFilter: searchVersionFilter,
      scope: nextScope,
      currentBook,
    });
  }

  function handleSearchInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
      return;
    }

    if (event.key === "Escape") {
      setIsSearchPanelOpen(false);
    }
  }

  async function selectSearchResult(result: WorkbenchSearchResult, queryText: string) {
    if (result.book !== resolvedActiveBookId && onRequestBook) {
      pendingBookRef.current = result.book;
      pendingSearchResultRef.current = result;
      await onRequestBook(result.book);
      await onRequestSearchResult?.(result);
    } else {
      selectVerse(result.verseId);
      await onRequestSearchResult?.(result);
    }
    if (isCenterModuleId(result.versionId) && result.versionId !== "card") {
      const nextLayout = openCenterModuleInLayout(layoutRef.current, result.versionId);
      changeLayout(nextLayout, `open_center_module_from_search_${result.versionId}`);
    }
    setQuery("");
    setSubmittedQuery("");
    setIsSearchPanelOpen(false);
    logSearchInteraction("result_selected", {
      queryLength: queryText.trim().length,
      verseId: result.verseId,
      versionId: result.versionId,
    });
  }

  function changeLayout(nextLayout: WorkbenchLayout, reason = "layout_changed") {
    setLayout(nextLayout);
    layoutRef.current = nextLayout;
    const persisted = persistLayoutToStorage(nextLayout);
    logWorkbenchInfo("[workbench] layout changed", {
      reason,
      persisted,
      showCuv: nextLayout.showCuv,
      showKjv: nextLayout.showKjv,
      readerSplitPercent: nextLayout.readerSplitPercent,
      cardBrowserSplitPercent: nextLayout.cardBrowserSplitPercent,
      centerModules: nextLayout.centerModules,
      activeCenterModules: nextLayout.activeCenterModules,
      activeResourceId: nextLayout.activeResourceId,
      centerCardResourceIds: nextLayout.centerCardResourceIds,
      centerCardResourceIdsByBook: nextLayout.centerCardResourceIdsByBook,
      modules: nextLayout.modules.map((module) => `${module.id}:${module.side}:${module.visible ? "on" : "off"}`),
      savedCardsByBook: Object.fromEntries(
        Object.entries(nextLayout.savedCardsByBook).map(([book, refs]) => [book, refs.map((ref) => ref.resourceId)]),
      ),
      savedCardsByVerse: Object.fromEntries(
        Object.entries(nextLayout.savedCardsByVerse).map(([verseId, refs]) => [verseId, refs.map((ref) => ref.resourceId)]),
      ),
    });
    return { persisted };
  }

  function editResourceCopy(resourceId: string, draft: { body: string; title: string }): ResourceEditResult {
    const baseResource = resources.find((resource) => resource.id === resourceId);
    const baseEditableBody = baseResource ? editableResourceBody(baseResource) : "";
    const bodyChanged = !baseResource || draft.body !== baseEditableBody;
    const titleChanged = !baseResource || draft.title !== baseResource.title;
    const nextDraft: ResourceEditDrafts[string] = {};
    if (titleChanged) {
      nextDraft.title = draft.title;
    }
    if (bodyChanged) {
      nextDraft.body = draft.body;
      if (baseResource?.type === "image") {
        nextDraft.summary = draft.body;
      }
    }
    const nextEdits = {
      ...resourceEdits,
    };
    if (baseResource && !bodyChanged && !titleChanged) {
      delete nextEdits[resourceId];
    } else {
      nextEdits[resourceId] = nextDraft;
    }

    const persisted = persistResourceEditsToStorage(nextEdits);

    setResourceEdits(nextEdits);
    logWorkbenchInfo("[workbench] resource card text edited", {
      resourceId,
      title: draft.title,
      bodyLength: draft.body.length,
      persisted,
    });
    return { persisted };
  }

  async function updateWorkbenchResourceCopy(resourceId: string, draft: { body: string; title: string }) {
    if (!onUpdateWorkbenchResource || updateInFlightResourceIdRef.current) return;
    const resource = visibleResources.find((item) => item.id === resourceId);
    updateInFlightResourceIdRef.current = resourceId;
    setUpdateInFlightResourceId(resourceId);
    setStatus(`正在同步卡片修改：${resource?.title ?? resourceId}`);
    logWorkbenchInfo("[workbench] resource card edit sync requested", {
      bodyLength: draft.body.length,
      resourceId,
      externalResourceId: resource?.debugMeta?.externalResourceId,
      title: draft.title,
    });

    try {
      await onUpdateWorkbenchResource(resourceId, draft);
      setStatus(`已同步卡片修改：${draft.title}`);
      logWorkbenchInfo("[workbench] resource card edit sync succeeded", {
        resourceId,
        title: draft.title,
        externalResourceId: resource?.debugMeta?.externalResourceId,
      });
    } catch (error) {
      setStatus(`卡片修改同步失败：${resource?.title ?? resourceId}`);
      console.error("[workbench] resource card edit sync failed", {
        resourceId,
        title: resource?.title,
        externalResourceId: resource?.debugMeta?.externalResourceId,
        error,
      });
      throw error;
    } finally {
      updateInFlightResourceIdRef.current = null;
      setUpdateInFlightResourceId(null);
    }
  }

  function toggleDock(side: DockSide) {
    const key = side === "left" ? "leftCollapsed" : "rightCollapsed";
    const nextLayout = {
      ...layout,
      [key]: !layout[key],
    };
    changeLayout(nextLayout, side === "left" ? "toggle_left_dock" : "toggle_right_dock");
    setStatus(nextLayout[key] ? `${side === "left" ? "左侧" : "右侧"}已收起` : `${side === "left" ? "左侧" : "右侧"}已展开`);
  }

  function saveLayout() {
    const currentLayout = layoutRef.current;
    const persisted = persistLayoutToStorage(currentLayout);
    onSaveLayout?.(currentLayout);
    logWorkbenchInfo("[workbench] layout saved", { ...currentLayout, persisted });
    setStatus(`布局已保存${localPersistenceSuffix(persisted)}`);
  }

  function resetLayout() {
    changeLayout(defaultWorkbenchLayout, "layout_reset");
    setStatus("布局已重置");
  }

  async function refreshResources() {
    if (!onRefreshResources || isRefreshingResources || refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setRefreshStatus("idle");
    setStatus("正在刷新卡片资源...");
    logWorkbenchInfo("[workbench] synced resources refresh requested", {
      resourceCount: resources.length,
      selectedIntroBook,
      selectedVerseId,
    });

    try {
      await onRefreshResources();
      setRefreshStatus("success");
      setStatus("卡片资源已刷新");
    } catch (error) {
      console.error("[workbench] synced resources refresh failed", error);
      setRefreshStatus("error");
      setStatus("卡片资源刷新失败");
    } finally {
      refreshInFlightRef.current = false;
    }
  }

  async function unsyncResource(resourceId: string) {
    if (!onUnsyncResource || unsyncInFlightResourceIdRef.current) return;
    const resource = visibleResources.find((item) => item.id === resourceId);
    unsyncInFlightResourceIdRef.current = resourceId;
    setLocallyUnsyncingResourceId(resourceId);
    setUnsyncFailedResourceId(null);
    setStatus(`正在删除并退回未同步：${resource?.title ?? resourceId}`);
    logWorkbenchInfo("[workbench] resource unsync requested", {
      resourceId,
      title: resource?.title,
      externalResourceId: resource?.debugMeta?.externalResourceId,
    });

    try {
      await onUnsyncResource(resourceId);
      setStatus(`已删除并退回未同步：${resource?.title ?? resourceId}`);
      logWorkbenchInfo("[workbench] resource unsync succeeded", {
        resourceId,
        title: resource?.title,
        externalResourceId: resource?.debugMeta?.externalResourceId,
      });
    } catch (error) {
      setUnsyncFailedResourceId(resourceId);
      setStatus(`删除并退回未同步失败：${resource?.title ?? resourceId}`);
      console.error("[workbench] resource unsync failed", {
        resourceId,
        title: resource?.title,
        externalResourceId: resource?.debugMeta?.externalResourceId,
        error,
      });
    } finally {
      unsyncInFlightResourceIdRef.current = null;
      setLocallyUnsyncingResourceId(null);
    }
  }

  function deleteCurrentResourceCard(resourceId: string) {
    const resource = visibleResources.find((item) => item.id === resourceId);
    if (resource?.debugMeta?.externalResourceId && onUnsyncResource) {
      void unsyncResource(resourceId);
      return;
    }

    if (deletedResourceIds.has(resourceId)) return;

    const nextDeletedResourceIds = new Set(deletedResourceIds);
    nextDeletedResourceIds.add(resourceId);
    const persisted = persistDeletedResourceIdsToStorage(nextDeletedResourceIds);
    setDeletedResourceIds(nextDeletedResourceIds);
    setCollapsedCenterCardIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(resourceId);
      return nextIds;
    });
    setStatus(`已删除当前经文卡片：${resource?.title ?? resourceId}${localPersistenceSuffix(persisted)}`);
    logWorkbenchInfo("[workbench] current resource card locally deleted", {
      resourceId,
      title: resource?.title,
      type: resource?.type,
      selectedSourceId,
      persisted,
    });
  }

  function openCenterModule(moduleId: CenterModuleId) {
    const nextLayout = toggleCenterModuleInLayout(layout, moduleId);
    const isOpen = nextLayout.activeCenterModules.includes(moduleId);
    const result = changeLayout(nextLayout, isOpen ? `open_center_module_${moduleId}` : `close_center_module_${moduleId}`);
    setStatus(
      `${isOpen ? `已显示${centerModuleLabel(moduleId)}模块` : `已关闭${centerModuleLabel(moduleId)}模块`}${localPersistenceSuffix(result.persisted)}`,
    );
  }

  function openResourceInCenter(resourceId: string, targetScope = organizedCardScopeKey) {
    const resource = visibleResources.find((item) => item.id === resourceId);
    const currentScopeResourceIds = layout.centerCardResourceIdsByBook[targetScope] ?? [];
    const nextCenterCardResourceIds = [
      ...currentScopeResourceIds.filter((currentResourceId) => currentResourceId !== resourceId),
      resourceId,
    ];
    const nextLayout = {
      ...layout,
      leftCollapsed: false,
      activeResourceId: resourceId,
      centerCardResourceIds: nextCenterCardResourceIds,
      centerCardResourceIdsByBook: {
        ...layout.centerCardResourceIdsByBook,
        [targetScope]: nextCenterCardResourceIds,
      },
    };
    setCollapsedCenterCardIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(resourceId);
      return nextIds;
    });
    changeLayout(nextLayout, "add_resource_card_to_left_stack");
    setStatus(`已加入左侧整理：${resource?.title ?? "卡片"}`);
    logWorkbenchInfo("[workbench] resource card added to left organized stack", {
      resourceId,
      title: resource?.title,
      type: resource?.type,
      scope: targetScope,
      activeCenterModules: nextLayout.activeCenterModules,
      centerCardResourceIds: nextCenterCardResourceIds,
    });
  }

  function toggleCenterResourceCard(resourceId: string) {
    const resource = visibleResources.find((item) => item.id === resourceId);
    setCollapsedCenterCardIds((currentIds) => {
      const nextIds = new Set(currentIds);
      const nextCollapsed = !nextIds.has(resourceId);
      if (nextCollapsed) {
        nextIds.add(resourceId);
      } else {
        nextIds.delete(resourceId);
      }
      logWorkbenchInfo("[workbench] left organized resource card expanded state changed", {
        resourceId,
        title: resource?.title,
        collapsed: nextCollapsed,
      });
      setStatus(nextCollapsed ? `已折叠 ${resource?.title ?? "卡片"}` : `已展开 ${resource?.title ?? "卡片"}`);
      return nextIds;
    });
  }

  function removeCenterResourceCard(resourceId: string) {
    const currentScopeResourceIds = layout.centerCardResourceIdsByBook[organizedCardScopeKey] ?? [];
    if (!currentScopeResourceIds.includes(resourceId)) return;

    const nextCenterCardResourceIds = currentScopeResourceIds.filter((currentResourceId) => currentResourceId !== resourceId);
    const nextActiveResourceId = nextCenterCardResourceIds.length > 0
      ? nextCenterCardResourceIds[nextCenterCardResourceIds.length - 1]
      : null;
    const nextLayout = {
      ...layout,
      activeResourceId: layout.activeResourceId === resourceId ? nextActiveResourceId : layout.activeResourceId,
      centerCardResourceIds: nextCenterCardResourceIds,
      centerCardResourceIdsByBook: {
        ...layout.centerCardResourceIdsByBook,
        [organizedCardScopeKey]: nextCenterCardResourceIds,
      },
    };
    const resource = visibleResources.find((item) => item.id === resourceId);
    setCollapsedCenterCardIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(resourceId);
      return nextIds;
    });
    changeLayout(nextLayout, "resource_card_removed_from_left_stack");
    setStatus(`已从左侧移除 ${resource?.title ?? "卡片"}`);
    logWorkbenchInfo("[workbench] resource card removed from left organized stack", {
      resourceId,
      title: resource?.title,
      scope: organizedCardScopeKey,
      centerCardResourceIds: nextCenterCardResourceIds,
    });
  }

  function navigateToResourceTarget(resource: StudyResource, sourceId?: ResourceSourceId) {
    const target = sourceId ?? baseResourceNavigationTarget(resource);
    if (!target) {
      setStatus(`这张卡片还没有关联经文：${resource.title}`);
      return;
    }

    if (isBookIntroSourceId(target)) {
      const book = bookFromSourceId(target);
      selectBookIntro(book);
      setStatus(`已跳转到 ${sourceIdLabel(target)}`);
      logWorkbenchInfo("[workbench] center resource card navigation selected", {
        resourceId: resource.id,
        title: resource.title,
        sourceId: target,
      });
      return;
    }

    selectVerse(target);
    setStatus(`已跳转到 ${target}`);
    logWorkbenchInfo("[workbench] center resource card navigation selected", {
      resourceId: resource.id,
      title: resource.title,
      sourceId: target,
    });
  }

  function openImagePreview(resource: StudyResource) {
    setPreviewImageResource(resource);
    setStatus(`已放大图片：${resource.title}`);
    logWorkbenchInfo("[workbench] image preview opened", {
      resourceId: resource.id,
      title: resource.title,
      assetPath: resource.assetPath,
    });
  }

  function closeImagePreview() {
    const resource = previewImageResource;
    setPreviewImageResource(null);
    setStatus("图片预览已关闭");
    logWorkbenchInfo("[workbench] image preview closed", {
      resourceId: resource?.id,
      title: resource?.title,
    });
  }

  function swapVisibleCenterModules() {
    if (visibleCenterModules.length !== 2) return;

    const [firstModule, secondModule] = visibleCenterModules;
    const centerModules = normalizeCenterModules(layout.centerModules);
    const firstIndex = centerModules.indexOf(firstModule);
    const secondIndex = centerModules.indexOf(secondModule);
    if (firstIndex < 0 || secondIndex < 0) return;

    const nextCenterModules = [...centerModules];
    nextCenterModules[firstIndex] = secondModule;
    nextCenterModules[secondIndex] = firstModule;
    const nextLayout = {
      ...layout,
      centerModules: nextCenterModules,
      activeCenterModules: normalizeActiveCenterModules(layout.activeCenterModules),
    };

    changeLayout(nextLayout, "swap_visible_center_modules");
    setStatus("中间模块顺序已交换");
    logWorkbenchInfo("[workbench] visible center modules swapped", {
      before: visibleCenterModules,
      after: visibleCenterModules.slice().reverse(),
      centerModules: nextCenterModules,
    });
  }

  function setVerseButtonRef(versionId: string, verseId: VerseId, element: HTMLButtonElement | null) {
    const key = `${versionId}:${verseId}`;
    if (element) {
      verseButtonRefs.current.set(key, element);
    } else {
      verseButtonRefs.current.delete(key);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const resourceId = resourceIdFromDragId(String(event.active.id));
    if (resourceId) {
      setActiveResourceId(resourceId);
      const resource = visibleResources.find((item) => item.id === resourceId);
      logWorkbenchInfo("[workbench] resource card drag started", {
        resourceId,
        title: resource?.title,
      });
      setStatus(`正在拖动 ${resource?.title ?? "资源卡片"}`);
      return;
    }

    const centerCardResourceId = resourceIdFromCenterCardDragId(String(event.active.id));
    if (centerCardResourceId) {
      const resource = visibleResources.find((item) => item.id === centerCardResourceId);
      setStatus(`正在调整 ${resource?.title ?? "左侧卡片"} 顺序`);
      logWorkbenchInfo("[workbench] left organized card reorder started", {
        resourceId: centerCardResourceId,
        title: resource?.title,
        scope: organizedCardScopeKey,
      });
      return;
    }

    const moduleId = centerModuleIdFromDragId(String(event.active.id));
    if (moduleId) {
      setStatus(`正在调整${centerModuleLabel(moduleId)}模块顺序`);
      logWorkbenchInfo("[workbench] center module drag started", {
        moduleId,
        centerModules: layoutRef.current.centerModules,
        activeCenterModules: normalizeActiveCenterModules(layoutRef.current.activeCenterModules),
      });
    }
  }

  function handleDragCancel(event: DragCancelEvent) {
    const resourceId = resourceIdFromDragId(String(event.active.id));
    if (resourceId) {
      setActiveResourceId(null);
      logWorkbenchInfo("[workbench] resource card drag cancelled", {
        resourceId,
      });
      setStatus("卡片拖动已取消");
      return;
    }

    const centerCardResourceId = resourceIdFromCenterCardDragId(String(event.active.id));
    if (centerCardResourceId) {
      logWorkbenchInfo("[workbench] left organized card reorder cancelled", {
        resourceId: centerCardResourceId,
      });
      setStatus("左侧整理卡片排序已取消");
      return;
    }

    const moduleId = centerModuleIdFromDragId(String(event.active.id));
    if (moduleId) {
      logWorkbenchInfo("[workbench] center module drag cancelled", {
        moduleId,
      });
      setStatus("模块拖动已取消");
      return;
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const resourceId = resourceIdFromDragId(String(event.active.id));
    if (resourceId) {
      setActiveResourceId(null);
      const sourceVerseId = event.active.data.current?.sourceVerseId as ResourceSourceId | undefined;
      const origin = event.active.data.current?.origin as ResourceCardOrigin | undefined;
      const overId = event.over?.id;
      const fallbackDropId = event.delta.x < -500
        ? "left-dock"
        : event.delta.x < -200
          ? "left-dock"
          : overId;
      const effectiveOverId = overId === "right-dock" ? fallbackDropId : overId;

      if ((origin === "left" || origin === "right" || origin === "center") && sourceVerseId && acceptsResourceCardDropTarget(effectiveOverId)) {
        openResourceInCenter(resourceId, organizedCardScopeFromSourceId(sourceVerseId));
        return;
      }

      logWorkbenchInfo("[workbench] resource card drag ended without save", {
        resourceId,
        origin,
        sourceVerseId,
        overId,
        effectiveOverId,
        delta: event.delta,
      });
      setStatus("卡片未打开");
      return;
    }

    const activeCenterCardResourceId = resourceIdFromCenterCardDragId(String(event.active.id));
    const explicitOverCenterCardResourceId = event.over ? resourceIdFromCenterCardDragId(String(event.over.id)) : null;
    const fallbackOverCenterCardResourceId = activeCenterCardResourceId
      ? inferCenterCardOverResourceId(layoutRef.current, organizedCardScopeKey, activeCenterCardResourceId, event.delta.y)
      : null;
    const overCenterCardResourceId = explicitOverCenterCardResourceId ?? fallbackOverCenterCardResourceId;
    if (activeCenterCardResourceId && overCenterCardResourceId) {
      const nextLayout = reorderCenterCardsByDrag(
        layoutRef.current,
        organizedCardScopeKey,
        activeCenterCardResourceId,
        overCenterCardResourceId,
      );
      if (nextLayout === layoutRef.current) {
        setStatus("左侧整理卡片顺序未变化");
        logWorkbenchInfo("[workbench] left organized card reorder unchanged", {
          activeResourceId: activeCenterCardResourceId,
          overResourceId: overCenterCardResourceId,
          explicitOverResourceId: explicitOverCenterCardResourceId,
          scope: organizedCardScopeKey,
        });
        return;
      }

      changeLayout(nextLayout, "drag_reorder_center_card");
      setStatus("左侧整理卡片顺序已更新");
      logWorkbenchInfo("[workbench] left organized card reordered by drag", {
        activeResourceId: activeCenterCardResourceId,
        overResourceId: overCenterCardResourceId,
        explicitOverResourceId: explicitOverCenterCardResourceId,
        scope: organizedCardScopeKey,
        centerCardResourceIds: nextLayout.centerCardResourceIdsByBook[organizedCardScopeKey] ?? [],
      });
      return;
    }

    const activeModuleId = centerModuleIdFromDragId(String(event.active.id));
    const overModuleId = event.over ? centerModuleIdFromDragId(String(event.over.id)) : null;
    if (activeModuleId && overModuleId) {
      const nextLayout = reorderCenterModulesByDrag(layoutRef.current, activeModuleId, overModuleId);
      changeLayout(nextLayout, "drag_reorder_center_module");
      setStatus("中间模块顺序已更新");
      logWorkbenchInfo("[workbench] center module reordered by drag", {
        activeModuleId,
        overModuleId,
        centerModules: nextLayout.centerModules,
        activeCenterModules: nextLayout.activeCenterModules,
      });
      return;
    }
  }

  function startDockResize(side: DockSide, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const session = {
      side,
      startLayout: layout,
      startX: event.clientX,
    };
    resizeSessionRef.current = session;
    setActiveResizeSide(side);
    document.body.style.userSelect = "none";
    setStatus(`正在调整${dockLabel(side)}资料栏宽度`);
    logWorkbenchInfo("[workbench] dock resize started", {
      side,
      width: dockVisibleWidth(layout, side),
    });

    const onPointerMove = (moveEvent: PointerEvent) => {
      const currentSession = resizeSessionRef.current;
      if (!currentSession) return;

      const deltaX = moveEvent.clientX - currentSession.startX;
      const nextLayout = resizeDock(currentSession.startLayout, currentSession.side, deltaX, readerMinWidth, window.innerWidth);
      changeLayout(nextLayout, currentSession.side === "left" ? "resize_left_dock" : "resize_right_dock");
    };

    const cleanup = () => {
      const finalLayout = layoutRef.current;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
      resizeSessionRef.current = null;
      setActiveResizeSide(null);
      document.body.style.userSelect = "";
      setStatus(`${dockLabel(side)}资料栏宽度已更新`);
      logWorkbenchInfo("[workbench] dock resize finished", {
        side,
        width: dockVisibleWidth(finalLayout, side),
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
  }

  function handleDockResizeKeyDown(side: DockSide, event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 40 : 20;
    const currentWidth = side === "left" ? layout.leftWidth : layout.rightWidth;
    const maxWidth = dockResizeMaxWidth(layout, side, readerMinWidth, window.innerWidth);
    let nextWidth = currentWidth;

    if (event.key === "ArrowLeft") {
      nextWidth = side === "left" ? currentWidth - step : currentWidth + step;
    } else if (event.key === "ArrowRight") {
      nextWidth = side === "left" ? currentWidth + step : currentWidth - step;
    } else if (event.key === "Home") {
      nextWidth = dockMinWidth;
    } else if (event.key === "End") {
      nextWidth = maxWidth;
    } else {
      return;
    }

    event.preventDefault();
    const clampedWidth = Math.min(maxWidth, Math.max(dockMinWidth, nextWidth));
    const nextLayout = side === "left"
      ? { ...layout, leftCollapsed: false, leftWidth: clampedWidth }
      : { ...layout, rightCollapsed: false, rightWidth: clampedWidth };

    changeLayout(nextLayout, side === "left" ? "keyboard_resize_left_dock" : "keyboard_resize_right_dock");
    setStatus(`${dockLabel(side)}资料栏宽度已更新`);
    logWorkbenchInfo("[workbench] dock resized by keyboard", {
      side,
      width: clampedWidth,
    });
  }

  function startCenterSplitResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || visibleCenterModules.length !== 2) return;

    event.preventDefault();
    event.stopPropagation();

    centerSplitResizeSessionRef.current = {
      startLayout: layout,
      startX: event.clientX,
    };
    document.body.style.userSelect = "none";
    setStatus("正在调整中间模块占比");
    logWorkbenchInfo("[workbench] center module split resize started", {
      readerSplitPercent: layout.readerSplitPercent,
      activeCenterModules,
    });

    const onPointerMove = (moveEvent: PointerEvent) => {
      const currentSession = centerSplitResizeSessionRef.current;
      if (!currentSession) return;

      const deltaX = moveEvent.clientX - currentSession.startX;
      const nextPercent = normalizeSplitPercent(currentSession.startLayout.readerSplitPercent + deltaX / 10, currentSession.startLayout.readerSplitPercent);
      changeLayout(
        {
          ...currentSession.startLayout,
          readerSplitPercent: nextPercent,
        },
        "resize_center_module_split",
      );
    };

    const cleanup = () => {
      const finalLayout = layoutRef.current;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
      centerSplitResizeSessionRef.current = null;
      document.body.style.userSelect = "";
      setStatus("中间模块占比已更新");
      logWorkbenchInfo("[workbench] center module split resize finished", {
        readerSplitPercent: finalLayout.readerSplitPercent,
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
  }

  function handleCenterSplitResizeKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (visibleCenterModules.length !== 2) return;

    const step = event.shiftKey ? 10 : 5;
    let nextPercent = layout.readerSplitPercent;

    if (event.key === "ArrowLeft") {
      nextPercent = layout.readerSplitPercent - step;
    } else if (event.key === "ArrowRight") {
      nextPercent = layout.readerSplitPercent + step;
    } else if (event.key === "Home") {
      nextPercent = splitMinPercent;
    } else if (event.key === "End") {
      nextPercent = splitMaxPercent;
    } else {
      return;
    }

    event.preventDefault();
    const normalizedPercent = normalizeSplitPercent(nextPercent, layout.readerSplitPercent);
    changeLayout({ ...layout, readerSplitPercent: normalizedPercent }, "keyboard_resize_center_module_split");
    setStatus("中间模块占比已更新");
    logWorkbenchInfo("[workbench] center module split resized by keyboard", {
      readerSplitPercent: normalizedPercent,
    });
  }

  function renderBibleColumn(version: BibleVersion) {
    const isKjv = version.id === "kjv";
    if (selectedIntroBook) {
      return (
        <section
          aria-label={isKjv ? "KJV阅读" : "和合本阅读"}
          className={`bible-column bible-column--intro ${isKjv ? "bible-column--kjv" : "bible-column--cuv"}`}
          data-module-id={version.id}
          data-testid="center-module"
          key={version.id}
        >
          <header className="bible-column__header">
            <span>{isKjv ? "English" : "中文"}</span>
            <h2>{version.label} / {isKjv ? englishBookTitle(selectedIntroBook) : bookTitle(selectedIntroBook)} 序</h2>
          </header>
          <div className="book-intro-panel" aria-label={`${isKjv ? englishBookTitle(selectedIntroBook) : bookTitle(selectedIntroBook)}序`}>
            <strong>{isKjv ? `${englishBookTitle(selectedIntroBook)} Introduction` : `${bookTitle(selectedIntroBook)}导论`}</strong>
          </div>
        </section>
      );
    }

    const chapterVerses = version.verses.filter((verse) => verse.book === currentBook && verse.chapter === currentChapter);
    return (
      <section
        aria-label={isKjv ? "KJV阅读" : "和合本阅读"}
        className={`bible-column ${isKjv ? "bible-column--kjv" : "bible-column--cuv"}`}
        data-module-id={version.id}
        data-testid="center-module"
        key={version.id}
      >
        <header className="bible-column__header">
          <span>{isKjv ? "English" : "中文"}</span>
          <h2>{version.label} / {isKjv ? englishBookTitle(currentBook) : bookTitle(currentBook)} {currentChapter}</h2>
        </header>
        <div className="verse-list">
          {chapterVerses.map((verse) => (
            <button
              ref={(element) => setVerseButtonRef(version.id, verse.id, element)}
              aria-label={`${verse.verse} ${verse.text}`}
              aria-current={verse.id === selectedVerseId ? "true" : undefined}
              className="verse-button"
              data-verse-id={verse.id}
              data-version-id={version.id}
              data-testid={`${version.id}-${verse.id}`}
              key={`${version.id}-${verse.id}`}
              onClick={() => selectVerse(verse.id)}
              type="button"
            >
              <strong className="verse-number">{verse.verse}</strong>
              <span className="verse-text">{verse.text}</span>
            </button>
          ))}
          {chapterVerses.length === 0 ? (
            <p className="reader-empty">当前章节没有 {version.label} 经文。</p>
          ) : null}
        </div>
      </section>
    );
  }

  function renderCenterCardBrowser() {
    return (
      <section
        aria-label="当前经文已有卡片"
        className="resource-detail resource-detail--current"
        data-module-id="card"
        data-testid="center-module"
        key="card"
      >
        <div className="center-card-browser" aria-label="当前经文卡片选择">
          <header className="center-card-browser__header">
            <span className="resource-card__type">{selectedIntroBook ? "当前序言" : "当前经文"}</span>
            <strong>{currentVerseResources.length}</strong>
          </header>
          <CurrentVerseCardList
            centerVariant
            onDeleteResource={deleteCurrentResourceCard}
            onEditResource={editResourceCopy}
            onNavigateToResource={navigateToResourceTarget}
            onOpenImageResource={openImagePreview}
            onOpenResource={openResourceInCenter}
            onUnsyncResource={unsyncResource}
            onUpdateWorkbenchResource={updateWorkbenchResourceCopy}
            onCopyStatus={setStatus}
            selectedSourceId={selectedSourceId}
            sourceIdForResource={sourceIdForResource}
            unsyncingResourceId={activeUnsyncingResourceId}
            unsyncFailedResourceId={unsyncFailedResourceId}
            hasAnyUnsyncInFlight={hasAnyUnsyncInFlight}
            updateInFlightResourceId={updateInFlightResourceId}
            verseResources={currentVerseResources}
          />
        </div>
      </section>
    );
  }

  function renderCenterModule(moduleId: CenterModuleId) {
    if (moduleId === "cuv" && cuv) return renderBibleColumn(cuv);
    if (moduleId === "kjv" && kjv) return renderBibleColumn(kjv);
    if (moduleId === "card") return renderCenterCardBrowser();

    return (
      <section
        aria-label={centerModuleRegionLabel(moduleId)}
        className="reader-empty reader-empty--module"
        data-module-id={moduleId}
        data-testid="center-module"
        key={moduleId}
      >
        {centerModuleLabel(moduleId)}暂不可用。
      </section>
    );
  }

  function renderNavigationPanel() {
    if (openNavigationPanel === "book") {
      const renderBookButton = (book: string) => (
        <button
          aria-current={currentBook === book ? "true" : undefined}
          className="book-picker__option"
          disabled={isBookLoading}
          key={book}
          type="button"
          onClick={() => void selectBook(book)}
        >
          {bookTitle(book)}
        </button>
      );
      const oldBooks = oldTestamentBooks.map((book) => book.id).filter((book) => availableBooks.includes(book));
      const newBooks = newTestamentBooks.map((book) => book.id).filter((book) => availableBooks.includes(book));
      const uncategorizedBooks = availableBooks.filter((book) => !oldBooks.includes(book) && !newBooks.includes(book));

      return (
        <div aria-label="书卷选择" className="scripture-picker navigation-panel navigation-panel--book" role="dialog">
          {oldBooks.length > 0 ? (
            <div className="book-picker book-picker__section">
              <span className="book-picker__label">旧约</span>
              <div className="book-picker__grid">
                {oldBooks.map(renderBookButton)}
              </div>
            </div>
          ) : null}
          {newBooks.length > 0 ? (
            <div className="book-picker book-picker__section">
              <span className="book-picker__label">新约</span>
              <div className="book-picker__grid">
                {newBooks.map(renderBookButton)}
              </div>
            </div>
          ) : null}
          {uncategorizedBooks.length > 0 ? (
            <div className="book-picker book-picker__section">
              <span className="book-picker__label">其他</span>
              <div className="book-picker__grid">
                {uncategorizedBooks.map(renderBookButton)}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    if (openNavigationPanel === "chapter") {
      return (
        <div aria-label="章节选择" className="scripture-picker navigation-panel navigation-panel--chapters" role="dialog">
          <div className="chapter-picker">
            <span className="chapter-picker__label">{bookTitle(currentBook)}章节</span>
            <div className="chapter-picker__grid">
              <button
                aria-current={selectedIntroBook === currentBook ? "true" : undefined}
                aria-label={`${bookTitle(currentBook)} 序`}
                className="chapter-picker__option"
                key="book-intro"
                title={`${bookTitle(currentBook)} 序`}
                type="button"
                onClick={() => selectBookIntro(currentBook)}
              >
                序
              </button>
              {currentChapterNumbers.map((chapter) => (
                <button
                  aria-current={!selectedIntroBook && chapter === currentChapter ? "true" : undefined}
                  aria-label={`第 ${chapter} 章`}
                  className="chapter-picker__option"
                  key={chapter}
                  title={`第 ${chapter} 章`}
                  type="button"
                  onClick={() => selectChapter(chapter)}
                >
                  {chapter}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  function renderSearchFilterButton(
    label: string,
    isActive: boolean,
    onClick: () => void,
    ariaLabel = label,
  ) {
    return (
      <button
        aria-label={ariaLabel}
        aria-pressed={isActive}
        className="bible-search__chip"
        type="button"
        onClick={onClick}
      >
        {label}
      </button>
    );
  }

  function renderSearchPanel() {
    if (!shouldShowSearchPanel) return null;

    return (
      <section
        aria-label="经文搜索结果"
        className="bible-search-panel"
        role="region"
        style={{
          left: `${leftDockWidth + dockResizeHandleWidth}px`,
          right: `${rightDockWidth + dockResizeHandleWidth}px`,
        }}
      >
        <header className="bible-search-panel__header">
          <div>
            <span>经文搜索</span>
            <strong>{searchStatusLabel}</strong>
          </div>
          <p>
            {normalizedSearchVersionLabel(searchVersionFilter)} / {normalizedSearchScopeLabel(searchScope, currentBook)}
          </p>
        </header>
        <div className="bible-search-panel__filters" aria-label="搜索筛选">
          <div className="bible-search-panel__filter-group" aria-label="译本">
            {renderSearchFilterButton("全部", searchVersionFilter === "all", () => updateSearchVersionFilter("all"), "全部译本")}
            {renderSearchFilterButton("和合本", searchVersionFilter === "cuv", () => updateSearchVersionFilter("cuv"), "搜索译本 和合本")}
            {renderSearchFilterButton("KJV", searchVersionFilter === "kjv", () => updateSearchVersionFilter("kjv"), "搜索译本 KJV")}
          </div>
          <div className="bible-search-panel__filter-group" aria-label="范围">
            {renderSearchFilterButton("整本", searchScope === "all", () => updateSearchScope("all"))}
            {renderSearchFilterButton("旧约", searchScope === "old", () => updateSearchScope("old"))}
            {renderSearchFilterButton("新约", searchScope === "new", () => updateSearchScope("new"))}
            {renderSearchFilterButton("当前书卷", searchScope === "currentBook", () => updateSearchScope("currentBook"))}
          </div>
        </div>
        <div className="bible-search-panel__results">
          {hasPendingSearchChange ? (
            <p className="bible-search-panel__empty">输入已改变，点击搜索更新结果。</p>
          ) : searchQuery ? (
            searchResponse.totalCount > 0 ? (
              <>
                {searchResults.map((result) => (
                  <button
                    aria-label={`${result.versionLabel} ${result.verseId} ${result.text}`}
                    className="bible-search-result"
                    key={`${result.versionId}-${result.verseId}`}
                    type="button"
                    onClick={() => void selectSearchResult(result, searchQuery)}
                  >
                    <span className="bible-search-result__meta">
                      {result.versionLabel} {result.verseId}
                      <span>{bookTitle(result.book)} {result.chapter}:{result.verse}</span>
                    </span>
                    <span className="bible-search-result__text">{highlightedSearchText(result)}</span>
                  </button>
                ))}
                {searchResponse.totalCount > searchResults.length ? (
                  <p className="bible-search-panel__empty">已显示前 {searchResults.length} 处结果。</p>
                ) : null}
              </>
            ) : (
              <p className="bible-search-panel__empty">没有经文结果。</p>
            )
          ) : (
            <p className="bible-search-panel__empty">输入关键词后点击搜索。</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <main className="workbench">
      <header className="toolbar">
        <div className="toolbar__brand" aria-label="One Holy Bible">
          <span className="toolbar__mark" aria-hidden="true">OHB</span>
          <span>One Holy Bible</span>
        </div>
        <div className="toolbar__group" aria-label="当前书卷章节" ref={navigationPickerRef}>
          <button
            aria-expanded={openNavigationPanel === "book"}
            aria-label={`选择书卷 ${bookTitle(currentBook)}`}
            className="toolbar-button toolbar-button--chapter"
            type="button"
            onClick={() => openNavigation("book")}
          >
            <BookOpen size={16} />
            {bookTitle(currentBook)}
          </button>
          <button
            aria-expanded={openNavigationPanel === "chapter"}
            aria-label={selectedIntroBook ? "选择章节 序" : `选择章节 第 ${currentChapter} 章`}
            className="toolbar-button toolbar-button--chapter"
            type="button"
            onClick={() => openNavigation("chapter")}
          >
            {selectedIntroBook ? "序" : `第 ${currentChapter} 章`}
          </button>
          {renderNavigationPanel()}
        </div>
        <div className="toolbar__group toolbar__group--modules" aria-label="中间模块">
          <DndContext
            collisionDetection={closestCenter}
            onDragCancel={handleDragCancel}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            sensors={sensors}
          >
            <SortableContext
              items={toolbarCenterModules.map(centerModuleDragId)}
              strategy={horizontalListSortingStrategy}
            >
              {toolbarCenterModules.map((moduleId) => (
                <CenterModuleButton
                  key={moduleId}
                  isActive={activeCenterModules.includes(moduleId)}
                  moduleId={moduleId}
                  onActivate={openCenterModule}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button
            aria-label="交换中间模块顺序"
            className="toolbar-button toolbar-button--icon toolbar-button--swap"
            disabled={visibleCenterModules.length !== 2}
            title="交换中间模块顺序"
            type="button"
            onClick={swapVisibleCenterModules}
          >
            <ArrowLeftRight size={15} />
          </button>
        </div>
        <div className="card-search" role="search" aria-label="卡片搜索">
          <Search size={15} />
          <input
            aria-label="搜索卡片资源"
            placeholder="搜索卡片"
            type="search"
            value={cardQuery}
            onChange={(event) => updateCardSearchQuery(event.target.value)}
          />
          {cardQuery.trim() ? (
            <button
              aria-label="清除卡片搜索"
              className="card-search__clear"
              title="清除卡片搜索"
              type="button"
              onClick={clearCardSearch}
            >
              <X size={13} />
            </button>
          ) : null}
          <span aria-live="polite" className="card-search__status">
            {cardSearchQuery ? `${filteredCurrentResources.length} 张` : "全部"}
          </span>
        </div>
        <div className="bible-search" role="search" aria-label="经文搜索">
          <Search size={16} />
          <input
            aria-label="搜索经文"
            placeholder="搜索经文"
            type="search"
            value={query}
            onChange={(event) => updateSearchQuery(event.target.value)}
            onFocus={() => setIsSearchPanelOpen(true)}
            onKeyDown={handleSearchInputKeyDown}
          />
          {query.trim() ? (
            <button
              aria-label="清除搜索"
              className="bible-search__clear"
              title="清除搜索"
              type="button"
              onClick={clearSearch}
            >
              <X size={14} />
            </button>
          ) : null}
          <button
            className="bible-search__submit"
            type="button"
            onClick={() => runSearch()}
          >
            搜索
          </button>
        </div>
        <div className="toolbar__group toolbar__group--layout" aria-label="布局操作" role="group">
	          {onRefreshResources ? (
	            <>
	              <button
	                aria-label={isRefreshingResources ? "正在刷新卡片" : "刷新卡片"}
	                className="toolbar-button"
	                disabled={isRefreshingResources}
	                title="重新读取工作台已同步卡片"
	                type="button"
	                onClick={refreshResources}
	              >
	                <RefreshCcw size={16} />
	                {isRefreshingResources ? "刷新中" : "刷新卡片"}
	              </button>
	              {refreshStatus !== "idle" ? (
	                <span
	                  className={`toolbar-refresh-status toolbar-refresh-status--${refreshStatus}`}
	                  role={refreshStatus === "error" ? "alert" : undefined}
	                >
	                  {refreshStatus === "success" ? "已刷新" : "刷新失败"}
	                </span>
	              ) : null}
	            </>
	          ) : null}
          <button className="toolbar-button toolbar-button--primary" type="button" onClick={saveLayout}>
            <Save size={16} />
            保存布局
          </button>
          <button className="toolbar-button" type="button" onClick={resetLayout}>
            <RotateCcw size={16} />
            重置
          </button>
        </div>
      </header>
      {renderSearchPanel()}

      <DndContext
        collisionDetection={workbenchCollisionDetection}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div
          className="workbench-grid"
          style={{
            gridTemplateColumns: `${leftDockWidth}px ${dockResizeHandleWidth}px minmax(${readerMinWidth}px, 1fr) ${dockResizeHandleWidth}px ${rightDockWidth}px`,
          }}
        >
          <ResourceDock
            collapsedOrganizedResourceIds={collapsedCenterCardIds}
            layout={layout}
            onCopyStatus={setStatus}
            onEditResource={editResourceCopy}
            onNavigateToResource={navigateToResourceTarget}
            onOpenImageResource={openImagePreview}
            onOpenResource={openResourceInCenter}
            onUnsyncResource={unsyncResource}
            onUpdateWorkbenchResource={updateWorkbenchResourceCopy}
            onRemoveOrganizedResource={removeCenterResourceCard}
            onToggleDock={toggleDock}
            onToggleOrganizedResource={toggleCenterResourceCard}
            organizedResources={centerCardResources}
            rightResources={filteredCurrentResources}
            selectedSourceId={selectedSourceId}
            sourceIdForResource={sourceIdForResource}
            side="left"
            unsyncingResourceId={activeUnsyncingResourceId}
            unsyncFailedResourceId={unsyncFailedResourceId}
            hasAnyUnsyncInFlight={hasAnyUnsyncInFlight}
            updateInFlightResourceId={updateInFlightResourceId}
          />
          <div
            aria-label="调整左侧资料栏宽度"
            aria-orientation="vertical"
            aria-valuemax={dockResizeMaxWidth(layout, "left", readerMinWidth, window.innerWidth)}
            aria-valuemin={dockMinWidth}
            aria-valuenow={leftDockWidth}
            className={`workbench-resize-handle workbench-resize-handle--left ${activeResizeSide === "left" ? "is-active" : ""}`}
            role="separator"
            tabIndex={0}
            title="调整左侧资料栏宽度"
            onKeyDown={(event) => handleDockResizeKeyDown("left", event)}
            onPointerDown={(event) => startDockResize("left", event)}
          />
          <section className="reader-pane" aria-label="双译本阅读区">
            <header className="reader-pane__masthead">
              <div>
                <span className="reader-pane__eyebrow">{currentEnglishBookTitle} study desk</span>
                <h1>{currentChapterLabel}</h1>
              </div>
              <div className="reader-pane__selection">
                <span>{selectedIntroBook ? "当前位置" : "当前经节"}</span>
                <strong>{selectedIntroBook ? `${bookTitle(selectedIntroBook)}序` : selectedVerseId}</strong>
              </div>
            </header>
            <div
              aria-label="中间工作区"
              className={`reader-columns center-workspace center-workspace--${visibleCenterModules.length}`}
              role="region"
              style={visibleCenterModules.length === 2
                ? {
                    "--center-split-percent": `${layout.readerSplitPercent}%`,
                    gridTemplateColumns: `${layout.readerSplitPercent}% minmax(0, 1fr)`,
                  } as CSSProperties
                : undefined}
            >
              {visibleCenterModules.length === 0 ? (
                <div aria-label="未开启中间模块" className="center-workspace__empty" />
              ) : visibleCenterModules.length === 2 ? (
                <>
                  {renderCenterModule(visibleCenterModules[0])}
                  {renderCenterModule(visibleCenterModules[1])}
                  <div
                    aria-label="调整中间模块占比"
                    aria-orientation="vertical"
                    aria-valuemax={splitMaxPercent}
                    aria-valuemin={splitMinPercent}
                    aria-valuenow={layout.readerSplitPercent}
                    className="center-workspace-resize-handle center-workspace-resize-handle--overlay"
                    role="separator"
                    tabIndex={0}
                    title="调整中间模块占比"
                    onKeyDown={handleCenterSplitResizeKeyDown}
                    onPointerDown={startCenterSplitResize}
                  />
                </>
              ) : (
                visibleCenterModules.map((moduleId) => renderCenterModule(moduleId))
              )}
            </div>
            {!cuv && !kjv ? <p className="reader-empty">没有可显示的圣经版本。</p> : null}
          </section>
          <div
            aria-label="调整右侧资料栏宽度"
            aria-orientation="vertical"
            aria-valuemax={dockResizeMaxWidth(layout, "right", readerMinWidth, window.innerWidth)}
            aria-valuemin={dockMinWidth}
            aria-valuenow={rightDockWidth}
            className={`workbench-resize-handle workbench-resize-handle--right ${activeResizeSide === "right" ? "is-active" : ""}`}
            role="separator"
            tabIndex={0}
            title="调整右侧资料栏宽度"
            onKeyDown={(event) => handleDockResizeKeyDown("right", event)}
            onPointerDown={(event) => startDockResize("right", event)}
          />
          <ResourceDock
            collapsedOrganizedResourceIds={collapsedCenterCardIds}
            layout={layout}
            onCopyStatus={setStatus}
            onEditResource={editResourceCopy}
            onNavigateToResource={navigateToResourceTarget}
            onOpenImageResource={openImagePreview}
            onOpenResource={openResourceInCenter}
            onUnsyncResource={unsyncResource}
            onUpdateWorkbenchResource={updateWorkbenchResourceCopy}
            onRemoveOrganizedResource={removeCenterResourceCard}
            onToggleDock={toggleDock}
            onToggleOrganizedResource={toggleCenterResourceCard}
            organizedResources={centerCardResources}
            rightResources={filteredCurrentResources}
            selectedSourceId={selectedSourceId}
            sourceIdForResource={sourceIdForResource}
            side="right"
            unsyncingResourceId={activeUnsyncingResourceId}
            unsyncFailedResourceId={unsyncFailedResourceId}
            hasAnyUnsyncInFlight={hasAnyUnsyncInFlight}
            updateInFlightResourceId={updateInFlightResourceId}
          />
        </div>
        <DragOverlay dropAnimation={null} modifiers={[anchorDragOverlayToCursor]}>
          {activeResource ? <ResourceDragPreview resource={activeResource} /> : null}
        </DragOverlay>
      </DndContext>

      {previewImageResource?.assetPath ? (
        <div
          aria-label={`图片预览：${previewImageResource.title}`}
          aria-modal="true"
          className="image-lightbox"
          role="dialog"
          onClick={closeImagePreview}
        >
          <figure
            className="image-lightbox__frame"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="image-lightbox__header">
              <div>
                <span className="resource-card__type">{resourceVisibleTypeLabel(previewImageResource)}</span>
                <h2>{previewImageResource.title}</h2>
              </div>
              <button
                aria-label="关闭图片预览"
                className="image-lightbox__close"
                title="关闭图片预览"
                type="button"
                onClick={closeImagePreview}
              >
                <X size={18} />
              </button>
            </header>
            <div className="image-lightbox__canvas">
              <img
                src={previewImageResource.assetPath}
                alt={imageResourceAlt(previewImageResource)}
                {...imageDimensionsFromAssetPath(previewImageResource.assetPath)}
              />
            </div>
            {imageResourceCaption(previewImageResource) ? (
              <figcaption>{imageResourceCaption(previewImageResource)}</figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </main>
  );
}
