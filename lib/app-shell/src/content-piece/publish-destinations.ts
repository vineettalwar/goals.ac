import {
  type CmsPlatformId,
  type ExportDestinationId,
  type SocialPublishId,
} from "../integrations/destination-ids";

/** Vite publish-dialog subset — IDs constrained to shared destination-ids SSOT. */
const CONTENT_PIECE_CMS_IDS = [
  "wordpress",
  "notion",
  "webflow",
  "ghost",
  "webhook",
  "shopify",
  "drupal",
  "joomla",
] as const satisfies readonly CmsPlatformId[];

const CONTENT_PIECE_SOCIAL_IDS = [
  "linkedin",
  "twitter",
  "instagram",
  "facebook",
] as const satisfies readonly SocialPublishId[];

export type ContentFormatType =
  | "blog_post"
  | "news_article"
  | "tutorial"
  | "guide"
  | "whitepaper"
  | "pillar_page"
  | "location_page"
  | "infographic_outline"
  | "linkedin_post"
  | "twitter_thread"
  | "instagram_post"
  | "facebook_post"
  | "email_sequence"
  | "ad_copy"
  | "landing_page_copy"
  | "product_description"
  | "press_release"
  | "faq_article";

export type PublishDestinationId =
  | (typeof CONTENT_PIECE_CMS_IDS)[number]
  | (typeof CONTENT_PIECE_SOCIAL_IDS)[number]
  | ExportDestinationId;

export type ConnectionMethod = "api" | "plugin" | "oauth";

export type CmsConnectionSnapshot = Record<string, unknown>;

export interface PublishDestinationDefinition {
  id: PublishDestinationId;
  label: string;
  category: "cms" | "social" | "export";
  integrationKey: string;
  description: string;
  connectionMethods: ConnectionMethod[];
  connectionMethodLabels: Partial<Record<ConnectionMethod, string>>;
  isConnected: (connections: CmsConnectionSnapshot) => boolean;
  matchesFormat: (format: ContentFormatType) => boolean;
  hideSettingsCard?: boolean;
  /** Copy/download only — no server publish API. */
  exportOnly?: boolean;
}

const SOCIAL_FORMAT_DESTINATION: Partial<
  Record<ContentFormatType, PublishDestinationId>
> = {
  linkedin_post: "linkedin",
  twitter_thread: "twitter",
  instagram_post: "instagram",
  facebook_post: "facebook",
};

const LONG_FORM_FORMATS: ContentFormatType[] = [
  "blog_post",
  "news_article",
  "tutorial",
  "guide",
  "whitepaper",
  "pillar_page",
  "location_page",
  "infographic_outline",
  "email_sequence",
  "ad_copy",
  "landing_page_copy",
  "product_description",
  "press_release",
  "faq_article",
];

function matchesLongForm(format: ContentFormatType): boolean {
  return LONG_FORM_FORMATS.includes(format);
}

function hasMeta(connections: CmsConnectionSnapshot): boolean {
  return !!connections.meta;
}

const PUBLISHING_DESTINATIONS: PublishDestinationDefinition[] = [
  {
    id: "wordpress",
    label: "WordPress",
    category: "cms",
    integrationKey: "wordpress",
    description: "Publish via Application Passwords or the goals.ac WordPress plugin.",
    connectionMethods: ["api", "plugin"],
    connectionMethodLabels: {
      api: "Application Password (REST API)",
      plugin: "goals.ac plugin (HMAC)",
    },
    isConnected: (c) => !!c.wordpress,
    matchesFormat: matchesLongForm,
  },
  {
    id: "notion",
    label: "Notion",
    category: "cms",
    integrationKey: "notion",
    description: "Publish content directly to a Notion database as a new page.",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Integration token" },
    isConnected: (c) => !!c.notion,
    matchesFormat: matchesLongForm,
  },
  {
    id: "webflow",
    label: "Webflow",
    category: "cms",
    integrationKey: "webflow",
    description: "Publish content as a draft CMS item in your Webflow collection.",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Site API token" },
    isConnected: (c) => !!c.webflow,
    matchesFormat: matchesLongForm,
  },
  {
    id: "ghost",
    label: "Ghost",
    category: "cms",
    integrationKey: "ghost",
    description: "Publish content to Ghost via the Admin API.",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Admin API key" },
    isConnected: (c) => !!c.ghost,
    matchesFormat: matchesLongForm,
  },
  {
    id: "shopify",
    label: "Shopify",
    category: "cms",
    integrationKey: "shopify",
    description: "Publish blog articles via Admin API or the goals.ac Shopify app plugin.",
    connectionMethods: ["api", "plugin"],
    connectionMethodLabels: {
      api: "Shopify Admin API",
      plugin: "goals.ac plugin (HMAC)",
    },
    isConnected: (c) => !!c.shopify,
    matchesFormat: matchesLongForm,
  },
  {
    id: "drupal",
    label: "Drupal",
    category: "cms",
    integrationKey: "drupal",
    description: "Publish via JSON:API or the goals.ac Drupal plugin.",
    connectionMethods: ["api", "plugin"],
    connectionMethodLabels: {
      api: "Drupal JSON:API",
      plugin: "goals.ac plugin (HMAC)",
    },
    isConnected: (c) => !!c.drupal,
    matchesFormat: matchesLongForm,
  },
  {
    id: "joomla",
    label: "Joomla",
    category: "cms",
    integrationKey: "joomla",
    description: "Publish via Joomla Web Services API or the goals.ac plugin.",
    connectionMethods: ["api", "plugin"],
    connectionMethodLabels: {
      api: "Joomla Web Services API",
      plugin: "goals.ac plugin (HMAC)",
    },
    isConnected: (c) => !!c.joomla,
    matchesFormat: matchesLongForm,
  },
  {
    id: "webhook",
    label: "Webhook",
    category: "cms",
    integrationKey: "webhook",
    description: "Send HMAC-signed JSON to Zapier, Make, n8n, or any custom endpoint.",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Signed webhook URL" },
    isConnected: (c) => !!c.webhook,
    matchesFormat: matchesLongForm,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    category: "social",
    integrationKey: "linkedin",
    description: "Publish LinkedIn posts directly from Content Studio.",
    connectionMethods: ["oauth"],
    connectionMethodLabels: { oauth: "OAuth" },
    isConnected: (c) => !!c.linkedin,
    matchesFormat: (f) => SOCIAL_FORMAT_DESTINATION[f] === "linkedin",
  },
  {
    id: "twitter",
    label: "X",
    category: "social",
    integrationKey: "twitter",
    description: "Publish threads directly to X.",
    connectionMethods: ["oauth"],
    connectionMethodLabels: { oauth: "OAuth" },
    isConnected: (c) => !!c.twitter,
    matchesFormat: (f) => SOCIAL_FORMAT_DESTINATION[f] === "twitter",
  },
  {
    id: "instagram",
    label: "Instagram",
    category: "social",
    integrationKey: "meta",
    description: "Publish Instagram posts via a connected Meta account.",
    connectionMethods: ["oauth"],
    connectionMethodLabels: { oauth: "Meta OAuth" },
    hideSettingsCard: true,
    isConnected: hasMeta,
    matchesFormat: (f) => SOCIAL_FORMAT_DESTINATION[f] === "instagram",
  },
  {
    id: "facebook",
    label: "Facebook",
    category: "social",
    integrationKey: "meta",
    description: "Publish Facebook posts via a connected Meta account.",
    connectionMethods: ["oauth"],
    connectionMethodLabels: { oauth: "Meta OAuth" },
    hideSettingsCard: true,
    isConnected: hasMeta,
    matchesFormat: (f) => SOCIAL_FORMAT_DESTINATION[f] === "facebook",
  },
  {
    id: "medium",
    label: "Medium",
    category: "export",
    integrationKey: "medium",
    description: "Export markdown for Medium (no publish API).",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Manual export" },
    isConnected: () => true,
    matchesFormat: matchesLongForm,
    exportOnly: true,
    hideSettingsCard: true,
  },
  {
    id: "substack",
    label: "Substack",
    category: "export",
    integrationKey: "substack",
    description: "Export markdown for Substack (no public write API).",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Manual export" },
    isConnected: () => true,
    matchesFormat: matchesLongForm,
    exportOnly: true,
    hideSettingsCard: true,
  },
];

function getDestinationsForFormat(format: ContentFormatType): PublishDestinationDefinition[] {
  return PUBLISHING_DESTINATIONS.filter((d) => d.matchesFormat(format));
}

export function getConnectedDestinationsForFormat(
  format: ContentFormatType,
  connections: CmsConnectionSnapshot,
): PublishDestinationDefinition[] {
  return getDestinationsForFormat(format).filter(
    (d) => d.exportOnly || d.isConnected(connections),
  );
}

function getDefaultConnectionMethod(cmsId: PublishDestinationId): ConnectionMethod {
  const def = PUBLISHING_DESTINATIONS.find((d) => d.id === cmsId);
  return def?.connectionMethods[0] ?? "api";
}

function getConnectionMethodLabel(cmsId: PublishDestinationId, method: ConnectionMethod): string {
  const def = PUBLISHING_DESTINATIONS.find((d) => d.id === cmsId);
  return def?.connectionMethodLabels[method] ?? method;
}

function resolveStoredConnectionMethod(
  destinationId: PublishDestinationId,
  record: Record<string, unknown>,
): ConnectionMethod {
  const raw = record.connectionType;
  if (raw === "plugin" || raw === "api" || raw === "oauth") return raw;
  return getDefaultConnectionMethod(destinationId);
}

export function getConnectionSummary(
  destinationId: PublishDestinationId,
  connections: CmsConnectionSnapshot,
): string | null {
  const record = connections[destinationId] as Record<string, unknown> | undefined;
  if (destinationId === "instagram" || destinationId === "facebook") {
    const meta = connections.meta as { pageName?: string; instagramUsername?: string } | undefined;
    if (!meta) return null;
    if (destinationId === "instagram" && meta.instagramUsername) {
      return `@${meta.instagramUsername}`;
    }
    return meta.pageName ?? "Connected Meta account";
  }

  if (!record) return null;

  switch (destinationId) {
    case "wordpress":
    case "shopify":
    case "drupal":
    case "joomla": {
      const cms = record as { connectionType?: string; siteUrl?: string; shopDomain?: string };
      const method = resolveStoredConnectionMethod(destinationId, cms);
      const modeLabel = getConnectionMethodLabel(destinationId, method);
      const site = cms.siteUrl ?? cms.shopDomain;
      return site ? `${modeLabel}: ${site}` : null;
    }
    case "notion": {
      const notion = record as { databaseId?: string };
      return notion.databaseId ? `Database ${notion.databaseId}` : null;
    }
    case "webflow": {
      const webflow = record as { collectionId?: string };
      return webflow.collectionId ? `Collection ${webflow.collectionId}` : null;
    }
    case "ghost": {
      const ghost = record as { apiUrl?: string };
      return ghost.apiUrl ?? null;
    }
    case "webhook": {
      const webhook = record as { url?: string };
      return webhook.url ?? null;
    }
    case "linkedin": {
      const linkedin = record as { displayName?: string };
      return linkedin.displayName ?? "Connected account";
    }
    case "twitter": {
      const twitter = record as { screenName?: string };
      return twitter.screenName ? `@${twitter.screenName}` : "Connected account";
    }
    default:
      return null;
  }
}
