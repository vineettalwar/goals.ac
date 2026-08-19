import { describe, expect, it } from "vitest";
import {
  categoryNamesFromContent,
  parseSectionFromAngle,
  resolveWordPressTermIds,
} from "./wordpress-taxonomy";

describe("resolveWordPressTermIds", () => {
  const terms = [
    { id: 3, name: "News", slug: "news" },
    { id: 7, name: "Vegan Business", slug: "vegan-business" },
  ];

  it("maps names and slugs to term ids", () => {
    expect(resolveWordPressTermIds(["News", "vegan-business"], terms)).toEqual([3, 7]);
  });

  it("passes through numeric ids", () => {
    expect(resolveWordPressTermIds([7, "News"], terms)).toEqual([7, 3]);
  });

  it("ignores unknown labels", () => {
    expect(resolveWordPressTermIds(["Opinion", 999], terms)).toEqual([]);
  });
});

describe("parseSectionFromAngle", () => {
  it("reads section: prefix from pipe-separated angle", () => {
    expect(parseSectionFromAngle("section:Funding|notes from editor")).toBe("Funding");
  });
});

describe("categoryNamesFromContent", () => {
  it("prefers cmsCategories then section: angle metadata", () => {
    const names = categoryNamesFromContent({
      id: "1",
      markdown: "",
      meta: { title: "Test" },
      pieceMetadata: {
        cmsCategories: ["Features"],
        contentAngle: "section:News|sources: https://example.com/a",
      },
    });
    expect(names).toEqual(["Features", "News"]);
  });
});
