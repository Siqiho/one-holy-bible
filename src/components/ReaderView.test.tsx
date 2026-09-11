import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReaderView } from "./ReaderView";
import type { DoreChapterArtwork } from "../data/doreChapterArtwork";
import type { BibleVersion } from "../domain/bible";
import type { StudyResource } from "../domain/resources";

const { mockArtwork } = vi.hoisted(() => ({
  mockArtwork: { current: new Map<string, DoreChapterArtwork>() },
}));

vi.mock("../data/doreChapterArtwork", () => ({
  loadDoreChapterArtworkByChapter: () => Promise.resolve(mockArtwork.current),
}));

const cuv = {
  id: "cuv",
  label: "和合本",
  language: "zh",
  verses: [
    { id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "起初，神创造天地。" },
    { id: "Gen.1.2", book: "Gen", chapter: 1, verse: 2, text: "地是空虚混沌。" },
    { id: "Gen.1.3", book: "Gen", chapter: 1, verse: 3, text: "神说，要有光。" },
    { id: "Gen.2.1", book: "Gen", chapter: 2, verse: 1, text: "天地万物都造齐了。" },
  ],
} satisfies BibleVersion;

const kjv = {
  id: "kjv",
  label: "KJV",
  language: "en",
  verses: [
    { id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "In the beginning God created the heaven and the earth." },
    { id: "Gen.1.2", book: "Gen", chapter: 1, verse: 2, text: "And the earth was without form, and void." },
    { id: "Gen.1.3", book: "Gen", chapter: 1, verse: 3, text: "And God said, Let there be light." },
    { id: "Gen.2.1", book: "Gen", chapter: 2, verse: 1, text: "Thus the heavens and the earth were finished." },
  ],
} satisfies BibleVersion;

const anchoredCommentary = {
  id: "commentary-1-1",
  title: "创世记 1:1 综合解读",
  type: "commentary",
  verses: ["Gen.1.1"],
  primaryAnchor: "Gen.1.1",
  source: "综合解读",
  body: "起初，神创造天地的注释正文。",
} satisfies StudyResource;

const imageCard = {
  id: "image-1-2",
  title: "阿波罗 8 号地球照片",
  type: "image",
  verses: ["Gen.1.2"],
  primaryAnchor: "Gen.1.2",
  source: "圣经信息系列",
  body: "阿波罗 8 号拍摄的地球照片说明。",
  assetPath: "/resources/workbench/apollo8.png",
} satisfies StudyResource;

const secondImageCard = {
  id: "image-1-2b",
  title: "昆兰羊皮卷残片",
  type: "image",
  verses: ["Gen.1.2"],
  primaryAnchor: "Gen.1.2",
  source: "圣经信息系列",
  body: "羊皮卷残片红外照片说明。",
  assetPath: "/resources/workbench/qumran.png",
} satisfies StudyResource;

const rangeCommentary = {
  id: "range-1-1-3",
  title: "创世记 1:1-3 研读本注释",
  type: "commentary",
  verses: ["Gen.1.1", "Gen.1.2", "Gen.1.3"],
  primaryAnchor: "Gen.1.1",
  source: "研读本圣经",
  body: "覆盖 1 至 3 节的结构注释。",
} satisfies StudyResource;

const htmlCard = {
  id: "html-1-2",
  title: "创世记互动时间线",
  type: "html",
  verses: ["Gen.1.2"],
  primaryAnchor: "Gen.1.2",
  source: "互动资料",
  body: "<div>creation timeline</div>",
} satisfies StudyResource;

const resources: StudyResource[] = [anchoredCommentary, imageCard, secondImageCard, rangeCommentary];

async function renderReader(onExitReader = vi.fn(), extraResources: StudyResource[] = []) {
  render(
    <ReaderView versions={[cuv, kjv]} resources={[...resources, ...extraResources]} onExitReader={onExitReader} />,
  );
  // Flush the async chapter-artwork load inside act to keep React updates clean.
  await act(async () => {});
  return { onExitReader };
}

describe("ReaderView", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockArtwork.current = new Map();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("renders bilingual verses with resource dots and the chapter masthead", async () => {
    await renderReader();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1创世记Genesis");
    const verseOne = screen.getByTestId("reader-verse-1");
    expect(verseOne).toHaveTextContent("起初，神创造天地。");
    expect(verseOne).toHaveTextContent("In the beginning God created the heaven and the earth.");
    expect(verseOne).toHaveAttribute("aria-current", "true");
  });

  it("marks verses in the gutter by text, image, and html card kinds", async () => {
    await renderReader(vi.fn(), [htmlCard]);

    const textOnly = screen.getByTestId("reader-verse-1-marks");
    expect(textOnly).toHaveAttribute("data-kinds", "text");
    expect(textOnly).toHaveAttribute("title", "本节有文字卡片");
    expect(within(textOnly).queryByTestId("reader-verse-mark-image")).not.toBeInTheDocument();
    expect(within(textOnly).queryByTestId("reader-verse-mark-html")).not.toBeInTheDocument();

    const mixed = screen.getByTestId("reader-verse-2-marks");
    expect(mixed).toHaveAttribute("data-kinds", "text image html");
    expect(mixed).toHaveAttribute("title", "本节有文字、图片与互动卡片");
    expect(within(mixed).getByTestId("reader-verse-mark-image")).toBeInTheDocument();
    expect(within(mixed).getByTestId("reader-verse-mark-html")).toBeInTheDocument();

    const textAndRange = screen.getByTestId("reader-verse-3-marks");
    expect(textAndRange).toHaveAttribute("data-kinds", "text");
    expect(within(textAndRange).queryByTestId("reader-verse-mark-image")).not.toBeInTheDocument();
  });

  it("shows verse-anchored and range-covering cards in the marginalia with a coverage badge", async () => {
    const user = userEvent.setup();
    await renderReader();

    expect(screen.getByText("创世记 1:1 边注")).toBeInTheDocument();
    expect(screen.getByText("创世记 1:1 综合解读")).toBeInTheDocument();
    expect(screen.getByText("覆盖 1:1-3")).toBeInTheDocument();

    await user.click(screen.getByTestId("reader-verse-3"));
    expect(screen.getByText("创世记 1:3 边注")).toBeInTheDocument();
    // Verse 3 has no anchored card, but the 1:1-3 range card still covers it.
    expect(screen.getByText("创世记 1:1-3 研读本注释")).toBeInTheDocument();
  });

  it("fills the unread marginalia with every verse card, images first", async () => {
    const user = userEvent.setup();
    await renderReader();

    await user.click(screen.getByTestId("reader-verse-2"));
    const panel = screen.getByTestId("reader-marginalia");
    expect(panel).not.toHaveAttribute("data-peeking");
    expect(screen.queryByRole("separator", { name: "调整边注预览高度" })).not.toBeInTheDocument();

    // Verse 2 has two image cards plus the covering text card; unread preview keeps all of them.
    expect(screen.getByAltText("阿波罗 8 号地球照片")).toHaveAttribute("src", "/resources/workbench/apollo8.png");
    expect(screen.getByAltText("昆兰羊皮卷残片")).toBeInTheDocument();
    const marginalia = screen.getByText("创世记 1:2 边注").parentElement!;
    expect(within(marginalia).getByText("创世记 1:1-3 研读本注释")).toBeInTheDocument();
    expect(within(panel).queryByText(/图片 ·/)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/注释 ·/)).not.toBeInTheDocument();
    const unreadButtons = within(panel).getAllByRole("button");
    expect(unreadButtons.map((button) => button.textContent)).toEqual([
      expect.stringContaining("阿波罗 8 号地球照片"),
      expect.stringContaining("昆兰羊皮卷残片"),
      expect.stringContaining("创世记 1:1-3 研读本注释"),
    ]);
    expect(screen.queryByRole("button", { name: /查看本节全部/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/上下文/)).not.toBeInTheDocument();
  });

  it("peeks a margin card in place, then slides back when clicking elsewhere", async () => {
    const user = userEvent.setup();
    await renderReader();

    const panel = screen.getByTestId("reader-marginalia");
    expect(panel).not.toHaveAttribute("data-peeking");

    await user.click(screen.getByRole("button", { name: /创世记 1:1 综合解读/ }));
    expect(panel).toHaveAttribute("data-peeking", "true");
    expect(screen.queryByRole("dialog", { name: "卡片" })).not.toBeInTheDocument();
    expect(screen.getByTestId("reader-marginalia-peek")).toHaveTextContent("起初，神创造天地的注释正文。");

    await user.click(screen.getByTestId("reader-verse-3"));
    expect(screen.getByTestId("reader-marginalia")).not.toHaveAttribute("data-peeking");
    expect(screen.queryByTestId("reader-marginalia-peek")).not.toBeInTheDocument();
  });

  it("peeks into a thumbnail strip of every verse card with a resizable divider", async () => {
    const user = userEvent.setup();
    await renderReader();

    await user.click(screen.getByTestId("reader-verse-2"));
    await user.click(screen.getByRole("button", { name: /阿波罗 8 号地球照片/ }));

    expect(screen.queryByRole("button", { name: /查看本节全部/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/上下文/)).not.toBeInTheDocument();

    const strip = screen.getByTestId("reader-marginalia-strip");
    expect(strip).toHaveClass("reader-marginalia__strip");
    const stripButtons = within(strip).getAllByRole("button");
    expect(stripButtons.map((button) => button.textContent)).toEqual([
      expect.stringContaining("阿波罗 8 号地球照片"),
      expect.stringContaining("昆兰羊皮卷残片"),
      expect.stringContaining("创世记 1:1-3 研读本注释"),
    ]);
    expect(stripButtons[0]).toHaveClass("reader-marginalia__thumb--image");
    expect(within(stripButtons[0]!).queryByText(/图片 ·/)).not.toBeInTheDocument();
    expect(within(stripButtons[0]!).getByRole("img")).toHaveAttribute("alt", "阿波罗 8 号地球照片");
    expect(stripButtons[2]).not.toHaveClass("reader-marginalia__thumb--image");
    expect(screen.getByTestId("reader-marginalia-peek")).toHaveTextContent("阿波罗 8 号拍摄的地球照片说明。");
    expect(screen.getByTestId("reader-marginalia")).toHaveAttribute("data-peeking", "true");

    const split = screen.getByRole("separator", { name: "调整边注预览高度" });
    expect(split).toHaveAttribute("aria-valuenow", "34");
    split.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("separator", { name: "调整边注预览高度" })).toHaveAttribute("aria-valuenow", "38");
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(screen.getByRole("separator", { name: "调整边注预览高度" })).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByTestId("reader-verse-2")).toHaveAttribute("aria-current", "true");
  });

  it("shows Doré chapter artwork under the masthead and opens it in the lightbox", async () => {
    const user = userEvent.setup();
    mockArtwork.current = new Map([[
      "Gen.1",
      {
        page: 1,
        book: "Gen",
        chapter: 1,
        title: "The Creation of Light",
        scriptureReference: null,
        assetPath: "/resources/dore/001_Gen.1.jpg",
      },
    ]]);
    await renderReader();

    const artwork = await screen.findByTestId("reader-chapter-art");
    expect(within(artwork).getByRole("img")).toHaveAttribute("src", "/resources/dore/001_Gen.1.jpg");
    expect(artwork).toHaveTextContent("多雷《圣经》插图 · The Creation of Light");

    await user.click(artwork);
    const lightbox = screen.getByRole("dialog", { name: "查看大图" });
    expect(within(lightbox).getByText("多雷《圣经》插图 · The Creation of Light")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "查看大图" })).not.toBeInTheDocument();
  });

  it("resizes the marginalia column from the keyboard-accessible separator", async () => {
    const user = userEvent.setup();
    await renderReader();

    const handle = screen.getByRole("separator", { name: "调整边注栏宽度" });
    expect(handle).toHaveAttribute("aria-valuenow", "340");
    handle.focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("separator", { name: "调整边注栏宽度" })).toHaveAttribute("aria-valuenow", "356");
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("separator", { name: "调整边注栏宽度" })).toHaveAttribute("aria-valuenow", "324");
    // Arrow keys on the separator must not move the verse selection.
    expect(screen.getByTestId("reader-verse-1")).toHaveAttribute("aria-current", "true");
  });

  it("moves by verse and chapter from the advertised keyboard shortcuts", async () => {
    const user = userEvent.setup();
    await renderReader();

    expect(screen.getByTestId("reader-verse-1")).toHaveAttribute("aria-current", "true");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByTestId("reader-verse-2")).toHaveAttribute("aria-current", "true");
    await user.keyboard("{ArrowUp}");
    expect(screen.getByTestId("reader-verse-1")).toHaveAttribute("aria-current", "true");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("2创世记Genesis");
    expect(screen.getByTestId("reader-verse-1")).toHaveTextContent("天地万物都造齐了。");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1创世记Genesis");

    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "卡片" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "卡片" })).not.toBeInTheDocument();
  });

  it("hides the keyboard legend behind a corner help control", async () => {
    const user = userEvent.setup();
    await renderReader();

    expect(screen.queryByText(/逐节/)).not.toBeInTheDocument();
    const help = screen.getByRole("button", { name: "键盘快捷键" });
    await user.hover(help);
    expect(screen.getByText(/逐节/)).toBeInTheDocument();
    await user.unhover(help);
    expect(screen.queryByText(/逐节/)).not.toBeInTheDocument();
    await user.click(help);
    expect(screen.getByText(/翻章/)).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByText(/翻章/)).not.toBeInTheDocument();
  });

  it("opens the drawer with verse and chapter tabs, type chips, and a cross-verse group", async () => {
    const user = userEvent.setup();
    await renderReader();

    fireEvent.keyDown(screen.getByTestId("reader-verse-1"), { key: "Enter" });
    const drawer = screen.getByRole("dialog", { name: "卡片" });
    expect(within(drawer).getByText("本节相关 2 张")).toBeInTheDocument();

    await user.click(within(drawer).getByRole("tab", { name: "本章" }));
    expect(within(drawer).getByText("本章全部 4 张")).toBeInTheDocument();
    expect(within(drawer).getByText("跨节 · 结构与导读")).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "图片 2" })).toBeInTheDocument();

    await user.click(within(drawer).getByRole("button", { name: "图片 2" }));
    expect(within(drawer).getAllByTestId("reader-card")).toHaveLength(2);
    expect(within(drawer).getByText("阿波罗 8 号地球照片")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "卡片" })).not.toBeInTheDocument();
  });

  it("navigates books and chapters from the rail", async () => {
    const user = userEvent.setup();
    await renderReader();

    await user.click(screen.getByRole("button", { name: "展开导航" }));
    await user.click(screen.getByRole("button", { name: "创世记" }));
    const booksDialog = screen.getByRole("dialog", { name: "选择书卷" });
    expect(within(booksDialog).getByText("旧约 · 39 卷")).toBeInTheDocument();
    await user.click(within(booksDialog).getByRole("button", { name: "✕ 关闭" }));

    const chapterGrid = screen.getByRole("group", { name: "章" });
    await user.click(within(chapterGrid).getByRole("button", { name: "2" }));
    expect(screen.getByTestId("reader-verse-1")).toHaveTextContent("天地万物都造齐了。");

    await user.click(screen.getByRole("button", { name: "上一章" }));
    expect(screen.getByTestId("reader-verse-1")).toHaveTextContent("起初，神创造天地。");
  });

  it("opens at the workbench verse instead of the stored reader position", async () => {
    window.localStorage.setItem("one-holy-bible-reader-position", JSON.stringify({ book: "Gen", chapter: 1, verse: 1 }));
    render(
      <ReaderView versions={[cuv, kjv]} resources={resources} initialPosition={{ book: "Gen", chapter: 2, verse: 1 }} />,
    );
    await act(async () => {});
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("2创世记Genesis");
    expect(screen.getByTestId("reader-verse-1")).toHaveTextContent("天地万物都造齐了。");
    expect(screen.getByTestId("reader-verse-1")).toHaveAttribute("aria-current", "true");
  });

  it("returns to the workbench through the topbar switch with the current verse", async () => {
    const user = userEvent.setup();
    const { onExitReader } = await renderReader();

    await user.click(screen.getByTestId("reader-verse-2"));
    await user.click(screen.getByRole("button", { name: "阅读台" }));
    expect(onExitReader).toHaveBeenCalledTimes(1);
    expect(onExitReader).toHaveBeenCalledWith({ book: "Gen", chapter: 1, verse: 2 });
  });
});
