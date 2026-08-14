import { describe, expect, it } from "vitest";
import { markdownToGutenbergBlocks } from "./gutenberg";

/** Every attribute object WordPress will run through json_decode. */
function blockAttributes(markup: string): unknown[] {
  const matches = markup.matchAll(/<!-- wp:[a-z-]+ (\{.*?\}) -->/g);
  return [...matches].map(([, json]) => JSON.parse(json!));
}

describe("markdownToGutenbergBlocks", () => {
  it("emits strict JSON attributes that WordPress can decode", () => {
    const markup = markdownToGutenbergBlocks("## A heading\n\nSome text.");

    // json_decode fails on unquoted keys, and a failed decode makes the editor
    // flag the block as containing unexpected content.
    expect(() => blockAttributes(markup)).not.toThrow();
  });

  it("writes the heading level as a number, not a string", () => {
    const markup = markdownToGutenbergBlocks("### Third level");

    expect(markup).toContain('<!-- wp:heading {"level":3} -->');
    expect(blockAttributes(markup)).toContainEqual({ level: 3 });
  });

  it("wraps the heading in the matching tag", () => {
    expect(markdownToGutenbergBlocks("## Two")).toContain("<h2>Two</h2>");
    expect(markdownToGutenbergBlocks("#### Four")).toContain("<h4>Four</h4>");
  });

  it("marks an ordered list as ordered so numbering survives editing", () => {
    const markup = markdownToGutenbergBlocks("1. first\n2. second");

    expect(markup).toContain('<!-- wp:list {"ordered":true} -->');
    expect(markup).toContain("<ol>");
  });

  it("leaves a bullet list without the ordered attribute", () => {
    const markup = markdownToGutenbergBlocks("- one\n- two");

    expect(markup).toContain("<!-- wp:list -->");
    expect(markup).not.toContain("ordered");
  });

  it("emits a paragraph block for plain text", () => {
    const markup = markdownToGutenbergBlocks("Just a sentence.");

    expect(markup).toContain("<!-- wp:paragraph -->");
    expect(markup).toContain("<p>Just a sentence.</p>");
  });

  it("closes every block it opens", () => {
    const markup = markdownToGutenbergBlocks("## Heading\n\ntext\n\n- a\n- b\n\n1. one");
    const opened = [...markup.matchAll(/<!-- wp:([a-z-]+)/g)].map((m) => m[1]);
    const closed = [...markup.matchAll(/<!-- \/wp:([a-z-]+)/g)].map((m) => m[1]);

    expect(closed).toEqual(opened);
  });

  it("escapes HTML in body text so markup cannot leak into the post", () => {
    const markup = markdownToGutenbergBlocks("A <script>alert(1)</script> line.");

    expect(markup).not.toContain("<script>");
    expect(markup).toContain("&lt;script&gt;");
  });

  it("converts inline emphasis and code", () => {
    const markup = markdownToGutenbergBlocks("Some **bold** and *italic* and `code`.");

    expect(markup).toContain("<strong>bold</strong>");
    expect(markup).toContain("<em>italic</em>");
    expect(markup).toContain("<code>code</code>");
  });

  it("emits an image block for a markdown image", () => {
    const markup = markdownToGutenbergBlocks("![a cat](https://example.com/cat.jpg)");

    expect(markup).toContain("<!-- wp:image -->");
    expect(markup).toContain('src="https://example.com/cat.jpg"');
    expect(markup).toContain('alt="a cat"');
  });

  it("emits a code block for a fenced section", () => {
    const markup = markdownToGutenbergBlocks("```\nconst a = 1;\n```");

    expect(markup).toContain("<!-- wp:code ");
    expect(markup).toContain("const a = 1;");
    // The language attribute went through the same broken serializer.
    expect(blockAttributes(markup)).toContainEqual({ language: "plain text" });
  });

  it("carries a fenced language through as a decodable attribute", () => {
    const markup = markdownToGutenbergBlocks("```ts\nconst a = 1;\n```");

    expect(() => blockAttributes(markup)).not.toThrow();
    expect(blockAttributes(markup)).toContainEqual({ language: "ts" });
  });

  it("returns a valid empty paragraph for empty input", () => {
    const markup = markdownToGutenbergBlocks("");

    expect(markup).toContain("<!-- wp:paragraph -->");
    expect(() => blockAttributes(markup)).not.toThrow();
  });
});
