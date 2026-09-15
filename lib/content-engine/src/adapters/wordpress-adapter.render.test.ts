import { describe, expect, it } from "vitest";
import { wordpressAdapter } from "./wordpress-adapter";
import type { CanonicalContent } from "../content/canonical-content";

const content: CanonicalContent = {
  id: "1",
  markdown: "## Hello\n\nA previewable paragraph.",
  meta: { title: "Hello" },
};

describe("wordpressAdapter.render preview", () => {
  it("returns visual previewHtml for gutenberg, not just contentLength", async () => {
    const result = await wordpressAdapter.render(content, { outputMode: "gutenberg" });

    expect(result.previewHtml).toContain("Hello");
    expect(result.previewHtml).toContain("A previewable paragraph.");
    expect(result.previewJson).toMatchObject({ editorMode: "gutenberg" });
    expect((result.previewJson as { content: string }).content).toContain("<!-- wp:paragraph -->");
  });

  it("returns HTML previewHtml for divi shortcode mode", async () => {
    const result = await wordpressAdapter.render(content, { outputMode: "divi" });

    expect(result.previewHtml).toContain("Hello");
    expect((result.previewJson as { content: string }).content).toContain("[et_pb_");
  });
});
