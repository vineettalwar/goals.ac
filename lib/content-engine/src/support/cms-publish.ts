import { marked } from "marked";
import { prepareWordPressImages } from "@workspace/connectors/wordpress-images";
import { publishToGhost } from "@workspace/connectors/ghost";
import { publishToWebhook } from "@workspace/connectors/webhook";
import type { WebhookArticlePayload } from "@workspace/connectors/webhook";
import { publishToShopify } from "@workspace/connectors/shopify";
import { publishToDrupal } from "@workspace/connectors/drupal";
import { publishToJoomla } from "@workspace/connectors/joomla";
import { publishToGoalsAcPlugin, injectGoalsAcSchema } from "@workspace/connectors/goals-ac-plugin";
import { publishToWordPress } from "@workspace/connectors/wordpress";
import type { ContentPieceMetadata } from "@workspace/db";
import type { CmsIntegrationCredentials, CmsPublishPlatform } from "./cms-integrations";
import { resolveWordPressConnectionType } from "./cms-integrations";
import {
  mapSeoToJoomlaMeta,
  mapSeoToPluginMeta,
  mapSeoToWordPressRestMeta,
  seoFromPieceMetadata,
  type CanonicalSeoFields,
} from "./seo-field-mapper";

export interface PublishableContentPiece {
  id?: number;
  title: string;
  bodyMarkdown: string;
  targetKeyword?: string | null;
  formatType?: string | null;
  pieceMetadata?: ContentPieceMetadata | null;
}

function contentTags(piece: PublishableContentPiece): string[] {
  const tags: string[] = [];
  if (piece.targetKeyword) tags.push(piece.targetKeyword);
  if (piece.formatType) tags.push(piece.formatType.replace(/_/g, " "));
  return tags;
}

function resolveSeo(
  piece: PublishableContentPiece,
  ogImageOverride?: string,
): CanonicalSeoFields {
  const seo = seoFromPieceMetadata(piece.title, piece.targetKeyword, piece.pieceMetadata);
  if (ogImageOverride) {
    return { ...seo, ogImageUrl: ogImageOverride };
  }
  return seo;
}

async function maybeInjectSchema(
  creds: CmsIntegrationCredentials,
  platform: CmsPublishPlatform | "wordpress",
  piece: PublishableContentPiece,
): Promise<void> {
  const jsonLd = piece.pieceMetadata?.jsonLdSchema;
  if (!jsonLd || typeof jsonLd !== "object") return;

  const pluginCreds =
    platform === "wordpress"
      ? creds.wordpress?.siteUrl && creds.wordpress.siteKey
        ? { siteUrl: creds.wordpress.siteUrl, siteKey: creds.wordpress.siteKey, platform: "wordpress" as const }
        : null
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

export async function publishPieceToWordPress(
  piece: PublishableContentPiece,
  creds: CmsIntegrationCredentials,
  options?: { status?: "draft" | "publish" },
): Promise<string> {
  if (!creds.wordpress) {
    throw new Error("WordPress is not connected. Configure it in Project Settings → Publishing.");
  }

  const status = options?.status ?? "publish";
  const tags = contentTags(piece);
  const connectionType = resolveWordPressConnectionType(creds.wordpress);
  const keyword = piece.targetKeyword ?? piece.title;

  const hasImages = (piece.pieceMetadata?.images?.length ?? 0) > 0;

  if (connectionType === "plugin") {
    if (!creds.wordpress.siteKey) {
      throw new Error("WordPress plugin credentials are incomplete.");
    }

    const pluginCreds = {
      siteUrl: creds.wordpress.siteUrl,
      siteKey: creds.wordpress.siteKey,
      platform: "wordpress" as const,
    };

    let bodyMarkdown = piece.bodyMarkdown;
    let featuredImageId: number | undefined;
    let hostedOgUrl: string | undefined;
    let updatedMetadata = piece.pieceMetadata;

    if (hasImages) {
      const prepared = await prepareWordPressImages({
        bodyMarkdown: piece.bodyMarkdown,
        targetKeyword: keyword,
        images: piece.pieceMetadata?.images,
        pluginCreds,
      });
      bodyMarkdown = prepared.bodyMarkdown;
      featuredImageId = prepared.featuredImageId;
      hostedOgUrl = prepared.featuredHostedUrl;
      if (prepared.updatedImages) {
        updatedMetadata = {
          ...piece.pieceMetadata,
          images: prepared.updatedImages,
          featuredImageUrl: prepared.featuredHostedUrl ?? piece.pieceMetadata?.featuredImageUrl,
          ogImageUrl: prepared.featuredHostedUrl ?? piece.pieceMetadata?.ogImageUrl,
        };
      }
    }

    const seo = resolveSeo({ ...piece, pieceMetadata: updatedMetadata }, hostedOgUrl);

    const result = await publishToGoalsAcPlugin(
      pluginCreds,
      {
        title: piece.title,
        content: bodyMarkdown,
        status: status === "publish" ? "publish" : "draft",
        tags,
        featured_image_id: featuredImageId,
        meta: mapSeoToPluginMeta(seo),
        seo: seo as Record<string, string | undefined>,
      },
      {
        markdown: true,
        idempotencyKey: piece.id ? `piece-${piece.id}` : undefined,
      },
    );
    await maybeInjectSchema(creds, "wordpress", piece);
    return result.url;
  }

  if (!creds.wordpress.username || !creds.wordpress.appPassword) {
    throw new Error("WordPress API credentials are incomplete.");
  }

  const wpCreds = {
    siteUrl: creds.wordpress.siteUrl,
    username: creds.wordpress.username,
    appPassword: creds.wordpress.appPassword,
  };

  let bodyMarkdown = piece.bodyMarkdown;
  let featuredMediaId: number | undefined;
  let hostedOgUrl: string | undefined;
  let updatedMetadata = piece.pieceMetadata;

  if (hasImages) {
    const prepared = await prepareWordPressImages({
      bodyMarkdown: piece.bodyMarkdown,
      targetKeyword: keyword,
      images: piece.pieceMetadata?.images,
      wpCreds,
    });
    bodyMarkdown = prepared.bodyMarkdown;
    featuredMediaId = prepared.featuredImageId;
    hostedOgUrl = prepared.featuredHostedUrl;
    if (prepared.updatedImages) {
      updatedMetadata = {
        ...piece.pieceMetadata,
        images: prepared.updatedImages,
        featuredImageUrl: prepared.featuredHostedUrl ?? piece.pieceMetadata?.featuredImageUrl,
        ogImageUrl: prepared.featuredHostedUrl ?? piece.pieceMetadata?.ogImageUrl,
      };
    }
  }

  const seo = resolveSeo({ ...piece, pieceMetadata: updatedMetadata }, hostedOgUrl);
  const wpMeta = mapSeoToWordPressRestMeta(seo);
  const result = await publishToWordPress(
    wpCreds,
    seo.seoTitle ?? piece.title,
    bodyMarkdown,
    status,
    seo.metaDescription,
    undefined,
    Object.keys(wpMeta).length > 0 ? wpMeta : undefined,
    { featuredMediaId },
  );
  return result.url;
}

export async function publishPieceToCms(
  platform: CmsPublishPlatform,
  piece: PublishableContentPiece,
  creds: CmsIntegrationCredentials,
  options?: { status?: "draft" | "published" },
): Promise<string> {
  const status = options?.status ?? "published";
  const tags = contentTags(piece);
  const seo = resolveSeo(piece);

  switch (platform) {
    case "ghost": {
      if (!creds.ghost) {
        throw new Error("Ghost is not connected. Configure it in Project Settings → Publishing.");
      }
      const result = await publishToGhost(
        creds.ghost,
        seo.seoTitle ?? piece.title,
        piece.bodyMarkdown,
        status,
        seo.metaDescription,
        tags,
      );
      return result.url;
    }
    case "webhook": {
      if (!creds.webhook) {
        throw new Error("Webhook is not connected. Configure it in Project Settings → Publishing.");
      }
      const bodyHtml = await marked(piece.bodyMarkdown);
      const payload: WebhookArticlePayload = {
        title: piece.title,
        bodyMarkdown: piece.bodyMarkdown,
        bodyHtml,
        publishedStatus: status === "published" ? "publish" : "draft",
        keywords: tags,
        metaDescription: seo.metaDescription,
        faq: piece.pieceMetadata?.faqSection,
        citations: piece.pieceMetadata?.citations,
        jsonLd: piece.pieceMetadata?.jsonLdSchema,
      };
      await publishToWebhook(creds.webhook, payload);
      return creds.webhook.url;
    }
    case "shopify": {
      if (!creds.shopify) {
        throw new Error("Shopify is not connected. Configure it in Project Settings → Publishing.");
      }
      if (creds.shopify.connectionType === "plugin") {
        if (!creds.shopify.siteUrl || !creds.shopify.siteKey) {
          throw new Error("Shopify plugin credentials are incomplete.");
        }
        const result = await publishToGoalsAcPlugin(
          {
            siteUrl: creds.shopify.siteUrl,
            siteKey: creds.shopify.siteKey,
            platform: "shopify",
          },
          {
            title: piece.title,
            content: piece.bodyMarkdown,
            status,
            blogId: creds.shopify.blogId,
            tags,
            meta: mapSeoToPluginMeta(seo),
            seo: seo as Record<string, string | undefined>,
          },
          {
            markdown: true,
            idempotencyKey: piece.id ? `piece-${piece.id}` : undefined,
          },
        );
        await maybeInjectSchema(creds, "shopify", piece);
        return result.url;
      }
      if (!creds.shopify.shopDomain || !creds.shopify.accessToken) {
        throw new Error("Shopify API credentials are incomplete.");
      }
      const result = await publishToShopify(
        {
          shopDomain: creds.shopify.shopDomain,
          accessToken: creds.shopify.accessToken,
          blogId: creds.shopify.blogId,
        },
        seo.seoTitle ?? piece.title,
        piece.bodyMarkdown,
        status,
        seo.metaDescription,
        tags,
      );
      return result.url;
    }
    case "drupal": {
      if (!creds.drupal) {
        throw new Error("Drupal is not connected. Configure it in Project Settings → Publishing.");
      }
      if (creds.drupal.connectionType === "plugin") {
        if (!creds.drupal.siteKey) {
          throw new Error("Drupal plugin credentials are incomplete.");
        }
        const result = await publishToGoalsAcPlugin(
          {
            siteUrl: creds.drupal.siteUrl,
            siteKey: creds.drupal.siteKey,
            platform: "drupal",
          },
          {
            title: piece.title,
            content: piece.bodyMarkdown,
            status,
            meta: mapSeoToPluginMeta(seo),
            seo: seo as Record<string, string | undefined>,
          },
          {
            markdown: true,
            idempotencyKey: piece.id ? `piece-${piece.id}` : undefined,
          },
        );
        await maybeInjectSchema(creds, "drupal", piece);
        return result.url;
      }
      const result = await publishToDrupal(
        {
          siteUrl: creds.drupal.siteUrl,
          authType: creds.drupal.authType ?? "basic",
          username: creds.drupal.username,
          password: creds.drupal.password,
          accessToken: creds.drupal.accessToken,
        },
        seo.seoTitle ?? piece.title,
        piece.bodyMarkdown,
        status,
        creds.drupal.contentType ?? "article",
        seo.metaDescription,
        tags,
      );
      return result.url;
    }
    case "joomla": {
      if (!creds.joomla) {
        throw new Error("Joomla is not connected. Configure it in Project Settings → Publishing.");
      }
      const joomlaMeta = mapSeoToJoomlaMeta(seo);
      if (creds.joomla.connectionType === "plugin") {
        if (!creds.joomla.siteKey) {
          throw new Error("Joomla plugin credentials are incomplete.");
        }
        const result = await publishToGoalsAcPlugin(
          {
            siteUrl: creds.joomla.siteUrl,
            siteKey: creds.joomla.siteKey,
            platform: "joomla",
          },
          {
            title: piece.title,
            content: piece.bodyMarkdown,
            status: status === "published" ? "publish" : "draft",
            meta: mapSeoToPluginMeta(seo),
            seo: { ...seo, ...joomlaMeta } as Record<string, string | undefined>,
          },
          {
            markdown: true,
            idempotencyKey: piece.id ? `piece-${piece.id}` : undefined,
          },
        );
        await maybeInjectSchema(creds, "joomla", piece);
        return result.url;
      }
      if (!creds.joomla.apiToken) {
        throw new Error("Joomla API credentials are incomplete.");
      }
      const result = await publishToJoomla(
        {
          siteUrl: creds.joomla.siteUrl,
          apiToken: creds.joomla.apiToken,
        },
        seo.seoTitle ?? piece.title,
        piece.bodyMarkdown,
        status === "published" ? "publish" : "draft",
        creds.joomla.categoryId,
        seo.metaDescription,
        tags,
      );
      return result.url;
    }
    case "typo3": {
      if (!creds.typo3) {
        throw new Error("TYPO3 is not connected. Configure it in Project Settings → Publishing.");
      }
      const { publishToTypo3 } = await import("@workspace/connectors/typo3");
      const result = await publishToTypo3(creds.typo3, piece.title, piece.bodyMarkdown, status);
      return result.url;
    }
    default: {
      const exhaustive: never = platform;
      throw new Error(`Unsupported CMS platform: ${exhaustive}`);
    }
  }
}
