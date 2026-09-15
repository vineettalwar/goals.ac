import { describe, expect, it } from "vitest";
import {
  mapSeoToAioseoRestField,
  mapSeoToWordPressRestMeta,
  parseDetectedSeoPlugin,
  type CanonicalSeoFields,
} from "./seo-field-mapper";

const seo: CanonicalSeoFields = {
  seoTitle: "Title",
  metaDescription: "Desc",
  focusKeyword: "kw",
  ogTitle: "OG Title",
  ogDescription: "OG Desc",
  ogImageUrl: "https://example.com/og.png",
};

describe("mapSeoToWordPressRestMeta", () => {
  it("sends only Yoast keys when yoast is detected", () => {
    const meta = mapSeoToWordPressRestMeta(seo, "yoast");
    expect(Object.keys(meta).every((k) => k.startsWith("_yoast_"))).toBe(true);
    expect(meta._yoast_wpseo_metadesc).toBe("Desc");
    expect(meta.rank_math_description).toBeUndefined();
  });

  it("sends only Rank Math keys when rankmath is detected", () => {
    const meta = mapSeoToWordPressRestMeta(seo, "rankmath");
    expect(Object.keys(meta).every((k) => k.startsWith("rank_math_"))).toBe(true);
    expect(meta._yoast_wpseo_metadesc).toBeUndefined();
  });

  it("sends SEOPress title, description, keyword, and social image keys", () => {
    const meta = mapSeoToWordPressRestMeta(seo, "seopress");
    expect(meta).toEqual({
      _seopress_titles_title: "Title",
      _seopress_titles_desc: "Desc",
      _seopress_analysis_target_kw: "kw",
      _seopress_social_fb_title: "OG Title",
      _seopress_social_fb_desc: "OG Desc",
      _seopress_social_fb_img: "https://example.com/og.png",
      _seopress_social_twitter_title: "OG Title",
      _seopress_social_twitter_desc: "OG Desc",
      _seopress_social_twitter_img: "https://example.com/og.png",
    });
  });

  it("returns empty meta for AIOSEO (uses aioseo_meta_data instead)", () => {
    expect(mapSeoToWordPressRestMeta(seo, "aioseo")).toEqual({});
  });

  it("returns empty meta when no SEO plugin is installed", () => {
    expect(mapSeoToWordPressRestMeta(seo, "none")).toEqual({});
  });

  it("sends no plugin meta when detection is unknown (REST rejects unregistered keys)", () => {
    expect(mapSeoToWordPressRestMeta(seo)).toEqual({});
  });
});

describe("mapSeoToAioseoRestField", () => {
  it("builds AIOSEO table fields including custom OG image", () => {
    expect(mapSeoToAioseoRestField(seo)).toEqual({
      title: "Title",
      description: "Desc",
      og_title: "OG Title",
      og_description: "OG Desc",
      og_image_type: "custom",
      og_image_custom_url: "https://example.com/og.png",
      keyphrases: {
        focus: { keyphrase: "kw", score: 0, analysis: {} },
        additional: [],
      },
    });
  });

  it("omits empty fields", () => {
    expect(mapSeoToAioseoRestField({ seoTitle: "T" })).toEqual({ title: "T" });
  });
});

describe("parseDetectedSeoPlugin", () => {
  it("parses health capability values", () => {
    expect(parseDetectedSeoPlugin("yoast")).toBe("yoast");
    expect(parseDetectedSeoPlugin(null)).toBeUndefined();
    expect(parseDetectedSeoPlugin("")).toBeUndefined();
    expect(parseDetectedSeoPlugin("none")).toBe("none");
    expect(parseDetectedSeoPlugin(false)).toBe("none");
  });
});
