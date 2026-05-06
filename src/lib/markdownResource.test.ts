import { describe, expect, it } from "vitest";
import { parseMarkdownResource, serializeMarkdownResource } from "./markdownResource";

const markdown = `---
id: gen-1-1-creation-note
title: 起初，神创造天地
type: commentary
verses:
  - Gen.1.1
source: 用户笔记
---

“起初”声明时间、宇宙和历史都在神的创造中开始。
`;

describe("markdown resources", () => {
  it("parses frontmatter and body", () => {
    expect(parseMarkdownResource(markdown)).toEqual({
      id: "gen-1-1-creation-note",
      title: "起初，神创造天地",
      type: "commentary",
      verses: ["Gen.1.1"],
      source: "用户笔记",
      body: "“起初”声明时间、宇宙和历史都在神的创造中开始。",
    });
  });

  it("serializes resources back to markdown", () => {
    const serialized = serializeMarkdownResource(parseMarkdownResource(markdown));
    expect(serialized).toContain("id: gen-1-1-creation-note");
    expect(serialized).toContain("type: commentary");
    expect(serialized).toContain("“起初”声明时间");
  });
});
