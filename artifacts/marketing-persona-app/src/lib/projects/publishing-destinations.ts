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
  | "bluesky_post"
  | "mastodon_post"
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
  | "wix"
  | "framer"
  | "squarespace"
  | "contentful"
  | "sanity"
  | "strapi"
  | "hubspot"
  | "typo3"
  | "beehiiv"
  | "convertkit"
  | "mailchimp"
  | "medium"
  | "substack"
  | "linkedin"
  | "twitter"
  | "instagram"
  | "facebook"
  | "bluesky"
  | "mastodon";

export type ConnectionMethod = "api" | "plugin" | "oauth";

export type CmsConnectionSnapshot = Record<string, unknown>;

export interface PublishDestinationDefinition {
  id: PublishDestinationId;
  label: string;
  category: "cms" | "social" | "esp" | "export";
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
  /** Export-only destinations have no live publish */
  exportOnly?: boolean;
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
  | "wix"
  | "framer"
  | "squarespace"
  | "contentful"
  | "sanity"
  | "strapi"
  | "hubspot"
  | "typo3"
  | "beehiiv"
  | "convertkit"
  | "mailchimp"
  | "linkedin"
  | "twitter"
  | "meta"
  | "bluesky"
  | "mastodon",
  boolean
>;

const SOCIAL_FORMAT_DESTINATION: Partial<
  Record<ContentFormatType, PublishDestinationId>
> = {
  linkedin_post: "linkedin",
  twitter_thread: "twitter",
  instagram_post: "instagram",
  facebook_post: "facebook",
  bluesky_post: "bluesky",
  mastodon_post: "mastodon",
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
  "ad_copy",
  "landing_page_copy",
  "product_description",
  "press_release",
  "faq_article",
];

const EMAIL_FORMATS: ContentFormatType[] = ["email_sequence"];

function matchesLongForm(format: ContentFormatType): boolean {
  return LONG_FORM_FORMATS.includes(format);
}

function matchesEmail(format: ContentFormatType): boolean {
  return EMAIL_FORMATS.includes(format);
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
    description: "Publish content as a CMS item in your Webflow collection (draft or live).",
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
    id: "wix",
    label: "Wix",
    category: "cms",
    integrationKey: "wix",
    description: "Publish blog posts to Wix via the Blog API.",
    badgeLetter: "W",
    badgeClassName: "bg-yellow-500 text-black",
    listColorClassName: "bg-yellow-400",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "OAuth access token" },
    isConnected: (c) => !!c.wix,
    matchesFormat: matchesLongForm,
  },
  {
    id: "framer",
    label: "Framer",
    category: "cms",
    integrationKey: "framer",
    description: "Publish CMS collection items to Framer sites.",
    badgeLetter: "F",
    badgeClassName: "bg-violet-600",
    listColorClassName: "bg-violet-400",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Project API token" },
    isConnected: (c) => !!c.framer,
    matchesFormat: matchesLongForm,
  },
  {
    id: "squarespace",
    label: "Squarespace",
    category: "cms",
    integrationKey: "squarespace",
    description: "Publish blog posts to Squarespace via the Content API.",
    badgeLetter: "S",
    badgeClassName: "bg-neutral-900 text-white",
    listColorClassName: "bg-neutral-500",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "API key" },
    isConnected: (c) => !!c.squarespace,
    matchesFormat: matchesLongForm,
  },
  {
    id: "contentful",
    label: "Contentful",
    category: "cms",
    integrationKey: "contentful",
    description: "Create entries in Contentful via the Management API.",
    badgeLetter: "C",
    badgeClassName: "bg-blue-500",
    listColorClassName: "bg-blue-300",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Personal access token" },
    isConnected: (c) => !!c.contentful,
    matchesFormat: matchesLongForm,
  },
  {
    id: "sanity",
    label: "Sanity",
    category: "cms",
    integrationKey: "sanity",
    description: "Create documents in Sanity datasets via the HTTP API.",
    badgeLetter: "S",
    badgeClassName: "bg-red-600",
    listColorClassName: "bg-red-400",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Project token" },
    isConnected: (c) => !!c.sanity,
    matchesFormat: matchesLongForm,
  },
  {
    id: "strapi",
    label: "Strapi",
    category: "cms",
    integrationKey: "strapi",
    description: "Publish content to Strapi via REST API.",
    badgeLetter: "S",
    badgeClassName: "bg-indigo-600",
    listColorClassName: "bg-indigo-400",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "API token" },
    isConnected: (c) => !!c.strapi,
    matchesFormat: matchesLongForm,
  },
  {
    id: "hubspot",
    label: "HubSpot CMS",
    category: "cms",
    integrationKey: "hubspot",
    description: "Publish blog posts to HubSpot CMS.",
    badgeLetter: "H",
    badgeClassName: "bg-orange-500",
    listColorClassName: "bg-orange-400",
    connectionMethods: ["oauth"],
    connectionMethodLabels: { oauth: "Private app token" },
    isConnected: (c) => !!c.hubspot,
    matchesFormat: matchesLongForm,
  },
  {
    id: "typo3",
    label: "TYPO3",
    category: "cms",
    integrationKey: "typo3",
    description: "Publish via the goals.ac TYPO3 extension (HMAC plugin).",
    badgeLetter: "T",
    badgeClassName: "bg-orange-700",
    listColorClassName: "bg-orange-500",
    connectionMethods: ["plugin"],
    connectionMethodLabels: { plugin: "goals.ac plugin (HMAC)" },
    isConnected: (c) => !!c.typo3,
    matchesFormat: matchesLongForm,
  },
  {
    id: "beehiiv",
    label: "Beehiiv",
    category: "esp",
    integrationKey: "beehiiv",
    description: "Publish email sequences and newsletters to Beehiiv.",
    badgeLetter: "B",
    badgeClassName: "bg-yellow-600",
    listColorClassName: "bg-yellow-500",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "API key" },
    isConnected: (c) => !!c.beehiiv,
    matchesFormat: matchesEmail,
  },
  {
    id: "convertkit",
    label: "ConvertKit",
    category: "esp",
    integrationKey: "convertkit",
    description: "Create email broadcasts in ConvertKit (Kit).",
    badgeLetter: "K",
    badgeClassName: "bg-red-500",
    listColorClassName: "bg-red-400",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "API secret" },
    isConnected: (c) => !!c.convertkit,
    matchesFormat: matchesEmail,
  },
  {
    id: "mailchimp",
    label: "Mailchimp",
    category: "esp",
    integrationKey: "mailchimp",
    description: "Create email campaign drafts in Mailchimp.",
    badgeLetter: "M",
    badgeClassName: "bg-yellow-500 text-black",
    listColorClassName: "bg-yellow-400",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "API key" },
    isConnected: (c) => !!c.mailchimp,
    matchesFormat: matchesEmail,
  },
  {
    id: "medium",
    label: "Medium",
    category: "export",
    integrationKey: "medium",
    description: "Medium's API is deprecated. Export markdown and paste into Medium.",
    badgeLetter: "M",
    badgeClassName: "bg-neutral-700",
    listColorClassName: "bg-neutral-500",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Export only" },
    isConnected: () => true,
    matchesFormat: matchesLongForm,
    exportOnly: true,
  },
  {
    id: "substack",
    label: "Substack",
    category: "export",
    integrationKey: "substack",
    description: "No write API available. Export markdown and paste into Substack.",
    badgeLetter: "S",
    badgeClassName: "bg-orange-600",
    listColorClassName: "bg-orange-400",
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Export only" },
    isConnected: () => true,
    matchesFormat: (f) => matchesEmail(f) || matchesLongForm(f),
    exportOnly: true,
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
  {
    id: "bluesky",
    label: "Bluesky",
    category: "social",
    integrationKey: "bluesky",
    description: "Publish posts to Bluesky via AT Protocol OAuth.",
    listColorClassName: "bg-sky-500",
    connectionMethods: ["oauth"],
    connectionMethodLabels: { oauth: "AT Protocol OAuth" },
    oauthPath: "bluesky",
    hideSettingsCard: true,
    isConnected: (c) => !!c.bluesky,
    matchesFormat: (f) => SOCIAL_FORMAT_DESTINATION[f] === "bluesky",
  },
  {
    id: "mastodon",
    label: "Mastodon",
    category: "social",
    integrationKey: "mastodon",
    description: "Publish toots to your Mastodon instance.",
    listColorClassName: "bg-violet-500",
    connectionMethods: ["oauth"],
    connectionMethodLabels: { oauth: "Instance OAuth" },
    oauthPath: "mastodon",
    hideSettingsCard: true,
    isConnected: (c) => !!c.mastodon,
    matchesFormat: (f) => SOCIAL_FORMAT_DESTINATION[f] === "mastodon",
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

export function getEspDestinations(): PublishDestinationDefinition[] {
  return PUBLISHING_DESTINATIONS.filter((d) => d.category === "esp");
}

export function getExportDestinations(): PublishDestinationDefinition[] {
  return PUBLISHING_DESTINATIONS.filter((d) => d.category === "export");
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

export function countCmsConnections(connections: CmsConnectionSnapshot): number {
  return getCmsDestinations().filter((d) => d.isConnected(connections)).length;
}

export function countEspConnections(connections: CmsConnectionSnapshot): number {
  return getEspDestinations().filter((d) => d.isConnected(connections)).length;
}

/** Distinct social integrations shown in settings (LinkedIn, X, Meta, Bluesky, Mastodon). */
export function countSocialConnections(connections: CmsConnectionSnapshot): number {
  let count = 0;
  if (connections.linkedin) count += 1;
  if (connections.twitter) count += 1;
  if (connections.meta) count += 1;
  if (connections.bluesky) count += 1;
  if (connections.mastodon) count += 1;
  return count;
}

export const SOCIAL_SETTINGS_COUNT = 5;

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
    case "wix": {
      const wix = record as { siteId?: string };
      return wix.siteId ? `Site ${wix.siteId}` : null;
    }
    case "framer": {
      const framer = record as { collectionId?: string };
      return framer.collectionId ? `Collection ${framer.collectionId}` : null;
    }
    case "squarespace": {
      const sq = record as { siteId?: string };
      return sq.siteId ? `Blog ${sq.siteId}` : null;
    }
    case "contentful": {
      const cf = record as { spaceId?: string; contentTypeId?: string };
      return cf.spaceId ? `${cf.spaceId} / ${cf.contentTypeId ?? "entry"}` : null;
    }
    case "sanity": {
      const sanity = record as { projectId?: string; dataset?: string };
      return sanity.projectId ? `${sanity.projectId}/${sanity.dataset ?? "production"}` : null;
    }
    case "strapi": {
      const strapi = record as { baseUrl?: string };
      return strapi.baseUrl ?? null;
    }
    case "hubspot": {
      const hubspot = record as { blogId?: string };
      return hubspot.blogId ? `Blog ${hubspot.blogId}` : null;
    }
    case "typo3": {
      const typo3 = record as { siteUrl?: string };
      return typo3.siteUrl ?? null;
    }
    case "beehiiv":
    case "convertkit":
    case "mailchimp": {
      return "Connected";
    }
    case "medium":
    case "substack": {
      return "Export only";
    }
    case "linkedin": {
      const linkedin = record as { displayName?: string };
      return linkedin.displayName ?? "Connected account";
    }
    case "twitter": {
      const twitter = record as { screenName?: string };
      return twitter.screenName ? `@${twitter.screenName}` : "Connected account";
    }
    case "bluesky": {
      const bluesky = record as { handle?: string };
      return bluesky.handle ? `@${bluesky.handle}` : "Connected account";
    }
    case "mastodon": {
      const mastodon = record as { username?: string; instanceUrl?: string };
      return mastodon.username
        ? `@${mastodon.username}@${new URL(mastodon.instanceUrl ?? "https://mastodon.social").hostname}`
        : "Connected account";
    }
    default:
      return null;
  }
}
