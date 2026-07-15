import { type CmsPlatformId } from "./destination-ids";

export type IntegrationsTab = "cms" | "social" | "esp" | "search" | "ai" | "tools";
export type ProjectIntegrationsTab = "cms" | "social" | "esp" | "search";
export type OrgIntegrationsTab = "ai" | "tools";

export type CmsIntegrationRow = {
  connected?: boolean;
  url?: string;
} & Record<string, unknown>;

export type CmsPlatform = {
  key: CmsPlatformId;
  label: string;
  description: string;
  badgeLetter?: string;
  badgeClassName?: string;
};

export const CMS_PLATFORMS: CmsPlatform[] = [
  {
    key: "wordpress",
    label: "WordPress",
    description: "Publish via Application Passwords or the goals.ac WordPress plugin.",
    badgeLetter: "W",
    badgeClassName: "bg-blue-500",
  },
  {
    key: "ghost",
    label: "Ghost",
    description: "Publish content to Ghost via the Admin API.",
    badgeLetter: "G",
    badgeClassName: "bg-zinc-800",
  },
  {
    key: "shopify",
    label: "Shopify",
    description: "Publish blog articles via Admin API or the goals.ac Shopify app plugin.",
    badgeLetter: "S",
    badgeClassName: "bg-green-700",
  },
  {
    key: "webflow",
    label: "Webflow",
    description: "Publish content as a CMS item in your Webflow collection.",
    badgeLetter: "W",
    badgeClassName: "bg-blue-600",
  },
  {
    key: "notion",
    label: "Notion",
    description: "Publish content directly to a Notion database as a new page.",
    badgeLetter: "N",
    badgeClassName: "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900",
  },
  {
    key: "drupal",
    label: "Drupal",
    description: "Publish via JSON:API or the goals.ac Drupal plugin.",
    badgeLetter: "D",
    badgeClassName: "bg-sky-700",
  },
  {
    key: "joomla",
    label: "Joomla",
    description: "Publish via Joomla Web Services API or the goals.ac plugin.",
    badgeLetter: "J",
    badgeClassName: "bg-orange-600",
  },
  {
    key: "webhook",
    label: "Webhook",
    description: "Send HMAC-signed JSON to Zapier, Make, n8n, or any custom endpoint.",
  },
  {
    key: "contentful",
    label: "Contentful",
    description: "Publish entries to a Contentful space via the Content Management API.",
    badgeLetter: "C",
    badgeClassName: "bg-sky-600",
  },
  {
    key: "sanity",
    label: "Sanity",
    description: "Create documents in a Sanity dataset via the API.",
    badgeLetter: "S",
    badgeClassName: "bg-red-600",
  },
  {
    key: "strapi",
    label: "Strapi",
    description: "Publish articles to Strapi via REST API.",
    badgeLetter: "S",
    badgeClassName: "bg-indigo-600",
  },
  {
    key: "typo3",
    label: "TYPO3",
    description: "Publish via TYPO3 content elements or the goals.ac TYPO3 extension.",
    badgeLetter: "T",
    badgeClassName: "bg-orange-700",
  },
  {
    key: "wix",
    label: "Wix",
    description: "Publish blog posts to Wix via the Blog API.",
    badgeLetter: "W",
    badgeClassName: "bg-yellow-600",
  },
  {
    key: "framer",
    label: "Framer",
    description: "Publish CMS items to a Framer project collection.",
    badgeLetter: "F",
    badgeClassName: "bg-zinc-700",
  },
  {
    key: "squarespace",
    label: "Squarespace",
    description: "Publish blog posts via the Squarespace Commerce API.",
    badgeLetter: "S",
    badgeClassName: "bg-zinc-900",
  },
  {
    key: "hubspot",
    label: "HubSpot CMS",
    description: "Create or update HubSpot CMS blog posts.",
    badgeLetter: "H",
    badgeClassName: "bg-orange-500",
  },
];
