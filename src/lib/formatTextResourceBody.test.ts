import { describe, expect, it } from "vitest";
import { formatTextResourceBody } from "./formatTextResourceBody";

describe("formatTextResourceBody", () => {
  it("joins mid-sentence soft line wraps so reading is continuous", () => {
    const body =
      "《创世记》第一章的遣词用句十分简单，其中的\n\n用字在所有的语言中都有，所以这一章是整本圣经里最容易翻译的。";

    expect(formatTextResourceBody(body)).toBe(
      "《创世记》第一章的遣词用句十分简单，其中的用字在所有的语言中都有，所以这一章是整本圣经里最容易翻译的。",
    );
  });

  it("keeps intentional paragraph breaks after complete sentences", () => {
    const body =
      "分出「昼、夜」并不是一件简单的事情。\n\n4、如果地球的体积太大，地表大气压力非常大，很难维持生命。";

    expect(formatTextResourceBody(body)).toBe(
      "分出「昼、夜」并不是一件简单的事情。\n\n4、如果地球的体积太大，地表大气压力非常大，很难维持生命。",
    );
  });

  it("separates bullet sections with paragraph spacing for easier reading", () => {
    const body =
      "「神说：『诸水之间要有空气，将水分为上下。』」• 「空气」原文是「穹苍」。原始地球的大气层充满浓厚的云雾。• 「将水分为上下」并不是一件简单的事情。";

    expect(formatTextResourceBody(body)).toBe(
      [
        "「神说：『诸水之间要有空气，将水分为上下。』」",
        "• 「空气」原文是「穹苍」。原始地球的大气层充满浓厚的云雾。",
        "• 「将水分为上下」并不是一件简单的事情。",
      ].join("\n\n"),
    );
  });

  it("normalizes bullet spacing and joins soft wraps before splitting sections", () => {
    const body =
      "「有晚上，有早晨」原文是「晚上临到，早晨临到」，这句短语可\n\n能是希伯来的修辞方法。• 这里的「日」原文可以指 24 小时的一天。";

    expect(formatTextResourceBody(body)).toBe(
      [
        "「有晚上，有早晨」原文是「晚上临到，早晨临到」，这句短语可能是希伯来的修辞方法。",
        "• 这里的「日」原文可以指 24 小时的一天。",
      ].join("\n\n"),
    );
  });

  it("collapses excessive blank lines", () => {
    const body = "第一段。\n\n\n\n第二段。";

    expect(formatTextResourceBody(body)).toBe("第一段。\n\n第二段。");
  });
});
