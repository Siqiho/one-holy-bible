import {
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Copy,
  GripVertical,
  Trash2,
  Images,
  LibraryBig,
  Navigation2,
  NotebookText,
  Pencil,
  ArrowLeftRight,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RefreshCcw,
  RotateCcw,
  Save,
  ScrollText,
  Search,
  Settings,
  SunMedium,
  Type,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { closestCenter, DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type DragCancelEvent, type DragEndEvent, type DragStartEvent, type Modifier } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BibleVersion } from "../domain/bible";
import { ScriptureLinkedText } from "./ScriptureLinkedText";
import { VersePreviewProvider } from "./VersePreviewContext";
import type { PublicScriptureSearchEntry } from "../data/publicData";
import { bookTitle, englishBookTitle, newTestamentBooks, oldTestamentBooks } from "../domain/bibleBooks";
import { defaultWorkbenchLayout, type CenterModuleId, type DockSide, type ResourceModuleLayout, type ResourceSourceId, type SavedCardRef, type WorkbenchLayout } from "../domain/layout";
import { buildBookIntroView, type BookIntroViewModel } from "../domain/bookIntroView";
import type { StudyResource } from "../domain/resources";
import type { VerseId } from "../domain/verse";
import { parseVerseId } from "../domain/verse";
import { createVerseResourceIndex, resourceMentionsVerse, resourcesForBookIntro, resourcesForVerse } from "../lib/backlinks";
import { createBibleSearchIndex, createPublicScriptureSearchIndex, type BibleSearchMatchRange, type IndexedBibleSearchResult } from "../lib/bibleSearch";
import { formatTextResourceBody } from "../lib/formatTextResourceBody";

export const layoutStorageKey = "one-holy-bible-layout";
export const paperThemeStorageKey = "one-holy-bible-paper-theme";
type PaperTheme = "default" | "warm";

function storedPaperTheme(): PaperTheme {
  try {
    const value = window.localStorage.getItem(paperThemeStorageKey);
    if (value === "default") return "default";
    return "warm";
  } catch {
    return "warm";
  }
}

function persistPaperTheme(theme: PaperTheme) {
  try {
    window.localStorage.setItem(paperThemeStorageKey, theme);
  } catch {
    // Theme still works for the current session if storage is unavailable.
  }
}

export const readingFontStorageKey = "one-holy-bible-reading-font";
type ReadingFont = "serif" | "sans";

function storedReadingFont(): ReadingFont {
  try {
    const value = window.localStorage.getItem(readingFontStorageKey);
    if (value === "sans") return "sans";
    return "serif";
  } catch {
    return "serif";
  }
}

function persistReadingFont(font: ReadingFont) {
  try {
    window.localStorage.setItem(readingFontStorageKey, font);
  } catch {
    // Session font still works without storage.
  }
}

const resourceEditsStorageKey = "one-holy-bible-resource-edits";
const deletedResourceIdsStorageKey = "one-holy-bible-deleted-resource-ids";
export const commentaryLibrariesStorageKey = "one-holy-bible-commentary-libraries";
const dockCollapsedWidth = 40;
const dockResizeHandleWidth = 8;
const dockMinWidth = 220;
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
  onUpdateWorkbenchResource?: (resourceId: string, draft: { body: string; title: string; primaryAnchor?: string | null }) => Promise<void> | void;
  unsyncingResourceId?: string | null;
  initialVerseId?: VerseId;
  versions: BibleVersion[];
  resources: StudyResource[];
  initialLayout: WorkbenchLayout;
  onSaveLayout?: (layout: WorkbenchLayout) => void;
  onOpenReader?: (verseId: VerseId) => void;
}

type ResourceCardOrigin = DockSide | "center";
type ResourceEditDrafts = Record<string, {
  body?: string;
  primaryAnchor?: string | null;
  summary?: string;
  title?: string;
}>;
type ResourceEditResult = { persisted: boolean };
type ResourceTextDraft = { body: string; primaryAnchor?: string | null; title: string };
type ResourceEditHandler = (resourceId: string, draft: ResourceTextDraft) => ResourceEditResult;
type WorkbenchResourceUpdateHandler = (resourceId: string, draft: ResourceTextDraft) => Promise<void> | void;
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
  maxResults = searchResultLimit,
): WorkbenchSearchResponse {
  const response = (wholeBibleSearchIndex
    ? createPublicScriptureSearchIndex(wholeBibleSearchIndex)
    : createBibleSearchIndex(versions)).search(query, {
    maxResults,
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
    const parsedModules: Array<{ id?: string; visible?: unknown }> = Array.isArray(parsed.modules)
      ? parsed.modules
      : [];
    const modules = initialLayout.modules.map((defaultModule) => {
      const storedModules = parsedModules.filter((item) => (
        item.id === defaultModule.id
        || (defaultModule.id === "encyclopedia" && item.id === "dictionary")
      ));
      const storedVisibility = storedModules
        .map((item) => item.visible)
        .filter((visible: unknown): visible is boolean => typeof visible === "boolean");
      return {
        ...defaultModule,
        title: resourceModuleTitle(defaultModule.id),
        visible: storedVisibility.length > 0 ? storedVisibility.some(Boolean) : defaultModule.visible,
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

const paperBlendAssetSuffixes = [
  "/cmc-01/p011_img001_661x631.png",
  "/cmc-01/p015_img003_435x262.png",
] as const;

export function shouldBlendImageWithPaper(resource: StudyResource) {
  if (resource.type !== "image" || !resource.assetPath) return false;

  const normalizedPath = resource.assetPath.toLowerCase().split(/[?#]/, 1)[0];
  return paperBlendAssetSuffixes.some((suffix) => normalizedPath.endsWith(suffix));
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

    const nextPrimaryAnchor = (edit.primaryAnchor === undefined
      ? resource.primaryAnchor
      : edit.primaryAnchor || undefined) as VerseId | undefined;
    const hasPlacementEdit = edit.primaryAnchor !== undefined;
    const nextVerses = hasPlacementEdit
      ? nextPrimaryAnchor ? [nextPrimaryAnchor] : []
      : resource.verses;

    return {
      ...resource,
      body: edit.body ?? resource.body,
      ...(nextPrimaryAnchor ? { primaryAnchor: nextPrimaryAnchor } : { primaryAnchor: undefined }),
      ...(hasPlacementEdit ? {
        debugMeta: {
          ...resource.debugMeta,
          coverageRanges: nextPrimaryAnchor
            ? [{ start: nextPrimaryAnchor, end: nextPrimaryAnchor }]
            : [],
        },
      } : {}),
      summary: edit.summary ?? resource.summary,
      title: edit.title ?? resource.title,
      verses: nextVerses,
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
          const draft = value as { body?: unknown; primaryAnchor?: unknown; summary?: unknown; title?: unknown };
          return [resourceId, {
            ...(typeof draft.body === "string" ? { body: draft.body } : {}),
            ...(typeof draft.primaryAnchor === "string" || draft.primaryAnchor === null
              ? { primaryAnchor: draft.primaryAnchor }
              : {}),
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
  if (moduleId === "encyclopedia") {
    return resources.filter((resource) => resource.type === "link");
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
  return "百科";
}

function resourceVisibleTypeLabel(resource: StudyResource) {
  if (resource.type === "note") return "笔记";
  if (resource.type === "commentary") return "注释";
  if (resource.type === "link") return "百科";
  return "媒体";
}

const rightDockJumpModuleIds = ["commentary", "media", "encyclopedia", "notes"] as const;

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

export type CommentaryLibraryId = "zonghe" | "yandu" | "yanxiu" | "xinxi";

export interface CommentaryLibraryDefinition {
  id: CommentaryLibraryId;
  title: string;
  subtitle: string;
}

export const commentaryLibraryCatalog: CommentaryLibraryDefinition[] = [
  { id: "zonghe", title: "综合解读", subtitle: "圣经综合解读" },
  { id: "yandu", title: "研读本圣经", subtitle: "研读本注释" },
  { id: "yanxiu", title: "圣经研修本", subtitle: "研修本注释" },
  { id: "xinxi", title: "圣经信息系列", subtitle: "信息系列注释" },
];

export const defaultSelectedCommentaryLibraryId: CommentaryLibraryId = "zonghe";

function commentaryLibraryIcon(libraryId: CommentaryLibraryId) {
  if (libraryId === "zonghe") return LibraryBig;
  if (libraryId === "yandu") return BookMarked;
  if (libraryId === "yanxiu") return ScrollText;
  return NotebookText;
}

export function commentaryLibraryIdFromLabel(label: string | null | undefined): CommentaryLibraryId | null {
  const value = label?.trim() ?? "";
  if (!value) return null;
  if (/image[-_ ]?text[-_ ]?ocr[-_ ]?conversion|综合解读[·・]图注|(?<![A-Za-z])ocr(?![A-Za-z])/i.test(value)) {
    return null;
  }
  if (value.includes("综合解读")) return "zonghe";
  if (value.includes("圣经研修本") || value.includes("研修本")) return "yanxiu";
  if (value.includes("研读本圣经") || value.includes("研读本")) return "yandu";
  if (value.includes("圣经信息系列") || value.includes("信息系列")) return "xinxi";
  return null;
}

/** Map a resource to a left-dock commentary library, if it is library-backed text. */
export function commentaryLibraryIdForResource(resource: StudyResource): CommentaryLibraryId | null {
  // Image / video / html media cards are never library-scoped.
  if (resource.type === "image" || resource.type === "video" || resource.type === "html") {
    return null;
  }

  // Only text-like cards can belong to a commentary library.
  // Notes and plain links without a library source stay unscoped.
  if (resource.type !== "commentary" && resource.type !== "note" && resource.type !== "link") {
    return null;
  }

  const fromSource = commentaryLibraryIdFromLabel(resource.source);
  if (fromSource) return fromSource;

  const fromMeta = commentaryLibraryIdFromLabel(
    resource.debugMeta?.sourceLabel
      ?? resource.debugMeta?.sourceStream
      ?? resource.debugMeta?.sourcePackage,
  );
  if (fromMeta) return fromMeta;

  const display = displayableSourceName(
    resource.source
      ?? resource.debugMeta?.sourceLabel
      ?? resource.debugMeta?.sourceStream,
    resource.title,
  );
  return commentaryLibraryIdFromLabel(display?.label);
}

/**
 * Resource-library filter contract (single selected library):
 * - Text cards that belong to a known commentary library are visible only when they match the selected library.
 * - Image/media cards always remain visible (they are not library-scoped).
 * - Unscoped text (user notes, OCR without library label, etc.) stays visible.
 */
export function resourceMatchesSelectedCommentaryLibrary(
  resource: StudyResource,
  selectedLibraryId: CommentaryLibraryId,
) {
  if (resource.type === "image" || resource.type === "video" || resource.type === "html") {
    return true;
  }

  const libraryId = commentaryLibraryIdForResource(resource);
  if (!libraryId) return true;
  return libraryId === selectedLibraryId;
}

// Backward-compatible alias used by existing call sites/tests during transition.
export function resourceMatchesEnabledCommentaryLibraries(
  resource: StudyResource,
  enabledLibraryIds: ReadonlySet<CommentaryLibraryId> | CommentaryLibraryId,
) {
  if (typeof enabledLibraryIds === "string") {
    return resourceMatchesSelectedCommentaryLibrary(resource, enabledLibraryIds);
  }
  // Prefer the first enabled id if a set is provided (legacy multi-toggle shape).
  const selected = enabledLibraryIds.values().next().value as CommentaryLibraryId | undefined;
  if (!selected) return true;
  return resourceMatchesSelectedCommentaryLibrary(resource, selected);
}

function isCommentaryLibraryId(value: unknown): value is CommentaryLibraryId {
  return typeof value === "string" && commentaryLibraryCatalog.some((item) => item.id === value);
}

function normalizeSelectedCommentaryLibraryId(value: unknown): CommentaryLibraryId {
  if (isCommentaryLibraryId(value)) return value;
  if (Array.isArray(value)) {
    const first = value.find(isCommentaryLibraryId);
    if (first) return first;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (isCommentaryLibraryId(record.selected)) return record.selected;
    if (Array.isArray(record.enabled)) {
      const first = record.enabled.find(isCommentaryLibraryId);
      if (first) return first;
    }
  }
  return defaultSelectedCommentaryLibraryId;
}

function storedSelectedCommentaryLibraryId(): CommentaryLibraryId {
  try {
    const raw = window.localStorage.getItem(commentaryLibrariesStorageKey);
    if (!raw) return defaultSelectedCommentaryLibraryId;
    return normalizeSelectedCommentaryLibraryId(JSON.parse(raw));
  } catch {
    return defaultSelectedCommentaryLibraryId;
  }
}

function persistSelectedCommentaryLibraryId(libraryId: CommentaryLibraryId) {
  try {
    window.localStorage.setItem(
      commentaryLibrariesStorageKey,
      JSON.stringify({ selected: normalizeSelectedCommentaryLibraryId(libraryId) }),
    );
    return true;
  } catch {
    return false;
  }
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

    if (/image-text-ocr-conversion|综合解读[·・]图注|OCR\s*转文字/i.test(cleanedSource)) {
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
      ?? resource.debugMeta?.sourceLabel
      ?? resource.debugMeta?.sourceStream,
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
  if (resource.type === "image" && sourceVerseId) {
    if (isBookIntroSourceId(sourceVerseId)) {
      if (resource.bookIntro === bookFromSourceId(sourceVerseId)) {
        return sourceVerseId;
      }
    } else if ((resource.debugMeta?.navigationPrimaryAnchors ?? []).includes(sourceVerseId)) {
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
  headerStartAction?: ReactNode;
  headerEndAction?: ReactNode;
  onEditResource: ResourceEditHandler;
  onDeleteResource?: ResourceDeleteHandler;
  onNavigateToResource?: ResourceNavigateHandler;
  onOpenImageResource?: (resource: StudyResource, trigger?: HTMLButtonElement) => void;
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

function resourceScriptureContext(resource: StudyResource, fallbackSourceId: ResourceSourceId) {
  const candidate = resource.primaryAnchor ?? resource.verses[0] ?? fallbackSourceId;
  try {
    const parsed = parseVerseId(String(candidate));
    return { sourceBookId: parsed.book, sourceChapter: parsed.chapter };
  } catch {
    return { sourceBookId: undefined, sourceChapter: undefined };
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

export function ResourceCard({
  resource,
  origin,
  sourceVerseId,
  leadingAction,
  headerStartAction,
  headerEndAction,
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
  const [editPrimaryAnchor, setEditPrimaryAnchor] = useState<string>(resource.primaryAnchor ?? resource.verses[0] ?? "");
  const [editTitle, setEditTitle] = useState(resource.title);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const [editSyncError, setEditSyncError] = useState<string | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyResizeRef = useRef<{ pointerId: number; startHeight: number; startY: number } | null>(null);
  const usesBodyCopyActions = centerVariant || currentVerseVariant;
  const canOpenImagePreview = Boolean(onOpenImageResource);
  const navigationTarget = resourceNavigationTarget(resource, sourceVerseId);
  const navigationTargetLabel = navigationTarget ? sourceIdLabel(navigationTarget) : null;
  const canNavigateToResource = Boolean(navigationTarget && onNavigateToResource);
  const canUnsyncResource = Boolean(resource.debugMeta?.sourceWorkbenchCardId && onUnsyncResource);
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
    setEditPrimaryAnchor(resource.primaryAnchor ?? resource.verses[0] ?? "");
    setEditTitle(resource.title);
  }, [isEditing, visibleEditableBody, resource.primaryAnchor, resource.title, resource.verses]);

  useEffect(() => {
    setIsEditing(false);
    setIsCopyMenuOpen(false);
  }, [isCollapsed]);

  useEffect(() => {
    if (!isCopyMenuOpen) return;
    const menu = copyMenuRef.current;
    const opener = copyButtonRef.current;
    menu?.querySelector<HTMLButtonElement>("button")?.focus();
    function closeOnOutsideClick(event: MouseEvent) {
      if (!(event.target instanceof Node)) return;
      if (menu?.contains(event.target) || opener?.contains(event.target)) return;
      setIsCopyMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !(event.target instanceof Node)) return;
      if (!menu?.contains(event.target) && !opener?.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      setIsCopyMenuOpen(false);
    }
    document.addEventListener("click", closeOnOutsideClick, true);
    document.addEventListener("keydown", closeOnEscape, true);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick, true);
      document.removeEventListener("keydown", closeOnEscape, true);
      if (opener?.isConnected && (menu?.contains(document.activeElement) || document.activeElement === document.body)) {
        opener.focus();
      }
    };
  }, [isCopyMenuOpen]);

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
    setEditPrimaryAnchor(resource.primaryAnchor ?? resource.verses[0] ?? "");
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
    setEditPrimaryAnchor(resource.primaryAnchor ?? resource.verses[0] ?? "");
    setEditTitle(resource.title);
    setEditSyncError(null);
    setIsEditing(false);
    onCopyStatus(`已取消编辑：${resource.title}`);
  }

  async function saveEditor() {
    const nextTitle = editTitle.trim() || resource.title;
    const nextBody = editBody.trim();
    const nextPrimaryAnchor = editPrimaryAnchor.trim() || null;
    if (resource.debugMeta?.sourceWorkbenchCardId && onUpdateWorkbenchResource) {
      setEditSyncError(null);
      try {
        setEditSyncError(null);
        onCopyStatus(`正在保存并同步：${nextTitle}`);
        await onUpdateWorkbenchResource(resource.id, {
          body: nextBody,
          primaryAnchor: nextPrimaryAnchor,
          title: nextTitle,
        });
        setIsEditing(false);
        onCopyStatus(`已保存并进入工作台「已编辑」：${nextTitle}`);
        return;
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        setEditSyncError(`同步失败：${detail}`);
        onCopyStatus(`卡片修改同步失败：${resource.title}（${detail}）`);
        return;
      }
    }

    const result = onEditResource(resource.id, {
      body: nextBody,
      primaryAnchor: nextPrimaryAnchor,
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
    <div ref={copyMenuRef} className="resource-card__copy-menu" role="menu" aria-label={`${resource.title}复制菜单`}>
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
      ref={copyButtonRef}
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
      aria-label={`删除并退回待复核：${resource.title}`}
      className="resource-card__action-button resource-card__action-button--danger"
      disabled={isResourceActionBusy}
      title="删除并退回待复核"
      type="button"
      onClick={(event) => {
        stopResourceActionEvent(event);
        if (isResourceActionBusy) return;
        onUnsyncResource?.(resource.id);
      }}
      onPointerDown={stopResourceActionEvent}
    >
      <Trash2 size={13} strokeWidth={1.9} />
    </button>
  ) : null;
  const deleteButton = canDeleteResource ? (
    <button
      aria-label={canUnsyncResource ? `删除并退回待复核：${resource.title}` : `删除：${resource.title}`}
      className="resource-card__action-button resource-card__action-button--danger"
      disabled={isResourceActionBusy}
      title={canUnsyncResource ? "删除并退回待复核" : "删除"}
      type="button"
      onClick={(event) => {
        stopResourceActionEvent(event);
        if (isResourceActionBusy) return;
        onDeleteResource?.(resource.id);
      }}
      onPointerDown={stopResourceActionEvent}
    >
      <Trash2 size={13} strokeWidth={1.9} />
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
        <div className="resource-card__header-start">
          {headerStartAction ? (
            <span className="resource-card__control-cluster resource-card__control-cluster--start">
              {headerStartAction}
            </span>
          ) : null}
          {(!centerVariant || currentVerseVariant) ? <span className="drag-handle" aria-hidden="true"><GripVertical size={14} strokeWidth={1.9} /></span> : null}
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
                  <Navigation2 size={13} strokeWidth={1.9} />
                </button>
              ) : null}
              {leadingAction}
            </span>
          ) : null}
        </div>
        <div
          className="resource-card__title resource-card__selectable-title"
          data-selection-mode="text"
          onClick={stopResourceTextSelectionEvent}
          onDoubleClick={stopResourceTextSelectionEvent}
          onPointerDown={stopResourceTextSelectionEvent}
        >
          <span className="resource-card__type resource-card__source-pill">{resourceHeaderLabel(resource)}</span>
          <h3 title={resource.title}>{resource.title}</h3>
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
            <Pencil size={13} strokeWidth={1.9} />
          </button>
          {deleteButton ?? unsyncButton}
          {headerEndAction}
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
            <span>经文定位</span>
            <input
              aria-label="经文定位"
              placeholder="如 Job.1.22 或 Gen.1.1"
              value={editPrimaryAnchor}
              onChange={(event) => setEditPrimaryAnchor(event.currentTarget.value)}
            />
            <span className="resource-card__editor-hint">
              {(() => {
                const anchor = editPrimaryAnchor.trim();
                if (!anchor) return "填写主锚点后，卡片会按该经文归位。";
                try {
                  const verse = parseVerseId(anchor as ResourceSourceId);
                  return `当前定位：${bookTitle(verse.book)} ${verse.chapter}:${verse.verse}（${anchor}）`;
                } catch {
                  return `当前定位：${anchor}`;
                }
              })()}
            </span>
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
                      onOpenImageResource?.(resource, event.currentTarget);
                    }}
                    onPointerDown={stopResourceActionEvent}
                  >
                    <img
                      src={resource.assetPath}
                      alt={imageResourceAlt(resource)}
                      data-paper-blend={shouldBlendImageWithPaper(resource) ? "true" : undefined}
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
                    data-paper-blend={shouldBlendImageWithPaper(resource) ? "true" : undefined}
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
              <ScriptureLinkedText
                text={resourceDisplayBody(resource)}
                {...resourceScriptureContext(resource, sourceVerseId)}
              />
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
  onOpenImageResource?: (resource: StudyResource, trigger?: HTMLButtonElement) => void;
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
  onOpenImageResource?: (resource: StudyResource, trigger?: HTMLButtonElement) => void;
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
        headerStartAction={(
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`拖动排序 ${resource.title}`}
            className="center-card-sort-handle"
            title={`拖动排序 ${resource.title}`}
            type="button"
            onClick={stopResourceActionEvent}
            onDoubleClick={stopResourceActionEvent}
          >
            <GripVertical size={14} strokeWidth={1.9} />
          </button>
        )}
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
            <ToggleIcon size={13} strokeWidth={1.9} />
          </button>
        )}
        headerEndAction={(
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
            <X size={13} strokeWidth={1.9} />
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
            <p className="resource-dock__empty">还没有整理卡片。双击右侧卡片，或拖入此处。</p>
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
  onOpenImageResource?: (resource: StudyResource, trigger?: HTMLButtonElement) => void;
  onOpenResource: (resourceId: string) => void;
  onUnsyncResource?: (resourceId: string) => void;
  onUpdateWorkbenchResource?: WorkbenchResourceUpdateHandler;
  onCopyStatus: (message: string) => void;
  unsyncingResourceId?: string | null;
  unsyncFailedResourceId?: string | null;
  hasAnyUnsyncInFlight?: boolean;
  updateInFlightResourceId?: string | null;
  isCardSearchActive?: boolean;
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
  hideHeader = false,
  isCollapsed = false,
  onToggleCollapsed,
  sectionRef,
  unsyncingResourceId = null,
  unsyncFailedResourceId = null,
  hasAnyUnsyncInFlight = false,
  updateInFlightResourceId = null,
  isCardSearchActive = false,
}: ResourceModuleProps & {
  hideHeader?: boolean;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  sectionRef?: (element: HTMLElement | null) => void;
}) {
  const ToggleIcon = isCollapsed ? ChevronRight : ChevronDown;
  const showHeader = !hideHeader;

  function toggleModuleCollapse() {
    onToggleCollapsed?.();
    logWorkbenchInfo("[workbench] right resource module collapsed state changed", {
      moduleId: module.id,
      title: module.title,
      collapsed: !isCollapsed,
    });
  }

  return (
    <section
      ref={sectionRef}
      aria-expanded={!isCollapsed}
      aria-label={module.title}
      className={`resource-module resource-module--dock ${isCollapsed ? "is-collapsed" : ""} ${hideHeader ? "resource-module--jump-only" : ""}`}
      data-module-id={module.id}
      role="region"
    >
      {showHeader ? (
        <header className="resource-module__header">
          <div className="resource-module__title">
            <span className="resource-module__title-text">{module.title}</span>
            <span className="resource-module__count">{resources.length}</span>
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
            <ToggleIcon size={13} strokeWidth={1.9} />
          </button>
        </header>
      ) : null}
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
          <p className="resource-dock__empty">
            {isCardSearchActive ? "没有匹配的卡片。" : "当前经节还没有资源。"}
          </p>
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
  onOpenImageResource?: (resource: StudyResource, trigger?: HTMLButtonElement) => void;
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
                      <ToggleIcon size={13} strokeWidth={1.9} />
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

const bookIntroLaneLabels = {
  context: "书卷背景",
  message: "核心信息",
  structure: "阅读结构",
} as const;

interface BookIntroStableGridProps {
  view: BookIntroViewModel;
  sourceIdForResource: (resource: StudyResource) => ResourceSourceId;
  onEditResource: ResourceEditHandler;
  onDeleteResource: ResourceDeleteHandler;
  onNavigateToResource: ResourceNavigateHandler;
  onOpenImageResource?: (resource: StudyResource, trigger?: HTMLButtonElement) => void;
  onOpenResource: (resourceId: string) => void;
  onUnsyncResource?: (resourceId: string) => void;
  onUpdateWorkbenchResource?: WorkbenchResourceUpdateHandler;
  onCopyStatus: (message: string) => void;
  unsyncingResourceId?: string | null;
  unsyncFailedResourceId?: string | null;
  hasAnyUnsyncInFlight?: boolean;
  updateInFlightResourceId?: string | null;
}

function BookIntroStableGrid({
  view,
  sourceIdForResource,
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
}: BookIntroStableGridProps) {
  const [collapsedResourceIds, setCollapsedResourceIds] = useState<Set<string>>(() => new Set());

  function toggleResource(resource: StudyResource) {
    setCollapsedResourceIds((currentIds) => {
      const nextIds = new Set(currentIds);
      const nextCollapsed = !nextIds.has(resource.id);
      if (nextCollapsed) {
        nextIds.add(resource.id);
      } else {
        nextIds.delete(resource.id);
      }
      logWorkbenchInfo("[workbench] book intro stable grid card collapsed state changed", {
        bookId: view.bookId,
        resourceId: resource.id,
        title: resource.title,
        collapsed: nextCollapsed,
      });
      return nextIds;
    });
  }

  return (
    <section className="book-intro-canvas" role="region" aria-label={`${view.chineseTitle}书卷序`}>
      <div className="book-intro-stable-grid">
        {view.lanes.map((lane) => (
          <section
            aria-label={bookIntroLaneLabels[lane.id]}
            className={`book-intro-lane book-intro-lane--${lane.id}`}
            key={lane.id}
            role="region"
          >
            <header className="book-intro-lane__header">
              <span>{lane.eyebrow}</span>
              <h2>{bookIntroLaneLabels[lane.id]}</h2>
              <p>{lane.description}</p>
            </header>
            <div className="book-intro-lane__cards">
              {lane.items.length > 0 ? (
                lane.items.map((item) => {
                  const { resource } = item;
                  const isCollapsed = collapsedResourceIds.has(resource.id);
                  const ToggleIcon = isCollapsed ? ChevronRight : ChevronDown;

                  return (
                    <div
                      aria-expanded={!isCollapsed}
                      className={`book-intro-lane__item ${isCollapsed ? "is-collapsed" : ""}`}
                      key={resource.id}
                    >
                      {item.sharedFromBookId ? (
                        <p className="book-intro-lane__shared-label">
                          上下卷共用导论 · {bookTitle(item.sharedFromBookId)}
                        </p>
                      ) : null}
                      <ResourceCard
                        origin="center"
                        resource={resource}
                        savedVariant
                        currentVerseVariant
                        centerVariant
                        draggable={false}
                        sourceVerseId={sourceIdForResource(resource)}
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
                              toggleResource(resource);
                            }}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                          >
                            <ToggleIcon size={13} strokeWidth={1.9} />
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
                })
              ) : (
                <p className="resource-dock__empty">这一栏暂无导论卡片。</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

interface ResourceDockProps {
  side: DockSide;
  layout: WorkbenchLayout;
  selectedSourceId: ResourceSourceId;
  rightResources: StudyResource[];
  organizedResources: StudyResource[];
  selectedCommentaryLibraryId: CommentaryLibraryId;
  sourceIdForResource: (resource: StudyResource) => ResourceSourceId;
  onToggleDock: (side: DockSide) => void;
  onSelectCommentaryLibrary: (libraryId: CommentaryLibraryId) => void;
  onEditResource: ResourceEditHandler;
  onNavigateToResource: ResourceNavigateHandler;
  onOpenImageResource?: (resource: StudyResource, trigger?: HTMLButtonElement) => void;
  onOpenResource: (resourceId: string) => void;
  onUnsyncResource?: (resourceId: string) => void;
  onUpdateWorkbenchResource?: WorkbenchResourceUpdateHandler;
  onRemoveOrganizedResource: (resourceId: string) => void;
  onToggleOrganizedResource: (resourceId: string) => void;
  collapsedOrganizedResourceIds: Set<string>;
  onCopyStatus: (message: string) => void;
  isWarmPaperTheme?: boolean;
  isSerifReadingFont?: boolean;
  onTogglePaperTheme?: () => void;
  onToggleReadingFont?: () => void;
  unsyncingResourceId?: string | null;
  unsyncFailedResourceId?: string | null;
  hasAnyUnsyncInFlight?: boolean;
  updateInFlightResourceId?: string | null;
  isCardSearchActive?: boolean;
}

function ResourceDock({
  side,
  layout,
  selectedSourceId,
  rightResources,
  organizedResources,
  selectedCommentaryLibraryId,
  sourceIdForResource,
  onToggleDock,
  onSelectCommentaryLibrary,
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
  isWarmPaperTheme = true,
  isSerifReadingFont = true,
  onTogglePaperTheme,
  onToggleReadingFont,
  unsyncingResourceId = null,
  unsyncFailedResourceId = null,
  hasAnyUnsyncInFlight = false,
  updateInFlightResourceId = null,
  isCardSearchActive = false,
}: ResourceDockProps) {
  const modules = layout.modules.filter((module) => module.side === side && module.visible);
  const collapsed = side === "left" ? layout.leftCollapsed : layout.rightCollapsed;
  const collapseIcon = side === "left" ? (collapsed ? PanelLeftOpen : PanelLeftClose) : (collapsed ? PanelRightOpen : PanelRightClose);
  const { isOver, setNodeRef } = useDroppable({
    id: `${side}-dock`,
  });
  const CollapseIcon = collapseIcon;
  const [collapsedModuleIds, setCollapsedModuleIds] = useState<Set<string>>(() => new Set());
  const [activeJumpModuleId, setActiveJumpModuleId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const moduleSectionRefs = useRef(new Map<string, HTMLElement>());
  const dockPanelRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const jumpTargets = useMemo(() => {
    if (side !== "right") return [];
    return rightDockJumpModuleIds.map((moduleId) => {
      const module = modules.find((item) => item.id === moduleId) ?? {
        id: moduleId,
        title: resourceModuleTitle(moduleId),
        side: "right" as const,
        visible: true,
      };
      return {
        module,
        count: moduleResources(moduleId, rightResources).length,
      };
    });
  }, [modules, rightResources, side]);

  function setModuleSectionRef(moduleId: string, element: HTMLElement | null) {
    if (element) {
      moduleSectionRefs.current.set(moduleId, element);
      return;
    }
    moduleSectionRefs.current.delete(moduleId);
  }

  function toggleModuleCollapsed(moduleId: string) {
    setCollapsedModuleIds((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  function jumpToModule(moduleId: string) {
    setCollapsedModuleIds((current) => {
      if (!current.has(moduleId)) return current;
      const next = new Set(current);
      next.delete(moduleId);
      return next;
    });
    setActiveJumpModuleId(moduleId);
    window.requestAnimationFrame(() => {
      const section = moduleSectionRefs.current.get(moduleId);
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    if (side !== "right") return;
    const panel = dockPanelRef.current;
    if (!panel) return;

    function updateActiveJumpTarget() {
      const panelTop = panel!.getBoundingClientRect().top + 48;
      let nextActive: string | null = null;
      for (const moduleId of rightDockJumpModuleIds) {
        const section = moduleSectionRefs.current.get(moduleId);
        if (!section) continue;
        const rect = section.getBoundingClientRect();
        if (rect.top <= panelTop + 24 && rect.bottom > panelTop + 24) {
          nextActive = moduleId;
          break;
        }
        if (rect.top > panelTop + 24 && nextActive === null) {
          nextActive = moduleId;
          break;
        }
      }
      setActiveJumpModuleId((current) => (current === nextActive ? current : nextActive));
    }

    updateActiveJumpTarget();
    panel.addEventListener("scroll", updateActiveJumpTarget, { passive: true });
    return () => panel.removeEventListener("scroll", updateActiveJumpTarget);
  }, [side, modules, rightResources]);

  useEffect(() => {
    if (side !== "left" || !isSettingsOpen) return;

    function closeSettingsOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (settingsRef.current?.contains(target)) return;
      setIsSettingsOpen(false);
    }

    function closeSettingsOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsSettingsOpen(false);
      settingsButtonRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeSettingsOnOutsidePointerDown, true);
    document.addEventListener("keydown", closeSettingsOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeSettingsOnOutsidePointerDown, true);
      document.removeEventListener("keydown", closeSettingsOnEscape);
    };
  }, [isSettingsOpen, side]);

  useEffect(() => {
    if (side === "left" && !collapsed) return;
    setIsSettingsOpen(false);
  }, [collapsed, side]);

  return (
    <aside
      ref={setNodeRef}
      aria-label={dockTitle(side)}
      className={`resource-dock resource-dock--${side} ${collapsed ? "is-collapsed" : ""} ${isOver ? "is-drop-target" : ""}`}
      role="complementary"
    >
      <div ref={dockPanelRef} className="resource-dock__panel">
        {side === "right" && !collapsed ? (
          <nav className="resource-dock__jump-bar" aria-label="资料类别快捷跳转">
            <div className="resource-dock__jump-bar-actions">
              {jumpTargets.map(({ module, count }) => (
                <button
                  key={module.id}
                  aria-current={activeJumpModuleId === module.id ? "true" : undefined}
                  aria-label={`跳转到${module.title}${count ? `，${count} 张` : ""}`}
                  className={`resource-dock__jump-chip ${activeJumpModuleId === module.id ? "is-active" : ""} ${count === 0 ? "is-empty" : ""}`}
                  title={`${module.title}（${count}）`}
                  type="button"
                  onClick={() => jumpToModule(module.id)}
                >
                  <span>{module.title}</span>
                  <em>{count}</em>
                </button>
              ))}
            </div>
            <button
              aria-label="收起右侧资料栏"
              className="dock-toggle resource-dock__jump-collapse"
              title="收起右侧资料栏"
              type="button"
              onClick={() => onToggleDock(side)}
            >
              <CollapseIcon size={14} />
            </button>
          </nav>
        ) : null}
        {side === "left" ? (
          <>
            <header className="resource-dock__header resource-dock__header--library">
              <div className="resource-dock__title resource-dock__title--library">
                <span>资源库</span>
              </div>
              <div className="resource-dock__header-actions">
                {!collapsed ? (
                  <button
                    aria-label="收起左侧资料栏"
                    className="dock-toggle"
                    title="收起左侧资料栏"
                    type="button"
                    onClick={() => onToggleDock(side)}
                  >
                    <CollapseIcon size={14} />
                  </button>
                ) : null}
              </div>
            </header>
            <section className="resource-library" aria-label="注释资源库">
              <div className="resource-library__list">
                {commentaryLibraryCatalog.map((library) => {
                  const selected = selectedCommentaryLibraryId === library.id;
                  const Icon = commentaryLibraryIcon(library.id);
                  return (
                    <button
                      key={library.id}
                      aria-label={`${library.title}，${library.subtitle}`}
                      aria-pressed={selected}
                      className={`resource-library__item ${selected ? "is-active" : ""}`}
                      title={selected ? `当前资源库：${library.title}` : `选择 ${library.title}`}
                      type="button"
                      onClick={() => onSelectCommentaryLibrary(library.id)}
                    >
                      <span className="resource-library__icon" aria-hidden="true">
                        <Icon size={16} />
                      </span>
                      <span className="resource-library__copy">
                        <strong>{library.title}</strong>
                        <em>{library.subtitle}</em>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
            <div className="resource-dock__section-divider" aria-hidden="true" />
            <header className="resource-dock__subheader">
              <div className="resource-dock__title resource-dock__title--book">
                <span>整理卡片</span>
                <strong>{sourceIdChapterLabel(selectedSourceId)}</strong>
              </div>
            </header>
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
            <div className="resource-dock__settings" ref={settingsRef}>
              {isSettingsOpen ? (
                <div className="resource-dock__settings-panel" role="dialog" aria-label="阅读台设置">
                  <div className="resource-dock__settings-title">阅读设置</div>
                  <div className="resource-dock__settings-actions" role="group" aria-label="纸张与书体">
                    <button
                      aria-label={isWarmPaperTheme ? "关闭纸张模式" : "开启纸张模式"}
                      aria-pressed={isWarmPaperTheme}
                      className="toolbar-button toolbar-button--paper"
                      title={isWarmPaperTheme ? "恢复默认主题" : "使用现代暖纸主题"}
                      type="button"
                      onClick={() => onTogglePaperTheme?.()}
                    >
                      <SunMedium size={16} />
                      <span className="toolbar-button__label">纸张模式</span>
                    </button>
                    <button
                      aria-label={isSerifReadingFont ? "切换为系统字体" : "切换为书体阅读字体"}
                      aria-pressed={isSerifReadingFont}
                      className="toolbar-button toolbar-button--font"
                      title={isSerifReadingFont ? "当前：宋体书体，点击切回系统字体" : "当前：系统字体，点击使用宋体书体"}
                      type="button"
                      onClick={() => onToggleReadingFont?.()}
                    >
                      <Type size={16} />
                      <span className="toolbar-button__label">{isSerifReadingFont ? "书体" : "系统字体"}</span>
                    </button>
                  </div>
                </div>
              ) : null}
              <button
                aria-expanded={isSettingsOpen}
                aria-haspopup="dialog"
                aria-label={isSettingsOpen ? "关闭设置" : "打开设置"}
                ref={settingsButtonRef}
                className={`resource-dock__settings-button ${isSettingsOpen ? "is-active" : ""}`}
                title="阅读设置"
                type="button"
                onClick={() => setIsSettingsOpen((current) => !current)}
              >
                <Settings size={15} />
                <span>设置</span>
              </button>
            </div>
          </>
        ) : (
          modules.map((module) => {
            const resourcesForModule = moduleResources(module.id, rightResources);
            return (
              <ResourceModule
                key={module.id}
                module={{ ...module, title: resourceModuleTitle(module.id) }}
                hideHeader
                isCollapsed={collapsedModuleIds.has(module.id)}
                onToggleCollapsed={() => toggleModuleCollapsed(module.id)}
                sectionRef={(element) => setModuleSectionRef(module.id, element)}
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
                isCardSearchActive={isCardSearchActive}
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
  onOpenReader,
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
  const [paperTheme, setPaperTheme] = useState<PaperTheme>(storedPaperTheme);
  const isWarmPaperTheme = paperTheme === "warm";
  const [readingFont, setReadingFont] = useState<ReadingFont>(storedReadingFont);
  const isSerifReadingFont = readingFont === "serif";
  const [activeResizeSide, setActiveResizeSide] = useState<DockSide | null>(null);
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [previewImageResource, setPreviewImageResource] = useState<StudyResource | null>(null);
  const [resourceEdits, setResourceEdits] = useState<ResourceEditDrafts>(() => storedResourceEdits());
  const [deletedResourceIds, setDeletedResourceIds] = useState<Set<string>>(() => storedDeletedResourceIds());
  const [selectedCommentaryLibraryId, setSelectedCommentaryLibraryId] = useState<CommentaryLibraryId>(() => storedSelectedCommentaryLibraryId());
  const [selectedVerseId, setSelectedVerseId] = useState<VerseId>(initialVerseId);
  const [selectedIntroBook, setSelectedIntroBook] = useState<string | null>(initialIntroBook);
  const [openNavigationPanel, setOpenNavigationPanel] = useState<"book" | "chapter" | null>(null);
  const [query, setQuery] = useState("");
  const [cardQuery, setCardQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searchDisplayLimit, setSearchDisplayLimit] = useState(searchResultLimit);
  const [searchVersionFilter, setSearchVersionFilter] = useState<SearchVersionFilter>("all");
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [collapsedCenterCardIds, setCollapsedCenterCardIds] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState("工作台已加载");
  const [refreshStatus, setRefreshStatus] = useState<"idle" | "success" | "error">("idle");
  const [unsyncFailedResourceId, setUnsyncFailedResourceId] = useState<string | null>(null);
  const [locallyUnsyncingResourceId, setLocallyUnsyncingResourceId] = useState<string | null>(null);
  const [updateInFlightResourceId, setUpdateInFlightResourceId] = useState<string | null>(null);
  const [mastheadHeight, setMastheadHeight] = useState(112);
  const mastheadSize = mastheadHeight < 92 ? "mini" : mastheadHeight < 108 ? "compact" : "full";
  const [mastheadResizeActive, setMastheadResizeActive] = useState(false);
  const resizeSessionRef = useRef<{
    side: DockSide;
    startLayout: WorkbenchLayout;
    startX: number;
  } | null>(null);
  const centerSplitResizeSessionRef = useRef<{
    startLayout: WorkbenchLayout;
    startX: number;
  } | null>(null);
  const mastheadResizeSessionRef = useRef<{
    pointerId: number;
    startHeight: number;
    startY: number;
  } | null>(null);
  const layoutRef = useRef(layout);
  const refreshInFlightRef = useRef(false);
  const unsyncInFlightResourceIdRef = useRef<string | null>(null);
  const updateInFlightResourceIdRef = useRef<string | null>(null);
  const initialNavigationRef = useRef({ introBook: initialIntroBook, verseId: initialVerseId });
  const navigationPickerRef = useRef<HTMLDivElement>(null);
  const bookNavButtonRef = useRef<HTMLButtonElement>(null);
  const chapterNavButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchFormRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLElement>(null);
  const imagePreviewOpenerRef = useRef<HTMLButtonElement | null>(null);
  const imagePreviewCloseRef = useRef<HTMLButtonElement>(null);
  const verseButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const bibleColumnRefs = useRef(new Map<string, HTMLElement>());
  const bibleScrollSyncLockRef = useRef(false);
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
  const bookIntroView = useMemo(
    () => (selectedIntroBook ? buildBookIntroView(visibleResources, selectedIntroBook) : null),
    [selectedIntroBook, visibleResources],
  );
  const libraryFilteredResources = useMemo(() => (
    visibleResources.filter((resource) => resourceMatchesSelectedCommentaryLibrary(resource, selectedCommentaryLibraryId))
  ), [selectedCommentaryLibraryId, visibleResources]);
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
  const libraryResourceIndex = useMemo(
    () => createVerseResourceIndex(libraryFilteredResources),
    [libraryFilteredResources],
  );
  const currentResources = useMemo(() => (
    selectedIntroBook
      ? verseFirstBookIntroResources(libraryFilteredResources, selectedIntroBook)
      : libraryResourceIndex.mentioningAny(currentChapterVerseIds)
  ), [currentChapterVerseIds, libraryFilteredResources, libraryResourceIndex, selectedIntroBook]);
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
      ? verseFirstBookIntroResources(libraryFilteredResources, selectedIntroBook)
      : resourcesForVerse(libraryFilteredResources, selectedVerseId)
  ), [libraryFilteredResources, selectedIntroBook, selectedVerseId]);
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
    searchDisplayLimit,
  ), [currentBook, searchQuery, searchScope, searchVersionFilter, searchDisplayLimit, versions, wholeBibleSearchIndex]);
  useEffect(() => {
    setSearchDisplayLimit(searchResultLimit);
    setStatus((previous) => {
      if (!/^(已显示 |搜索到 )/.test(previous)) return previous;
      if (hasPendingSearchChange) return "搜索条件已更新，请点击搜索。";
      return searchQuery ? `搜索到 ${searchResponse.totalCount} 处经文` : "搜索已清除";
    });
  }, [pendingSearchQuery, searchQuery, searchVersionFilter, searchScope, currentBook, searchResponse.totalCount, hasPendingSearchChange]);
  const searchResults = searchResponse.results;
  const shouldShowSearchPanel = isSearchPanelOpen && (pendingSearchQuery.length > 0 || searchQuery.length > 0);
  useEffect(() => {
    if (!shouldShowSearchPanel) return;
    function closeSearchOnOutsidePointer(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (searchFormRef.current?.contains(event.target) || searchPanelRef.current?.contains(event.target)) return;
      setIsSearchPanelOpen(false);
    }
    document.addEventListener("pointerdown", closeSearchOnOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", closeSearchOnOutsidePointer, true);
  }, [shouldShowSearchPanel]);
  const searchStatusLabel = hasPendingSearchChange
    ? "待搜索"
    : searchQuery
    ? `${searchResponse.totalCount} 处结果`
    : "输入关键词后搜索";
  const readerMinWidth = readerColumnMinWidth * 2;
  const leftDockWidth = dockVisibleWidth(layout, "left");
  const rightDockWidth = dockVisibleWidth(layout, "right");
  const leftDockTrackMinWidth = layout.leftCollapsed ? dockCollapsedWidth : dockMinWidth;
  const rightDockTrackMinWidth = layout.rightCollapsed ? dockCollapsedWidth : dockMinWidth;
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
    if (refreshStatus === "idle") return;
    const timeoutMs = refreshStatus === "success" ? 1800 : 2600;
    const timer = window.setTimeout(() => {
      setRefreshStatus("idle");
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [refreshStatus]);

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

    function closeNavigationPanelOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      const panel = openNavigationPanel;
      setOpenNavigationPanel(null);
      logWorkbenchInfo("[workbench] navigation panel closed", {
        panel,
        reason: "escape",
      });
      const trigger = panel === "book" ? bookNavButtonRef.current : chapterNavButtonRef.current;
      trigger?.focus();
    }

    document.addEventListener("pointerdown", closeNavigationPanelOnOutsidePointerDown, true);
    document.addEventListener("keydown", closeNavigationPanelOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeNavigationPanelOnOutsidePointerDown, true);
      document.removeEventListener("keydown", closeNavigationPanelOnEscape);
    };
  }, [openNavigationPanel]);

  useEffect(() => {
    if (!previewImageResource?.assetPath) return;
    const opener = imagePreviewOpenerRef.current;
    imagePreviewCloseRef.current?.focus();
    function handlePreviewKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeImagePreview();
      } else if (event.key === "Tab") {
        // The close button is the lightbox's only interactive element.
        event.preventDefault();
        event.stopPropagation();
        imagePreviewCloseRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handlePreviewKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handlePreviewKeyDown, true);
      if (opener?.isConnected) opener.focus();
    };
  }, [previewImageResource]);

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

  function stepChapter(direction: -1 | 1) {
    if (selectedIntroBook) {
      if (direction < 0) return;
      const firstChapter = currentChapterNumbers[0];
      if (firstChapter === undefined) return;
      selectChapter(firstChapter);
      return;
    }

    const currentIndex = currentChapterNumbers.indexOf(currentChapter);
    if (currentIndex < 0) return;
    const nextChapter = currentChapterNumbers[currentIndex + direction];
    if (nextChapter === undefined) return;
    selectChapter(nextChapter);
  }

  function runSearch(nextQuery = query) {
    setSearchDisplayLimit(searchResultLimit);
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

  function editResourceCopy(resourceId: string, draft: ResourceTextDraft): ResourceEditResult {
    const baseResource = resources.find((resource) => resource.id === resourceId);
    const baseEditableBody = baseResource ? editableResourceBody(baseResource) : "";
    const basePrimaryAnchor = baseResource?.primaryAnchor ?? baseResource?.verses[0] ?? null;
    const bodyChanged = !baseResource || draft.body !== baseEditableBody;
    const titleChanged = !baseResource || draft.title !== baseResource.title;
    const nextPrimaryAnchor = draft.primaryAnchor === undefined
      ? basePrimaryAnchor
      : draft.primaryAnchor;
    const primaryAnchorChanged = !baseResource || nextPrimaryAnchor !== basePrimaryAnchor;
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
    if (primaryAnchorChanged) {
      nextDraft.primaryAnchor = nextPrimaryAnchor;
    }
    const nextEdits = {
      ...resourceEdits,
    };
    if (baseResource && !bodyChanged && !titleChanged && !primaryAnchorChanged) {
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
      primaryAnchor: nextPrimaryAnchor,
      persisted,
    });
    return { persisted };
  }

  async function updateWorkbenchResourceCopy(resourceId: string, draft: ResourceTextDraft) {
    if (!onUpdateWorkbenchResource || updateInFlightResourceIdRef.current) return;
    const resource = visibleResources.find((item) => item.id === resourceId);
    updateInFlightResourceIdRef.current = resourceId;
    setUpdateInFlightResourceId(resourceId);
    setStatus(`正在同步卡片修改：${resource?.title ?? resourceId}`);
    logWorkbenchInfo("[workbench] resource card edit sync requested", {
      bodyLength: draft.body.length,
      resourceId,
      sourceWorkbenchCardId: resource?.debugMeta?.sourceWorkbenchCardId,
      title: draft.title,
    });

    try {
      await onUpdateWorkbenchResource(resourceId, draft);
      setStatus(`已同步卡片修改：${draft.title}`);
      logWorkbenchInfo("[workbench] resource card edit sync succeeded", {
        resourceId,
        title: draft.title,
        sourceWorkbenchCardId: resource?.debugMeta?.sourceWorkbenchCardId,
      });
    } catch (error) {
      setStatus(`卡片修改同步失败：${resource?.title ?? resourceId}`);
      console.error("[workbench] resource card edit sync failed", {
        resourceId,
        title: resource?.title,
        sourceWorkbenchCardId: resource?.debugMeta?.sourceWorkbenchCardId,
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

  function togglePaperTheme() {
    const nextTheme: PaperTheme = isWarmPaperTheme ? "default" : "warm";
    setPaperTheme(nextTheme);
    persistPaperTheme(nextTheme);
    setStatus(nextTheme === "warm" ? "纸张模式已开启" : "纸张模式已关闭");
  }

  function toggleReadingFont() {
    const nextFont: ReadingFont = isSerifReadingFont ? "sans" : "serif";
    setReadingFont(nextFont);
    persistReadingFont(nextFont);
    setStatus(nextFont === "serif" ? "已切换为书体阅读字体" : "已切换为系统字体");
  }

  function selectCommentaryLibrary(libraryId: CommentaryLibraryId) {
    if (libraryId === selectedCommentaryLibraryId) {
      const library = commentaryLibraryCatalog.find((item) => item.id === libraryId);
      setStatus(`当前资源库：${library?.title ?? libraryId}`);
      return;
    }

    const next = normalizeSelectedCommentaryLibraryId(libraryId);
    const persisted = persistSelectedCommentaryLibraryId(next);
    setSelectedCommentaryLibraryId(next);
    const library = commentaryLibraryCatalog.find((item) => item.id === next);
    const label = library?.title ?? next;
    setStatus(`已选择资源库：${label}${localPersistenceSuffix(persisted)}`);
    logWorkbenchInfo("[workbench] commentary library selected", {
      libraryId: next,
      selectedCommentaryLibraryId: next,
      persisted,
    });
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
    setStatus(`正在删除并退回待复核：${resource?.title ?? resourceId}`);
    logWorkbenchInfo("[workbench] resource unsync requested", {
      resourceId,
      title: resource?.title,
      sourceWorkbenchCardId: resource?.debugMeta?.sourceWorkbenchCardId,
    });

    try {
      await onUnsyncResource(resourceId);
      setStatus(`已删除并退回待复核：${resource?.title ?? resourceId}`);
      logWorkbenchInfo("[workbench] resource unsync succeeded", {
        resourceId,
        title: resource?.title,
        sourceWorkbenchCardId: resource?.debugMeta?.sourceWorkbenchCardId,
      });
    } catch (error) {
      setUnsyncFailedResourceId(resourceId);
      setStatus(`删除并退回待复核失败：${resource?.title ?? resourceId}`);
      console.error("[workbench] resource unsync failed", {
        resourceId,
        title: resource?.title,
        sourceWorkbenchCardId: resource?.debugMeta?.sourceWorkbenchCardId,
        error,
      });
    } finally {
      unsyncInFlightResourceIdRef.current = null;
      setLocallyUnsyncingResourceId(null);
    }
  }

  function deleteCurrentResourceCard(resourceId: string) {
    const resource = visibleResources.find((item) => item.id === resourceId);
    if (resource?.debugMeta?.sourceWorkbenchCardId && onUnsyncResource) {
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

  function openImagePreview(resource: StudyResource, trigger?: HTMLButtonElement) {
    imagePreviewOpenerRef.current = trigger ?? null;
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

  function setBibleColumnRef(versionId: string, element: HTMLElement | null) {
    if (element) {
      bibleColumnRefs.current.set(versionId, element);
      return;
    }
    bibleColumnRefs.current.delete(versionId);
  }

  function syncBibleColumnScroll(sourceVersionId: string) {
    if (bibleScrollSyncLockRef.current) return;
    const source = bibleColumnRefs.current.get(sourceVersionId);
    if (!source) return;

    const sourceMax = Math.max(source.scrollHeight - source.clientHeight, 0);
    const ratio = sourceMax <= 0 ? 0 : source.scrollTop / sourceMax;
    bibleScrollSyncLockRef.current = true;

    bibleColumnRefs.current.forEach((column, versionId) => {
      if (versionId === sourceVersionId) return;
      const targetMax = Math.max(column.scrollHeight - column.clientHeight, 0);
      column.scrollTop = ratio * targetMax;
    });

    window.requestAnimationFrame(() => {
      bibleScrollSyncLockRef.current = false;
    });
  }

  function startMastheadResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    mastheadResizeSessionRef.current = {
      pointerId: event.pointerId,
      startHeight: mastheadHeight,
      startY: event.clientY,
    };
    setMastheadResizeActive(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic/test environments may not support pointer capture.
    }
  }

  function moveMastheadResize(event: ReactPointerEvent<HTMLDivElement>) {
    const session = mastheadResizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    const nextHeight = Math.round(
      Math.min(220, Math.max(72, session.startHeight + (event.clientY - session.startY))),
    );
    setMastheadHeight(nextHeight);
  }

  function stopMastheadResize(event: ReactPointerEvent<HTMLDivElement>) {
    const session = mastheadResizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    mastheadResizeSessionRef.current = null;
    setMastheadResizeActive(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may not have been acquired.
    }
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
          ref={(element) => setBibleColumnRef(version.id, element)}
          aria-label={isKjv ? "KJV阅读" : "和合本阅读"}
          className={`bible-column bible-column--intro ${isKjv ? "bible-column--kjv" : "bible-column--cuv"}`}
          data-module-id={version.id}
          data-testid="center-module"
          key={version.id}
          onScroll={() => syncBibleColumnScroll(version.id)}
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
        ref={(element) => setBibleColumnRef(version.id, element)}
        aria-label={isKjv ? "KJV阅读" : "和合本阅读"}
        className={`bible-column ${isKjv ? "bible-column--kjv" : "bible-column--cuv"}`}
        data-module-id={version.id}
        data-testid="center-module"
        key={version.id}
        onScroll={() => syncBibleColumnScroll(version.id)}
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
        ref={searchPanelRef}
        className="bible-search-panel"
        role="region"
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          searchInputRef.current?.focus();
          setIsSearchPanelOpen(false);
        }}
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
                <p className="bible-search-panel__empty">
                  已显示 {searchResults.length} / 共 {searchResponse.totalCount} 处结果
                </p>
                {searchResponse.totalCount > searchResults.length ? (
                  <button className="toolbar-button" type="button" onClick={() => {
                    const nextLimit = Math.min(searchDisplayLimit + searchResultLimit, searchResponse.totalCount);
                    setSearchDisplayLimit(nextLimit);
                    setStatus(`已显示 ${nextLimit} / 共 ${searchResponse.totalCount} 处经文`);
                  }}>
                    加载更多结果
                  </button>
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

  const cuvVerses = useMemo(
    () => versions.find((version) => version.id === "cuv")?.verses ?? [],
    [versions],
  );

  return (
    <VersePreviewProvider verses={cuvVerses}>
    <main className={`workbench ${activeResizeSide || mastheadResizeActive ? "is-resizing" : ""}`} data-paper-theme={paperTheme} data-reading-font={readingFont}>
      <header className="toolbar">
        <div className="toolbar__brand" aria-label="One Holy Bible">
          <span className="toolbar__mark" aria-hidden="true">OHB</span>
          <span>One Holy Bible</span>
        </div>
        <div className="toolbar__group" aria-label="当前书卷章节" ref={navigationPickerRef}>
          <button
            ref={bookNavButtonRef}
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
            ref={chapterNavButtonRef}
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
        <div ref={searchFormRef} className="bible-search" role="search" aria-label="经文搜索">
          <Search size={16} />
          <input
            aria-label="搜索经文"
            ref={searchInputRef}
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
          {onOpenReader ? (
            <button
              aria-label="切换到阅读模式"
              className="toolbar-button"
              title="切换到阅读模式"
              type="button"
              onClick={() => onOpenReader(selectedVerseId)}
            >
              <BookOpen size={16} />
              阅读
            </button>
          ) : null}
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
                  role={refreshStatus === "error" ? "alert" : "status"}
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
            gridTemplateColumns: `minmax(${leftDockTrackMinWidth}px, ${leftDockWidth}px) ${dockResizeHandleWidth}px minmax(${readerMinWidth}px, 1fr) ${dockResizeHandleWidth}px minmax(${rightDockTrackMinWidth}px, ${rightDockWidth}px)`,
          }}
        >
          <ResourceDock
            collapsedOrganizedResourceIds={collapsedCenterCardIds}
            selectedCommentaryLibraryId={selectedCommentaryLibraryId}
            layout={layout}
            onCopyStatus={setStatus}
            onEditResource={editResourceCopy}
            onNavigateToResource={navigateToResourceTarget}
            onOpenImageResource={openImagePreview}
            onOpenResource={openResourceInCenter}
            onUnsyncResource={unsyncResource}
            onUpdateWorkbenchResource={updateWorkbenchResourceCopy}
            onRemoveOrganizedResource={removeCenterResourceCard}
            onSelectCommentaryLibrary={selectCommentaryLibrary}
            onToggleDock={toggleDock}
            onToggleOrganizedResource={toggleCenterResourceCard}
            organizedResources={centerCardResources}
            rightResources={filteredCurrentResources}
            selectedSourceId={selectedSourceId}
            sourceIdForResource={sourceIdForResource}
            side="left"
            isWarmPaperTheme={isWarmPaperTheme}
            isSerifReadingFont={isSerifReadingFont}
            onTogglePaperTheme={togglePaperTheme}
            onToggleReadingFont={toggleReadingFont}
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
          <section
            className="reader-pane"
            aria-label="双译本阅读区"
            data-masthead-size={mastheadSize}
            style={{ "--reader-masthead-height": `${mastheadHeight}px` } as CSSProperties}
          >
            <header className="reader-pane__masthead">
              {(() => {
                const canGoPrevious = selectedIntroBook
                  ? false
                  : currentChapterNumbers.indexOf(currentChapter) > 0;
                const canGoNext = selectedIntroBook
                  ? currentChapterNumbers.length > 0
                  : currentChapterNumbers.indexOf(currentChapter) >= 0
                    && currentChapterNumbers.indexOf(currentChapter) < currentChapterNumbers.length - 1;

                return (
                  <>
                    <button
                      aria-label="上一章"
                      className={`reader-pane__chapter-zone reader-pane__chapter-zone--previous ${canGoPrevious ? "" : "is-disabled"}`}
                      disabled={!canGoPrevious}
                      type="button"
                      onClick={() => stepChapter(-1)}
                    >
                      <span className="reader-pane__chapter-button">
                        <ChevronLeft size={16} />
                        上一章
                      </span>
                    </button>
                    <div className="reader-pane__title">
                      <h1>{currentChapterLabel}</h1>
                      <div className="reader-pane__selection">
                        <span>{selectedIntroBook ? "当前位置" : "当前经节"}</span>
                        <strong>{selectedIntroBook ? `${bookTitle(selectedIntroBook)}序` : selectedVerseId}</strong>
                      </div>
                    </div>
                    <button
                      aria-label="下一章"
                      className={`reader-pane__chapter-zone reader-pane__chapter-zone--next ${canGoNext ? "" : "is-disabled"}`}
                      disabled={!canGoNext}
                      type="button"
                      onClick={() => stepChapter(1)}
                    >
                      <span className="reader-pane__chapter-button">
                        下一章
                        <ChevronRight size={16} />
                      </span>
                    </button>
                  </>
                );
              })()}
              <div
                aria-label="调整阅读台顶栏高度"
                aria-orientation="horizontal"
                aria-valuemax={220}
                aria-valuemin={72}
                aria-valuenow={mastheadHeight}
                className={`reader-pane__masthead-resize-handle ${mastheadResizeActive ? "is-active" : ""}`}
                role="separator"
                tabIndex={0}
                title="上下拖动调整顶栏高度"
                onPointerCancel={stopMastheadResize}
                onPointerDown={startMastheadResize}
                onPointerMove={moveMastheadResize}
                onPointerUp={stopMastheadResize}
              />
            </header>
            {selectedIntroBook && bookIntroView ? (
              <BookIntroStableGrid
                view={bookIntroView}
                sourceIdForResource={sourceIdForResource}
                onDeleteResource={deleteCurrentResourceCard}
                onEditResource={editResourceCopy}
                onNavigateToResource={navigateToResourceTarget}
                onOpenImageResource={openImagePreview}
                onOpenResource={openResourceInCenter}
                onUnsyncResource={unsyncResource}
                onUpdateWorkbenchResource={updateWorkbenchResourceCopy}
                onCopyStatus={setStatus}
                unsyncingResourceId={activeUnsyncingResourceId}
                unsyncFailedResourceId={unsyncFailedResourceId}
                hasAnyUnsyncInFlight={hasAnyUnsyncInFlight}
                updateInFlightResourceId={updateInFlightResourceId}
              />
            ) : (
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
            )}
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
            selectedCommentaryLibraryId={selectedCommentaryLibraryId}
            layout={layout}
            onCopyStatus={setStatus}
            onEditResource={editResourceCopy}
            onNavigateToResource={navigateToResourceTarget}
            onOpenImageResource={openImagePreview}
            onOpenResource={openResourceInCenter}
            onUnsyncResource={unsyncResource}
            onUpdateWorkbenchResource={updateWorkbenchResourceCopy}
            onRemoveOrganizedResource={removeCenterResourceCard}
            onSelectCommentaryLibrary={selectCommentaryLibrary}
            onToggleDock={toggleDock}
            onToggleOrganizedResource={toggleCenterResourceCard}
            organizedResources={centerCardResources}
            rightResources={filteredCurrentResources}
            selectedSourceId={selectedSourceId}
            sourceIdForResource={sourceIdForResource}
            side="right"
            isCardSearchActive={Boolean(cardSearchQuery)}
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
                ref={imagePreviewCloseRef}
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
                data-paper-blend={shouldBlendImageWithPaper(previewImageResource) ? "true" : undefined}
                {...imageDimensionsFromAssetPath(previewImageResource.assetPath)}
              />
            </div>
            {imageResourceCaption(previewImageResource) ? (
              <figcaption>{imageResourceCaption(previewImageResource)}</figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}

      <p className={`workbench-status toolbar-refresh-status toolbar-refresh-status--${status.includes("失败") ? "error" : "success"}`}
        role="status" aria-live="polite" aria-atomic="true">
        {status}
      </p>
    </main>
    </VersePreviewProvider>
  );
}
