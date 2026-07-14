import type { ContentPieceMetadata } from "@workspace/db";

export interface CanonicalSeoFields {
  seoTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
}

export function seoFromPieceMetadata(
  title: string,
  targetKeyword: string | null | undefined,
  metadata?: ContentPieceMetadata | null,
): CanonicalSeoFields {
  const focusKeyword = metadata?.focusKeyword ?? targetKeyword ?? undefined;
  return {
    seoTitle: metadata?.seoTitle ?? title,
    metaDescription: metadata?.metaDescription,
    focusKeyword,
    ogTitle: metadata?.ogTitle ?? metadata?.seoTitle ?? title,
    ogDescription: metadata?.ogDescription ?? metadata?.metaDescription,
    ogImageUrl: metadata?.ogImageUrl ?? metadata?.featuredImageUrl,
  };
}

/** WordPress REST API meta keys (Yoast + RankMath + fallbacks). */
export function mapSeoToWordPressRestMeta(seo: CanonicalSeoFields): Record<string, string> {
  const meta: Record<string, string> = {};
  if (seo.metaDescription) {
    meta._yoast_wpseo_metadesc = seo.metaDescription;
    meta.rank_math_description = seo.metaDescription;
  }
  if (seo.seoTitle) {
    meta._yoast_wpseo_title = seo.seoTitle;
    meta.rank_math_title = seo.seoTitle;
  }
  if (seo.focusKeyword) {
    meta._yoast_wpseo_focuskw = seo.focusKeyword;
    meta.rank_math_focus_keyword = seo.focusKeyword;
  }
  if (seo.ogTitle) {
    meta._yoast_wpseo_opengraph_title = seo.ogTitle;
    meta.rank_math_facebook_title = seo.ogTitle;
  }
  if (seo.ogDescription) {
    meta._yoast_wpseo_opengraph_description = seo.ogDescription;
    meta.rank_math_facebook_description = seo.ogDescription;
  }
  if (seo.ogImageUrl) {
    meta._yoast_wpseo_opengraph_image = seo.ogImageUrl;
    meta.rank_math_facebook_image = seo.ogImageUrl;
  }
  return meta;
}

/** Generic plugin meta map — plugin-side Seo_Meta_Mapper handles plugin-specific keys. */
export function mapSeoToPluginMeta(seo: CanonicalSeoFields): Record<string, string> {
  return {
    ...mapSeoToWordPressRestMeta(seo),
    _aioseo_title: seo.seoTitle ?? "",
    _aioseo_description: seo.metaDescription ?? "",
    _aioseo_og_title: seo.ogTitle ?? "",
    _aioseo_og_description: seo.ogDescription ?? "",
    _seopress_titles_title: seo.seoTitle ?? "",
    _seopress_titles_desc: seo.metaDescription ?? "",
    _seopress_social_fb_title: seo.ogTitle ?? "",
    _seopress_social_fb_desc: seo.ogDescription ?? "",
  };
}

export function mapSeoToJoomlaMeta(seo: CanonicalSeoFields): {
  description?: string;
  keywords?: string;
} {
  return {
    description: seo.metaDescription,
    keywords: seo.focusKeyword,
  };
}
