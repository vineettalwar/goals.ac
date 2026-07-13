import { describe, expect, it } from "vitest";
import { buildSemrushGapCacheKey } from "./semrush-gap-cache";

describe("semrush-gap-cache", () => {
  it("builds stable keys for the same gap inputs", () => {
    const params = {
      projectId: 4,
      domain: "https://sometech.work/",
      competitors: ["surferseo.com", "jasper.ai"],
      database: "us",
    };
    expect(buildSemrushGapCacheKey(params)).toBe(buildSemrushGapCacheKey(params));
  });

  it("changes key when competitors change", () => {
    const base = {
      projectId: 4,
      domain: "sometech.work",
      competitors: ["jasper.ai"],
      database: "us",
    };
    const other = { ...base, competitors: ["jasper.ai", "surferseo.com"] };
    expect(buildSemrushGapCacheKey(base)).not.toBe(buildSemrushGapCacheKey(other));
  });
});
