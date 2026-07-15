import { describe, expect, it } from "vitest";
import { notionAdapter } from "./notion-adapter";
import type { CanonicalContent } from "../content/canonical-content";

function fakeContent(overrides: Partial<CanonicalContent> = {}): CanonicalContent {
  return {
    id: "1",
    markdown: "## Hello\n\nWorld",
    meta: { title: "Test" },
    ...overrides,
  };
}

describe("notionAdapter.render", () => {
  it("sets coverUrl from https featured image", async () => {
    const result = await notionAdapter.render(
      fakeContent({
        pieceMetadata: { featuredImageUrl: "https://cdn.example/hero.png" } as never,
      }),
    );
    expect(result.payload).toMatchObject({
      kind: "notion_blocks",
      coverUrl: "https://cdn.example/hero.png",
    });
    expect(result.warnings).toEqual([]);
  });

  it("skips non-https featured image with warning", async () => {
    const result = await notionAdapter.render(
      fakeContent({
        pieceMetadata: { featuredImageUrl: "data:image/png;base64,abc" } as never,
      }),
    );
    expect(result.payload).toMatchObject({ kind: "notion_blocks" });
    if (result.payload.kind === "notion_blocks") {
      expect(result.payload.coverUrl).toBeUndefined();
    }
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "notion_featured_skipped" }),
    );
  });

  it("omits coverUrl when no featured image provided", async () => {
    const result = await notionAdapter.render(fakeContent());
    if (result.payload.kind === "notion_blocks") {
      expect(result.payload.coverUrl).toBeUndefined();
    }
    expect(result.warnings).toEqual([]);
  });

  it("emits image blocks for https markdown images", async () => {
    const result = await notionAdapter.render(
      fakeContent({ markdown: "![Alt](https://cdn.example/img.png)" }),
    );
    if (result.payload.kind === "notion_blocks") {
      const imageBlock = result.payload.blocks.find((b) => b.type === "image");
      expect(imageBlock).toMatchObject({
        type: "image",
        image: { type: "external", external: { url: "https://cdn.example/img.png" } },
      });
    }
  });

  it("warns about non-https markdown images", async () => {
    const result = await notionAdapter.render(
      fakeContent({ markdown: "![x](http://insecure.example/a.png)\n\n![y](data:image/png;base64,abc)" }),
    );
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "notion_images_omitted" }),
    );
  });
});
