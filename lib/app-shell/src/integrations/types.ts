export type IntegrationsTab = "cms" | "social" | "esp" | "search";

export type CmsIntegrationRow = {
  connected?: boolean;
  url?: string;
} & Record<string, unknown>;

export type CmsPlatform = {
  key: string;
  label: string;
};

export const CMS_PLATFORMS: CmsPlatform[] = [
  { key: "wordpress", label: "WordPress" },
  { key: "ghost", label: "Ghost" },
  { key: "shopify", label: "Shopify" },
  { key: "webflow", label: "Webflow" },
  { key: "notion", label: "Notion" },
  { key: "drupal", label: "Drupal" },
  { key: "joomla", label: "Joomla" },
  { key: "webhook", label: "Webhook" },
];
