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
    meta["_yoast_wpseo_opengraph-title"] = seo.ogTitle;
    meta.rank_math_facebook_title = seo.ogTitle;
  }
  if (seo.ogDescription) {
    meta["_yoast_wpseo_opengraph-description"] = seo.ogDescription;
    meta.rank_math_facebook_description = seo.ogDescription;
  }
  if (seo.ogImageUrl) {
    meta["_yoast_wpseo_opengraph-image"] = seo.ogImageUrl;
    meta.rank_math_facebook_image = seo.ogImageUrl;
  }
  return meta;
}

/**
 * SEO plugin the goals.ac plugin's `/health` endpoint reported as installed
 * (`Seo_Meta_Mapper::detect_plugin()` in the WordPress plugin — see
 * cms-plugins/wordpress/includes/class-seo-meta-mapper.php). `undefined`
 * means "unknown" — no health check ran, or the connection predates one —
 * and every plugin's keys are sent as a best-effort fallback so an existing
 * integration does not regress.
 */
export type DetectedSeoPlugin = "yoast" | "rankmath" | "aioseo" | "seopress" | "none";

function aioseoMeta(seo: CanonicalSeoFields): Record<string, string> {
  return {
    _aioseo_title: seo.seoTitle ?? "",
    _aioseo_description: seo.metaDescription ?? "",
    _aioseo_og_title: seo.ogTitle ?? "",
    _aioseo_og_description: seo.ogDescription ?? "",
  };
}

function seopressMeta(seo: CanonicalSeoFields): Record<string, string> {
  return {
    _seopress_titles_title: seo.seoTitle ?? "",
    _seopress_titles_desc: seo.metaDescription ?? "",
    _seopress_social_fb_title: seo.ogTitle ?? "",
    _seopress_social_fb_desc: seo.ogDescription ?? "",
  };
}

function yoastRankMathMeta(seo: CanonicalSeoFields): Record<string, string> {
  return mapSeoToWordPressRestMeta(seo);
}

/**
 * Plugin-connection meta map — plugin-side Seo_Meta_Mapper writes these into
 * whichever SEO plugin's real storage the site uses. Every post used to
 * accumulate keys for all four plugins regardless of which one (if any) is
 * installed; pass `detectedPlugin` (from the connection health check) to
 * send only the keys that plugin actually reads, so uninstalled plugins
 * don't end up with orphaned post meta on every publish.
 */
export function mapSeoToPluginMeta(
  seo: CanonicalSeoFields,
  detectedPlugin?: DetectedSeoPlugin,
): Record<string, string> {
  switch (detectedPlugin) {
    case "yoast":
    case "rankmath":
      return yoastRankMathMeta(seo);
    case "aioseo":
      return aioseoMeta(seo);
    case "seopress":
      return seopressMeta(seo);
    case "none":
      return {};
    default:
      // Unknown — no health data yet for this connection. Best-effort: send
      // every plugin's keys so we don't regress sites already relying on this.
      return {
        ...yoastRankMathMeta(seo),
        ...aioseoMeta(seo),
        ...seopressMeta(seo),
      };
  }
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
