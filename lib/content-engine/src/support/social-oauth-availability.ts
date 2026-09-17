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
