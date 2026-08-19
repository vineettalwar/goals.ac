import { describe, expect, it } from "vitest";
import { isDailyFiveItemValid, parseSourceUrls, requiresSources } from "./daily-five-validation";

describe("daily-five validation", () => {
  it("parses URLs from comma or newline list", () => {
    expect(parseSourceUrls("https://a.com, https://b.com\nhttps://c.com")).toEqual([
      "https://a.com",
      "https://b.com",
      "https://c.com",
    ]);
  });

  it("requires source URLs for News section", () => {
    expect(requiresSources("News")).toBe(true);
    expect(isDailyFiveItemValid({ section: "News", sourceUrls: "" })).toBe(false);
    expect(isDailyFiveItemValid({ section: "News", sourceUrls: "https://vegnews.com/story" })).toBe(true);
  });

  it("does not require source URLs for non-news sections", () => {
    expect(isDailyFiveItemValid({ section: "Features", sourceUrls: "" })).toBe(true);
  });
});
