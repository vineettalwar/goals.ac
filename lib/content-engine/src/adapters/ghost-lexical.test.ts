import { describe, expect, it } from "vitest";
import { markdownToGhostLexical } from "./ghost-lexical";

function rootChildren(markdown: string) {
  return markdownToGhostLexical(markdown).root.children as Array<Record<string, unknown>>;
}

describe("markdownToGhostLexical images", () => {
  it("converts a standalone image line to an image card", () => {
    const children = rootChildren("![Hero](https://cdn.example/hero.png)");
    expect(children).toHaveLength(1);
    expect(children[0]).toMatchObject({
      type: "image",
      src: "https://cdn.example/hero.png",
      altText: "Hero",
    });
  });

  it("splits a paragraph around an inline image into paragraph + image card + paragraph", () => {
    const children = rootChildren(
      "Before the shot ![Inline](https://cdn.example/inline.png) and after.",
    );
    expect(children.map((c) => c.type)).toEqual(["paragraph", "image", "paragraph"]);
    expect(children[1]).toMatchObject({
      type: "image",
      src: "https://cdn.example/inline.png",
      altText: "Inline",
    });
    const before = children[0]!.children as Array<{ text?: string }>;
    const after = children[2]!.children as Array<{ text?: string }>;
    expect(before.map((n) => n.text).join("")).toBe("Before the shot");
    expect(after.map((n) => n.text).join("")).toBe("and after.");
  });

  it("emits multiple image cards when a line has several images", () => {
    const children = rootChildren(
      "A ![one](https://cdn.example/1.png) mid ![two](https://cdn.example/2.png) Z",
    );
    expect(children.map((c) => c.type)).toEqual([
      "paragraph",
      "image",
      "paragraph",
      "image",
      "paragraph",
    ]);
    expect(children[1]).toMatchObject({ src: "https://cdn.example/1.png", altText: "one" });
    expect(children[3]).toMatchObject({ src: "https://cdn.example/2.png", altText: "two" });
  });

  it("keeps trailing text after a leading image on the same line", () => {
    const children = rootChildren("![Lead](https://cdn.example/lead.png) then prose.");
    expect(children.map((c) => c.type)).toEqual(["image", "paragraph"]);
    const prose = children[1]!.children as Array<{ text?: string }>;
    expect(prose.map((n) => n.text).join("")).toBe("then prose.");
  });
});
