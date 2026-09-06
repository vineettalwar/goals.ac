import { describe, expect, it } from "vitest";
import { STUDIO_FORMAT_OPTIONS, studioFormatOptionsForSurface } from "./types";

describe("studioFormatOptionsForSurface", () => {
  it("defaults to the blog surface", () => {
    const values = studioFormatOptionsForSurface().map((option) => option.value);

    expect(values).toContain("blog_post");
    expect(values).not.toContain("linkedin_post");
  });

  it("offers only article formats on the blog surface", () => {
    const values = studioFormatOptionsForSurface("blog_wordpress").map((option) => option.value);

    expect(values).toEqual([
      "blog_post",
      "news_article",
      "tutorial",
      "guide",
      "whitepaper",
      "pillar_page",
      "location_page",
      "faq_article",
    ]);
  });

  it("hides every social and non-article format on the blog surface", () => {
    const values = new Set(studioFormatOptionsForSurface("blog_wordpress").map((o) => o.value));

    for (const hidden of [
      "linkedin_post",
      "twitter_thread",
      "instagram_post",
      "facebook_post",
      "bluesky_post",
      "mastodon_post",
      "email_sequence",
      "ad_copy",
      "landing_page_copy",
      "product_description",
      "press_release",
      "infographic_outline",
    ] as const) {
      expect(values.has(hidden)).toBe(false);
    }
  });

  it("returns the full catalog on the full surface", () => {
    expect(studioFormatOptionsForSurface("full")).toEqual(STUDIO_FORMAT_OPTIONS);
  });

  it("hides no format that the schema does not define", () => {
    const all = new Set(STUDIO_FORMAT_OPTIONS.map((option) => option.value));

    for (const option of studioFormatOptionsForSurface("blog_wordpress")) {
      expect(all.has(option.value)).toBe(true);
    }
  });
});
