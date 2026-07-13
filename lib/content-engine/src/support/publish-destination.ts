import { publishToNotion } from "@workspace/connectors/notion";
import { publishToWebflow, type WebflowPublishStatus } from "@workspace/connectors/webflow";
import {
  type CmsIntegrationCredentials,
  type CmsPublishPlatform,
  CMS_PUBLISH_PLATFORMS,
  type EspPublishPlatform,
  ESP_PUBLISH_PLATFORMS,
} from "./cms-integrations";
import {
  publishPieceToCms,
  publishPieceToWordPress,
  type PublishableContentPiece,
} from "./cms-publish";
import { publishPieceToEsp } from "./esp-publish";

export type BlogDestinationId =
  | "wordpress"
  | "notion"
  | "webflow"
  | CmsPublishPlatform
  | "wix"
  | "framer"
  | "squarespace"
  | "contentful"
  | "sanity"
  | "strapi"
  | "hubspot"
  | "typo3";

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
}

export interface PublishDestinationResult {
  publishedUrl: string;
  publishPlatform: string;
}

function mapWpStatus(
  status: PublishDestinationOptions["status"],
): "draft" | "publish" {
  if (status === "draft") return "draft";
  return "publish";
}

function mapCmsStatus(
  status: PublishDestinationOptions["status"],
): "draft" | "published" {
  if (status === "draft") return "draft";
  return "published";
}

function mapWebflowStatus(
  creds: CmsIntegrationCredentials,
  status: PublishDestinationOptions["status"],
): WebflowPublishStatus {
  if (status === "draft") return "draft";
  if (status === "publish" || status === "published") return "live";
  return creds.webflow?.publishStatus ?? "draft";
}

export async function publishPieceToDestination(
  platform: string,
  piece: PublishableContentPiece,
  creds: CmsIntegrationCredentials,
  options?: PublishDestinationOptions,
): Promise<PublishDestinationResult> {
  const wpStatus = mapWpStatus(options?.status);
  const cmsStatus = mapCmsStatus(options?.status);

  if (platform === "wordpress" && creds.wordpress) {
    const url = await publishPieceToWordPress(piece, creds, { status: wpStatus });
    return { publishedUrl: url, publishPlatform: "wordpress" };
  }

  if (platform === "notion" && creds.notion) {
    const url = await publishToNotion(
      creds.notion.integrationToken,
      creds.notion.databaseId,
      piece.title,
      piece.bodyMarkdown,
      { status: cmsStatus === "published" ? "published" : "draft" },
    );
    return { publishedUrl: url, publishPlatform: "notion" };
  }

  if (platform === "webflow" && creds.webflow) {
    const url = await publishToWebflow(
      creds.webflow.apiToken,
      creds.webflow.collectionId,
      creds.webflow.bodyFieldSlug,
      piece.title,
      piece.bodyMarkdown,
      { publishStatus: mapWebflowStatus(creds, options?.status) },
    );
    return { publishedUrl: url, publishPlatform: "webflow" };
  }

  if (CMS_PUBLISH_PLATFORMS.includes(platform as CmsPublishPlatform)) {
    const url = await publishPieceToCms(platform as CmsPublishPlatform, piece, creds, {
      status: cmsStatus,
    });
    return { publishedUrl: url, publishPlatform: platform };
  }

  if (platform === "wix" && creds.wix) {
    const { publishToWix } = await import("@workspace/connectors/wix");
    const result = await publishToWix(creds.wix, piece.title, piece.bodyMarkdown, cmsStatus);
    return { publishedUrl: result.url, publishPlatform: "wix" };
  }

  if (platform === "framer" && creds.framer) {
    const { publishToFramer } = await import("@workspace/connectors/framer");
    const result = await publishToFramer(creds.framer, piece.title, piece.bodyMarkdown, cmsStatus);
    return { publishedUrl: result.url, publishPlatform: "framer" };
  }

  if (platform === "squarespace" && creds.squarespace) {
    const { publishToSquarespace } = await import("@workspace/connectors/squarespace");
    const result = await publishToSquarespace(
      creds.squarespace,
      piece.title,
      piece.bodyMarkdown,
      cmsStatus,
    );
    return { publishedUrl: result.url, publishPlatform: "squarespace" };
  }

  if (platform === "contentful" && creds.contentful) {
    const { publishToContentful } = await import("@workspace/connectors/contentful");
    const result = await publishToContentful(creds.contentful, piece.title, piece.bodyMarkdown, cmsStatus);
    return { publishedUrl: result.url, publishPlatform: "contentful" };
  }

  if (platform === "sanity" && creds.sanity) {
    const { publishToSanity } = await import("@workspace/connectors/sanity");
    const result = await publishToSanity(creds.sanity, piece.title, piece.bodyMarkdown, cmsStatus);
    return { publishedUrl: result.url, publishPlatform: "sanity" };
  }

  if (platform === "strapi" && creds.strapi) {
    const { publishToStrapi } = await import("@workspace/connectors/strapi");
    const result = await publishToStrapi(creds.strapi, piece.title, piece.bodyMarkdown, cmsStatus);
    return { publishedUrl: result.url, publishPlatform: "strapi" };
  }

  if (platform === "hubspot" && creds.hubspot) {
    const { publishToHubSpot } = await import("@workspace/connectors/hubspot");
    const result = await publishToHubSpot(creds.hubspot, piece.title, piece.bodyMarkdown, cmsStatus);
    return { publishedUrl: result.url, publishPlatform: "hubspot" };
  }

  if (platform === "typo3" && creds.typo3) {
    const { publishToTypo3 } = await import("@workspace/connectors/typo3");
    const result = await publishToTypo3(creds.typo3, piece.title, piece.bodyMarkdown, cmsStatus);
    return { publishedUrl: result.url, publishPlatform: "typo3" };
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
