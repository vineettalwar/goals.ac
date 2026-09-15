import { describe, expect, it } from "vitest";
import { SEO_SYSTEM_PROMPT } from "./content-piece-seo";
import { SYSTEM_PROMPT } from "./content-studio-prompts/system-prompt";
import {
  BODY_HEADING_OUTLINE_PROMPT,
  shiftHtmlHeadingsTowardH2,
  shiftMarkdownHeadingsTowardH2,
} from "./heading-outline";

describe("BODY_HEADING_OUTLINE_PROMPT", () => {
  it("is inlined into studio and SEO system prompts", () => {
    expect(SYSTEM_PROMPT).toContain(BODY_HEADING_OUTLINE_PROMPT);
    expect(SEO_SYSTEM_PROMPT).toContain(BODY_HEADING_OUTLINE_PROMPT);
  });
});

describe("shiftMarkdownHeadingsTowardH2", () => {
  it("promotes a body that never uses H2", () => {
    const body = "### Hook\n\nProse.\n\n#### Nested\n\nMore.";
    expect(shiftMarkdownHeadingsTowardH2(body)).toBe("## Hook\n\nProse.\n\n### Nested\n\nMore.");
  });

  it("leaves an outline that already has H2", () => {
    const body = "## Top\n\n### Nested";
    expect(shiftMarkdownHeadingsTowardH2(body)).toBe(body);
  });
});

describe("shiftHtmlHeadingsTowardH2", () => {
  it("promotes a body that never uses h2", () => {
    expect(shiftHtmlHeadingsTowardH2("<h3>Hook</h3><h4>Nested</h4>")).toBe(
      "<h2>Hook</h2><h3>Nested</h3>",
    );
  });
});
