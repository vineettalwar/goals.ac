import { describe, expect, it } from "vitest";
import { parseIntIdList } from "./publish-reliability";

describe("parseIntIdList", () => {
  it("returns empty list for empty input", () => {
    expect(parseIntIdList("")).toEqual([]);
    expect(parseIntIdList(null)).toEqual([]);
    expect(parseIntIdList(undefined)).toEqual([]);
  });

  it("parses comma-separated positive ints", () => {
    expect(parseIntIdList("1, 2,3")).toEqual([1, 2, 3]);
  });

  it("ignores invalid and non-positive values", () => {
    expect(parseIntIdList("0, -1, 2, abc, 3")).toEqual([2, 3]);
  });
});

