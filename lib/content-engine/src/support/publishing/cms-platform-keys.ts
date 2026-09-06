import type { CmsConnectionType, CmsIntegrationCredentials } from "./cms-integration-types";

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
