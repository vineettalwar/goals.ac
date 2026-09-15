import { describe, expect, it } from "vitest";
import { parseAnalyticsRowKeys, priorPeriodRange } from "./gscSearchAnalytics";

describe("parseAnalyticsRowKeys", () => {
  it("maps date+query in request order", () => {
    expect(parseAnalyticsRowKeys(["2026-09-01", "seo tools"], ["date", "query"])).toEqual({
      query: "seo tools",
      page: null,
      date: "2026-09-01",
    });
  });

  it("leaves date empty for query-only rows", () => {
    expect(parseAnalyticsRowKeys(["seo tools"], ["query"])).toEqual({
      query: "seo tools",
      page: null,
      date: null,
    });
  });
});

describe("priorPeriodRange", () => {
  it("returns an equal-length window immediately before the current range", () => {
    const prior = priorPeriodRange("2026-06-01", "2026-06-28");
    expect(prior).toEqual({ startDate: "2026-05-04", endDate: "2026-05-31" });
  });

  it("handles single-day ranges", () => {
    const prior = priorPeriodRange("2026-07-10", "2026-07-10");
    expect(prior).toEqual({ startDate: "2026-07-09", endDate: "2026-07-09" });
  });

  it("uses UTC date math across month boundaries", () => {
    const prior = priorPeriodRange("2026-03-01", "2026-03-07");
    expect(prior.startDate).toBe("2026-02-22");
    expect(prior.endDate).toBe("2026-02-28");
  });
});
