import { describe, expect, it } from "vitest";
import type { StudyResource } from "../domain/resources";
import { resourcesForVerse } from "./backlinks";

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
];

describe("resourcesForVerse", () => {
  it("returns resources bound by frontmatter or body references", () => {
    expect(resourcesForVerse(resources, "Gen.1.1").map((resource) => resource.id)).toEqual([
      "frontmatter-match",
      "body-match",
    ]);
  });
});
