import { describe, expect, it } from "vitest";
import { markdownToHtml } from "./markdown-html";

describe("markdownToHtml heading outline", () => {
  it("renders a ###-only body as h2 so it sits under the CMS title", async () => {
    const html = await markdownToHtml("### The Hook System\n\nProse.");
    expect(html).toContain("<h2>");
    expect(html).not.toContain("<h3>");
  });
});
