import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { loadDoreChapterArtworkByChapter, type DoreChapterArtwork } from "../data/doreChapterArtwork";
import type { BibleVersion, BibleVerse } from "../domain/bible";
import { bibleBooks, bookTitle, chaptersForBook, englishBookTitle, getBibleBook } from "../domain/bibleBooks";
import type { StudyResource } from "../domain/resources";
import { verseIdFromParts } from "../domain/verse";
import { createVerseResourceIndex } from "../lib/backlinks";
import { formatTextResourceBody } from "../lib/formatTextResourceBody";
import { ScriptureLinkedText } from "./ScriptureLinkedText";
import { VersePreviewProvider } from "./VersePreviewContext";
import { readerPositionStorageKey, storedReaderPosition, type ReaderPosition } from "../data/readerPosition";
import { ResourceImage } from "./ResourceImage";

export { readerPositionStorageKey, type ReaderPosition };
export const readerPrefsStorageKey = "one-holy-bible-public-reader-prefs";

export interface ReaderViewProps {
  versions: BibleVersion[];
  resources: StudyResource[];
  initialPosition?: ReaderPosition | null;
  onRequestBook?: (bookId: string) => Promise<void>;
  onExitReader?: (position: ReaderPosition) => void;
}

interface ReaderPrefs {
  railOpen: boolean;
  showKjv: boolean;
  fontSize: number;
  marginWidth: number;
}

const defaultPrefs: ReaderPrefs = { railOpen: false, showKjv: true, fontSize: 21, marginWidth: 340 };
const minFontSize = 18;
const maxFontSize = 25;
const minMarginWidth = 260;
const maxMarginWidth = 560;
const marginKeyboardStep = 16;
const minPeekSplit = 22;
const maxPeekSplit = 62;
const defaultPeekSplit = 34;
const peekSplitStep = 4;

function clampMarginWidth(value: number): number {
  return Math.min(maxMarginWidth, Math.max(minMarginWidth, Math.round(value)));
}

function clampPeekSplit(value: number): number {
  return Math.min(maxPeekSplit, Math.max(minPeekSplit, Math.round(value)));
}

const resourceTypeLabels: Record<string, string> = {
  commentary: "注释",
  image: "图片",
  note: "笔记",
  link: "百科",
  video: "视频",
  html: "互动",
};

function resourceTypeLabel(resource: StudyResource): string {
  return resourceTypeLabels[resource.type] ?? "资源";
}

function isEncyclopediaCard(resource: StudyResource): boolean {
  return resource.type === "link";
}

function sourceMetaLabel(resource: StudyResource): string | null {
  if (!isEncyclopediaCard(resource)) return null;
  const type = resourceTypeLabel(resource);
  return resource.source ? `${type} · ${resource.source}` : type;
}

function resolveInitialPosition(preferred?: ReaderPosition | null): ReaderPosition {
  if (preferred && getBibleBook(preferred.book)) {
    const chapterCount = chaptersForBook(preferred.book);
    const chapter = preferred.chapter >= 1 && preferred.chapter <= chapterCount ? preferred.chapter : 1;
    const verse = preferred.verse >= 1 ? preferred.verse : 1;
    return { book: preferred.book, chapter, verse };
  }
  return storedReaderPosition();
}

function storedPrefs(): ReaderPrefs {
  try {
    const raw = window.localStorage.getItem(readerPrefsStorageKey);
    if (!raw) return defaultPrefs;
    const parsed = JSON.parse(raw) as Partial<ReaderPrefs>;
    return {
      railOpen: typeof parsed.railOpen === "boolean" ? parsed.railOpen : defaultPrefs.railOpen,
      showKjv: typeof parsed.showKjv === "boolean" ? parsed.showKjv : defaultPrefs.showKjv,
      fontSize: typeof parsed.fontSize === "number"
        ? Math.min(maxFontSize, Math.max(minFontSize, parsed.fontSize))
        : defaultPrefs.fontSize,
      marginWidth: typeof parsed.marginWidth === "number"
        ? clampMarginWidth(parsed.marginWidth)
        : defaultPrefs.marginWidth,
    };
  } catch {
    return defaultPrefs;
  }
}

function persistJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function isInteractiveShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(
    "button, a, summary, input, textarea, select, [contenteditable=true], [role='button'], [role='tab'], [role='menuitem'], [role='link'], [role='option'], [role='switch'], [role='checkbox'], [role='separator']",
  ));
}

/** Span of a resource inside the current chapter, for the coverage badge. */
function chapterSpan(resource: StudyResource, book: string, chapter: number): { start: number; end: number } | null {
  const inChapter = resource.verses
    .map((verseId) => {
      const [verseBook, verseChapter, verseNumber] = verseId.split(".");
      if (verseBook !== book || Number(verseChapter) !== chapter) return null;
      return Number(verseNumber);
    })
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (!inChapter.length) return null;
  return { start: Math.min(...inChapter), end: Math.max(...inChapter) };
}

function isChapterRangeResource(resource: StudyResource, book: string, chapter: number): boolean {
  const span = chapterSpan(resource, book, chapter);
  return span !== null && span.end > span.start;
}

/** Margin snippets are plain text, so unwrap [[wiki links]] to their labels. */
function marginSnippet(resource: StudyResource): string {
  const raw = (resource.summary ?? resource.body).replace(/\[\[([^\]]+)\]\]/g, "$1");
  return raw.length > 92 ? `${raw.slice(0, 92)}…` : raw;
}

/** Unread previews keep every verse card; image cards always take priority over text cards. */
function pickMarginalia(cards: StudyResource[]): StudyResource[] {
  const images = cards.filter((card) => card.type === "image" && card.assetPath);
  const texts = cards.filter((card) => !(card.type === "image" && card.assetPath));
  return [...images, ...texts];
}

interface VerseCardKinds {
  text: boolean;
  image: boolean;
  html: boolean;
}

function emptyVerseCardKinds(): VerseCardKinds {
  return { text: false, image: false, html: false };
}

function kindsFromResources(cards: StudyResource[]): VerseCardKinds {
  const kinds = emptyVerseCardKinds();
  for (const resource of cards) {
    if (resource.type === "image") kinds.image = true;
    else if (resource.type === "html") kinds.html = true;
    else kinds.text = true;
  }
  return kinds;
}

function hasAnyKind(kinds: VerseCardKinds): boolean {
  return kinds.text || kinds.image || kinds.html;
}

function kindsKey(kinds: VerseCardKinds): string {
  return [
    kinds.text ? "text" : null,
    kinds.image ? "image" : null,
    kinds.html ? "html" : null,
  ].filter(Boolean).join(" ");
}

function kindsTitle(kinds: VerseCardKinds): string {
  if (kinds.text && kinds.image && kinds.html) return "本节有文字、图片与互动卡片";
  if (kinds.text && kinds.image) return "本节有文字与图片卡片";
  if (kinds.text && kinds.html) return "本节有文字与互动卡片";
  if (kinds.image && kinds.html) return "本节有图片与互动卡片";
  if (kinds.image) return "本节有图片卡片";
  if (kinds.html) return "本节有互动卡片";
  return "本节有文字卡片";
}

function VerseGutterMarks({ verse, kinds }: { verse: number; kinds: VerseCardKinds }) {
  if (!hasAnyKind(kinds)) return null;
  return (
    <span
      className="reader-verse__marks"
      data-testid={`reader-verse-${verse}-marks`}
      data-kinds={kindsKey(kinds)}
      title={kindsTitle(kinds)}
    >
      <span className="reader-verse__dot" aria-hidden="true" />
      {kinds.image ? (
        <span className="reader-verse__mark reader-verse__mark--image" data-testid="reader-verse-mark-image" aria-hidden="true" />
      ) : null}
      {kinds.html ? (
        <span className="reader-verse__mark reader-verse__mark--html" data-testid="reader-verse-mark-html" aria-hidden="true">{`</>`}</span>
      ) : null}
    </span>
  );
}

export function ReaderView({ versions, resources, initialPosition: preferredPosition, onExitReader, onRequestBook }: ReaderViewProps) {
  const initialPosition = useMemo(() => resolveInitialPosition(preferredPosition), [preferredPosition]);
  const initialPrefs = useMemo(storedPrefs, []);
  const [book, setBook] = useState(initialPosition.book);
  const [chapter, setChapter] = useState(initialPosition.chapter);
  const [selectedVerse, setSelectedVerse] = useState(initialPosition.verse);
  const [railOpen, setRailOpen] = useState(initialPrefs.railOpen);
  const [showKjv, setShowKjv] = useState(initialPrefs.showKjv);
  const [fontSize, setFontSize] = useState(initialPrefs.fontSize);
  const [marginWidth, setMarginWidth] = useState(initialPrefs.marginWidth);
  const [booksOpen, setBooksOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"verse" | "chapter">("verse");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [lightbox, setLightbox] = useState<{ src: string; alt: string; caption: string } | null>(null);
  const [peekedResourceId, setPeekedResourceId] = useState<string | null>(null);
  const [helpPinned, setHelpPinned] = useState(false);
  const [helpHovered, setHelpHovered] = useState(false);
  const [peekSplit, setPeekSplit] = useState(defaultPeekSplit);
  const [savePulse, setSavePulse] = useState(false);
  const [doreByChapter, setDoreByChapter] = useState<Map<string, DoreChapterArtwork> | null>(null);
  const [positionSaveFailed, setPositionSaveFailed] = useState(false);
  const [prefsSaveFailed, setPrefsSaveFailed] = useState(false);

  const viewRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const verseRefs = useRef(new Map<number, HTMLDivElement>());
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const savePulseTimer = useRef<number | undefined>(undefined);
  const marginDragRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);
  const splitDragRef = useRef<{ pointerId: number; startY: number; startSplit: number } | null>(null);
  const marginaliaRef = useRef<HTMLDivElement | null>(null);
  const helpRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    loadDoreChapterArtworkByChapter()
      .then((map) => { if (isMounted) setDoreByChapter(map); })
      .catch((error: unknown) => console.error("[reader] failed to load Doré chapter artwork", error));
    return () => { isMounted = false; };
  }, []);

  const cuvVersion = useMemo(
    () => versions.find((version) => version.id === "cuv") ?? versions.find((version) => version.language === "zh"),
    [versions],
  );
  const kjvVersion = useMemo(
    () => versions.find((version) => version.id === "kjv") ?? versions.find((version) => version.language === "en"),
    [versions],
  );

  const chapterCuvVerses = useMemo(
    () => (cuvVersion?.verses ?? [])
      .filter((verse) => verse.book === book && verse.chapter === chapter)
      .sort((a, b) => a.verse - b.verse),
    [book, chapter, cuvVersion],
  );
  const kjvTextByVerse = useMemo(() => {
    const map = new Map<number, string>();
    (kjvVersion?.verses ?? [])
      .filter((verse) => verse.book === book && verse.chapter === chapter)
      .forEach((verse) => map.set(verse.verse, verse.text));
    return map;
  }, [book, chapter, kjvVersion]);

  const verseCount = chapterCuvVerses.length;
  const chapterCount = chaptersForBook(book);
  const chapterVerseIds = useMemo(
    () => chapterCuvVerses.map((verse) => verse.id),
    [chapterCuvVerses],
  );
  // Built once per resource set; chapter/verse lookups then cost O(hits) instead of
  // re-scanning every resource body per verse (Ps 119 × 30k cards was ~1.7 s).
  const resourceIndex = useMemo(() => createVerseResourceIndex(resources), [resources]);
  // Same relation semantics as the workbench chapter dock (anchor, verses, or wiki links in the body).
  const chapterResources = useMemo(
    () => resourceIndex.mentioningAny(chapterVerseIds),
    [chapterVerseIds, resourceIndex],
  );
  const selectedVerseId = useMemo(
    () => verseIdFromParts(book, chapter, selectedVerse),
    [book, chapter, selectedVerse],
  );
  const selectedVerseResources = useMemo(
    () => resourceIndex.mentioning(selectedVerseId),
    [resourceIndex, selectedVerseId],
  );
  const verseCardKinds = useMemo(() => {
    const marked = new Map<number, VerseCardKinds>();
    for (const verse of chapterCuvVerses) {
      const cards = resourceIndex.touching(verse.id);
      if (cards.length) marked.set(verse.verse, kindsFromResources(cards));
    }
    return marked;
  }, [chapterCuvVerses, resourceIndex]);

  const pulseAutosave = useCallback(() => {
    setSavePulse(true);
    window.clearTimeout(savePulseTimer.current);
    savePulseTimer.current = window.setTimeout(() => setSavePulse(false), 1200);
  }, []);

  useEffect(() => {
    setPositionSaveFailed(!persistJson(readerPositionStorageKey, { book, chapter, verse: selectedVerse } satisfies ReaderPosition));
  }, [book, chapter, selectedVerse]);
  useEffect(() => {
    setPrefsSaveFailed(!persistJson(readerPrefsStorageKey, { railOpen, showKjv, fontSize, marginWidth } satisfies ReaderPrefs));
  }, [fontSize, marginWidth, railOpen, showKjv]);
  useEffect(() => () => window.clearTimeout(savePulseTimer.current), []);

  const chapterArtwork = doreByChapter?.get(`${book}.${chapter}`) ?? null;

  /* ---- 边注栏宽度拖拽:拖动中直接写 CSS 变量,松手后落状态并持久化 ---- */
  const applyMarginWidthVar = useCallback((width: number) => {
    viewRef.current?.style.setProperty("--reader-margin-w", `${width}px`);
  }, []);
  const onMarginHandlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    marginDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: marginWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("reader-resizing");
  }, [marginWidth]);
  const onMarginHandlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = marginDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    applyMarginWidthVar(clampMarginWidth(drag.startWidth + (drag.startX - event.clientX)));
  }, [applyMarginWidthVar]);
  const onMarginHandlePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = marginDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    marginDragRef.current = null;
    document.body.classList.remove("reader-resizing");
    const width = clampMarginWidth(drag.startWidth + (drag.startX - event.clientX));
    applyMarginWidthVar(width);
    setMarginWidth(width);
    pulseAutosave();
  }, [applyMarginWidthVar, pulseAutosave]);
  const onMarginHandleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    const width = clampMarginWidth(marginWidth + (event.key === "ArrowLeft" ? marginKeyboardStep : -marginKeyboardStep));
    applyMarginWidthVar(width);
    setMarginWidth(width);
    pulseAutosave();
  }, [applyMarginWidthVar, marginWidth, pulseAutosave]);

  const applyPeekSplitVar = useCallback((value: number) => {
    marginaliaRef.current?.style.setProperty("--reader-peek-split", `${value}%`);
  }, []);
  const onSplitHandlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    splitDragRef.current = { pointerId: event.pointerId, startY: event.clientY, startSplit: peekSplit };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("reader-split-resizing");
  }, [peekSplit]);
  const onSplitHandlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = splitDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const height = marginaliaRef.current?.getBoundingClientRect().height ?? 1;
    applyPeekSplitVar(clampPeekSplit(drag.startSplit + ((event.clientY - drag.startY) / height) * 100));
  }, [applyPeekSplitVar]);
  const onSplitHandlePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = splitDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    splitDragRef.current = null;
    document.body.classList.remove("reader-split-resizing");
    const height = marginaliaRef.current?.getBoundingClientRect().height ?? 1;
    const value = clampPeekSplit(drag.startSplit + ((event.clientY - drag.startY) / height) * 100);
    applyPeekSplitVar(value);
    setPeekSplit(value);
  }, [applyPeekSplitVar]);
  const onSplitHandleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    event.stopPropagation();
    const value = clampPeekSplit(peekSplit + (event.key === "ArrowDown" ? peekSplitStep : -peekSplitStep));
    applyPeekSplitVar(value);
    setPeekSplit(value);
  }, [applyPeekSplitVar, peekSplit]);

  const selectVerse = useCallback((verse: number, options?: { scroll?: boolean }) => {
    setSelectedVerse(verse);
    pulseAutosave();
    if (options?.scroll === false) return;
    const el = verseRefs.current.get(verse);
    if (!el || !scrollRef.current) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < 100 || rect.bottom > window.innerHeight - 60) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [pulseAutosave]);

  const goToChapter = useCallback(async (nextBook: string, nextChapter: number) => {
    if (onRequestBook) {
      try { await onRequestBook(nextBook); } catch { return; }
    }
    const clamped = Math.min(Math.max(1, nextChapter), chaptersForBook(nextBook));
    setBook(nextBook);
    setChapter(clamped);
    setSelectedVerse(1);
    setTypeFilter("全部");
    pulseAutosave();
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pulseAutosave, book, onRequestBook]);

  const openDrawer = useCallback((tab: "verse" | "chapter") => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setDrawerTab(tab);
    setDrawerOpen(true);
  }, []);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    restoreFocusRef.current?.focus();
  }, []);
  const openBooks = useCallback(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setBooksOpen(true);
  }, []);
  const closeBooks = useCallback(() => {
    setBooksOpen(false);
    restoreFocusRef.current?.focus();
  }, []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const closePeek = useCallback(() => setPeekedResourceId(null), []);
  const peekCard = useCallback((resourceId: string) => {
    setPeekedResourceId((current) => (current === resourceId ? null : resourceId));
  }, []);

  useEffect(() => {
    setPeekedResourceId(null);
  }, [book, chapter, selectedVerse]);

  useEffect(() => {
    if (!peekedResourceId) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && marginaliaRef.current?.contains(target)) return;
      setPeekedResourceId(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [peekedResourceId]);

  useEffect(() => {
    if (!helpPinned) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && helpRef.current?.contains(target)) return;
      setHelpPinned(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [helpPinned]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (lightbox) { closeLightbox(); return; }
        if (drawerOpen) { closeDrawer(); return; }
        if (booksOpen) { closeBooks(); return; }
        if (peekedResourceId) { closePeek(); return; }
        if (helpPinned || helpHovered) { setHelpPinned(false); setHelpHovered(false); return; }
        return;
      }
      const target = event.target as HTMLElement | null;
      const isVerseNavigation = target?.closest(".reader-verse") && ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "j", "k"].includes(event.key);
      if (isInteractiveShortcutTarget(target) && !isVerseNavigation) return;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (drawerOpen || booksOpen || lightbox) return;
      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        selectVerse(Math.min(verseCount, selectedVerse + 1));
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        selectVerse(Math.max(1, selectedVerse - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (chapter < chapterCount) goToChapter(book, chapter + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (chapter > 1) goToChapter(book, chapter - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        openDrawer("verse");
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [book, booksOpen, chapter, chapterCount, closeBooks, closeDrawer, closeLightbox, closePeek, drawerOpen, goToChapter, helpHovered, helpPinned, lightbox, openDrawer, peekedResourceId, selectVerse, selectedVerse, verseCount]);

  const peekedResource = peekedResourceId
    ? selectedVerseResources.find((resource) => resource.id === peekedResourceId) ?? null
    : null;
  const marginaliaCards = pickMarginalia(selectedVerseResources);

  const drawerCards = drawerTab === "verse" ? selectedVerseResources : chapterResources;
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>([["全部", drawerCards.length]]);
    for (const card of drawerCards) {
      const label = resourceTypeLabel(card);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return counts;
  }, [drawerCards]);
  const filteredDrawerCards = drawerCards.filter(
    (card) => typeFilter === "全部" || resourceTypeLabel(card) === typeFilter,
  );
  const drawerRangeCards = drawerTab === "chapter"
    ? filteredDrawerCards.filter((card) => isChapterRangeResource(card, book, chapter))
    : [];
  const drawerVerseGroups = useMemo(() => {
    if (drawerTab !== "chapter") return [];
    const groups = new Map<number, StudyResource[]>();
    for (const card of filteredDrawerCards) {
      if (isChapterRangeResource(card, book, chapter)) continue;
      const span = chapterSpan(card, book, chapter);
      const verse = span?.start ?? selectedVerse;
      const bucket = groups.get(verse) ?? [];
      bucket.push(card);
      groups.set(verse, bucket);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [book, chapter, drawerTab, filteredDrawerCards, selectedVerse]);

  const chineseTitle = bookTitle(book);
  const englishTitle = englishBookTitle(book);
  const referenceLabel = `${chineseTitle} ${chapter}:${selectedVerse}`;

  function renderCard(resource: StudyResource) {
    const range = isChapterRangeResource(resource, book, chapter) ? chapterSpan(resource, book, chapter) : null;
    const isImage = resource.type === "image" && Boolean(resource.assetPath);
    return (
      <article key={resource.id} className={`reader-card${isImage ? " reader-card--image" : ""}`} data-testid="reader-card">
        <div className="reader-card__meta">
          <span className={`reader-card__type${isImage ? " reader-card__type--image" : ""}`}>{resourceTypeLabel(resource)}</span>
          {resource.source ? <span>{resource.source}</span> : null}
          {range
            ? <span className="reader-card__cover">覆盖 {chapter}:{range.start}-{range.end}</span>
            : <span>{chineseTitle} {chapter}:{chapterSpan(resource, book, chapter)?.start ?? selectedVerse}</span>}
        </div>
        {isImage ? (
          <button
            className="reader-card__figure"
            type="button"
            title="查看大图"
            onClick={() => {
              restoreFocusRef.current = document.activeElement as HTMLElement | null;
              setLightbox({ src: resource.assetPath!, alt: resource.title, caption: resource.summary ?? resource.title });
            }}
          >
            <ResourceImage src={resource.assetPath} alt={resource.title} loading="lazy" />
          </button>
        ) : null}
        <h4>{resource.title}</h4>
        {isImage && (resource.summary ?? resource.body).trim() ? (
          <p className="reader-card__caption">{resource.summary ?? resource.body}</p>
        ) : null}
        {resource.type === "html" && !resource.assetPath ? (
          <p className="reader-card__placeholder">互动内容尚未提供</p>
        ) : resource.type === "video" && !resource.assetPath ? (
          <p className="reader-card__placeholder">视频尚未提供</p>
        ) : !isImage && resource.body.trim() ? (
          <div className="reader-card__body">
            <ScriptureLinkedText
              text={formatTextResourceBody(resource.body)}
              sourceBookId={book}
              sourceChapter={chapter}
            />
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <VersePreviewProvider verses={(cuvVersion?.verses ?? []) as ReadonlyArray<Pick<BibleVerse, "id" | "text">>}>
      <div
        ref={viewRef}
        className={`reader-view${railOpen ? " reader-view--rail-open" : ""}`}
        style={{ "--reader-font-size": `${fontSize}px`, "--reader-margin-w": `${marginWidth}px` } as CSSProperties}
      >
        <header className="reader-topbar">
          {onExitReader ? (
            <button
              className="reader-topbar__btn"
              type="button"
              aria-label="返回工作台"
              title="返回工作台"
              onClick={() => onExitReader({ book, chapter, verse: selectedVerse })}
            >
              ⊞ 工作台
            </button>
          ) : null}
          <span className="reader-topbar__loc">
            {chineseTitle} {chapter}
            <span className="reader-topbar__loc-en">{englishTitle}</span>
          </span>
          <div className="reader-topbar__actions">
            <button
              className="reader-topbar__btn reader-topbar__cards"
              type="button"
              aria-label="查看本节卡片"
              title="查看本节卡片"
              onClick={() => openDrawer("verse")}
            >
              本节卡片 {selectedVerseResources.length}
            </button>
            <button
              className="reader-topbar__btn"
              type="button"
              aria-pressed={showKjv}
              title="显示/隐藏英文对照"
              onClick={() => { setShowKjv((value) => !value); pulseAutosave(); }}
            >
              英文对照
            </button>
            <span className="reader-stepper" role="group" aria-label="经文字号">
              <button type="button" aria-label="减小字号" disabled={fontSize <= minFontSize} onClick={() => { setFontSize((v) => Math.max(minFontSize, v - 1)); pulseAutosave(); }}>−</button>
              <button type="button" aria-label="增大字号" disabled={fontSize >= maxFontSize} onClick={() => { setFontSize((v) => Math.min(maxFontSize, v + 1)); pulseAutosave(); }}>+</button>
            </span>
            <span className={`reader-autosave${positionSaveFailed || prefsSaveFailed ? "" : savePulse ? " reader-autosave--pulse" : ""}`} role="status">
              <span className="reader-autosave__dot" aria-hidden="true" />
              {positionSaveFailed || prefsSaveFailed ? "未能保存到本机" : "已自动保存"}
            </span>
          </div>
        </header>

        {railOpen ? (
          <nav className="reader-rail" aria-label="卷章节导航">
            <div className="reader-rail__head">
              <button className="reader-rail__book" type="button" onClick={openBooks}>
                {chineseTitle} <span aria-hidden="true">▾</span>
              </button>
              <button className="reader-rail__collapse" type="button" aria-label="收起导航" onClick={() => { setRailOpen(false); pulseAutosave(); }}>‹</button>
            </div>
            <h4>章 · {chapterCount}</h4>
            <div className="reader-num-grid" role="group" aria-label="章">
              {Array.from({ length: chapterCount }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-current={value === chapter}
                  onClick={() => goToChapter(book, value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <h4>节 · {verseCount} <span className="reader-rail__hint">(· 文字 · ▭ 图片 · {"</>"} 互动)</span></h4>
            <div className="reader-num-grid" role="group" aria-label="节">
              {chapterCuvVerses.map((verse) => {
                const kinds = verseCardKinds.get(verse.verse);
                return (
                  <button
                    key={verse.verse}
                    type="button"
                    aria-current={verse.verse === selectedVerse}
                    title={kinds ? `${chapter}:${verse.verse} · ${kindsTitle(kinds)}` : `${chapter}:${verse.verse}`}
                    onClick={() => selectVerse(verse.verse)}
                  >
                    {verse.verse}
                    {kinds ? <span className="reader-num-grid__dot" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </nav>
        ) : (
          <div className="reader-spine">
            <button className="reader-spine__open" type="button" aria-label="展开导航" onClick={() => { setRailOpen(true); pulseAutosave(); }}>›</button>
            <button className="reader-spine__title" type="button" title="展开导航" onClick={() => { setRailOpen(true); pulseAutosave(); }}>
              {chineseTitle} · 第{chapter}章
            </button>
          </div>
        )}

        <button
          className="reader-edge-nav reader-edge-nav--prev"
          type="button"
          aria-label="上一章"
          disabled={chapter <= 1}
          onClick={() => goToChapter(book, chapter - 1)}
        >
          ‹
        </button>
        <button
          className="reader-edge-nav reader-edge-nav--next"
          type="button"
          aria-label="下一章"
          disabled={chapter >= chapterCount}
          onClick={() => goToChapter(book, chapter + 1)}
        >
          ›
        </button>

        <div className="reader-scroll" ref={scrollRef}>
          <div className="reader-page">
            <div className="reader-folio">
              <h1 className="reader-chapter-title">
                <span className="reader-chapter-title__num">{chapter}</span>
                <span className="reader-chapter-title__name">{chineseTitle}</span>
                <span className="reader-chapter-title__en">{englishTitle}</span>
              </h1>
              <p className="reader-chapter-sub">和合本{showKjv ? " · KJV 对照" : ""} · 点选经节,右侧浮现该节边注</p>
              {chapterArtwork ? (
                <button
                  className="reader-chapter-art"
                  type="button"
                  title="查看大图"
                  data-testid="reader-chapter-art"
                  onClick={() => {
                    restoreFocusRef.current = document.activeElement as HTMLElement | null;
                    setLightbox({
                      src: chapterArtwork.assetPath,
                      alt: chapterArtwork.title,
                      caption: `多雷《圣经》插图 · ${chapterArtwork.title}`,
                    });
                  }}
                >
                  <ResourceImage src={chapterArtwork.assetPath} alt={`多雷《圣经》插图:${chapterArtwork.title}`} />
                  <span className="reader-chapter-art__caption">多雷《圣经》插图 · {chapterArtwork.title}</span>
                </button>
              ) : null}
              <div>
                {chapterCuvVerses.map((verse) => (
                  <div
                    key={verse.id}
                    ref={(el) => {
                      if (el) verseRefs.current.set(verse.verse, el);
                      else verseRefs.current.delete(verse.verse);
                    }}
                    className="reader-verse"
                    role="button"
                    tabIndex={0}
                    aria-current={verse.verse === selectedVerse}
                    data-testid={`reader-verse-${verse.verse}`}
                    onClick={() => selectVerse(verse.verse, { scroll: false })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && verse.verse === selectedVerse) openDrawer("verse");
                    }}
                  >
                    <span className="reader-verse__index">
                      <span className="reader-verse__num">{verse.verse}</span>
                      <VerseGutterMarks verse={verse.verse} kinds={verseCardKinds.get(verse.verse) ?? emptyVerseCardKinds()} />
                    </span>
                    <span className="reader-verse__cuv">{verse.text}</span>
                    {showKjv && kjvTextByVerse.has(verse.verse) ? (
                      <span className="reader-verse__kjv">{kjvTextByVerse.get(verse.verse)}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="reader-margin">
              <div
                className="reader-margin__handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="调整边注栏宽度"
                aria-valuemin={minMarginWidth}
                aria-valuemax={maxMarginWidth}
                aria-valuenow={marginWidth}
                tabIndex={0}
                title="拖动或按 ← → 调整边注栏宽度"
                onPointerDown={onMarginHandlePointerDown}
                onPointerMove={onMarginHandlePointerMove}
                onPointerUp={onMarginHandlePointerEnd}
                onPointerCancel={onMarginHandlePointerEnd}
                onKeyDown={onMarginHandleKeyDown}
              />
              <div
                ref={marginaliaRef}
                className={`reader-marginalia${peekedResource ? " reader-marginalia--peek" : ""}`}
                data-testid="reader-marginalia"
                data-peeking={peekedResource ? "true" : undefined}
                style={{ "--reader-peek-split": `${peekSplit}%` } as CSSProperties}
              >
                <div className="reader-marginalia__list">
                  <div className="reader-marginalia__ref">{referenceLabel} 边注</div>
                  {selectedVerseResources.length === 0 ? (
                    <div className="reader-marginalia__empty">本节暂无卡片。左栏节号带圆点的有内容。</div>
                  ) : peekedResource ? (
                    <div className="reader-marginalia__strip" data-testid="reader-marginalia-strip">
                      {pickMarginalia(selectedVerseResources).map((resource) => {
                        const isImage = resource.type === "image" && Boolean(resource.assetPath);
                        return (
                          <button
                            key={resource.id}
                            className={`reader-marginalia__thumb${isImage ? " reader-marginalia__thumb--image" : ""}`}
                            type="button"
                            aria-current={peekedResource.id === resource.id}
                            title={resource.title}
                            onClick={() => peekCard(resource.id)}
                          >
                            {isImage ? (
                              <span className="reader-marginalia__thumb-media">
                                <ResourceImage src={resource.assetPath} alt={resource.title} />
                                <span className="reader-marginalia__thumb-copy">
                                  <span className="reader-marginalia__thumb-title">{resource.title}</span>
                                </span>
                              </span>
                            ) : (
                              <span className="reader-marginalia__thumb-title">{resource.title}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    marginaliaCards.map((resource) => {
                      const range = isChapterRangeResource(resource, book, chapter) ? chapterSpan(resource, book, chapter) : null;
                      if (resource.type === "image" && resource.assetPath) {
                        return (
                          <button
                            key={resource.id}
                            className="reader-marginalia__item reader-marginalia__item--image"
                            type="button"
                            onClick={() => peekCard(resource.id)}
                          >
                            <ResourceImage src={resource.assetPath} alt={resource.title} />
                            <span className="reader-marginalia__title">{resource.title}</span>
                          </button>
                        );
                      }
                      return (
                        <button
                          key={resource.id}
                          className="reader-marginalia__item"
                          type="button"
                          onClick={() => peekCard(resource.id)}
                        >
                          {sourceMetaLabel(resource) || range ? (
                            <span className="reader-marginalia__kind">
                              {sourceMetaLabel(resource)}
                              {range ? <span className="reader-marginalia__cover">覆盖 {chapter}:{range.start}-{range.end}</span> : null}
                            </span>
                          ) : null}
                          <span className="reader-marginalia__title">{resource.title}</span>
                          <span className="reader-marginalia__body">{marginSnippet(resource)}</span>
                        </button>
                      );
                    })
                  )}
                </div>
                {peekedResource ? (
                  <>
                    <div
                      className="reader-marginalia__split"
                      role="separator"
                      aria-orientation="horizontal"
                      aria-label="调整边注预览高度"
                      aria-valuemin={minPeekSplit}
                      aria-valuemax={maxPeekSplit}
                      aria-valuenow={peekSplit}
                      tabIndex={0}
                      title="拖动或按 ↑ ↓ 调整预览高度"
                      onPointerDown={onSplitHandlePointerDown}
                      onPointerMove={onSplitHandlePointerMove}
                      onPointerUp={onSplitHandlePointerEnd}
                      onPointerCancel={onSplitHandlePointerEnd}
                      onKeyDown={onSplitHandleKeyDown}
                    />
                    <div className="reader-marginalia__peek" data-testid="reader-marginalia-peek">
                      {renderCard(peekedResource)}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {(drawerOpen || booksOpen) ? (
          <div
            className="reader-scrim"
            onClick={() => {
              if (drawerOpen) closeDrawer();
              if (booksOpen) closeBooks();
            }}
          />
        ) : null}

        {drawerOpen ? (
          <aside className="reader-drawer" role="dialog" aria-modal="true" aria-label="卡片" onKeyDown={trapDialogFocus}>
            <div className="reader-drawer__head">
              <div className="reader-drawer__row">
                <strong>{drawerTab === "verse" ? referenceLabel : `${chineseTitle} ${chapter} 章`}</strong>
                <span className="reader-drawer__sub">
                  {drawerTab === "verse" ? `本节相关 ${selectedVerseResources.length} 张` : `本章全部 ${chapterResources.length} 张`}
                </span>
                <button className="reader-drawer__close" type="button" title="关闭(Esc)" autoFocus onClick={closeDrawer}>✕ 关闭</button>
              </div>
              <div className="reader-drawer__tabs" role="tablist">
                <button role="tab" type="button" aria-selected={drawerTab === "verse"} onClick={() => { setDrawerTab("verse"); setTypeFilter("全部"); }}>本节</button>
                <button role="tab" type="button" aria-selected={drawerTab === "chapter"} onClick={() => { setDrawerTab("chapter"); setTypeFilter("全部"); }}>本章</button>
              </div>
            </div>
            <div className="reader-drawer__chips">
              {[...typeCounts.entries()].map(([label, count]) => (
                <button
                  key={label}
                  className="reader-chip"
                  type="button"
                  aria-pressed={typeFilter === label}
                  onClick={() => setTypeFilter(label)}
                >
                  {label} {count}
                </button>
              ))}
            </div>
            <div className="reader-drawer__body">
              {drawerTab === "verse" ? (
                filteredDrawerCards.length
                  ? filteredDrawerCards.map((resource) => renderCard(resource))
                  : <p className="reader-drawer__empty">当前筛选下本节没有卡片。</p>
              ) : (
                <>
                  {drawerRangeCards.length ? (
                    <>
                      <div className="reader-drawer__group-head">
                        <span>跨节 · 结构与导读</span>
                        <span className="reader-drawer__group-count">{drawerRangeCards.length} 张</span>
                      </div>
                      {drawerRangeCards.map((resource) => renderCard(resource))}
                    </>
                  ) : null}
                  {drawerVerseGroups.map(([verse, cards]) => (
                    <div key={verse}>
                      <div className={`reader-drawer__group-head${verse === selectedVerse ? " reader-drawer__group-head--current" : ""}`}>
                        <span>{chineseTitle} {chapter}:{verse}</span>
                        <span className="reader-drawer__group-count">{cards.length} 张</span>
                        <button type="button" className="reader-drawer__goto" onClick={() => selectVerse(verse)}>定位经文 ↖</button>
                      </div>
                      {cards.map((resource) => renderCard(resource))}
                    </div>
                  ))}
                  {!drawerRangeCards.length && !drawerVerseGroups.length ? (
                    <p className="reader-drawer__empty">当前筛选下本章没有卡片。</p>
                  ) : null}
                </>
              )}
            </div>
          </aside>
        ) : null}

        {booksOpen ? (
          <aside className="reader-books" role="dialog" aria-modal="true" aria-label="选择书卷" onKeyDown={trapDialogFocus}>
            <div className="reader-books__head">
              <strong>书卷</strong>
              <span className="reader-drawer__sub">66 卷</span>
              <button className="reader-drawer__close" type="button" title="关闭(Esc)" autoFocus onClick={closeBooks}>✕ 关闭</button>
            </div>
            <div className="reader-books__body">
              {(["old", "new"] as const).map((testament) => (
                <div key={testament}>
                  <h4>{testament === "old" ? "旧约 · 39 卷" : "新约 · 27 卷"}</h4>
                  <div className="reader-books__grid">
                    {bibleBooks.filter((candidate) => candidate.testament === testament).map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        aria-current={candidate.id === book}
                        onClick={() => {
                          closeBooks();
                          if (candidate.id !== book) goToChapter(candidate.id, 1);
                        }}
                      >
                        {candidate.chineseName}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        ) : null}

        {lightbox ? (
          <div
            className="reader-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="查看大图"
            onKeyDown={trapDialogFocus}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                closeLightbox();
                restoreFocusRef.current?.focus();
              }
            }}
          >
            <ResourceImage src={lightbox.src} alt={lightbox.alt} />
            <p className="reader-lightbox__caption">{lightbox.caption}</p>
            <button
              className="reader-lightbox__close"
              type="button"
              autoFocus
              onClick={() => {
                closeLightbox();
                restoreFocusRef.current?.focus();
              }}
            >
              ✕ 关闭 (Esc)
            </button>
          </div>
        ) : null}

        <div
          ref={helpRef}
          className={`reader-kbd${helpPinned || helpHovered ? " reader-kbd--open" : ""}`}
          onMouseEnter={() => setHelpHovered(true)}
          onMouseLeave={() => setHelpHovered(false)}
        >
          <button
            className="reader-kbd__toggle"
            type="button"
            aria-label="键盘快捷键"
            aria-expanded={helpPinned || helpHovered}
            title="键盘快捷键"
            onClick={() => setHelpPinned((current) => !current)}
          >
            ?
          </button>
          {helpPinned || helpHovered ? (
            <div className="reader-kbd__legend" role="note">
              <kbd>↑</kbd> <kbd>↓</kbd> 逐节 · <kbd>←</kbd> <kbd>→</kbd> 翻章 · <kbd>Enter</kbd> 本节卡片 · <kbd>Esc</kbd> 关闭
            </div>
          ) : null}
        </div>
      </div>
    </VersePreviewProvider>
  );
}

function trapDialogFocus(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>("button, [href], input, [tabindex]:not([tabindex='-1'])")]
    .filter((element) => element.offsetParent !== null || element === document.activeElement);
  if (!focusable.length) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
