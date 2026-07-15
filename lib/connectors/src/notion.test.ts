import { describe, expect, it } from "vitest";
import { markdownToNotionBlocks } from "./notion";

describe("markdownToNotionBlocks images", () => {
  it("emits external image blocks for https URLs", () => {
    const blocks = markdownToNotionBlocks("![Hero](https://cdn.example/hero.png)");
    expect(blocks).toEqual([
      {
        object: "block",
        type: "image",
        image: {
          type: "external",
          external: { url: "https://cdn.example/hero.png" },
          caption: [{ type: "text", text: { content: "Hero" } }],
        },
      },
    ]);
  });

  it("skips data: and http: image URLs", () => {
    const blocks = markdownToNotionBlocks(
      [
        "![svg](data:image/svg+xml;base64,PHN2Zy8+)",
        "![insecure](http://cdn.example/a.png)",
        "![ok](https://cdn.example/ok.png)",
      ].join("\n"),
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "image" });
  });
});
