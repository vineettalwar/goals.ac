import type { ContentFormatType } from "@workspace/db";
import { isSeoLongformFormat } from "./content-piece-seo";

/** Social studio formats eligible for the humanize pass (alongside SEO longform). */
export const HUMANIZABLE_SOCIAL_FORMATS = [
  "linkedin_post",
  "twitter_thread",
  "instagram_post",
  "facebook_post",
  "bluesky_post",
  "mastodon_post",
] as const;

export type HumanizableSocialFormat = (typeof HUMANIZABLE_SOCIAL_FORMATS)[number];

export function isHumanizableSocialFormat(format: string): boolean {
  return (HUMANIZABLE_SOCIAL_FORMATS as readonly string[]).includes(format);
}

/** Long-form SEO formats plus all social studio formats. */
export function isHumanizableFormat(format: string): boolean {
  return (
    isSeoLongformFormat(format as ContentFormatType) || isHumanizableSocialFormat(format)
  );
}
