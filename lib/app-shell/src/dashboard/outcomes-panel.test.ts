import { describe, expect, it } from "vitest";
import { formatCitationDelta, formatGeoTrend, formatPublishHealth } from "./outcomes-format";

describe("formatPublishHealth", () => {
  it("handles empty, ok-only, and mixed", () => {
    expect(formatPublishHealth({ ok: 0, failed: 0, lastAt: null })).toBe("No publishes yet");
    expect(formatPublishHealth({ ok: 3, failed: 0, lastAt: null })).toBe("3 ok");
    expect(formatPublishHealth({ ok: 4, failed: 1, lastAt: null })).toBe("4 ok · 1 failed");
  });
});

describe("formatGeoTrend", () => {
  it("returns null without both scores", () => {
    expect(formatGeoTrend(null, 10)).toBeNull();
    expect(formatGeoTrend(10, null)).toBeNull();
  });

  it("formats delta vs prior", () => {
    expect(formatGeoTrend(72, 60)).toBe("+12 vs prior");
    expect(formatGeoTrend(50, 55)).toBe("-5 vs prior");
    expect(formatGeoTrend(40, 40)).toBe("flat vs prior");
  });
});

describe("formatCitationDelta", () => {
  it("formats non-zero deltas", () => {
    expect(formatCitationDelta(null)).toBeNull();
    expect(formatCitationDelta(0)).toBeNull();
    expect(formatCitationDelta(5)).toBe("+5pp vs prior");
    expect(formatCitationDelta(-3)).toBe("-3pp vs prior");
  });
});
