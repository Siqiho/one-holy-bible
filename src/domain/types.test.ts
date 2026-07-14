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
      verses: ["Gen.1.1"],
    };

    expect(verse.id).toBe("Gen.1.1");
    expect(resource.verses).toEqual(["Gen.1.1"]);
    expectTypeOf(resource.type).toEqualTypeOf<"commentary" | "image" | "video" | "html" | "note" | "link">();
  });

  it("provides a default workbench layout", () => {
    const layout: WorkbenchLayout = defaultWorkbenchLayout;

    expect(layout.showCuv).toBe(true);
    expect(layout.showKjv).toBe(true);
    expect(layout.modules.map((module) => module.id)).toEqual(["notes", "commentary", "media", "backlinks"]);
  });
});
