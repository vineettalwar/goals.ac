import type {
  CmsConnectionSnapshot,
  CmsSummary,
  ConnectionMethod,
  ContentFormatType,
  PublishDestinationDefinition,
  PublishDestinationId,
} from "./types";
import { buildCmsDestinations } from "./cms";
import { buildEspDestinations } from "./esp";
import { buildExportDestinations } from "./export";
import { buildSocialDestinations } from "./social";

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

export const SOCIAL_FORMAT_DESTINATION: Partial<
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

const LONG_FORM_FORMATS: ContentFormatType[] = [
  "blog_post",
  "news_article",
  "tutorial",
  "guide",
  "whitepaper",
  "pillar_page",
  "location_page",
  "infographic_outline",
  "comparison",
  "listicle",
  "case_study",
  "ad_copy",
  "landing_page_copy",
  "product_description",
  "press_release",
  "faq_article",
];

const EMAIL_FORMATS: ContentFormatType[] = ["email_sequence"];

export function matchesLongForm(format: ContentFormatType): boolean {
  return LONG_FORM_FORMATS.includes(format);
}

export function matchesEmail(format: ContentFormatType): boolean {
  return EMAIL_FORMATS.includes(format);
}

export function hasMeta(connections: CmsConnectionSnapshot): boolean {
  return !!connections.meta;
}

// ---------------------------------------------------------------------------
// Canonical registry
// ---------------------------------------------------------------------------

export const PUBLISHING_DESTINATIONS: PublishDestinationDefinition[] = [
  ...buildCmsDestinations(),
  ...buildEspDestinations(),
  ...buildExportDestinations(),
  ...buildSocialDestinations(),
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Format-based destination queries
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Connection counts
// ---------------------------------------------------------------------------

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

export const SOCIAL_SETTINGS_COUNT = 5;

export function countSocialConnections(connections: CmsConnectionSnapshot): number {
  let count = 0;
  if (connections.linkedin) count += 1;
  if (connections.twitter) count += 1;
  if (connections.meta) count += 1;
  if (connections.bluesky) count += 1;
  if (connections.mastodon) count += 1;
  return count;
}

export function hasAnyPublishingConnection(
  connections: CmsConnectionSnapshot,
): boolean {
  return countPublishingConnections(connections) > 0;
}

// ---------------------------------------------------------------------------
// Connection method helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Publish endpoint
// ---------------------------------------------------------------------------

export function getPublishEndpoint(
  destinationId: PublishDestinationId,
  pieceId: number,
  apiBase: string,
): string {
  return `${apiBase}/api/content-pieces/${pieceId}/publish/${destinationId}`;
}

// ---------------------------------------------------------------------------
// Marketing label
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Connection summary (per-destination detail string)
// ---------------------------------------------------------------------------

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
