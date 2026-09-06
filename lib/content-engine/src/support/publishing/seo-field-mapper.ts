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

/**
 * SEO plugin the goals.ac plugin's `/health` endpoint reported as installed
 * (`Seo_Meta_Mapper::detect_plugin()` in the WordPress plugin). `undefined`
 * means unknown — no health check yet. `none` means health ran and nothing
 * was installed.
 */
export type DetectedSeoPlugin = "yoast" | "rankmath" | "aioseo" | "seopress" | "none";

function definedEntries(entries: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value?.trim()) out[key] = value;
  }
  return out;
}

function yoastMeta(seo: CanonicalSeoFields): Record<string, string> {
  return definedEntries({
    _yoast_wpseo_title: seo.seoTitle,
    _yoast_wpseo_metadesc: seo.metaDescription,
    _yoast_wpseo_focuskw: seo.focusKeyword,
    "_yoast_wpseo_opengraph-title": seo.ogTitle,
    "_yoast_wpseo_opengraph-description": seo.ogDescription,
    "_yoast_wpseo_opengraph-image": seo.ogImageUrl,
  });
}

function rankMathMeta(seo: CanonicalSeoFields): Record<string, string> {
  return definedEntries({
    rank_math_title: seo.seoTitle,
    rank_math_description: seo.metaDescription,
    rank_math_focus_keyword: seo.focusKeyword,
    rank_math_facebook_title: seo.ogTitle,
    rank_math_facebook_description: seo.ogDescription,
    rank_math_facebook_image: seo.ogImageUrl,
  });
}

function seopressMeta(seo: CanonicalSeoFields): Record<string, string> {
  return definedEntries({
    _seopress_titles_title: seo.seoTitle,
    _seopress_titles_desc: seo.metaDescription,
    _seopress_analysis_target_kw: seo.focusKeyword,
    _seopress_social_fb_title: seo.ogTitle,
    _seopress_social_fb_desc: seo.ogDescription,
  });
}

/**
 * AIOSEO REST body field (`aioseo_meta_data`). Post-meta `_aioseo_*` keys are
 * WPML duplicates only — AIOSEO v4 reads `wp_aioseo_posts`.
 */
export function mapSeoToAioseoRestField(
  seo: CanonicalSeoFields,
): Record<string, unknown> | undefined {
  const data: Record<string, unknown> = {};
  if (seo.seoTitle?.trim()) data.title = seo.seoTitle.trim();
  if (seo.metaDescription?.trim()) data.description = seo.metaDescription.trim();
  if (seo.ogTitle?.trim()) data.og_title = seo.ogTitle.trim();
  if (seo.ogDescription?.trim()) data.og_description = seo.ogDescription.trim();
  if (seo.ogImageUrl?.trim()) {
    data.og_image_type = "custom";
    data.og_image_custom_url = seo.ogImageUrl.trim();
  }
  if (seo.focusKeyword?.trim()) {
    data.keyphrases = {
      focus: { keyphrase: seo.focusKeyword.trim(), score: 0, analysis: {} },
      additional: [],
    };
  }
  return Object.keys(data).length > 0 ? data : undefined;
}

/**
 * WordPress core REST `meta` bag for Application Password publishes.
 * Sends only the keys the detected plugin reads — never all four at once.
 * AIOSEO returns {} here; use mapSeoToAioseoRestField for the REST field.
 */
export function mapSeoToWordPressRestMeta(
  seo: CanonicalSeoFields,
  detectedPlugin?: DetectedSeoPlugin,
): Record<string, string> {
  switch (detectedPlugin) {
    case "yoast":
      return yoastMeta(seo);
    case "rankmath":
      return rankMathMeta(seo);
    case "seopress":
      return seopressMeta(seo);
    case "aioseo":
    case "none":
      return {};
    default:
      // Unknown install — Yoast + Rank Math cover most sites without writing
      // dead AIOSEO/SEOPress keys. Prefer a health check when available.
      return { ...yoastMeta(seo), ...rankMathMeta(seo) };
  }
}

/**
 * Plugin-connection meta map. On the HMAC plugin path the PHP Seo_Meta_Mapper
 * re-maps from the `seo` object using live detect_plugin(), so this bag is
 * best-effort / legacy. Prefer sending `seo` and letting PHP apply().
 */
export function mapSeoToPluginMeta(
  seo: CanonicalSeoFields,
  detectedPlugin?: DetectedSeoPlugin,
): Record<string, string> {
  return mapSeoToWordPressRestMeta(seo, detectedPlugin);
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

/** Coerce a health capability value into DetectedSeoPlugin. */
export function parseDetectedSeoPlugin(raw: unknown): DetectedSeoPlugin | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  if (raw === false || raw === "none") return "none";
  if (raw === "yoast" || raw === "rankmath" || raw === "aioseo" || raw === "seopress") {
    return raw;
  }
  return undefined;
}
