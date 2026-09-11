import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ScriptureLinkedText } from "./ScriptureLinkedText";
import { VersePreviewProvider } from "./VersePreviewContext";

afterEach(() => {
  cleanup();
});

const sampleVerses = [
  { id: "Gen.1.1", text: "起初 神创造天地。" },
  { id: "John.1.1", text: "太初有道，道与神同在，道就是神。" },
  { id: "Deut.32.15", text: "但耶书仑渐渐肥胖，粗壮，光润，踢跳奔跑，便离弃造他的神，轻看救他的磐石。" },
  { id: "Gen.35.1", text: "神对雅各说：起来！上伯特利去，住在那里；要在那里筑一座坛给神。" },
  { id: "Eph.6.12", text: "因我们并不是与属血气的争战，乃是与那些执政的、掌权的、管辖这幽暗世界的，以及天空属灵气的恶魔争战。" },
] as const;

function renderLinked(text: string) {
  return render(
    <VersePreviewProvider verses={[...sampleVerses]}>
      <ScriptureLinkedText text={text} sourceBookId="Gen" sourceChapter={1} />
    </VersePreviewProvider>,
  );
}

describe("ScriptureLinkedText", () => {
  it("marks wiki and comprehensive refs from the reading-desk sample cards", () => {
    renderLinked(
      [
        "“起初”声明时间、宇宙和历史都在神的创造中开始。相关引用：[[Gen.1.1]]、[[约 1:1]]",
        "单数是 Eloah（申三十二 15）或 El（创三十五 1），双数是 Eloahi。",
      ].join("\n\n"),
    );

    const marks = screen.getAllByTestId("scripture-ref");
    expect(marks.map((node) => node.textContent)).toEqual([
      "Gen.1.1",
      "约 1:1",
      "（申三十二 15）",
      "（创三十五 1）",
    ]);
    expect(marks.map((node) => node.getAttribute("data-verse-id"))).toEqual([
      "Gen.1.1",
      "John.1.1",
      "Deut.32.15",
      "Gen.35.1",
    ]);
  });

  it("shows CUV verse text on hover for comprehensive refs", async () => {
    const user = userEvent.setup();
    renderLinked("有人认为是因为天空中有属灵气的恶魔居住的缘故（弗六 12）。");

    const mark = screen.getByTestId("scripture-ref");
    expect(mark).toHaveAttribute("data-verse-id", "Eph.6.12");
    expect(mark).toHaveTextContent("（弗六 12）");

    await user.hover(mark);

    const popover = await screen.findByTestId("verse-preview-popover");
    expect(popover).toHaveTextContent("以弗所书 6:12");
    expect(popover).toHaveTextContent("和合本");
    expect(popover).toHaveTextContent("天空属灵气的恶魔");
  });

  it("shows CUV verse text on hover for wiki refs", async () => {
    const user = userEvent.setup();
    renderLinked("相关引用：[[Gen.1.1]]、[[约 1:1]]");

    const marks = screen.getAllByTestId("scripture-ref");
    await user.hover(marks[0]!);

    const popover = await screen.findByTestId("verse-preview-popover");
    expect(popover).toHaveTextContent("创世记 1:1");
    expect(popover).toHaveTextContent("起初 神创造天地。");
  });
});
