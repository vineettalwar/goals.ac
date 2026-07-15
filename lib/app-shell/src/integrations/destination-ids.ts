/**
 * Shared publish / integration platform IDs — UI SSOT for app-shell + Next.
 * Hosts compose full destination definitions from these IDs + local overlays.
 */

export const CMS_PLATFORM_IDS = [
  "wordpress",
  "ghost",
  "shopify",
  "webflow",
  "notion",
  "drupal",
  "joomla",
  "webhook",
  "contentful",
  "sanity",
  "strapi",
  "typo3",
  "wix",
  "framer",
  "squarespace",
  "hubspot",
] as const;

export type CmsPlatformId = (typeof CMS_PLATFORM_IDS)[number];

/** Settings / OAuth integration keys (Meta is one connection for FB+IG). */
export const SOCIAL_INTEGRATION_IDS = [
  "linkedin",
  "twitter",
  "meta",
  "bluesky",
  "mastodon",
] as const;

export type SocialIntegrationId = (typeof SOCIAL_INTEGRATION_IDS)[number];

/** Publish-target IDs (Instagram/Facebook are separate formats; both use meta). */
export const SOCIAL_PUBLISH_IDS = [
  "linkedin",
  "twitter",
  "instagram",
  "facebook",
  "bluesky",
  "mastodon",
] as const;

export type SocialPublishId = (typeof SOCIAL_PUBLISH_IDS)[number];

export const ESP_PLATFORM_IDS = ["beehiiv", "convertkit", "mailchimp"] as const;

export type EspPlatformId = (typeof ESP_PLATFORM_IDS)[number];

export const EXPORT_DESTINATION_IDS = ["medium", "substack"] as const;

export type ExportDestinationId = (typeof EXPORT_DESTINATION_IDS)[number];
