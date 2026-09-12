import { describe, expect, it } from "vitest";
import type { StudyResource } from "../domain/resources";
import { createVerseResourceIndex, resourcesForBookIntro, resourcesForVerse } from "./backlinks";

const resources: StudyResource[] = [
  {
    id: "frontmatter-match",
    title: "Frontmatter Match",
    type: "commentary",
    verses: ["Gen.1.1"],
    body: "",
  },
  {
    id: "body-match",
    title: "Body Match",
    type: "note",
    verses: [],
    body: "This note mentions [[创 1:1]].",
  },
  {
    id: "other-verse",
    title: "Other Verse",
    type: "note",
    verses: ["Gen.1.2"],
    body: "No match.",
  },
  {
    id: "book-intro",
    title: "Book Intro",
    type: "image",
    verses: [],
    bookIntro: "Gen",
    body: "Genesis introduction.",
    assetPath: "/src/assets/resources/genesis/images/cmc-01/p001_img000_670x452.png",
  },
  {
    id: "primary-anchor-only-image",
    title: "Primary Anchor Only Image",
    type: "image",
    verses: [],
    primaryAnchor: "Gen.1.1",
    body: "Navigation-only image.",
    assetPath: "/src/assets/resources/genesis/images/cmc-01/p002_img001_670x452.png",
  },
];

describe("resourcesForVerse", () => {
  it("returns resources bound by frontmatter or body references", () => {
    expect(resourcesForVerse(resources, "Gen.1.1").map((resource) => resource.id)).toEqual([
      "frontmatter-match",
      "body-match",
      "primary-anchor-only-image",
    ]);
  });

  it("keeps book intro resources separate from verse resources", () => {
    expect(resourcesForVerse(resources, "Gen.1.1").map((resource) => resource.id)).not.toContain("book-intro");
    expect(resourcesForBookIntro(resources, "Gen").map((resource) => resource.id)).toEqual(["book-intro"]);
    expect(resourcesForBookIntro(resources, "Exod")).toEqual([]);
  });

  it("uses a primary anchor as verse membership when verses is empty", () => {
    expect(resourcesForVerse(resources, "Gen.1.1").map((resource) => resource.id)).toContain("primary-anchor-only-image");
  });
});

describe("createVerseResourceIndex", () => {
  const ids = (list: StudyResource[]) => list.map((resource) => resource.id);
  const index = createVerseResourceIndex(resources);

  it("matches resourcesForVerse for every verse, in resource order", () => {
    for (const verseId of ["Gen.1.1", "Gen.1.2", "Gen.1.3"] as const) {
      expect(ids(index.mentioning(verseId))).toEqual(ids(resourcesForVerse(resources, verseId)));
    }
  });

  it("separates anchor/coverage touches from wiki-link mentions", () => {
    expect(ids(index.touching("Gen.1.1"))).toEqual(["frontmatter-match", "primary-anchor-only-image"]);
    expect(ids(index.mentioning("Gen.1.1"))).toContain("body-match");
    expect(index.touching("Gen.9.9")).toEqual([]);
  });

  it("unions several verses without duplicates and keeps original order", () => {
    const covering: StudyResource = {
      id: "covers-both",
      title: "Covers Both",
      type: "commentary",
      verses: ["Gen.1.1", "Gen.1.2"],
      primaryAnchor: "Gen.1.1",
      body: "Also links [[创 1:2]].",
    };
    const combined = createVerseResourceIndex([covering, ...resources]);
    expect(ids(combined.mentioningAny(["Gen.1.2", "Gen.1.1"]))).toEqual([
      "covers-both",
      "frontmatter-match",
      "body-match",
      "other-verse",
      "primary-anchor-only-image",
    ]);
  });
});
