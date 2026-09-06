import type { ContentFormatType } from "@workspace/db/schema";

/** Formats that use the SEO longform pipeline (scoring, enhance, humanize). */
export const SEO_LONGFORM_FORMATS: ContentFormatType[] = [
  "blog_post",
  "guide",
  "tutorial",
  "pillar_page",
  "whitepaper",
  "faq_article",
  "news_article",
  "location_page",
];

export function isSeoLongformFormat(format: ContentFormatType): boolean {
  return SEO_LONGFORM_FORMATS.includes(format);
}
