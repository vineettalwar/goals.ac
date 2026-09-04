import { describe, expect, it } from "vitest";
import { computeScoreDistribution, countCodeFrequency } from "./publish-quality-distribution";

describe("computeScoreDistribution", () => {
  it("returns nulls and a zeroed histogram for an empty set", () => {
    const result = computeScoreDistribution([]);
    expect(result.count).toBe(0);
    expect(result.min).toBeNull();
    expect(result.max).toBeNull();
    expect(result.median).toBeNull();
    expect(result.p10).toBeNull();
    expect(result.p25).toBeNull();
    expect(result.p75).toBeNull();
    expect(result.p90).toBeNull();
    expect(result.histogram).toHaveLength(10);
    expect(result.histogram.every((b) => b.count === 0)).toBe(true);
    expect(result.histogram[0]).toEqual({ rangeStart: 0, rangeEnd: 9, count: 0 });
    expect(result.histogram[9]).toEqual({ rangeStart: 90, rangeEnd: 100, count: 0 });
  });

  it("collapses every percentile to the single value for a one-element set", () => {
    const result = computeScoreDistribution([73]);
    expect(result.count).toBe(1);
    expect(result.min).toBe(73);
    expect(result.max).toBe(73);
    expect(result.median).toBe(73);
    expect(result.p10).toBe(73);
    expect(result.p25).toBe(73);
    expect(result.p75).toBe(73);
    expect(result.p90).toBe(73);
    const bucket = result.histogram.find((b) => b.rangeStart === 70);
    expect(bucket?.count).toBe(1);
  });

  it("computes known percentiles and buckets over a fixed array", () => {
    // 0..100 in steps of 10: 0,10,20,...,100 (11 values).
    const scores = Array.from({ length: 11 }, (_, i) => i * 10);
    const result = computeScoreDistribution(scores);

    expect(result.count).toBe(11);
    expect(result.min).toBe(0);
    expect(result.max).toBe(100);
    expect(result.median).toBe(50);
    // Linear-interpolation percentile over 11 sorted points spaced by 10:
    // rank = p/100 * 10, value = rank * 10.
    expect(result.p10).toBe(10);
    expect(result.p25).toBe(25);
    expect(result.p75).toBe(75);
    expect(result.p90).toBe(90);

    // One value per decile bucket, except the last bucket which holds both 90 and 100.
    for (let i = 0; i < 9; i++) {
      expect(result.histogram[i]!.count).toBe(1);
    }
    expect(result.histogram[9]!.count).toBe(2);
  });

  it("clamps out-of-range scores into the nearest bucket instead of dropping them", () => {
    const result = computeScoreDistribution([-5, 105]);
    expect(result.histogram[0]!.count).toBe(1);
    expect(result.histogram[9]!.count).toBe(1);
  });
});

describe("countCodeFrequency", () => {
  it("returns an empty object for no rows", () => {
    expect(countCodeFrequency([])).toEqual({});
  });

  it("ignores null and undefined rows", () => {
    expect(countCodeFrequency([null, undefined, []])).toEqual({});
  });

  it("counts occurrences of each code across rows", () => {
    const result = countCodeFrequency([
      ["thin_content", "no_faq"],
      ["thin_content"],
      [],
      ["no_faq", "no_faq"],
    ]);
    expect(result).toEqual({ thin_content: 2, no_faq: 3 });
  });
});
