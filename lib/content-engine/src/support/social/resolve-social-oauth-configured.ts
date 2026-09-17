import { hasPlatformBlueskyCredentials } from "./bluesky-platform-credentials";
import { hasPlatformLinkedInCredentials } from "./linkedin-platform-credentials";
import { hasPlatformMetaCredentials } from "./meta-platform-credentials";
import { hasPlatformTwitterCredentials } from "./twitter-platform-credentials";
import {
  SOCIAL_OAUTH_DISABLED,
  type SocialOauthConfigured,
} from "../social-oauth-availability";

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
