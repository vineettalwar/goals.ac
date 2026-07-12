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
  | "wordpress"
  | "notion"
  | "webflow"
  | "ghost"
  | "webhook"
  | "shopify"
  | "drupal"
  | "joomla"
  | "linkedin"
  | "twitter"
  | "instagram"
  | "facebook";

export type ConnectionMethod = "api" | "plugin" | "oauth";

export type CmsConnectionSnapshot = Record<string, unknown>;

export interface PublishDestinationDefinition {
  id: PublishDestinationId;
  label: string;
  category: "cms" | "social";
  integrationKey: string;
  description: string;
  badgeLetter?: string;
  badgeClassName?: string;
  /** Dot color on marketing/home lists */
  listColorClassName?: string;
  /** Shown in project settings when multiple methods exist */
  connectionMethods: ConnectionMethod[];
  connectionMethodLabels: Partial<Record<ConnectionMethod, string>>;
  isConnected: (connections: CmsConnectionSnapshot) => boolean;
  /** Social formats map 1:1; CMS destinations accept all long-form formats */
  matchesFormat: (format: ContentFormatType) => boolean;
  /** OAuth redirect path segment for social connections */
  oauthPath?: string;
  /** Hide duplicate settings card when another destination shares integrationKey */
  hideSettingsCard?: boolean;
}

export type CmsSummary = Record<
  | "notion"
  | "webflow"
  | "wordpress"
  | "ghost"
  | "webhook"
  | "shopify"
  | "drupal"
  | "joomla"
  | "linkedin"
  | "twitter"
  | "meta",
  boolean
>;

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

export const PUBLISHING_DESTINATIONS: PublishDestinationDefinition[] = [
  {
    id: "wordpress",
    label: "WordPress",
    category: "cms",
    integrationKey: "wordpress",
    description: "Publish via Application Passwords or the goals.ac WordPress plugin.",
    badgeLetter: "W",
    badgeClassName: "bg-blue-500",
    listColorClassName: "bg-blue-400",
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
    badgeLetter: "N",
    badgeClassName: "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900",
    listColorClassName: "bg-zinc-400",
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
    badgeLetter: "W",
    badgeClassName: "bg-blue-600",
    listColorClassName: "bg-purple-400",
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
    badgeLetter: "G",
    badgeClassName: "bg-zinc-800",
    listColorClassName: "bg-zinc-500",
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
    badgeLetter: "S",
    badgeClassName: "bg-green-700",
    listColorClassName: "bg-green-500",
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
    badgeLetter: "D",
    badgeClassName: "bg-sky-700",
    listColorClassName: "bg-sky-500",
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
    badgeLetter: "J",
    badgeClassName: "bg-orange-600",
    listColorClassName: "bg-orange-500",
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
    listColorClassName: "bg-amber-400",
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
    listColorClassName: "bg-blue-500",
    connectionMethods: ["oauth"],
    connectionMethodLabels: { oauth: "OAuth" },
    oauthPath: "linkedin",
    isConnected: (c) => !!c.linkedin,
    matchesFormat: (f) => SOCIAL_FORMAT_DESTINATION[f] === "linkedin",
  },
  {
    id: "twitter",
    label: "X",
    category: "social",
    integrationKey: "twitter",
    description: "Publish threads directly to X.",
    listColorClassName: "bg-sky-400",
    connectionMethods: ["oauth"],
    connectionMethodLabels: { oauth: "OAuth" },
    oauthPath: "twitter",
    isConnected: (c) => !!c.twitter,
    matchesFormat: (f) => SOCIAL_FORMAT_DESTINATION[f] === "twitter",
  },
  {
    id: "instagram",
    label: "Instagram",
    category: "social",
    integrationKey: "meta",
    description: "Publish Instagram posts via a connected Meta account.",
    listColorClassName: "bg-fuchsia-500",
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
    listColorClassName: "bg-indigo-500",
    connectionMethods: ["oauth"],
    connectionMethodLabels: { oauth: "Meta OAuth" },
    hideSettingsCard: true,
    isConnected: hasMeta,
    matchesFormat: (f) => SOCIAL_FORMAT_DESTINATION[f] === "facebook",
  },
];

export function getDestination(
  id: PublishDestinationId,
): PublishDestinationDefinition | undefined {
  return PUBLISHING_DESTINATIONS.find((d) => d.id === id);
}

export function getCmsDestinations(): PublishDestinationDefinition[] {
  return PUBLISHING_DESTINATIONS.filter((d) => d.category === "cms");
}

export function getSocialDestinations(): PublishDestinationDefinition[] {
  return PUBLISHING_DESTINATIONS.filter(
    (d) => d.category === "social" && !d.hideSettingsCard,
  );
}

export function countPublishingConnections(
  connections: CmsConnectionSnapshot,
): number {
  const keys = new Set<string>();
  for (const destination of PUBLISHING_DESTINATIONS) {
    if (destination.isConnected(connections)) {
      keys.add(destination.integrationKey);
    }
  }
  return keys.size;
}

export function hasAnyPublishingConnection(
  connections: CmsConnectionSnapshot,
): boolean {
  return countPublishingConnections(connections) > 0;
}

export function getDestinationsForFormat(
  format: ContentFormatType,
): PublishDestinationDefinition[] {
  return PUBLISHING_DESTINATIONS.filter((d) => d.matchesFormat(format));
}

export function getConnectedDestinationsForFormat(
  format: ContentFormatType,
  connections: CmsConnectionSnapshot,
): PublishDestinationDefinition[] {
  return getDestinationsForFormat(format).filter((d) =>
    d.isConnected(connections),
  );
}

export function getPublishEndpoint(
  destinationId: PublishDestinationId,
  pieceId: number,
  apiBase: string,
): string {
  return `${apiBase}/api/content-pieces/${pieceId}/publish/${destinationId}`;
}

export function supportsMultipleConnectionMethods(
  cmsId: PublishDestinationId,
): boolean {
  const def = getDestination(cmsId);
  return (def?.connectionMethods.length ?? 0) > 1;
}

export function getDefaultConnectionMethod(
  cmsId: PublishDestinationId,
): ConnectionMethod {
  const def = getDestination(cmsId);
  return def?.connectionMethods[0] ?? "api";
}

export function getConnectionMethodLabel(
  cmsId: PublishDestinationId,
  method: ConnectionMethod,
): string {
  const def = getDestination(cmsId);
  return def?.connectionMethodLabels[method] ?? method;
}

export function isDestinationConnectedInSummary(
  destination: PublishDestinationDefinition,
  summary: CmsSummary,
): boolean {
  const key = destination.integrationKey as keyof CmsSummary;
  return summary[key] ?? false;
}

/** Marketing label for home / feature grids */
export function getPublishCapabilityLabel(
  destination: PublishDestinationDefinition,
): string {
  const methodLabels = destination.connectionMethods
    .map((method) => destination.connectionMethodLabels[method])
    .filter((label): label is string => !!label);

  if (methodLabels.length <= 1) {
    return methodLabels[0] ? `${destination.label} — ${methodLabels[0]}` : destination.label;
  }

  return `${destination.label} (${methodLabels.join(" + ")})`;
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
    case "shopify": {
      const shopify = record as {
        connectionType?: string;
        siteUrl?: string;
        shopDomain?: string;
      };
      const method = resolveStoredConnectionMethod("shopify", shopify);
      const modeLabel = getConnectionMethodLabel("shopify", method);
      const site = shopify.siteUrl ?? shopify.shopDomain;
      return site ? `${modeLabel}: ${site}` : null;
    }
    case "drupal":
    case "joomla": {
      const cms = record as { connectionType?: string; siteUrl?: string };
      const method = resolveStoredConnectionMethod(destinationId, cms);
      const modeLabel = getConnectionMethodLabel(destinationId, method);
      return cms.siteUrl ? `${modeLabel}: ${cms.siteUrl}` : null;
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
