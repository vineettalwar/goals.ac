import { describe, expect, it } from "vitest";
import {
  DEFAULT_VERIFY_LINKS,
  formatMetricDelta,
  getPublishedStories,
  PUBLISHED_STORIES,
} from "./success-stories";

describe("formatMetricDelta", () => {
  it("joins before → after", () => {
    expect(formatMetricDelta("12", "48")).toBe("12 → 48");
  });
});

describe("success stories catalog", () => {
  it("ships no published stories until a real launch", () => {
    expect(PUBLISHED_STORIES).toEqual([]);
    expect(getPublishedStories()).toEqual([]);
  });

  it("keeps verify CTAs for the reporting method", () => {
    expect(DEFAULT_VERIFY_LINKS.map((l) => l.label)).toEqual([
      "Google Search Console",
      "Ahrefs",
      "Verify with ChatGPT",
    ]);
  });
});
