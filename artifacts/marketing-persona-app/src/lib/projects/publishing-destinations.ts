/**
 * Next publishing destination registry.
 *
 * Composes CMS / ESP / social display metadata from `@workspace/app-shell/integrations`
 * (UI SSOT: CMS_PLATFORMS, ESP_DESTINATIONS, getSocialDestinations, destination-ids).
 * Next overlays: format matching, connection-method settings, marketing list colors,
 * publish API paths (`getPublishEndpoint`), and cookie-auth-safe fetch stays in Next loaders.
 *
 * Leftover divergence (unsafe to full-unify here): `lib/app-shell/.../content-piece/publish-destinations.ts`
 * stays a smaller Vite publish-dialog subset; Next keeps IG/FB as separate publish targets
 * (shell settings uses one `meta` integration) and `isConnected` via truthy snapshot rows
 * (not `.connected`). Do not move Next cookie/auth or `/api/content-pieces/.../publish` paths into shell.
 */

import {
  CMS_PLATFORMS,
  ESP_DESTINATIONS,
  EXPORT_DESTINATION_IDS,
  getSocialDestinations as getShellSocialDestinations,
  SOCIAL_PUBLISH_IDS,
  type CmsPlatformId,
  type EspPlatformId,
  type ExportDestinationId,
  type SocialPublishId,
} from "@workspace/app-shell/integrations";

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
  | CmsPlatformId
  | EspPlatformId
  | ExportDestinationId
  | SocialPublishId;

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
  | CmsPlatformId
  | EspPlatformId
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

export function impliedDestinationForFormat(
  format: ContentFormatType,
): PublishDestinationId | null {
  return SOCIAL_FORMAT_DESTINATION[format] ?? null;
}

/** Suggest a default intended destination from connections + project primary (optional). */
export function resolveSuggestedDestination(
  format: ContentFormatType,
  connections: CmsConnectionSnapshot,
  primaryBlogDestination?: string | null,
): PublishDestinationId | null {
  const implied = impliedDestinationForFormat(format);
  if (implied) {
    const def = getDestination(implied);
    if (def && !def.exportOnly && def.isConnected(connections)) return implied;
    return implied;
  }

  const connected = getConnectedDestinationsForFormat(format, connections);
  if (primaryBlogDestination) {
    const match = connected.find((d) => d.id === primaryBlogDestination);
    if (match) return match.id;
  }
  return connected[0]?.id ?? null;
}

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

/** Next-only settings overlays; labels/descriptions/badges come from shell CMS_PLATFORMS. */
const CMS_NEXT_OVERLAY: Record<
  CmsPlatformId,
  {
    connectionMethods: ConnectionMethod[];
    connectionMethodLabels: Partial<Record<ConnectionMethod, string>>;
    listColorClassName: string;
  }
> = {
  wordpress: {
    connectionMethods: ["api", "plugin"],
    connectionMethodLabels: {
      api: "Application Password (REST API)",
      plugin: "goals.ac plugin (HMAC)",
    },
    listColorClassName: "bg-blue-400",
  },
  notion: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Integration token" },
    listColorClassName: "bg-zinc-400",
  },
  webflow: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Site API token" },
    listColorClassName: "bg-purple-400",
  },
  ghost: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Admin API key" },
    listColorClassName: "bg-zinc-500",
  },
  shopify: {
    connectionMethods: ["api", "plugin"],
    connectionMethodLabels: {
      api: "Shopify Admin API",
      plugin: "goals.ac plugin (HMAC)",
    },
    listColorClassName: "bg-green-500",
  },
  drupal: {
    connectionMethods: ["api", "plugin"],
    connectionMethodLabels: {
      api: "Drupal JSON:API",
      plugin: "goals.ac plugin (HMAC)",
    },
    listColorClassName: "bg-sky-500",
  },
  joomla: {
    connectionMethods: ["api", "plugin"],
    connectionMethodLabels: {
      api: "Joomla Web Services API",
      plugin: "goals.ac plugin (HMAC)",
    },
    listColorClassName: "bg-orange-500",
  },
  webhook: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Signed webhook URL" },
    listColorClassName: "bg-amber-400",
  },
  wix: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Access token" },
    listColorClassName: "bg-yellow-400",
  },
  framer: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Project API token" },
    listColorClassName: "bg-violet-400",
  },
  squarespace: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "API key" },
    listColorClassName: "bg-neutral-500",
  },
  contentful: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Personal access token" },
    listColorClassName: "bg-blue-300",
  },
  sanity: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Project token" },
    listColorClassName: "bg-red-400",
  },
  strapi: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "API token" },
    listColorClassName: "bg-indigo-400",
  },
  hubspot: {
    connectionMethods: ["api"],
    connectionMethodLabels: { api: "Private app token" },
    listColorClassName: "bg-orange-400",
  },
  typo3: {
    connectionMethods: ["plugin"],
    connectionMethodLabels: { plugin: "goals.ac plugin (HMAC)" },
    listColorClassName: "bg-orange-500",
  },
};

/** Prefer Next settings card order; append any new shell platforms at the end. */
const CMS_DISPLAY_ORDER: CmsPlatformId[] = [
  "wordpress",
  "notion",
  "webflow",
  "ghost",
  "shopify",
  "drupal",
  "joomla",
  "webhook",
  "wix",
  "framer",
  "squarespace",
  "contentful",
  "sanity",
  "strapi",
  "hubspot",
  "typo3",
];

const ESP_LIST_COLORS: Record<EspPlatformId, string> = {
  beehiiv: "bg-yellow-500",
  convertkit: "bg-red-400",
  mailchimp: "bg-yellow-400",
};

const SOCIAL_LIST_COLORS: Record<SocialPublishId, string> = {
  linkedin: "bg-blue-500",
  twitter: "bg-sky-400",
  instagram: "bg-fuchsia-500",
  facebook: "bg-indigo-500",
  bluesky: "bg-sky-500",
  mastodon: "bg-violet-500",
};

const SOCIAL_OAUTH_LABEL: Partial<Record<string, string>> = {
  linkedin: "OAuth",
  twitter: "OAuth",
  bluesky: "AT Protocol OAuth",
  mastodon: "Instance OAuth",
  meta: "Meta OAuth",
};

function buildCmsDestinations(): PublishDestinationDefinition[] {
  const byKey = new Map(CMS_PLATFORMS.map((platform) => [platform.key, platform]));
  const ordered: PublishDestinationDefinition[] = [];

  for (const id of CMS_DISPLAY_ORDER) {
    const platform = byKey.get(id);
    if (!platform) continue;
    byKey.delete(id);
    ordered.push(cmsDefinitionFromShell(platform));
  }
  for (const platform of byKey.values()) {
    ordered.push(cmsDefinitionFromShell(platform));
  }
  return ordered;
}

function cmsDefinitionFromShell(
  platform: (typeof CMS_PLATFORMS)[number],
): PublishDestinationDefinition {
  const overlay = CMS_NEXT_OVERLAY[platform.key] ?? {
    connectionMethods: ["api"] as ConnectionMethod[],
    connectionMethodLabels: { api: "API" },
    listColorClassName: "bg-zinc-400",
  };
  return {
    id: platform.key,
    label: platform.label,
    category: "cms",
    integrationKey: platform.key,
    description: platform.description,
    badgeLetter: platform.badgeLetter,
    badgeClassName: platform.badgeClassName,
    listColorClassName: overlay.listColorClassName,
    connectionMethods: overlay.connectionMethods,
    connectionMethodLabels: overlay.connectionMethodLabels,
    isConnected: (c) => !!c[platform.key],
    matchesFormat: matchesLongForm,
  };
}

function buildEspDestinations(): PublishDestinationDefinition[] {
  return ESP_DESTINATIONS.map((esp) => ({
    id: esp.id,
    label: esp.label,
    category: "esp" as const,
    integrationKey: esp.integrationKey,
    description: esp.description,
    badgeLetter: esp.badgeLetter,
    badgeClassName: esp.badgeClassName,
    listColorClassName: ESP_LIST_COLORS[esp.id],
    connectionMethods: [...esp.connectionMethods] as ConnectionMethod[],
    connectionMethodLabels: { api: esp.connectionMethodLabel },
    isConnected: (c) => !!c[esp.id],
    matchesFormat: matchesEmail,
  }));
}

function buildExportDestinations(): PublishDestinationDefinition[] {
  return EXPORT_DESTINATION_IDS.map((id) => {
    if (id === "medium") {
      return {
        id,
        label: "Medium",
        category: "export" as const,
        integrationKey: "medium",
        description: "Medium's API is deprecated. Export markdown and paste into Medium.",
        badgeLetter: "M",
        badgeClassName: "bg-neutral-700",
        listColorClassName: "bg-neutral-500",
        connectionMethods: ["api"] as ConnectionMethod[],
        connectionMethodLabels: { api: "Export only" },
        isConnected: () => false,
        matchesFormat: matchesLongForm,
        exportOnly: true,
      };
    }
    return {
      id,
      label: "Substack",
      category: "export" as const,
      integrationKey: "substack",
      description: "No write API available. Export markdown and paste into Substack.",
      badgeLetter: "S",
      badgeClassName: "bg-orange-600",
      listColorClassName: "bg-orange-400",
      connectionMethods: ["api"] as ConnectionMethod[],
      connectionMethodLabels: { api: "Export only" },
      isConnected: () => false,
      matchesFormat: (f: ContentFormatType) => matchesEmail(f) || matchesLongForm(f),
      exportOnly: true,
    };
  });
}

function buildSocialDestinations(): PublishDestinationDefinition[] {
  const fromShell = getShellSocialDestinations().flatMap((shell) => {
    if (shell.id === "meta") {
      return (["instagram", "facebook"] as const).map((id) => ({
        id,
        label: id === "instagram" ? "Instagram" : "Facebook",
        category: "social" as const,
        integrationKey: "meta",
        description:
          id === "instagram"
            ? "Publish Instagram posts via a connected Meta account."
            : "Publish Facebook posts via a connected Meta account.",
        listColorClassName: SOCIAL_LIST_COLORS[id],
        connectionMethods: ["oauth"] as ConnectionMethod[],
        connectionMethodLabels: { oauth: SOCIAL_OAUTH_LABEL.meta ?? "Meta OAuth" },
        hideSettingsCard: true,
        isConnected: hasMeta,
        matchesFormat: (f: ContentFormatType) => SOCIAL_FORMAT_DESTINATION[f] === id,
      }));
    }

    const id = shell.id as SocialPublishId;
    return [
      {
        id,
        label: shell.label,
        category: "social" as const,
        integrationKey: shell.integrationKey,
        description: shell.description,
        listColorClassName: SOCIAL_LIST_COLORS[id],
        connectionMethods: ["oauth"] as ConnectionMethod[],
        connectionMethodLabels: {
          oauth: SOCIAL_OAUTH_LABEL[shell.id] ?? "OAuth",
        },
        oauthPath: shell.oauthPath,
        hideSettingsCard: id === "bluesky" || id === "mastodon" ? true : undefined,
        isConnected: (c: CmsConnectionSnapshot) => !!c[shell.integrationKey],
        matchesFormat: (f: ContentFormatType) => SOCIAL_FORMAT_DESTINATION[f] === id,
      },
    ];
  });

  // Guard: shell social list must cover every Next social publish id except IG/FB (from meta).
  const covered = new Set(fromShell.map((d) => d.id));
  for (const id of SOCIAL_PUBLISH_IDS) {
    if (!covered.has(id)) {
      throw new Error(`Shell social destinations missing publish id: ${id}`);
    }
  }
  return fromShell;
}

export const PUBLISHING_DESTINATIONS: PublishDestinationDefinition[] = [
  ...buildCmsDestinations(),
  ...buildEspDestinations(),
  ...buildExportDestinations(),
  ...buildSocialDestinations(),
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
    if (destination.exportOnly) continue;
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
  return getDestinationsForFormat(format).filter(
    (d) => !d.exportOnly && d.isConnected(connections),
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
