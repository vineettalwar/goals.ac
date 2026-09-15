import { describe, expect, it } from "vitest";
import { ROADMAP_SUMMARY_COLUMNS } from "./pin-roadmap-to-project";

describe("ROADMAP_SUMMARY_COLUMNS", () => {
  it("lists metadata only — never the content blob", () => {
    expect(Object.keys(ROADMAP_SUMMARY_COLUMNS).sort()).toEqual(
      ["id", "industry", "location", "slug", "stage", "viewCount"].sort(),
    );
    expect("content" in ROADMAP_SUMMARY_COLUMNS).toBe(false);
  });
});
