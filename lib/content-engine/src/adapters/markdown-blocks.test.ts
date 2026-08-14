import { describe, expect, it } from "vitest";
import { parseMarkdownBlocks } from "./markdown-blocks";

describe("parseMarkdownBlocks", () => {
  it("recognizes a heading with its level", () => {
    expect(parseMarkdownBlocks("### Third level")).toEqual([
      { type: "heading", level: 3, text: "Third level" },
    ]);
  });

  it("caps heading level at 6 for a 6-hash heading", () => {
    expect(parseMarkdownBlocks("###### Sixth level")).toEqual([
      { type: "heading", level: 6, text: "Sixth level" },
    ]);
  });

  it("treats 7+ hashes as a paragraph, matching that markdown has no heading past level 6", () => {
    expect(parseMarkdownBlocks("####### Too deep")).toEqual([
      { type: "paragraph", text: "####### Too deep" },
    ]);
  });

  it("recognizes a plain paragraph", () => {
    expect(parseMarkdownBlocks("Just a sentence.")).toEqual([
      { type: "paragraph", text: "Just a sentence." },
    ]);
  });

  it("recognizes an unordered list", () => {
    expect(parseMarkdownBlocks("- one\n- two")).toEqual([
      { type: "list", ordered: false, items: ["one", "two"] },
    ]);
  });

  it("recognizes an ordered list", () => {
    expect(parseMarkdownBlocks("1. first\n2. second")).toEqual([
      { type: "list", ordered: true, items: ["first", "second"] },
    ]);
  });

  it("splits two adjacent lists of different types instead of merging them", () => {
    const blocks = parseMarkdownBlocks("- bullet\n1. numbered");

    expect(blocks).toEqual([
      { type: "list", ordered: false, items: ["bullet"] },
      { type: "list", ordered: true, items: ["numbered"] },
    ]);
  });

  it("recognizes a fenced code block with a language tag", () => {
    expect(parseMarkdownBlocks("```ts\nconst a = 1;\n```")).toEqual([
      { type: "code", lang: "ts", code: "const a = 1;" },
    ]);
  });

  it("defaults an untagged fence to plain text", () => {
    expect(parseMarkdownBlocks("```\nplain\n```")).toEqual([
      { type: "code", lang: "plain text", code: "plain" },
    ]);
  });

  it("preserves multiple lines inside a code block, including blank ones", () => {
    const blocks = parseMarkdownBlocks("```\nline one\n\nline three\n```");

    expect(blocks).toEqual([
      { type: "code", lang: "plain text", code: "line one\n\nline three" },
    ]);
  });

  it("does not treat markdown syntax inside a code fence as structure", () => {
    const blocks = parseMarkdownBlocks("```\n# not a heading\n- not a list\n```");

    expect(blocks).toEqual([
      { type: "code", lang: "plain text", code: "# not a heading\n- not a list" },
    ]);
  });

  it("recognizes an image with alt text", () => {
    expect(parseMarkdownBlocks("![a cat](https://example.com/cat.jpg)")).toEqual([
      { type: "image", src: "https://example.com/cat.jpg", alt: "a cat" },
    ]);
  });

  it("recognizes an image with empty alt text", () => {
    expect(parseMarkdownBlocks("![](https://example.com/cat.jpg)")).toEqual([
      { type: "image", src: "https://example.com/cat.jpg", alt: "" },
    ]);
  });

  it("walks a full article into the right block sequence", () => {
    const markdown = [
      "## Intro",
      "",
      "A paragraph.",
      "",
      "- item one",
      "- item two",
      "",
      "![diagram](https://example.com/d.png)",
      "",
      "```js",
      "run();",
      "```",
    ].join("\n");

    expect(parseMarkdownBlocks(markdown)).toEqual([
      { type: "heading", level: 2, text: "Intro" },
      { type: "paragraph", text: "A paragraph." },
      { type: "list", ordered: false, items: ["item one", "item two"] },
      { type: "image", src: "https://example.com/d.png", alt: "diagram" },
      { type: "code", lang: "js", code: "run();" },
    ]);
  });

  it("closes an unterminated list at end of input", () => {
    expect(parseMarkdownBlocks("- only item")).toEqual([
      { type: "list", ordered: false, items: ["only item"] },
    ]);
  });

  it("does not emit a code block for an unterminated fence with no content", () => {
    // Matches gutenberg.ts's existing behavior: an opening fence with nothing
    // closed after it produces no block rather than a half-open one.
    expect(parseMarkdownBlocks("```\nunterminated")).toEqual([]);
  });

  it("returns no blocks for empty input", () => {
    expect(parseMarkdownBlocks("")).toEqual([]);
  });

  it("returns no blocks for whitespace-only input", () => {
    expect(parseMarkdownBlocks("   \n\n  ")).toEqual([]);
  });

  it("does not run inline formatting or HTML-escape block text", () => {
    // Serialization is each adapter's job, not the parser's.
    const blocks = parseMarkdownBlocks("A **bold** claim & a <tag>.");

    expect(blocks).toEqual([{ type: "paragraph", text: "A **bold** claim & a <tag>." }]);
  });

  it("treats consecutive same-type lists as one block, separated by a blank line as two", () => {
    const joined = parseMarkdownBlocks("- a\n- b");
    const separated = parseMarkdownBlocks("- a\n\n- b");

    expect(joined).toEqual([{ type: "list", ordered: false, items: ["a", "b"] }]);
    expect(separated).toEqual([
      { type: "list", ordered: false, items: ["a"] },
      { type: "list", ordered: false, items: ["b"] },
    ]);
  });
});
