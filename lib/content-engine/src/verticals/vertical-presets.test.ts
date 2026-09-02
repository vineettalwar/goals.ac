import { describe, it, expect } from "vitest";
import { findForbiddenClaims, verticalRequiresReview, getVerticalPreset } from "@workspace/content-engine/vertical-presets";

describe("vertical presets", () => {
  it("flags law and dental for human review", () => {
    expect(verticalRequiresReview("law")).toBe(true);
    expect(verticalRequiresReview("dental")).toBe(true);
    expect(verticalRequiresReview("software")).toBe(false);
    expect(verticalRequiresReview(null)).toBe(false);
  });
  it("finds every forbidden claim, not just the first", () => {
    const hits = findForbiddenClaims("We offer a guaranteed outcome. Truly a guaranteed outcome.", "law");
    expect(hits).toHaveLength(2);
    expect(hits[0].index).toBeLessThan(hits[1].index);
  });
  it("is case insensitive and carries an excerpt", () => {
    const hits = findForbiddenClaims("This procedure is PAINLESS for everyone.", "dental");
    expect(hits).toHaveLength(1);
    expect(hits[0].excerpt).toContain("PAINLESS");
  });
  it("falls back to the other preset for unknown verticals", () => {
    expect(getVerticalPreset(undefined).id).toBe("other");
  });
});
