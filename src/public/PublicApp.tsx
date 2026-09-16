import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReaderView } from "../core/components/ReaderView";
import { Workbench } from "../core/components/Workbench";
import { storedReaderPosition, type ReaderPosition } from "../core/data/readerPosition";
import { defaultWorkbenchLayout } from "../core/domain/layout";
import type { StudyResource } from "../core/domain/resources";
import { parseVerseId, verseIdFromParts, type VerseId } from "../core/domain/verse";
import { loadPublicBook, loadPublicManifest, loadPublicSearchIndex } from "./publicBibleData";
import type { PublicBookPayload, PublicDataManifest, PublicScriptureSearchEntry } from "./publicData";

export interface PublicAppLoaders {
  loadManifest: () => Promise<PublicDataManifest>;
  loadBook: (bookId: string) => Promise<PublicBookPayload>;
  loadSearchIndex: () => Promise<PublicScriptureSearchEntry[]>;
}
const defaultLoaders: PublicAppLoaders = {
  loadManifest: loadPublicManifest,
  loadBook: loadPublicBook,
  loadSearchIndex: loadPublicSearchIndex,
};
const sharedIntroSources: Record<string, string> = {"2Sam": "1Sam", "2Kgs": "1Kgs", "2Chr": "1Chr"};
async function loadBookGroup(loaders: PublicAppLoaders, bookId: string) {
  return Promise.all([bookId, ...(sharedIntroSources[bookId] ? [sharedIntroSources[bookId]] : [])].map(id => loaders.loadBook(id)));
}
const modeKey = "one-holy-bible-public-view-mode";
function storedMode(): "reader" | "workbench" {
  try { return localStorage.getItem(modeKey) === "workbench" ? "workbench" : "reader"; }
  catch { return "reader"; }
}
export function resourcesForBook(book: PublicBookPayload): StudyResource[] {
  return [...book.textCards.map(card => ({
    id: card.id, title: card.title, type: card.type, verses: card.verses as VerseId[],
    body: card.body, summary: card.summary, searchText: card.searchText,
    primaryAnchor: card.primaryAnchor as VerseId | undefined, bookIntro: card.bookIntro,
    source: card.sourceLabel,
    debugMeta: { sourceLabel: card.sourceLabel, page: card.page,
      coverageRanges: card.coverageRanges as Array<{start: VerseId; end?: VerseId}> | undefined },
  })), ...book.imageCards.map(card => ({
    id: card.id, title: card.title, type: card.type, verses: card.verses as VerseId[],
    body: card.body, summary: card.summary, primaryAnchor: card.primaryAnchor as VerseId | undefined,
    bookIntro: card.bookIntro, source: card.sourceLabel, assetPath: card.asset.url,
  }))];
}
export function PublicApp({ loaders = defaultLoaders }: { loaders?: PublicAppLoaders }) {
  const [start] = useState(storedReaderPosition);
  const [position, setPosition] = useState<ReaderPosition>(start);
  const [mode, setMode] = useState(storedMode);
  const [manifest, setManifest] = useState<PublicDataManifest>();
  const [book, setBook] = useState<PublicBookPayload>();
  const [loadedBooks, setLoadedBooks] = useState<Record<string, PublicBookPayload>>({});
  const [search, setSearch] = useState<PublicScriptureSearchEntry[]>([]);
  const [startupError, setStartupError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<{ bookId: string; message: string }>();
  const requestSequence = useRef(0);
  const currentBook = useRef<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    setStartupError(undefined);
    Promise.all([loaders.loadManifest(), loadBookGroup(loaders, start.book), loaders.loadSearchIndex()])
      .then(([nextManifest, books, index]) => {
        const nextBook = books[0];
        if (cancelled) return;
        currentBook.current = nextBook.bookId;
        setLoadedBooks(Object.fromEntries(books.map(item => [item.bookId, item])));
        setManifest(nextManifest); setBook(nextBook); setSearch(index);
      }).catch(error => { if (!cancelled) setStartupError(String(error)); });
    return () => { cancelled = true; requestSequence.current += 1; };
  }, [attempt, loaders, start.book]);
  const requestBook = useCallback(async (bookId: string) => {
    const sequence = ++requestSequence.current;
    if (bookId === currentBook.current) { setLoading(false); setFailure(undefined); return; }
    setLoading(true); setFailure(undefined);
    try {
      if (!manifest?.books.some(entry => entry.id === bookId)) throw new Error(`公开版中没有书卷 ${bookId}`);
      const books = await loadBookGroup(loaders, bookId);
      const next = books[0];
      if (sequence !== requestSequence.current) throw new Error("Superseded book request");
      currentBook.current = next.bookId;
      setBook(next);
      setLoadedBooks(previous => ({...previous, ...Object.fromEntries(books.map(item => [item.bookId, item]))}));
    } catch (error) {
      if (sequence === requestSequence.current) setFailure({bookId, message: error instanceof Error ? error.message : String(error)});
      throw error;
    } finally { if (sequence === requestSequence.current) setLoading(false); }
  }, [loaders, manifest]);
  const versions = useMemo(() => [
    {id: "cuv", label: "和合本", language: "zh"},
    {id: "kjv", label: "King James Version", language: "en"},
  ].map(version => ({...version, verses: search.filter(entry => entry.versionId === version.id).map(entry => ({
    id: entry.verseId, book: entry.book, chapter: entry.chapter, verse: entry.verse, text: entry.text,
  }))})), [search]);
  const resources = useMemo(() => Object.values(loadedBooks).flatMap(resourcesForBook), [loadedBooks]);
  function switchMode(next: "reader" | "workbench", nextPosition: ReaderPosition) {
    setPosition(nextPosition); setMode(next);
    try { localStorage.setItem(modeKey, next); } catch { /* Session mode remains available. */ }
  }
  if (startupError) return <main className="app-loading" role="alert"><p>公开版启动失败：{startupError}</p><button onClick={() => setAttempt(value => value + 1)}>重新加载经文库和卡片</button></main>;
  if (!book) return <main className="app-loading" role="status">正在加载公开版经文与卡片……</main>;
  return <>
    {loading && <aside className="public-load-status" role="status">正在加载书卷……</aside>}
    {failure && <aside className="public-load-status" role="alert">书卷 {failure.bookId} 加载失败：{failure.message}<button onClick={() => {
      void requestBook(failure.bookId).then(() => setPosition({book: failure.bookId, chapter: 1, verse: 1})).catch(() => {});
    }}>重试加载 {failure.bookId}</button></aside>}
    {mode === "reader" ? <ReaderView
      key={`${mode}:${position.book}:${position.chapter}:${position.verse}`}
      versions={versions} resources={resources} initialPosition={position} onRequestBook={requestBook}
      onExitReader={next => switchMode("workbench", next)}
    /> : <Workbench
      readOnly activeBookId={book.bookId} isBookLoading={loading}
      initialVerseId={verseIdFromParts(position.book, position.chapter, position.verse)}
      initialLayout={defaultWorkbenchLayout} versions={versions} resources={resources}
      wholeBibleSearchIndex={search}
      onRequestBook={bookId => requestBook(bookId).catch(() => {})}
      onOpenReader={verse => switchMode("reader", parseVerseId(verse))}
    />}
  </>;
}
