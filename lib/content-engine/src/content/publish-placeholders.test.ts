import { describe, expect, it } from "vitest";
import { findPublishPlaceholders } from "./publish-placeholders";

describe("findPublishPlaceholders", () => {
  it("returns empty array for clean prose", () => {
    expect(findPublishPlaceholders("## How proximity beats a prettier website\n\nLocal buyers pick the nearest option.")).toEqual([]);
  });

  it("detects [Company Name]", () => {
    expect(findPublishPlaceholders("Welcome to [Company Name], the best in class.")).toContain("[Company Name]");
  });

  it("detects [CEO/Founder Name]", () => {
    expect(findPublishPlaceholders("Signed by [CEO/Founder Name].")).toContain("[CEO/Founder Name]");
  });

  it("detects [Name, Title, Company]", () => {
    expect(findPublishPlaceholders("Quote from [Name, Title, Company].")).toContain("[Name, Title, Company]");
  });

  it("detects [Your Company Name]", () => {
    expect(findPublishPlaceholders("Contact [Your Company Name] today.")).toContain("[Your Company Name]");
  });

  it("detects [Insert Quote Here]", () => {
    expect(findPublishPlaceholders("[Insert Quote Here]")).toContain("[Insert Quote Here]");
  });

  it("detects whole-word TODO", () => {
    expect(findPublishPlaceholders("## Section\n\nTODO: fill this in later.")).toContain("TODO");
  });

  it("detects whole-word TBD", () => {
    expect(findPublishPlaceholders("Launch date: TBD.")).toContain("TBD");
  });

  it("detects whole-word FIXME", () => {
    expect(findPublishPlaceholders("FIXME remove this before shipping")).toContain("FIXME");
  });

  it("does not fire on 'todo' inside a word", () => {
    // 'todo' embedded in another word is not a whole-word match
    expect(findPublishPlaceholders("pseudodocument")).not.toContain("TODO");
  });

  it("detects lorem ipsum (case-insensitive)", () => {
    expect(findPublishPlaceholders("Lorem ipsum dolor sit amet.")).toContain("lorem ipsum");
    expect(findPublishPlaceholders("lorem ipsum is filler text")).toContain("lorem ipsum");
  });

  it("does NOT false-positive on markdown links [text](url)", () => {
    const md = "Read more at [Search Engine Land](https://searchengineland.com/local-seo) for details.";
    expect(findPublishPlaceholders(md)).toEqual([]);
  });

  it("does NOT false-positive on a markdown image with alt text ![alt](url)", () => {
    const md = "![A clean office sign](https://example.com/photo.jpg)";
    expect(findPublishPlaceholders(md)).toEqual([]);
  });

  it("does NOT false-positive on reference-style links [text][ref]", () => {
    const md = "[Search Engine Land][sel]\n\n[sel]: https://searchengineland.com";
    expect(findPublishPlaceholders(md)).toEqual([]);
  });

  it("returns distinct results even when the same placeholder appears multiple times", () => {
    const md = "Hello [Company Name], welcome to [Company Name].";
    const hits = findPublishPlaceholders(md);
    expect(hits.filter((h) => h === "[Company Name]")).toHaveLength(1);
  });

  it("returns multiple distinct placeholders when several kinds are present", () => {
    const md = "For [Company Name], contact [CEO/Founder Name]. TODO: add link.";
    const hits = findPublishPlaceholders(md);
    expect(hits).toContain("[Company Name]");
    expect(hits).toContain("[CEO/Founder Name]");
    expect(hits).toContain("TODO");
  });
});
