import { injectGoalsAcSchema } from "@workspace/connectors/goals-ac-plugin";
import { renderAndPublish } from "../adapters/render-service";
import { getAdapter } from "../adapters/registry";
import {
  type CmsIntegrationCredentials,
  type EspPublishPlatform,
  ESP_PUBLISH_PLATFORMS,
} from "./cms-integrations";
import {
  type PublishableContentPiece,
} from "./cms-publish";
import { publishPieceToEsp } from "./esp-publish";
import type { PublishEntitlements } from "./publish-entitlements";

export type BlogDestinationId =
  | "wordpress"
  | "notion"
  | "webflow"
  | "ghost"
  | "webhook"
  | "shopify"
  | "drupal"
  | "joomla"
  | "typo3"
  | "wix"
  | "framer"
  | "squarespace"
  | "contentful"
  | "sanity"
  | "strapi"
  | "hubspot";

const BLOG_DESTINATION_PRIORITY: BlogDestinationId[] = [
  "wordpress",
  "ghost",
  "shopify",
  "drupal",
  "joomla",
  "typo3",
  "hubspot",
  "wix",
  "framer",
  "squarespace",
  "contentful",
  "sanity",
  "strapi",
  "notion",
  "webflow",
  "webhook",
];

const ADAPTER_PLATFORMS = new Set([
  "wordpress",
  "notion",
  "webflow",
  "ghost",
  "webhook",
  "contentful",
  "sanity",
  "strapi",
  "shopify",
  "drupal",
  "joomla",
  "typo3",
  "wix",
  "framer",
  "squarespace",
  "hubspot",
]);

function hasBlogDestination(
  creds: CmsIntegrationCredentials,
  platform: BlogDestinationId,
): boolean {
  return Boolean(creds[platform as keyof CmsIntegrationCredentials]);
}

export function resolvePrimaryBlogDestination(
  creds: CmsIntegrationCredentials,
  preferred?: string | null,
): BlogDestinationId | null {
  if (preferred && hasBlogDestination(creds, preferred as BlogDestinationId)) {
    return preferred as BlogDestinationId;
  }
  for (const platform of BLOG_DESTINATION_PRIORITY) {
    if (hasBlogDestination(creds, platform)) return platform;
  }
  return null;
}

export function resolvePrimaryEspDestination(
  creds: CmsIntegrationCredentials,
  preferred?: string | null,
): EspPublishPlatform | null {
  if (preferred && ESP_PUBLISH_PLATFORMS.includes(preferred as EspPublishPlatform)) {
    const platform = preferred as EspPublishPlatform;
    if (creds[platform]) return platform;
  }
  for (const platform of ESP_PUBLISH_PLATFORMS) {
    if (creds[platform]) return platform;
  }
  return null;
}

export interface PublishDestinationOptions {
  status?: "draft" | "publish" | "published";
  featuredImageUrl?: string;
  entitlements?: PublishEntitlements;
  idempotencyKey?: string;
}

export interface PublishDestinationResult {
  publishedUrl: string;
  publishPlatform: string;
  warnings?: { code: string; message: string }[];
}

function mapCmsStatus(
  status: PublishDestinationOptions["status"],
): "draft" | "published" | "publish" {
  if (status === "draft") return "draft";
  if (status === "publish") return "publish";
  return "published";
}

async function maybeInjectSchema(
  creds: CmsIntegrationCredentials,
  platform: string,
  piece: PublishableContentPiece,
): Promise<void> {
  const jsonLd = piece.pieceMetadata?.jsonLdSchema;
  if (!jsonLd || typeof jsonLd !== "object") return;

  const pluginCreds =
    platform === "wordpress" && creds.wordpress?.siteUrl && creds.wordpress.siteKey
      ? { siteUrl: creds.wordpress.siteUrl, siteKey: creds.wordpress.siteKey, platform: "wordpress" as const }
      : platform === "drupal" && creds.drupal?.siteKey
        ? { siteUrl: creds.drupal.siteUrl, siteKey: creds.drupal.siteKey, platform: "drupal" as const }
        : platform === "joomla" && creds.joomla?.siteKey
          ? { siteUrl: creds.joomla.siteUrl, siteKey: creds.joomla.siteKey, platform: "joomla" as const }
          : platform === "shopify" && creds.shopify?.siteUrl && creds.shopify.siteKey
            ? { siteUrl: creds.shopify.siteUrl, siteKey: creds.shopify.siteKey, platform: "shopify" as const }
            : null;

  if (!pluginCreds) return;

  try {
    await injectGoalsAcSchema(pluginCreds, {
      json_ld: jsonLd,
      llms_txt: piece.pieceMetadata?.metaDescription
        ? `# ${piece.title}\n\n${piece.pieceMetadata.metaDescription}`
        : undefined,
    });
  } catch {
    // Schema injection is best-effort
  }
}

export async function publishPieceToDestination(
  platform: string,
  piece: PublishableContentPiece,
  creds: CmsIntegrationCredentials,
  options?: PublishDestinationOptions,
): Promise<PublishDestinationResult> {
  const cmsStatus = mapCmsStatus(options?.status);

  if (ADAPTER_PLATFORMS.has(platform) && getAdapter(platform)) {
    const result = await renderAndPublish({
      piece,
      platform,
      creds,
      entitlements: options?.entitlements,
      status: cmsStatus,
      idempotencyKey: options?.idempotencyKey ?? (piece.id ? `piece-${piece.id}` : undefined),
    });

    if (platform === "wordpress") {
      await maybeInjectSchema(creds, "wordpress", piece);
    }
    if (platform === "shopify" || platform === "drupal" || platform === "joomla") {
      await maybeInjectSchema(creds, platform, piece);
    }

    return {
      publishedUrl: result.url,
      publishPlatform: platform,
      warnings: result.warnings,
    };
  }

  if (ESP_PUBLISH_PLATFORMS.includes(platform as EspPublishPlatform)) {
    const result = await publishPieceToEsp(platform as EspPublishPlatform, piece, creds);
    return { publishedUrl: result.publishedUrl, publishPlatform: result.publishPlatform };
  }

  throw new Error(`Platform not connected: ${platform}`);
}

export async function publishBlogPieceToPrimaryDestination(
  piece: PublishableContentPiece,
  creds: CmsIntegrationCredentials,
  options?: PublishDestinationOptions & { preferredPlatform?: string | null },
): Promise<PublishDestinationResult> {
  const platform = resolvePrimaryBlogDestination(creds, options?.preferredPlatform);
  if (!platform) {
    throw new Error("No CMS destination connected. Configure publishing in Project Settings.");
  }
  return publishPieceToDestination(platform, piece, creds, options);
}

/** @deprecated Use publishPieceToDestination — kept for Express legacy routes */
export { publishPieceToWordPress } from "./cms-publish";
