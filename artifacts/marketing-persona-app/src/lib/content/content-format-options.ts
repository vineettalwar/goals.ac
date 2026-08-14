export const FORMAT_OPTIONS = [
  { value: "blog_post", label: "Blog Post", category: "Long-form" },
  { value: "news_article", label: "News Article", category: "Long-form" },
  { value: "tutorial", label: "Tutorial", category: "Long-form" },
  { value: "guide", label: "Guide", category: "Long-form" },
  { value: "whitepaper", label: "Whitepaper", category: "Long-form" },
  { value: "pillar_page", label: "Pillar Page", category: "Long-form" },
  { value: "location_page", label: "Location Page", category: "Long-form" },
  { value: "infographic_outline", label: "Infographic Outline", category: "Long-form" },
  { value: "linkedin_post", label: "LinkedIn Post", category: "Social" },
  { value: "twitter_thread", label: "Twitter Thread", category: "Social" },
  { value: "instagram_post", label: "Instagram Post", category: "Social" },
  { value: "facebook_post", label: "Facebook Post", category: "Social" },
  { value: "bluesky_post", label: "Bluesky Post", category: "Social" },
  { value: "mastodon_post", label: "Mastodon Post", category: "Social" },
  { value: "email_sequence", label: "Email Sequence", category: "Marketing" },
  { value: "ad_copy", label: "Ad Copy", category: "Marketing" },
  { value: "landing_page_copy", label: "Landing Page", category: "Marketing" },
  { value: "product_description", label: "Product Description", category: "Marketing" },
  { value: "press_release", label: "Press Release", category: "Marketing" },
  { value: "faq_article", label: "FAQ Article", category: "Long-form" },
] as const;

export type ContentFormatValue = (typeof FORMAT_OPTIONS)[number]["value"];
export type ContentFormatOption = (typeof FORMAT_OPTIONS)[number];

export type ProductSurface = "blog_wordpress" | "full";

/**
 * Formats offered on the blog surface — the article formats that run the SEO
 * pipeline, matching `SEO_LONGFORM_FORMATS` in content-engine and
 * `studioFormatOptionsForSurface` in app-shell. Note this is narrower than
 * `category: "Long-form"`, which also holds `infographic_outline`.
 */
const BLOG_SURFACE_FORMATS = new Set<string>([
  "blog_post",
  "guide",
  "tutorial",
  "pillar_page",
  "whitepaper",
  "faq_article",
  "news_article",
  "location_page",
]);

/**
 * Format options for a product surface. Hidden formats stay valid in the schema
 * and generatable through the API — this only decides what the picker offers.
 */
export function formatOptionsForSurface(
  surface: ProductSurface = "blog_wordpress",
): readonly ContentFormatOption[] {
  if (surface === "full") return FORMAT_OPTIONS;
  return FORMAT_OPTIONS.filter((option) => BLOG_SURFACE_FORMATS.has(option.value));
}
