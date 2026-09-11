import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App, { viewModeStorageKey } from "./App";
import type { ReaderViewProps } from "./components/ReaderView";
import type { WorkbenchProps } from "./components/Workbench";
import { loadBibleEveryoneImageResources } from "./data/bibleEveryoneImageResources";
import { loadComprehensiveCommentaryResources } from "./data/comprehensiveCommentaryResources";
import { loadBibleLibrary } from "./data/loadBibleLibrary";
import {
  loadWorkbenchSyncedResourcePayload,
  markWorkbenchCardReaderReturned,
  syncWorkbenchCards,
  updateWorkbenchCardReview,
} from "./data/workbenchSyncedResources";
import type { BibleVersion } from "./domain/bible";
import type { StudyResource } from "./domain/resources";

const { mockWorkbench, mockReaderView } = vi.hoisted(() => ({
  mockWorkbench: vi.fn(),
  mockReaderView: vi.fn(),
}));

vi.mock("./data/loadBibleLibrary", () => ({
  loadBibleLibrary: vi.fn(),
}));

vi.mock("./data/bibleEveryoneImageResources", () => ({
  loadBibleEveryoneImageResources: vi.fn(),
}));

vi.mock("./data/comprehensiveCommentaryResources", () => ({
  loadComprehensiveCommentaryResources: vi.fn(),
}));

vi.mock("./data/workbenchSyncedResources", () => ({
  loadWorkbenchSyncedResourcePayload: vi.fn(),
  markWorkbenchCardReaderReturned: vi.fn(),
  syncWorkbenchCards: vi.fn(),
  updateWorkbenchCardReview: vi.fn(),
}));

vi.mock("./data/sampleLibrary", () => ({
  sampleResources: [{
    id: "stable-text-card",
    title: "稳定解释卡",
    type: "commentary",
    verses: ["Gen.1.1"],
    body: "稳定解释内容。",
  } satisfies StudyResource],
}));

vi.mock("./components/Workbench", () => ({
  Workbench: (props: WorkbenchProps) => {
    mockWorkbench(props);
    return <main aria-label="OHB Study 工作台">完整开发版</main>;
  },
}));

vi.mock("./components/ReaderView", () => ({
  ReaderView: (props: ReaderViewProps) => {
    mockReaderView(props);
    return <main aria-label="阅读">阅读模式</main>;
  },
}));

const loadedVersions = {
  cuvBible: {
    id: "cuv",
    label: "和合本",
    language: "zh",
    verses: [
      { id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "起初，神创造天地。" },
      { id: "Gen.1.2", book: "Gen", chapter: 1, verse: 2, text: "地是空虚混沌。" },
    ],
  } satisfies BibleVersion,
  kjvBible: {
    id: "kjv",
    label: "KJV",
    language: "en",
    verses: [
      { id: "Gen.1.1", book: "Gen", chapter: 1, verse: 1, text: "In the beginning." },
      { id: "Gen.1.2", book: "Gen", chapter: 1, verse: 2, text: "The earth was without form." },
    ],
  } satisfies BibleVersion,
};

const imageResource = {
  id: "development-image-card",
  title: "开发版图片卡",
  type: "image",
  verses: ["Gen.1.1"],
  body: "图片说明。",
  assetPath: "/resources/workbench/development-image.png",
} satisfies StudyResource;

const workbenchResource = {
  id: "workbench-text-card",
  title: "卡片工作台解释卡",
  type: "commentary",
  verses: ["Gen.1.1"],
  body: "来自卡片工作台。",
  debugMeta: {
    sourceWorkbenchCardId: "source-card-1",
  },
} satisfies StudyResource;

const workbenchPayload = {
  metadata: {
    excludedCounts: {},
    excludedCountsByKind: {},
    excludedResourceIds: [],
    selectedCounts: {},
    sourceApiBase: "http://127.0.0.1:5179",
    totalWorkbenchCards: 1,
    workbenchSummary: {},
  },
  resources: [workbenchResource],
};

const mockLoadBibleLibrary = vi.mocked(loadBibleLibrary);
const mockLoadBibleEveryoneImageResources = vi.mocked(loadBibleEveryoneImageResources);
const mockLoadComprehensiveCommentaryResources = vi.mocked(loadComprehensiveCommentaryResources);
const mockLoadWorkbenchSyncedResourcePayload = vi.mocked(loadWorkbenchSyncedResourcePayload);
const mockMarkWorkbenchCardReaderReturned = vi.mocked(markWorkbenchCardReaderReturned);
const mockSyncWorkbenchCards = vi.mocked(syncWorkbenchCards);
const mockUpdateWorkbenchCardReview = vi.mocked(updateWorkbenchCardReview);

function latestWorkbenchProps(): WorkbenchProps {
  const props = mockWorkbench.mock.calls.at(-1)?.[0] as WorkbenchProps | undefined;
  if (!props) throw new Error("Workbench was not rendered");
  return props;
}

function latestReaderViewProps(): ReaderViewProps {
  const props = mockReaderView.mock.calls.at(-1)?.[0] as ReaderViewProps | undefined;
  if (!props) throw new Error("ReaderView was not rendered");
  return props;
}

describe("App complete development data flow", () => {
  beforeEach(() => {
    window.localStorage.setItem(viewModeStorageKey, "workbench");
    mockWorkbench.mockClear();
    mockReaderView.mockClear();
    mockLoadBibleLibrary.mockReset().mockResolvedValue(loadedVersions);
    mockLoadBibleEveryoneImageResources.mockReset().mockResolvedValue([imageResource]);
    mockLoadComprehensiveCommentaryResources.mockReset().mockResolvedValue([]);
    mockLoadWorkbenchSyncedResourcePayload.mockReset().mockResolvedValue(workbenchPayload as never);
    mockMarkWorkbenchCardReaderReturned.mockReset().mockResolvedValue(undefined);
    mockSyncWorkbenchCards.mockReset().mockResolvedValue({ copiedImageCount: 0, count: 1 } as never);
    mockUpdateWorkbenchCardReview.mockReset().mockResolvedValue(undefined);
  });

  it("loads image cards and card-workbench resources into the same Workbench", async () => {
    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent("正在加载经文库和卡片资源");
    expect(await screen.findByRole("main", { name: "OHB Study 工作台" })).toBeInTheDocument();

    const props = latestWorkbenchProps();
    expect(props.versions).toEqual([loadedVersions.cuvBible, loadedVersions.kjvBible]);
    expect(props.resources.map((resource) => resource.id)).toEqual(expect.arrayContaining([
      "stable-text-card",
      "development-image-card",
      "workbench-text-card",
    ]));
    expect(props.resources.some((resource) => resource.type === "image" && resource.assetPath)).toBe(true);
    expect(props.onRefreshResources).toEqual(expect.any(Function));
    expect(props.onUnsyncResource).toEqual(expect.any(Function));
    expect(props.onUpdateWorkbenchResource).toEqual(expect.any(Function));
  });

  it("shows a retry path when a complete development data source fails", async () => {
    const user = userEvent.setup();
    mockLoadBibleEveryoneImageResources
      .mockRejectedValueOnce(new Error("image source unavailable"))
      .mockResolvedValueOnce([imageResource]);

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("经文库或卡片资源加载失败");
    await user.click(screen.getByRole("button", { name: "重新加载经文库和卡片" }));

    await waitFor(() => expect(mockLoadBibleEveryoneImageResources).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("main", { name: "OHB Study 工作台" })).toBeInTheDocument();
  });

  it("hides an initially tombstoned stable card and restores it from canonical stable data on refresh", async () => {
    mockLoadWorkbenchSyncedResourcePayload
      .mockResolvedValueOnce(workbenchPayloadWithTombstones(["stable-text-card"]) as never)
      .mockResolvedValueOnce(workbenchPayloadWithTombstones([]) as never);

    render(<App />);

    expect(await screen.findByRole("main", { name: "OHB Study 工作台" })).toBeInTheDocument();
    await waitFor(() => {
      expect(latestWorkbenchProps().resources.map((resource) => resource.id)).not.toContain("stable-text-card");
    });

    await act(async () => {
      await latestWorkbenchProps().onRefreshResources?.();
    });

    await waitFor(() => {
      expect(latestWorkbenchProps().resources.map((resource) => resource.id)).toContain("stable-text-card");
    });
  });

  it("hides a stable card on manual workbench refresh without deleting its canonical restoration source", async () => {
    mockLoadWorkbenchSyncedResourcePayload
      .mockResolvedValueOnce(workbenchPayloadWithTombstones([]) as never)
      .mockResolvedValueOnce(workbenchPayloadWithTombstones(["stable-text-card"]) as never)
      .mockResolvedValueOnce(workbenchPayloadWithTombstones([]) as never);

    render(<App />);

    expect(await screen.findByRole("main", { name: "OHB Study 工作台" })).toBeInTheDocument();
    await waitFor(() => {
      expect(latestWorkbenchProps().resources.map((resource) => resource.id)).toContain("stable-text-card");
    });

    await act(async () => {
      await latestWorkbenchProps().onRefreshResources?.();
    });
    await waitFor(() => {
      expect(latestWorkbenchProps().resources.map((resource) => resource.id)).not.toContain("stable-text-card");
    });

    await act(async () => {
      await latestWorkbenchProps().onRefreshResources?.();
    });
    await waitFor(() => {
      expect(latestWorkbenchProps().resources.map((resource) => resource.id)).toContain("stable-text-card");
    });
  });

  it("writes a scripture relocation as an exact single-verse placement", async () => {
    const initialResource = workbenchRangeResource();
    const relocatedResource = {
      ...initialResource,
      primaryAnchor: "Gen.1.2",
      verses: ["Gen.1.2"],
      debugMeta: {
        ...initialResource.debugMeta,
        coverageRanges: [{ start: "Gen.1.2", end: "Gen.1.2" }],
      },
    } satisfies StudyResource;
    mockLoadWorkbenchSyncedResourcePayload
      .mockReset()
      .mockResolvedValueOnce(workbenchPayloadWithResources([initialResource]) as never)
      .mockResolvedValueOnce(workbenchPayloadWithResources([relocatedResource]) as never);

    render(<App />);
    expect(await screen.findByRole("main", { name: "OHB Study 工作台" })).toBeInTheDocument();

    await act(async () => {
      await latestWorkbenchProps().onUpdateWorkbenchResource?.(initialResource.id, {
        body: initialResource.body,
        primaryAnchor: "Gen.1.2",
        title: initialResource.title,
      });
    });

    expect(mockUpdateWorkbenchCardReview).toHaveBeenCalledWith({
      cardId: "source-range-card",
      review: expect.objectContaining({
        coverageRanges: [{ start: "Gen.1.2", end: "Gen.1.2" }],
        primaryAnchor: "Gen.1.2",
      }),
      sourceApiBase: workbenchPayload.metadata.sourceApiBase,
    });
    expect(latestWorkbenchProps().resources.find((resource) => resource.id === initialResource.id)).toMatchObject({
      primaryAnchor: "Gen.1.2",
      verses: ["Gen.1.2"],
      debugMeta: {
        coverageRanges: [{ start: "Gen.1.2", end: "Gen.1.2" }],
      },
    });
  });

  it("rejects a refreshed placement that keeps verses from before relocation", async () => {
    const initialResource = workbenchRangeResource();
    const staleRefresh = {
      ...initialResource,
      primaryAnchor: "Gen.1.2",
      verses: ["Gen.1.1", "Gen.1.2"],
      debugMeta: {
        ...initialResource.debugMeta,
        coverageRanges: [{ start: "Gen.1.2", end: "Gen.1.2" }],
      },
    } satisfies StudyResource;
    mockLoadWorkbenchSyncedResourcePayload
      .mockReset()
      .mockResolvedValueOnce(workbenchPayloadWithResources([initialResource]) as never)
      .mockResolvedValueOnce(workbenchPayloadWithResources([staleRefresh]) as never);

    render(<App />);
    expect(await screen.findByRole("main", { name: "OHB Study 工作台" })).toBeInTheDocument();

    await expect(act(async () => {
      await latestWorkbenchProps().onUpdateWorkbenchResource?.(initialResource.id, {
        body: initialResource.body,
        primaryAnchor: "Gen.1.2",
        title: initialResource.title,
      });
    })).rejects.toThrow("刷新后的经文定位仍包含旧范围");
  });

  it("rejects a refreshed placement that keeps coverage ranges from before relocation", async () => {
    const initialResource = workbenchRangeResource();
    const staleRefresh = {
      ...initialResource,
      primaryAnchor: "Gen.1.2",
      verses: ["Gen.1.2"],
    } satisfies StudyResource;
    mockLoadWorkbenchSyncedResourcePayload
      .mockReset()
      .mockResolvedValueOnce(workbenchPayloadWithResources([initialResource]) as never)
      .mockResolvedValueOnce(workbenchPayloadWithResources([staleRefresh]) as never);

    render(<App />);
    expect(await screen.findByRole("main", { name: "OHB Study 工作台" })).toBeInTheDocument();

    await expect(act(async () => {
      await latestWorkbenchProps().onUpdateWorkbenchResource?.(initialResource.id, {
        body: initialResource.body,
        primaryAnchor: "Gen.1.2",
        title: initialResource.title,
      });
    })).rejects.toThrow("刷新后的经文定位仍包含旧范围");
  });

  it("opens the reader as the default local development surface", async () => {
    window.localStorage.removeItem(viewModeStorageKey);
    render(<App />);

    expect(await screen.findByRole("main", { name: "阅读" })).toBeInTheDocument();
    expect(mockWorkbench).not.toHaveBeenCalled();
    expect(mockReaderView).toHaveBeenCalled();
  });

  it("opens the workbench at the reader verse when returning from reading", async () => {
    window.localStorage.removeItem(viewModeStorageKey);
    render(<App />);
    await screen.findByRole("main", { name: "阅读" });

    await act(async () => {
      latestReaderViewProps().onExitReader?.({ book: "Luke", chapter: 8, verse: 29 });
    });

    expect(await screen.findByRole("main", { name: "OHB Study 工作台" })).toBeInTheDocument();
    expect(latestWorkbenchProps().initialVerseId).toBe("Luke.8.29");
  });

  it("opens the reader at the workbench verse", async () => {
    window.localStorage.setItem(viewModeStorageKey, "workbench");
    render(<App />);
    await screen.findByRole("main", { name: "OHB Study 工作台" });

    await act(async () => {
      latestWorkbenchProps().onOpenReader?.("Mic.1.2");
    });

    expect(await screen.findByRole("main", { name: "阅读" })).toBeInTheDocument();
    expect(latestReaderViewProps().initialPosition).toEqual({ book: "Mic", chapter: 1, verse: 2 });
  });

  it("does not resurrect unprojected comprehensive commentary from the standalone source across startup and reload", async () => {
    const standaloneUnprojected = standaloneCmcCard({
      id: "cmc-legacy-unprojected",
      body: "独立综合解读源中的经文复述，当前投影没有这张卡。",
    });
    const standaloneProjectedStale = standaloneCmcCard({
      id: "cmc-projected",
      title: "创世记 1:1 综合解读",
      body: "独立源旧正文，不能靠标题或经文覆盖工作台投影。",
    });
    const standalonePurged = standaloneCmcCard({
      id: "cmc-purged",
      body: "已被排除或清除的综合解读卡，不能从独立源复活。",
    });
    const projectedCmc = {
      id: "cmc-projected",
      title: "创世记 1:1 综合解读",
      type: "commentary",
      verses: ["Gen.1.1"],
      primaryAnchor: "Gen.1.1",
      body: "来自工作台投影的综合解读。",
      source: "圣经综合解读·创世记",
      debugMeta: {
        sourceStream: "cmc-comprehensive-commentary",
        sourceWorkbenchCardId: "source-cmc-projected",
      },
    } satisfies StudyResource;

    mockLoadComprehensiveCommentaryResources.mockResolvedValue([
      standaloneUnprojected,
      standaloneProjectedStale,
      standalonePurged,
    ]);
    mockLoadWorkbenchSyncedResourcePayload.mockResolvedValue(
      workbenchPayloadWithResources([workbenchResource, projectedCmc], ["cmc-purged"]) as never,
    );

    window.localStorage.removeItem(viewModeStorageKey);
    const firstLoad = render(<App />);
    expect(await screen.findByRole("main", { name: "阅读" })).toBeInTheDocument();
    expectReaderCmcProjection(latestReaderViewProps().resources, projectedCmc);

    firstLoad.unmount();
    mockReaderView.mockClear();
    mockWorkbench.mockClear();
    render(<App />);
    expect(await screen.findByRole("main", { name: "阅读" })).toBeInTheDocument();
    expectReaderCmcProjection(latestReaderViewProps().resources, projectedCmc);

    await act(async () => {
      latestReaderViewProps().onExitReader?.({ book: "Gen", chapter: 1, verse: 1 });
    });
    expect(await screen.findByRole("main", { name: "OHB Study 工作台" })).toBeInTheDocument();
    await act(async () => {
      await latestWorkbenchProps().onRefreshResources?.();
    });
    expectReaderCmcProjection(latestWorkbenchProps().resources, projectedCmc);
  });
});

function workbenchPayloadWithTombstones(excludedResourceIds: string[]) {
  return {
    ...workbenchPayload,
    metadata: {
      ...workbenchPayload.metadata,
      excludedResourceIds,
    },
  };
}

function workbenchPayloadWithResources(resources: StudyResource[], excludedResourceIds: string[] = []) {
  return {
    ...workbenchPayload,
    metadata: {
      ...workbenchPayload.metadata,
      excludedResourceIds,
    },
    resources,
  };
}

function standaloneCmcCard(overrides: Partial<StudyResource> & Pick<StudyResource, "id" | "body">): StudyResource {
  return {
    title: "创世记 1:1 综合解读",
    type: "commentary",
    verses: ["Gen.1.1"],
    primaryAnchor: "Gen.1.1",
    source: "圣经综合解读·创世记",
    debugMeta: {
      sourceStream: "cmc-comprehensive-commentary",
    },
    ...overrides,
  };
}

function expectReaderCmcProjection(resources: StudyResource[], projectedCmc: StudyResource) {
  const ids = resources.map((resource) => resource.id);
  expect(ids).toEqual(expect.arrayContaining([
    "stable-text-card",
    "development-image-card",
    "workbench-text-card",
    projectedCmc.id,
  ]));
  expect(ids).not.toContain("cmc-legacy-unprojected");
  expect(ids).not.toContain("cmc-purged");
  expect(resources.filter((resource) => resource.type === "commentary").map((resource) => resource.id)).toEqual(
    expect.arrayContaining(["stable-text-card", "workbench-text-card", projectedCmc.id]),
  );
  expect(resources.find((resource) => resource.id === projectedCmc.id)).toMatchObject({
    body: projectedCmc.body,
    title: projectedCmc.title,
  });
  expect(mockLoadComprehensiveCommentaryResources).not.toHaveBeenCalled();
}

function workbenchRangeResource() {
  return {
    id: "workbench-range-card",
    title: "工作台范围卡",
    type: "commentary",
    primaryAnchor: "Gen.1.1",
    verses: ["Gen.1.1", "Gen.1.2"],
    body: "来自卡片工作台的范围卡。",
    debugMeta: {
      coverageRanges: [{ start: "Gen.1.1", end: "Gen.1.2" }],
      sourceWorkbenchCardId: "source-range-card",
    },
  } satisfies StudyResource;
}
