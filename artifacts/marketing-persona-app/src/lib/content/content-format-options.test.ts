import { describe, expect, it } from "vitest";
import { FORMAT_OPTIONS, formatOptionsForSurface } from "./content-format-options";

const SOCIAL_AND_MARKETING = [
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
];

describe("formatOptionsForSurface", () => {
  it("defaults to the blog surface", () => {
    expect(formatOptionsForSurface()).toEqual(formatOptionsForSurface("blog_wordpress"));
  });

  it("offers article formats only on the blog surface", () => {
    const values = new Set(formatOptionsForSurface("blog_wordpress").map((o) => o.value));

    expect(values.has("blog_post")).toBe(true);
    expect(values.has("pillar_page")).toBe(true);
    for (const hidden of SOCIAL_AND_MARKETING) {
      expect(values.has(hidden as never)).toBe(false);
    }
  });

  it("returns the full catalog on the full surface", () => {
    expect(formatOptionsForSurface("full")).toEqual(FORMAT_OPTIONS);
  });

  it("stays a subset of the schema catalog", () => {
    const all = new Set(FORMAT_OPTIONS.map((o) => o.value));

    for (const option of formatOptionsForSurface("blog_wordpress")) {
      expect(all.has(option.value)).toBe(true);
    }
  });
});
