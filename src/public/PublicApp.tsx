import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";

import {
  loadPublicBook,
  loadPublicManifest,
  loadPublicSearchIndex,
} from "./publicBibleData";
import type {
  PublicBibleVerse,
  PublicBookPayload,
  PublicDataManifest,
  PublicScriptureSearchEntry,
} from "./publicData";

interface PublicBibleVersion {
  id: string;
  label: string;
  language: string;
  verses: PublicBibleVerse[];
}

interface PublicStudyResource {
  id: string;
  title: string;
  type: "commentary" | "note" | "image";
  verses: string[];
  body: string;
  source?: string;
  assetPath?: string;
}

export interface PublicWorkbenchProps {
  activeBookId?: string;
  isBookLoading?: boolean;
  onRequestBook?: (bookId: string) => Promise<void> | void;
  onRequestSearchResult?: (result: { verseId: string; book: string }) => Promise<void> | void;
  wholeBibleSearchIndex?: PublicScriptureSearchEntry[];
  readOnly?: boolean;
  versions: PublicBibleVersion[];
  resources: PublicStudyResource[];
  initialLayout: unknown;
  onRefreshResources?: never;
  onUnsyncResource?: never;
  onUpdateWorkbenchResource?: never;
}

export interface PublicAppLoaders {
  loadManifest: () => Promise<PublicDataManifest>;
  loadBook: (bookId: string) => Promise<PublicBookPayload>;
  loadSearchIndex: () => Promise<PublicScriptureSearchEntry[]>;
}

export interface PublicAppProps {
  WorkbenchComponent: ComponentType<PublicWorkbenchProps>;
  initialLayout: unknown;
  initialBookId?: string;
  loaders?: PublicAppLoaders;
}

interface FailedBookRequest {
  bookId: string;
  message: string;
}

const defaultLoaders: PublicAppLoaders = {
  loadManifest: () => loadPublicManifest(),
  loadBook: (bookId) => loadPublicBook(bookId),
  loadSearchIndex: () => loadPublicSearchIndex(),
};

function versionsForBook(book: PublicBookPayload): PublicBibleVersion[] {
  return [
    { id: "cuv", label: "和合本", language: "zh", verses: book.cuvVerses },
    { id: "kjv", label: "King James Version", language: "en", verses: book.kjvVerses },
  ];
}

function resourcesForBook(book: PublicBookPayload): PublicStudyResource[] {
  const textResources = book.textCards.map((card) => ({
    id: card.id,
    title: card.title,
    type: card.type,
    verses: card.verses,
    body: card.body,
    source: card.sourceLabel,
  }));
  const imageResources = book.imageCards.map((card) => ({
    id: card.id,
    title: card.title,
    type: card.type,
    verses: card.verses,
    body: card.body,
    source: card.sourceLabel,
    assetPath: card.asset.url,
  }));
  return [...textResources, ...imageResources];
}

export function PublicApp({
  WorkbenchComponent,
  initialLayout,
  initialBookId = "Gen",
  loaders = defaultLoaders,
}: PublicAppProps) {
  const [manifest, setManifest] = useState<PublicDataManifest>();
  const [book, setBook] = useState<PublicBookPayload>();
  const [searchIndex, setSearchIndex] = useState<PublicScriptureSearchEntry[]>([]);
  const [startupError, setStartupError] = useState<string>();
  const [isBookLoading, setIsBookLoading] = useState(false);
  const [failedBookRequest, setFailedBookRequest] = useState<FailedBookRequest>();

  useEffect(() => {
    let cancelled = false;
    Promise.all([loaders.loadManifest(), loaders.loadBook(initialBookId), loaders.loadSearchIndex()])
      .then(([nextManifest, nextBook, nextSearchIndex]) => {
        if (cancelled) return;
        setManifest(nextManifest);
        setBook(nextBook);
        setSearchIndex(nextSearchIndex);
      })
      .catch((cause) => {
        if (!cancelled) setStartupError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => { cancelled = true; };
  }, [initialBookId, loaders]);

  const requestBook = useCallback(async (bookId: string) => {
    if (bookId === book?.bookId) return;
    if (manifest && !manifest.books.some((entry) => entry.id === bookId)) {
      setFailedBookRequest({ bookId, message: `公开版中没有书卷 ${bookId}` });
      return;
    }
    setIsBookLoading(true);
    setFailedBookRequest(undefined);
    try {
      const nextBook = await loaders.loadBook(bookId);
      setBook(nextBook);
    } catch (cause) {
      setFailedBookRequest({ bookId, message: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setIsBookLoading(false);
    }
  }, [book?.bookId, loaders, manifest]);

  const versions = useMemo(() => book ? versionsForBook(book) : [], [book]);
  const resources = useMemo(() => book ? resourcesForBook(book) : [], [book]);

  if (startupError) {
    return <main role="alert">公开版启动失败：{startupError}</main>;
  }
  if (!book) {
    return <main aria-busy="true">正在加载公开版经文与卡片……</main>;
  }

  return (
    <>
      {failedBookRequest && (
        <aside role="alert">
          <span>书卷 {failedBookRequest.bookId} 加载失败：{failedBookRequest.message}</span>
          <button type="button" onClick={() => void requestBook(failedBookRequest.bookId)}>
            重试加载 {failedBookRequest.bookId}
          </button>
        </aside>
      )}
      <WorkbenchComponent
        activeBookId={book.bookId}
        initialLayout={initialLayout}
        isBookLoading={isBookLoading}
        onRequestBook={requestBook}
        onRequestSearchResult={(result) => requestBook(result.book)}
        resources={resources}
        readOnly
        versions={versions}
        wholeBibleSearchIndex={searchIndex}
      />
    </>
  );
}
