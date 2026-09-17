import type { CmsConnectionType, CmsIntegrationCredentials } from "./cms-integration-types";

export type { CmsConnectionType, CmsIntegrationCredentials };

export type SocialPlatform =
  | "linkedin"
  | "twitter"
  | "instagram"
  | "facebook"
  | "bluesky"
  | "mastodon";

export type CmsPublishPlatform =
  | "ghost"
  | "webhook"
  | "shopify"
  | "drupal"
  | "joomla"
  | "typo3";

export type EspPublishPlatform = "beehiiv" | "convertkit" | "mailchimp";

export const ESP_PUBLISH_PLATFORMS: EspPublishPlatform[] = [
  "beehiiv",
  "convertkit",
  "mailchimp",
];

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "linkedin",
  "twitter",
  "instagram",
  "facebook",
  "bluesky",
  "mastodon",
];

export const CMS_PUBLISH_PLATFORMS: CmsPublishPlatform[] = [
  "ghost",
  "webhook",
  "shopify",
  "drupal",
  "joomla",
  "typo3",
];

/** All keys stored in website_projects.cms_integrations (used for PATCH/DELETE validation). */
export const CMS_INTEGRATION_PLATFORM_KEYS = [
  "notion",
  "webflow",
  "wordpress",
  "ghost",
  "webhook",
  "shopify",
  "drupal",
  "joomla",
  "linkedin",
  "twitter",
  "meta",
  "bluesky",
  "mastodon",
  "wix",
  "framer",
  "squarespace",
  "contentful",
  "sanity",
  "strapi",
  "beehiiv",
  "convertkit",
  "mailchimp",
  "hubspot",
  "typo3",
] as const satisfies readonly (keyof CmsIntegrationCredentials)[];

export type CmsIntegrationPlatformKey = (typeof CMS_INTEGRATION_PLATFORM_KEYS)[number];

export function isCmsIntegrationPlatformKey(
  value: string,
): value is CmsIntegrationPlatformKey {
  return (CMS_INTEGRATION_PLATFORM_KEYS as readonly string[]).includes(value);
}

export function resolveWordPressConnectionType(
  wordpress: NonNullable<CmsIntegrationCredentials["wordpress"]>,
): CmsConnectionType {
  return wordpress.connectionType ?? "api";
}

export type BlogDestinationId =
  | "wordpress"
  | "notion"
  | "webflow"
  | "ghost"
  | "webhook"
  | "shopify"
  | "drupal"
  | "joomla"
  | "typo3"
  | "wix"
  | "framer"
  | "squarespace"
  | "contentful"
  | "sanity"
  | "strapi"
  | "hubspot";

const BLOG_DESTINATION_PRIORITY: BlogDestinationId[] = [
  "wordpress",
  "ghost",
  "shopify",
  "drupal",
  "joomla",
  "typo3",
  "hubspot",
  "wix",
  "framer",
  "squarespace",
  "contentful",
  "sanity",
  "strapi",
  "notion",
  "webflow",
  "webhook",
];

const BLOG_DESTINATION_SET = new Set<string>(BLOG_DESTINATION_PRIORITY);

export const DEFAULT_RELEASED_CMS_PLATFORMS = ["wordpress"] as const;

export function normalizeReleasedCmsPlatforms(raw: unknown): string[] {
  const keys = Array.isArray(raw)
    ? raw.filter((key): key is string => typeof key === "string" && BLOG_DESTINATION_SET.has(key))
    : [];
  const released = new Set<string>(keys);
  released.add("wordpress");
  return [...released];
}

export function isCmsConnectReady(
  platform: string,
  released: readonly string[] = DEFAULT_RELEASED_CMS_PLATFORMS,
): boolean {
  if (!BLOG_DESTINATION_SET.has(platform)) return true;
  return released.includes(platform);
}

export function unreadyCmsConnectKeys(
  presentKeys: readonly string[],
  released: readonly string[] = DEFAULT_RELEASED_CMS_PLATFORMS,
): string[] {
  return presentKeys.filter((key) => BLOG_DESTINATION_SET.has(key) && !isCmsConnectReady(key, released));
}

function hasBlogDestination(
  creds: CmsIntegrationCredentials,
  platform: BlogDestinationId,
): boolean {
  return Boolean(creds[platform as keyof CmsIntegrationCredentials]);
}

export function resolvePrimaryBlogDestination(
  creds: CmsIntegrationCredentials,
  preferred?: string | null,
): BlogDestinationId | null {
  if (preferred && hasBlogDestination(creds, preferred as BlogDestinationId)) {
    return preferred as BlogDestinationId;
  }
  for (const platform of BLOG_DESTINATION_PRIORITY) {
    if (hasBlogDestination(creds, platform)) return platform;
  }
  return null;
}

export function resolvePrimaryEspDestination(
  creds: CmsIntegrationCredentials,
  preferred?: string | null,
): EspPublishPlatform | null {
  if (preferred && ESP_PUBLISH_PLATFORMS.includes(preferred as EspPublishPlatform)) {
    const platform = preferred as EspPublishPlatform;
    if (creds[platform]) return platform;
  }
  for (const platform of ESP_PUBLISH_PLATFORMS) {
    if (creds[platform]) return platform;
  }
  return null;
}
