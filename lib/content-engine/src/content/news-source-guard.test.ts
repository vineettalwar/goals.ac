import { describe, expect, it } from "vitest";
import { buildNewsSourceGuardPrompt, extractSourceUrlsFromAngle } from "./news-source-guard";

describe("news-source-guard", () => {
  it("extracts URLs from pasted research notes", () => {
    const angle =
      "section:News|Company X raised $5M — verify\nSources: https://vegnews.com/a, https://example.org/b.";
    expect(extractSourceUrlsFromAngle(angle)).toEqual([
      "https://vegnews.com/a",
      "https://example.org/b",
    ]);
  });

  it("returns guard prompt when URLs are present", () => {
    const prompt = buildNewsSourceGuardPrompt("notes https://example.com/story");
    expect(prompt).toContain("cite ONLY these");
    expect(prompt).toContain("https://example.com/story");
  });

  it("returns empty string when no URLs", () => {
    expect(buildNewsSourceGuardPrompt("section:Features|evergreen explainer")).toBe("");
  });
});
