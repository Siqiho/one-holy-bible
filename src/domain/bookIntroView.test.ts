import { describe, expect, it } from "vitest";
import generatedPayload from "../data/generated/workbenchSyncedResources-v4.json";
import { bibleBooks } from "./bibleBooks";
import { buildBookIntroView } from "./bookIntroView";
import type { StudyResource } from "./resources";

const generatedResources = (generatedPayload as { resources: StudyResource[] }).resources;

function introResource(
  id: string,
  title: string,
  primaryAnchor: string,
  page: number,
): StudyResource {
  return {
    id,
    title,
    type: "commentary",
    primaryAnchor: primaryAnchor as StudyResource["primaryAnchor"],
    verses: [primaryAnchor as StudyResource["verses"][number]],
    body: `${title} body`,
    debugMeta: { page },
  };
}

describe("buildBookIntroView", () => {
  it("selects formal introduction cards, classifies lanes and keeps stable page/id ordering", () => {
    const duplicate = introResource("study-bible-luke-intro-p002-n004", "路加福音 作者", "Luke.1.1", 2);
    const shuffledResources: StudyResource[] = [
      introResource("study-bible-luke-intro-p010-n001", "路加福音 文学特征", "Luke.1.1", 10),
      introResource("study-bible-luke-note-p001-n001", "路加福音 作者", "Luke.1.1", 1),
      introResource("study-bible-luke-intro-p003-n002", "路加福音 主题", "Luke.1.1", 3),
      duplicate,
      introResource("study-bible-luke-intro-p001-n001", "路加福音 作者", "Luke.1.1", 1),
      introResource("study-bible-luke-intro-p002-n004", "路加福音 作者", "Luke.1.1", 2),
      introResource("study-bible-luke-intro-p001-n002", "约翰福音 作者", "John.1.1", 1),
    ];

    const view = buildBookIntroView(shuffledResources, "Luke");

    expect(view.bookId).toBe("Luke");
    expect(view.chineseTitle).toBe("路加福音");
    expect(view.englishTitle).toBe("Luke");
    expect(view.lanes.map((lane) => lane.id)).toEqual(["context", "message", "structure"]);
    expect(view.lanes[0].items.map(({ resource }) => resource.id)).toEqual([
      "study-bible-luke-intro-p001-n001",
      "study-bible-luke-intro-p002-n004",
    ]);
    expect(view.lanes[1].items.map(({ resource }) => resource.id)).toEqual([
      "study-bible-luke-intro-p003-n002",
    ]);
    expect(view.lanes[2].items.map(({ resource }) => resource.id)).toEqual([
      "study-bible-luke-intro-p010-n001",
    ]);
    expect(view.lanes[0].items[1].resource).toBe(duplicate);
    expect(view.totalCount).toBe(
      new Set(view.lanes.flatMap((lane) => lane.items.map(({ resource }) => resource.id))).size,
    );
  });

  it("projects shared first-volume introductions without mutating or cloning resources", () => {
    const firstSamuelAuthor = introResource(
      "study-bible-1sam-intro-p001-n001",
      "撒母耳记上 作者",
      "1Sam.1.1",
      1,
    );
    const firstSamuelTheme = introResource(
      "study-bible-1sam-intro-p002-n001",
      "撒母耳记上 主题",
      "1Sam.1.1",
      2,
    );
    const firstSamuelStructure = introResource(
      "study-bible-1sam-intro-p003-n001",
      "撒母耳记上 结构",
      "1Sam.1.1",
      3,
    );
    const secondSamuelStructure = introResource(
      "study-bible-2sam-intro-p001-n001",
      "撒母耳记下 结构",
      "2Sam.1.1",
      1,
    );
    const firstKingsAuthor = introResource(
      "study-bible-1kgs-intro-p001-n001",
      "列王纪上 作者",
      "1Kgs.1.1",
      1,
    );
    const secondKingsStructure = introResource(
      "study-bible-2kgs-intro-p001-n001",
      "列王纪下 文学特征",
      "2Kgs.1.1",
      1,
    );
    const firstChroniclesStructure = introResource(
      "study-bible-1chr-intro-p003-n001",
      "历代志上 大纲",
      "1Chr.1.1",
      3,
    );
    const resources = [
      firstSamuelStructure,
      secondSamuelStructure,
      firstSamuelTheme,
      firstSamuelAuthor,
      firstKingsAuthor,
      secondKingsStructure,
      firstChroniclesStructure,
    ];

    const secondSamuelView = buildBookIntroView(resources, "2Sam");
    const secondSamuelItems = secondSamuelView.lanes.flatMap((lane) => lane.items);

    expect(secondSamuelView.lanes.find((lane) => lane.id === "context")?.items).toEqual([
      { resource: firstSamuelAuthor, sharedFromBookId: "1Sam" },
    ]);
    expect(secondSamuelView.lanes.find((lane) => lane.id === "message")?.items).toEqual([
      { resource: firstSamuelTheme, sharedFromBookId: "1Sam" },
    ]);
    expect(secondSamuelView.lanes.find((lane) => lane.id === "structure")?.items).toEqual([
      expect.objectContaining({ resource: expect.objectContaining({ id: "study-bible-2sam-intro-p001-n001" }) }),
    ]);
    expect(secondSamuelItems).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resource: firstSamuelStructure, sharedFromBookId: "1Sam" }),
      ]),
    );
    expect(secondSamuelItems.find((item) => item.resource === firstSamuelAuthor)?.resource).toBe(firstSamuelAuthor);

    expect(buildBookIntroView(resources, "2Kgs").lanes.find((lane) => lane.id === "structure")?.items)
      .toEqual([expect.objectContaining({ resource: secondKingsStructure })]);
    expect(buildBookIntroView(resources, "2Kgs").lanes.find((lane) => lane.id === "context")?.items)
      .toEqual([{ resource: firstKingsAuthor, sharedFromBookId: "1Kgs" }]);

    expect(buildBookIntroView(resources, "2Chr").lanes.flatMap((lane) => lane.items))
      .toEqual(expect.arrayContaining([expect.objectContaining({
        resource: firstChroniclesStructure,
        sharedFromBookId: "1Chr",
      })]));
  });

  it("builds a non-empty three-lane introduction view for every Bible book from generated resources", () => {
    for (const book of bibleBooks) {
      const view = buildBookIntroView(generatedResources, book.id);

      expect(view.totalCount, book.id).toBeGreaterThan(0);
      expect(view.lanes, book.id).toHaveLength(3);

      const ids = view.lanes.flatMap((lane) => lane.items.map(({ resource }) => resource.id));
      expect(new Set(ids).size, book.id).toBe(ids.length);
    }
  });
});
