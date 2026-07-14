import { useEffect, useRef, useState } from "react";
import { Workbench, type WorkbenchSearchResult } from "./components/Workbench";
import { loadPublicBook, loadPublicManifest, loadPublicSearchIndex } from "./data/publicBibleData";
import type { PublicBookPayload, PublicDataManifest, PublicScriptureSearchEntry } from "./data/publicData";
import type { BibleVersion } from "./domain/bible";
import { bookTitle } from "./domain/bibleBooks";
import { defaultWorkbenchLayout } from "./domain/layout";
import "./styles.css";

interface PublicAppData {
  manifest: PublicDataManifest;
  book: PublicBookPayload;
  searchIndex: PublicScriptureSearchEntry[];
}

interface FailedBookRequest {
  bookId: string;
  message: string;
}

function logAppInfo(message: string, details: Record<string, unknown>) {
  if (import.meta.env.PROD) return;
  console.info(message, details);
}

function versionsForBook(book: PublicBookPayload): BibleVersion[] {
  return [
    { id: "cuv", label: "和合本", language: "zh", verses: book.cuvVerses },
    { id: "kjv", label: "KJV", language: "en", verses: book.kjvVerses },
  ];
}

export default function App() {
  const [appData, setAppData] = useState<PublicAppData | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [loadingBookId, setLoadingBookId] = useState<string | null>(null);
  const [failedBookRequest, setFailedBookRequest] = useState<FailedBookRequest | null>(null);
  const startupPromiseRef = useRef<Promise<PublicAppData> | null>(null);
  const bookRequestSequenceRef = useRef(0);

  useEffect(() => {
    let subscribed = true;
    if (!startupPromiseRef.current) {
      const startedAt = performance.now();
      logAppInfo("[app] public data load started", { attempt: startupAttempt + 1, bookId: "Gen" });
      startupPromiseRef.current = Promise.all([
        loadPublicManifest(),
        loadPublicBook("Gen"),
        loadPublicSearchIndex(),
      ]).then(([manifest, book, searchIndex]) => {
        const nextData = { manifest, book, searchIndex };
        logAppInfo("[app] public data load succeeded", {
          bookId: book.bookId,
          durationMs: Math.round(performance.now() - startedAt),
          releaseVersion: manifest.releaseVersion,
          searchEntryCount: searchIndex.length,
          textCardCount: book.textCards.length,
        });
        return nextData;
      }).catch((error: unknown) => {
        logAppInfo("[app] public data load failed", {
          attempt: startupAttempt + 1,
          durationMs: Math.round(performance.now() - startedAt),
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      });
    }

    startupPromiseRef.current.then((nextData) => {
      if (!subscribed) return;
      setAppData(nextData);
      setStartupError(null);
    }).catch((error: unknown) => {
      console.error("[app] failed to load public data", error);
      if (subscribed) setStartupError("公开经文或文字卡片加载失败，请重试。");
    });

    return () => {
      subscribed = false;
    };
  }, [startupAttempt]);

  async function requestBook(bookId: string): Promise<void> {
    if (!appData || bookId === appData.book.bookId) return;
    const requestSequence = ++bookRequestSequenceRef.current;
    const startedAt = performance.now();
    setLoadingBookId(bookId);
    setFailedBookRequest(null);
    logAppInfo("[app] public book request started", { bookId });
    try {
      const book = await loadPublicBook(bookId);
      if (requestSequence !== bookRequestSequenceRef.current) return;
      setAppData((current) => current ? { ...current, book } : current);
      setFailedBookRequest(null);
      logAppInfo("[app] public book request succeeded", {
        bookId,
        durationMs: Math.round(performance.now() - startedAt),
        textCardCount: book.textCards.length,
      });
    } catch (error: unknown) {
      if (requestSequence !== bookRequestSequenceRef.current) return;
      const message = error instanceof Error ? error.message : String(error);
      setFailedBookRequest({ bookId, message });
      logAppInfo("[app] public book request failed", {
        bookId,
        durationMs: Math.round(performance.now() - startedAt),
        error: message,
      });
    } finally {
      if (requestSequence === bookRequestSequenceRef.current) setLoadingBookId(null);
    }
  }

  function retryStartup() {
    startupPromiseRef.current = null;
    setStartupError(null);
    setStartupAttempt((attempt) => attempt + 1);
  }

  if (!appData && startupError) {
    return (
      <main className="app-loading" role="alert">
        <p>{startupError}</p>
        <button type="button" onClick={retryStartup}>重新加载公开经文与文字卡片</button>
      </main>
    );
  }

  if (!appData) {
    return <main className="app-loading" role="status">正在加载公开经文与文字卡片...</main>;
  }

  const failedBookTitle = failedBookRequest ? bookTitle(failedBookRequest.bookId) : "";
  return (
    <>
      {failedBookRequest ? (
        <aside className="app-book-error" role="alert">
          <span>{failedBookTitle}加载失败</span>
          <button type="button" onClick={() => requestBook(failedBookRequest.bookId)}>
            重试加载{failedBookTitle}
          </button>
        </aside>
      ) : null}
      <Workbench
        activeBookId={appData.book.bookId}
        initialLayout={defaultWorkbenchLayout}
        isBookLoading={loadingBookId !== null}
        onRequestBook={requestBook}
        onRequestSearchResult={async (_result: WorkbenchSearchResult) => undefined}
        resources={appData.book.textCards}
        versions={versionsForBook(appData.book)}
        wholeBibleSearchIndex={appData.searchIndex}
      />
    </>
  );
}
