import { describe, expect, it } from "vitest";
import { shouldSkipRankCheck } from "./keyword-rank-debounce";

const WINDOW_MS = 45 * 60 * 1000;

describe("shouldSkipRankCheck", () => {
  it("returns false when lastCheckedAt is null", () => {
    expect(shouldSkipRankCheck(null)).toBe(false);
  });

  it("returns true when last check was within the window", () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 20 * 60 * 1000); // 20 min ago
    expect(shouldSkipRankCheck(recent, now, WINDOW_MS)).toBe(true);
  });

  it("returns false when last check was outside the window", () => {
    const now = new Date();
    const old = new Date(now.getTime() - 60 * 60 * 1000); // 60 min ago
    expect(shouldSkipRankCheck(old, now, WINDOW_MS)).toBe(false);
  });

  it("accepts ISO string as lastCheckedAt", () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    expect(shouldSkipRankCheck(recent, now, WINDOW_MS)).toBe(true);
  });
});
