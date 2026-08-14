import { describe, expect, it } from "vitest";
import { markdownToElementorData } from "./elementor";

type ElementorNode = {
  id: string;
  elType: string;
  widgetType?: string;
  settings: Record<string, unknown>;
  elements?: ElementorNode[];
};

async function widgets(markdown: string, title = "Title"): Promise<ElementorNode[]> {
  const { elementorData } = await markdownToElementorData(markdown, title);
  const tree = JSON.parse(elementorData) as ElementorNode[];
  return tree[0]!.elements![0]!.elements!;
}

describe("markdownToElementorData", () => {
  it("produces valid JSON matching Elementor's recursive elType schema", async () => {
    const { elementorData } = await markdownToElementorData("## Heading\n\nText.", "Title");
    const tree = JSON.parse(elementorData) as ElementorNode[];

    expect(tree).toHaveLength(1);
    expect(tree[0]!.elType).toBe("section");
    const column = tree[0]!.elements![0]!;
    expect(column.elType).toBe("column");
    expect(column.elements!.every((w) => w.elType === "widget")).toBe(true);
  });

  it("emits one widget per block instead of one blob for the whole article", async () => {
    const nodes = await widgets("## Heading\n\nA paragraph.\n\n- one\n- two");

    expect(nodes).toHaveLength(3);
  });

  it("uses the native heading widget with the correct header size", async () => {
    const [heading] = await widgets("### Third level");

    expect(heading!.widgetType).toBe("heading");
    expect(heading!.settings.title).toBe("Third level");
    expect(heading!.settings.header_size).toBe("h3");
  });

  it("renders a paragraph as a text-editor widget with real markup", async () => {
    const [para] = await widgets("Some **bold** text.");

    expect(para!.widgetType).toBe("text-editor");
    expect(para!.settings.editor).toContain("<strong>bold</strong>");
  });

  it("renders a list as a text-editor widget with a real list tag", async () => {
    const [list] = await widgets("1. first\n2. second");

    expect(list!.widgetType).toBe("text-editor");
    expect(list!.settings.editor).toContain("<ol>");
    expect(list!.settings.editor).toContain("<li>first</li>");
  });

  it("renders an unordered list with a ul tag, not ol", async () => {
    const [list] = await widgets("- a\n- b");

    expect(list!.settings.editor).toContain("<ul>");
    expect(list!.settings.editor).not.toContain("<ol>");
  });

  it("renders code as a text-editor widget with escaped content", async () => {
    const [code] = await widgets("```\n<script>x</script>\n```");

    expect(code!.widgetType).toBe("text-editor");
    expect(code!.settings.editor).toContain("&lt;script&gt;");
    expect(code!.settings.editor).not.toContain("<script>");
  });

  it("uses the native image widget with url and alt", async () => {
    const [image] = await widgets("![a cat](https://example.com/cat.jpg)");

    expect(image!.widgetType).toBe("image");
    expect(image!.settings.image).toEqual({ url: "https://example.com/cat.jpg", alt: "a cat" });
  });

  it("assigns every node a unique id", async () => {
    const { elementorData } = await markdownToElementorData(
      "## A\n\nB\n\n## C\n\nD\n\n## E\n\nF",
      "Title",
    );
    const ids = [...elementorData.matchAll(/"id":"([^"]+)"/g)].map((m) => m[1]);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to a single empty widget for empty markdown", async () => {
    const nodes = await widgets("");

    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.widgetType).toBe("text-editor");
  });

  it("still returns a plaintext content fallback alongside the structured tree", async () => {
    const { content } = await markdownToElementorData("## Heading\n\nText.", "Title");

    expect(content).toContain("<h2");
    expect(content).toContain("Heading");
  });
});
