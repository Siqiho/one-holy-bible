import { describe, expect, expectTypeOf, it } from "vitest";

import type { BibleVerse } from "./bible";
import { defaultWorkbenchLayout, type WorkbenchLayout } from "./layout";
import type { StudyResource } from "./resources";

describe("domain types", () => {
  it("supports BibleVerse and StudyResource shapes", () => {
    const verse: BibleVerse = {
      id: "Gen.1.1",
      book: "Gen",
      chapter: 1,
      verse: 1,
      text: "In the beginning God created the heaven and the earth.",
    };

    const resource: StudyResource = {
      id: "note-gen-1-1",
      title: "Genesis 1:1 note",
      type: "note",
      body: "Creation begins.",
      summary: "Creation begins.",
      searchText: "Genesis 1:1 creation begins",
      verses: ["Gen.1.1"],
      bookIntro: "Gen",
      debugMeta: {
        sourcePdfPath: "/Users/simon/OHB/文档/CMC-01_副本.pdf",
        sourcePdfSha256: "b1c3700fa45af07f63484fab7b19176cdbc39c41d011395466978d4ffc712c40",
        sourceTextSnippet: "Genesis source snippet",
      },
    };

    expect(verse.id).toBe("Gen.1.1");
    expect(resource.verses).toEqual(["Gen.1.1"]);
    expect(resource.bookIntro).toBe("Gen");
    expect(resource.debugMeta?.sourcePdfSha256).toHaveLength(64);
    expectTypeOf(resource.type).toEqualTypeOf<"commentary" | "image" | "video" | "html" | "note" | "link">();
    expectTypeOf(resource.bookIntro).toEqualTypeOf<string | undefined>();
    expectTypeOf(resource.summary).toEqualTypeOf<string | undefined>();
    expectTypeOf(resource.searchText).toEqualTypeOf<string | undefined>();
  });

  it("provides a default workbench layout", () => {
    const layout: WorkbenchLayout = defaultWorkbenchLayout;

    expect(layout.showCuv).toBe(true);
    expect(layout.showKjv).toBe(true);
    expect(layout.savedCardsByBook).toEqual({});
    expect(layout.savedCardsByVerse).toEqual({});
    expect(layout.centerModules).toEqual(["kjv", "cuv", "card"]);
    expect(layout.activeCenterModules).toEqual(["cuv"]);
    expect(layout.cardBrowserSplitPercent).toBe(44);
    expect(layout.activeResourceId).toBeNull();
    expect(layout.centerCardResourceIds).toEqual([]);
    expect(layout.centerCardResourceIdsByBook).toEqual({});
    expect(layout.modules.map((module) => module.id)).toEqual(["commentary", "media", "encyclopedia", "notes"]);
    expect(layout.modules.map((module) => module.title)).toEqual(["注释", "媒体", "百科", "笔记"]);
    expect(layout.modules.every((module) => module.side === "right")).toBe(true);
  });
});
