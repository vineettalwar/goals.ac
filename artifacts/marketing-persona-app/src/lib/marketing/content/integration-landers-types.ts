import type { PublishBrandIconId } from "@workspace/app-shell/integrations";

/** Public SEO landers under `/integrations/[slug]`. Never use `ai` or `tools` (app routes). */
export type IntegrationLanderSlug =
  | "wordpress"
  | "ghost"
  | "shopify"
  | "notion"
  | "webflow"
  | "drupal"
  | "joomla"
  | "webhook"
  | "contentful"
  | "sanity"
  | "strapi"
  | "typo3"
  | "wix"
  | "framer"
  | "squarespace"
  | "hubspot"
  | "beehiiv"
  | "convertkit"
  | "mailchimp"
  | "linkedin"
  | "twitter"
  | "instagram"
  | "facebook"
  | "bluesky"
  | "mastodon"
  | "medium"
  | "substack";

export type IntegrationLander = {
  slug: IntegrationLanderSlug;
  brandId: PublishBrandIconId;
  label: string;
  metaTitle: string;
  metaDescription: string;
  badge: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  depth: "deep" | "api" | "oauth" | "export";
  depthLabel: string;
  connectMethods: string[];
  capabilities: { title: string; body: string }[];
  setupSteps: string[];
  formats: string[];
  faq: { question: string; answer: string }[];
  relatedSlugs: IntegrationLanderSlug[];
};

/** Identity helper — gives each entry per-field type checking. */
export function L(partial: IntegrationLander): IntegrationLander {
  return partial;
}
