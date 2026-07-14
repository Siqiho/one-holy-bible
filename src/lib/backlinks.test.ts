import { describe, expect, it } from "vitest";
import type { StudyResource } from "../domain/resources";
import { resourcesForBookIntro, resourcesForVerse } from "./backlinks";

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
    assetPath: "/fixtures/image.png",
  },
  {
    id: "primary-anchor-only-image",
    title: "Primary Anchor Only Image",
    type: "image",
    verses: [],
    primaryAnchor: "Gen.1.1",
    body: "Navigation-only image.",
    assetPath: "/fixtures/image.png",
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
