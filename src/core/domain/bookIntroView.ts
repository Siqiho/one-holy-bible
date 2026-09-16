import { bibleBooks, bookTitle, englishBookTitle } from "./bibleBooks";
import type { StudyResource } from "./resources";
import { parseVerseId } from "./verse";

export type BookIntroLaneId = "context" | "message" | "structure";

export interface BookIntroViewItem {
  resource: StudyResource;
  sharedFromBookId?: string;
}

export interface BookIntroLane {
  id: BookIntroLaneId;
  eyebrow: string;
  title: string;
  description: string;
  items: BookIntroViewItem[];
}

export interface BookIntroViewModel {
  bookId: string;
  chineseTitle: string;
  englishTitle: string;
  totalCount: number;
  lanes: BookIntroLane[];
}

const FORMAL_INTRO_ID = /^study-bible-[a-z0-9]+-intro-/i;
const CONTEXT_PATTERN = /作者|书名|写作时间|大事年表|年表|写作目的|缘起|背景|文本/;
const STRUCTURE_PATTERN = /文学特征|大纲|结构/;

const LANE_COPY: Record<BookIntroLaneId, Omit<BookIntroLane, "items">> = {
  context: {
    id: "context",
    eyebrow: "背景",
    title: "处境与源流",
    description: "作者、书名、写作时间、背景与文本线索。",
  },
  message: {
    id: "message",
    eyebrow: "信息",
    title: "主题与信息",
    description: "主题、神学重点与书卷信息。",
  },
  structure: {
    id: "structure",
    eyebrow: "结构",
    title: "文学与结构",
    description: "文学特征、大纲与结构线索。",
  },
};

const LANE_ORDER: BookIntroLaneId[] = ["context", "message", "structure"];

const SHARED_INTRO_SOURCE: Readonly<Record<string, string>> = {
  "2Sam": "1Sam",
  "2Kgs": "1Kgs",
  "2Chr": "1Chr",
};

function classifyIntroTitle(title: string): BookIntroLaneId {
  if (STRUCTURE_PATTERN.test(title)) return "structure";
  if (CONTEXT_PATTERN.test(title)) return "context";
  return "message";
}

export function buildBookIntroView(resources: StudyResource[], bookId: string): BookIntroViewModel {
  const byLane = new Map<BookIntroLaneId, BookIntroViewItem[]>(
    LANE_ORDER.map((laneId) => [laneId, []]),
  );
  const seenResourceIds = new Set<string>();

  for (const resource of sortedIntroResources(resources)) {
    if (seenResourceIds.has(resource.id)) continue;
    const resolvedBookId = resolveResourceBookId(resource);
    const sharedFromBookId = sharedProjectionSource(bookId, resolvedBookId, classifyIntroTitle(resource.title));

    if (resolvedBookId !== bookId && !sharedFromBookId) continue;

    seenResourceIds.add(resource.id);
    byLane.get(classifyIntroTitle(resource.title))!.push(
      sharedFromBookId ? { resource, sharedFromBookId } : { resource },
    );
  }

  const lanes = LANE_ORDER.map((laneId) => ({
    ...LANE_COPY[laneId],
    items: byLane.get(laneId)!,
  }));

  return {
    bookId,
    chineseTitle: bookTitle(bookId),
    englishTitle: englishBookTitle(bookId),
    totalCount: lanes.reduce((count, lane) => count + lane.items.length, 0),
    lanes,
  };
}

function sharedProjectionSource(
  requestedBookId: string,
  resolvedBookId: string | undefined,
  laneId: BookIntroLaneId,
) {
  const sourceBookId = SHARED_INTRO_SOURCE[requestedBookId];
  if (!sourceBookId || resolvedBookId !== sourceBookId) return undefined;
  if (requestedBookId !== "2Chr" && laneId === "structure") return undefined;
  return sourceBookId;
}

function sortedIntroResources(resources: StudyResource[]) {
  return [...resources]
    .filter((resource) => FORMAL_INTRO_ID.test(resource.id))
    .sort(compareIntroResources);
}

function compareIntroResources(left: StudyResource, right: StudyResource) {
  return (
    pageOrder(left) - pageOrder(right)
    || parsedIdPart(left.id, "p") - parsedIdPart(right.id, "p")
    || parsedIdPart(left.id, "n") - parsedIdPart(right.id, "n")
    || left.id.localeCompare(right.id)
  );
}

function pageOrder(resource: StudyResource) {
  return resource.debugMeta?.page ?? Number.MAX_SAFE_INTEGER;
}

function parsedIdPart(id: string, part: "p" | "n") {
  return Number(id.match(new RegExp(`-${part}(\\d+)`, "i"))?.[1] ?? Number.MAX_SAFE_INTEGER);
}

function resolveResourceBookId(resource: StudyResource) {
  for (const verseId of [resource.primaryAnchor, ...(resource.verses ?? [])]) {
    if (!verseId) continue;
    try {
      const parsed = parseVerseId(verseId);
      if (bibleBooks.some((book) => book.id === parsed.book)) return parsed.book;
    } catch {
      continue;
    }
  }
  return undefined;
}
