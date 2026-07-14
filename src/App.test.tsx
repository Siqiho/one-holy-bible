import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import type { WorkbenchProps } from "./components/Workbench";
import { loadPublicBook, loadPublicManifest, loadPublicSearchIndex } from "./data/publicBibleData";
import type { PublicBookPayload, PublicDataManifest, PublicScriptureSearchEntry } from "./data/publicData";

const { mockWorkbench } = vi.hoisted(() => ({
  mockWorkbench: vi.fn(),
}));

vi.mock("./data/publicBibleData", () => ({
  loadPublicBook: vi.fn(),
  loadPublicManifest: vi.fn(),
  loadPublicSearchIndex: vi.fn(),
}));

vi.mock("./components/Workbench", () => ({
  Workbench: (props: WorkbenchProps) => {
    mockWorkbench(props);
    return (
      <main aria-label="OHB Study 工作台">
        <span>{props.activeBookId === "Gen" ? "创世记" : "出埃及记"}</span>
        <span>{props.versions[1]?.verses[0]?.text}</span>
        <span>{props.resources[0]?.title}</span>
        <button type="button" onClick={() => props.onRequestBook?.("Exod")}>出埃及记</button>
      </main>
    );
  },
}));

const manifest: PublicDataManifest = {
  schemaVersion: 1,
  releaseVersion: "test-release",
  searchIndexUrl: "/data/search-index.json",
  books: [
    { id: "Gen", url: "/data/books/Gen.json", bytes: 1, sha256: "a".repeat(64), cuvVerseCount: 1, kjvVerseCount: 1, textCardCount: 1 },
    { id: "Exod", url: "/data/books/Exod.json", bytes: 1, sha256: "b".repeat(64), cuvVerseCount: 1, kjvVerseCount: 1, textCardCount: 1 },
  ],
};

function bookPayload(bookId: "Gen" | "Exod", english: string): PublicBookPayload {
  const verseId = `${bookId}.1.1` as const;
  return {
    schemaVersion: 1,
    bookId,
    cuvVerses: [{ id: verseId, book: bookId, chapter: 1, verse: 1, text: bookId === "Gen" ? "起初，神创造天地。" : "以色列众子来到埃及。" }],
    kjvVerses: [{ id: verseId, book: bookId, chapter: 1, verse: 1, text: english }],
    textCards: [{ id: `${bookId}-card`, type: "commentary", title: `${bookId} commentary`, body: "Text only", verses: [verseId] }],
  };
}

const genesis = bookPayload("Gen", "Genesis fixture");
const exodus = bookPayload("Exod", "Exodus fixture");
const searchIndex: PublicScriptureSearchEntry[] = [{
  verseId: "Exod.1.1",
  versionId: "kjv",
  versionLabel: "KJV",
  book: "Exod",
  chapter: 1,
  verse: 1,
  text: "Exodus fixture",
}];

const mockLoadPublicManifest = vi.mocked(loadPublicManifest);
const mockLoadPublicBook = vi.mocked(loadPublicBook);
const mockLoadPublicSearchIndex = vi.mocked(loadPublicSearchIndex);

function latestWorkbenchProps(): WorkbenchProps {
  const props = mockWorkbench.mock.calls.at(-1)?.[0] as WorkbenchProps | undefined;
  if (!props) throw new Error("Workbench was not rendered");
  return props;
}

describe("App public text-first data flow", () => {
  beforeEach(() => {
    mockWorkbench.mockClear();
    mockLoadPublicManifest.mockReset().mockResolvedValue(manifest);
    mockLoadPublicSearchIndex.mockReset().mockResolvedValue(searchIndex);
    mockLoadPublicBook.mockReset().mockImplementation(async (bookId) => bookId === "Gen" ? genesis : exodus);
  });

  it("loads the manifest, Genesis text payload, and whole-Bible search index", async () => {
    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent("正在加载公开经文与文字卡片");
    expect(await screen.findByRole("main", { name: "OHB Study 工作台" })).toBeInTheDocument();
    expect(latestWorkbenchProps()).toMatchObject({
      activeBookId: "Gen",
      isBookLoading: false,
      wholeBibleSearchIndex: searchIndex,
    });
    expect(latestWorkbenchProps().versions.map((version) => version.verses)).toEqual([genesis.cuvVerses, genesis.kjvVerses]);
    expect(latestWorkbenchProps().resources).toEqual(genesis.textCards);
    expect(latestWorkbenchProps().resources.every((resource) => resource.type !== "image")).toBe(true);
  });

  it("keeps the previous book visible when the next book fails and retries it", async () => {
    const user = userEvent.setup();
    mockLoadPublicBook
      .mockResolvedValueOnce(genesis)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(exodus);
    render(<App />);

    expect(await screen.findByText("创世记")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "出埃及记" }));
    expect(await screen.findByText("出埃及记加载失败")).toBeInTheDocument();
    expect(screen.getByText("创世记")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重试加载出埃及记" }));
    expect(await screen.findByText("Exodus fixture")).toBeInTheDocument();
    expect(mockLoadPublicBook).toHaveBeenNthCalledWith(2, "Exod");
    expect(mockLoadPublicBook).toHaveBeenNthCalledWith(3, "Exod");
  });

  it("logs one logical startup success event under StrictMode", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    render(<StrictMode><App /></StrictMode>);

    await waitFor(() => {
      const successEvents = infoSpy.mock.calls.filter(([message, details]) => (
        message === "[app] public data load succeeded" && typeof details === "object"
      ));
      expect(successEvents).toHaveLength(1);
    });
    expect(mockLoadPublicManifest).toHaveBeenCalledTimes(1);
    expect(mockLoadPublicBook).toHaveBeenCalledTimes(1);
    expect(mockLoadPublicSearchIndex).toHaveBeenCalledTimes(1);
    infoSpy.mockRestore();
  });
});
