import { describe, expect, it } from "vitest";
import {
  extractInternalSlugs,
  nearestSlug,
  normalizeInternalSlug,
  validateInternalLinks,
} from "./internal-link-validator";

describe("normalizeInternalSlug", () => {
  it("strips leading and trailing slashes, a /blog prefix, and lowercases", () => {
    expect(normalizeInternalSlug("/blog/x")).toBe("x");
    expect(normalizeInternalSlug("blog/x")).toBe("x");
    expect(normalizeInternalSlug("/x/")).toBe("x");
    expect(normalizeInternalSlug("X")).toBe("x");
  });

  it("agrees across all forms of the same slug", () => {
    const forms = ["/blog/x", "blog/x", "/x/", "X", "x"];
    const normalized = new Set(forms.map(normalizeInternalSlug));
    expect(normalized.size).toBe(1);
  });
});

describe("extractInternalSlugs", () => {
  it("pulls internal links out of body markdown", () => {
    const body = "See [our guide](/blog/best-practices) and [pricing](/pricing/).";
    expect(extractInternalSlugs(body)).toEqual(
      expect.arrayContaining(["best-practices", "pricing"]),
    );
  });

  it("ignores external links in the body", () => {
    const body = "See [external](https://example.com/x) for more.";
    expect(extractInternalSlugs(body)).toEqual([]);
  });

  it("includes generator suggestions and dedupes against the body", () => {
    const body = "See [our guide](/blog/best-practices).";
    const slugs = extractInternalSlugs(body, [
      { suggestedSlug: "/blog/best-practices" },
      { suggestedSlug: "/other-post" },
    ]);
    expect(slugs.sort()).toEqual(["best-practices", "other-post"]);
  });

  it("strips query strings and fragments before normalizing", () => {
    const body = "See [x](/blog/best-practices?ref=nav#top).";
    expect(extractInternalSlugs(body)).toEqual(["best-practices"]);
  });
});

describe("validateInternalLinks", () => {
  it("splits valid and dangling slugs, normalizing both sides", () => {
    const result = validateInternalLinks(
      ["/blog/real-post", "made-up-post"],
      ["Real-Post", "/blog/another/"],
    );
    expect(result.valid).toEqual(["real-post"]);
    expect(result.dangling).toEqual(["made-up-post"]);
  });
});

describe("nearestSlug", () => {
  it("picks the obvious token-overlap match", () => {
    const known = ["best-hiking-boots", "trail-running-shoes", "camping-tents"];
    expect(nearestSlug("best-hiking-boot", known)).toBe("best-hiking-boots");
  });

  it("returns null when nothing is close", () => {
    const known = ["best-hiking-boots", "trail-running-shoes"];
    expect(nearestSlug("quantum-computing-basics", known)).toBeNull();
  });

  it("returns null for an empty known-slugs list", () => {
    expect(nearestSlug("anything", [])).toBeNull();
  });
});
