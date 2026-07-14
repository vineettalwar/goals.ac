import { resolvePrimaryBlogDestination } from "./publish-destination";
import type { CmsIntegrationCredentials } from "./cms-integrations";

const SOCIAL_FORMAT_TO_PLATFORM: Record<string, string> = {
  linkedin_post: "linkedin",
  twitter_thread: "twitter",
  instagram_post: "instagram",
  facebook_post: "facebook",
  bluesky_post: "bluesky",
  mastodon_post: "mastodon",
  email_sequence: "beehiiv",
};

/** Social/email formats imply a single destination platform. */
export function impliedPlatformForFormat(formatType: string): string | null {
  return SOCIAL_FORMAT_TO_PLATFORM[formatType] ?? null;
}

/** Resolve default intended destination from project connections + settings. */
export function resolveDefaultIntendedPlatform(
  formatType: string,
  creds: CmsIntegrationCredentials,
  primaryBlogDestination?: string | null,
): string | null {
  const implied = impliedPlatformForFormat(formatType);
  if (implied) {
    if (creds[implied as keyof CmsIntegrationCredentials]) return implied;
    if (implied === "instagram" || implied === "facebook") {
      if (creds.meta) return implied;
    }
    return implied;
  }

  if (primaryBlogDestination && creds[primaryBlogDestination as keyof CmsIntegrationCredentials]) {
    return primaryBlogDestination;
  }

  return resolvePrimaryBlogDestination(creds, primaryBlogDestination);
}
