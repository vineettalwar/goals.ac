import { describe, expect, it } from "vitest";
import { scrapeCompetitorText } from "./competitorAnalyzer";

describe("scrapeCompetitorText SSRF", () => {
  it("rejects a private URL before fetch", async () => {
    await expect(scrapeCompetitorText("http://127.0.0.1/secret")).rejects.toThrow(
      /private\/reserved/,
    );
  });
});
