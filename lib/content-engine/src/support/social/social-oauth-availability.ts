import { hasPlatformBlueskyCredentials } from "./bluesky-platform-credentials";
import { hasPlatformLinkedInCredentials } from "./linkedin-platform-credentials";
import { hasPlatformMetaCredentials } from "./meta-platform-credentials";
import { hasPlatformTwitterCredentials } from "./twitter-platform-credentials";

export type SocialOauthConfigured = {
  linkedin: boolean;
  twitter: boolean;
  meta: boolean;
  bluesky: boolean;
  /** Instance OAuth only — no platform-wide app credentials. */
  mastodon: boolean;
};

export const SOCIAL_OAUTH_DISABLED: SocialOauthConfigured = {
  linkedin: false,
  twitter: false,
  meta: false,
  bluesky: false,
  mastodon: false,
};

/**
 * Per-network connect readiness for project Social integrations.
 * Mastodon needs no platform OAuth app — only the feature flag.
 */
export async function resolveSocialOauthConfigured(options: {
  socialPublishingEnabled: boolean;
}): Promise<SocialOauthConfigured> {
  if (!options.socialPublishingEnabled) return { ...SOCIAL_OAUTH_DISABLED };

  const [linkedin, twitter, meta, bluesky] = await Promise.all([
    hasPlatformLinkedInCredentials(),
    hasPlatformTwitterCredentials(),
    hasPlatformMetaCredentials(),
    hasPlatformBlueskyCredentials(),
  ]);

  return { linkedin, twitter, meta, bluesky, mastodon: true };
}

export function isSocialOauthReady(
  id: string,
  configured: SocialOauthConfigured | null | undefined,
): boolean {
  if (!configured) return false;
  if (id === "linkedin") return configured.linkedin;
  if (id === "twitter") return configured.twitter;
  if (id === "meta") return configured.meta;
  if (id === "bluesky") return configured.bluesky;
  if (id === "mastodon") return configured.mastodon;
  return false;
}
