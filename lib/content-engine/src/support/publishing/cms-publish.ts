import { marked } from "marked";
import {
  isRasterFeaturedDataUri,
  prepareWordPressImages,
} from "@workspace/connectors/wordpress-images";
import { publishToGhost } from "@workspace/connectors/ghost";
import { publishToWebhook } from "@workspace/connectors/webhook";
import type { WebhookArticlePayload } from "@workspace/connectors/webhook";
import { publishToShopify } from "@workspace/connectors/shopify";
import { publishToDrupal } from "@workspace/connectors/drupal";
import { publishToJoomla } from "@workspace/connectors/joomla";
import {
  publishToGoalsAcPlugin,
  injectGoalsAcSchema,
  fetchGoalsAcSiteGraph,
  insertGoalsAcInternalLinks,
  type GoalsAcPluginCredentials,
} from "@workspace/connectors/goals-ac-plugin";
import { planInternalLinks, type LinkSourcePost } from "../../strategy/internal-link-planner";
import { logger } from "../../core/logger";
import { publishToWordPress, wordpressSlugFromTitle } from "@workspace/connectors/wordpress";
import type { ContentPieceMetadata } from "@workspace/db";
// See the note on assertVerticalReviewCleared in publish-destination.ts: the db
// column type predates the vertical guardrail fields, so reading requiresReview
// back needs content-engine's own wider ContentPieceMetadata.
import type { ContentPieceMetadata as GeneratedPieceMetadata } from "../../content/content-piece-seo";
import type { CmsIntegrationCredentials, CmsPublishPlatform } from "./cms-integrations";
import { resolveWordPressConnectionType } from "./cms-integrations";
import { hostFeaturedImageForPublish } from "./host-featured-image";
import { getLatestPublishedRemoteId } from "./publish-records";
import {
  mapSeoToAioseoRestField,
  mapSeoToJoomlaMeta,
  mapSeoToPluginMeta,
  mapSeoToWordPressRestMeta,
  seoFromPieceMetadata,
  type CanonicalSeoFields,
  type DetectedSeoPlugin,
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

/**
 * Link a freshly published post from existing posts that already discuss it.
 *
 * Best effort by design. A published article is the deliverable; failing to add
 * internal links is worth a log line, not a failed publish. Runs only on the
 * plugin connection, which is what exposes the site graph and the write-back
 * endpoint.
 */
async function maybeWriteBackInternalLinks(
  pluginCreds: GoalsAcPluginCredentials,
  piece: PublishableContentPiece,
  publishedUrl: string,
): Promise<void> {
  const keyword = piece.targetKeyword?.trim() || piece.title?.trim();
  if (!keyword || !publishedUrl) return;

  try {
    const graph = await fetchGoalsAcSiteGraph<{ posts?: LinkSourcePost[] }>(pluginCreds);
    const plan = planInternalLinks({
      targetUrl: publishedUrl,
      targetKeyword: keyword,
      posts: graph.posts ?? [],
    });
    if (!plan) return;

    const result = await insertGoalsAcInternalLinks(pluginCreds, {
      target_url: publishedUrl,
      anchor_text: plan.anchorText,
      post_ids: plan.postIds,
    });

    logger.info(
      {
        publishedUrl,
        anchorText: plan.anchorText,
        updated: result.updated.length,
        skipped: result.skipped.length,
      },
      "Internal link write-back complete",
    );
  } catch (err) {
    logger.warn({ err, publishedUrl }, "Internal link write-back failed; post published without inbound links");
  }
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
  // D2 last-mile review gate — see the matching guard in publish-destination.ts.
  if ((piece.pieceMetadata as GeneratedPieceMetadata | null | undefined)?.requiresReview) {
    throw new Error(
      "This draft belongs to a vertical that requires human review before publishing. Approve it first.",
    );
  }
  if (!creds.wordpress) {
    throw new Error("WordPress is not connected. Configure it in Project Settings → Publishing.");
  }

  const status = options?.status ?? "publish";
  const tags = contentTags(piece);
  const connectionType = resolveWordPressConnectionType(creds.wordpress);
  const keyword = piece.targetKeyword ?? piece.title;

  const needsImagePrep =
    (piece.pieceMetadata?.images?.length ?? 0) > 0 ||
    isRasterFeaturedDataUri(piece.pieceMetadata?.featuredImageUrl);

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

    if (needsImagePrep) {
      const prepared = await prepareWordPressImages({
        bodyMarkdown: piece.bodyMarkdown,
        targetKeyword: keyword,
        images: piece.pieceMetadata?.images,
        featuredImageUrl: piece.pieceMetadata?.featuredImageUrl,
        pluginCreds,
      });
      bodyMarkdown = prepared.bodyMarkdown;
      featuredImageId = prepared.featuredImageId;
      hostedOgUrl = prepared.featuredHostedUrl;
      if (prepared.featuredHostedUrl || prepared.updatedImages) {
        updatedMetadata = {
          ...piece.pieceMetadata,
          ...(prepared.updatedImages ? { images: prepared.updatedImages } : {}),
          featuredImageUrl: prepared.featuredHostedUrl ?? piece.pieceMetadata?.featuredImageUrl,
          ogImageUrl: prepared.featuredHostedUrl ?? piece.pieceMetadata?.ogImageUrl,
        };
      }
    }

    const seo = resolveSeo({ ...piece, pieceMetadata: updatedMetadata }, hostedOgUrl);

    // PHP Seo_Meta_Mapper::apply() owns SEO storage from the `seo` object.
    const result = await publishToGoalsAcPlugin(
      pluginCreds,
      {
        title: piece.title,
        content: bodyMarkdown,
        status: status === "publish" ? "publish" : "draft",
        tags,
        featured_image_id: featuredImageId,
        seo: seo as Record<string, string | undefined>,
      },
      {
        markdown: true,
        idempotencyKey: piece.id ? `piece-${piece.id}` : undefined,
      },
    );
    await maybeInjectSchema(creds, "wordpress", piece);
    if (status === "publish") {
      await maybeWriteBackInternalLinks(pluginCreds, piece, result.url);
    }
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

  if (needsImagePrep) {
    const prepared = await prepareWordPressImages({
      bodyMarkdown: piece.bodyMarkdown,
      targetKeyword: keyword,
      images: piece.pieceMetadata?.images,
      featuredImageUrl: piece.pieceMetadata?.featuredImageUrl,
      wpCreds,
    });
    bodyMarkdown = prepared.bodyMarkdown;
    featuredMediaId = prepared.featuredImageId;
    hostedOgUrl = prepared.featuredHostedUrl;
    if (prepared.featuredHostedUrl || prepared.updatedImages) {
      updatedMetadata = {
        ...piece.pieceMetadata,
        ...(prepared.updatedImages ? { images: prepared.updatedImages } : {}),
        featuredImageUrl: prepared.featuredHostedUrl ?? piece.pieceMetadata?.featuredImageUrl,
        ogImageUrl: prepared.featuredHostedUrl ?? piece.pieceMetadata?.ogImageUrl,
      };
    }
  }

  const seo = resolveSeo({ ...piece, pieceMetadata: updatedMetadata }, hostedOgUrl);
  const detected = creds.wordpress.seoPlugin as DetectedSeoPlugin | undefined;
  const wpMeta = mapSeoToWordPressRestMeta(seo, detected);
  const aioseoMetaData =
    detected === "aioseo" || detected === undefined
      ? mapSeoToAioseoRestField(seo)
      : undefined;
  // Legacy Express path (@deprecated re-export in publish-destination.ts) — kept
  // idempotent the same way the primary adapter path is: reuse a prior remote
  // post id for this piece rather than always creating a new post.
  const metadataRemoteId =
    typeof piece.pieceMetadata?.cmsRemoteId === "string" && piece.pieceMetadata.cmsRemoteId.trim()
      ? piece.pieceMetadata.cmsRemoteId.trim()
      : undefined;
  const existingRemoteId =
    metadataRemoteId ??
    (piece.id != null ? ((await getLatestPublishedRemoteId(piece.id, "wordpress")) ?? undefined) : undefined);
  const result = await publishToWordPress(
    wpCreds,
    seo.seoTitle ?? piece.title,
    bodyMarkdown,
    status,
    seo.metaDescription,
    undefined,
    Object.keys(wpMeta).length > 0 ? wpMeta : undefined,
    {
      featuredMediaId,
      existingRemoteId,
      slug: wordpressSlugFromTitle(seo.seoTitle ?? piece.title) ?? undefined,
      ...(aioseoMetaData ? { aioseoMetaData } : {}),
    },
  );
  if (result.metaWarning) {
    logger.warn({ pieceId: piece.id, url: result.url }, result.metaWarning);
  }
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

  const hostedFeatured = await hostFeaturedImageForPublish(
    piece.pieceMetadata?.featuredImageUrl,
    {
      scope: piece.id != null ? `piece-${piece.id}` : "cms",
      filenameBase: piece.targetKeyword ?? piece.title,
    },
  );
  const pieceForPublish: PublishableContentPiece =
    hostedFeatured && hostedFeatured !== piece.pieceMetadata?.featuredImageUrl
      ? {
          ...piece,
          pieceMetadata: {
            ...piece.pieceMetadata,
            featuredImageUrl: hostedFeatured,
            ogImageUrl: piece.pieceMetadata?.ogImageUrl?.startsWith("data:")
              ? hostedFeatured
              : piece.pieceMetadata?.ogImageUrl,
          },
        }
      : piece;

  const seo = resolveSeo(pieceForPublish);

  switch (platform) {
    case "ghost": {
      if (!creds.ghost) {
        throw new Error("Ghost is not connected. Configure it in Project Settings → Publishing.");
      }
      const result = await publishToGhost(
        creds.ghost,
        seo.seoTitle ?? pieceForPublish.title,
        pieceForPublish.bodyMarkdown,
        status,
        seo.metaDescription,
        tags,
        undefined,
        pieceForPublish.pieceMetadata?.featuredImageUrl,
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
            title: pieceForPublish.title,
            content: pieceForPublish.bodyMarkdown,
            status,
            blogId: creds.shopify.blogId,
            tags,
            meta: mapSeoToPluginMeta(seo),
            seo: seo as Record<string, string | undefined>,
            ...(pieceForPublish.pieceMetadata?.featuredImageUrl?.trim()
              ? { featuredImageUrl: pieceForPublish.pieceMetadata.featuredImageUrl.trim() }
              : {}),
          },
          {
            markdown: true,
            idempotencyKey: pieceForPublish.id ? `piece-${pieceForPublish.id}` : undefined,
          },
        );
        await maybeInjectSchema(creds, "shopify", pieceForPublish);
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
        seo.seoTitle ?? pieceForPublish.title,
        pieceForPublish.bodyMarkdown,
        status,
        seo.metaDescription,
        tags,
        pieceForPublish.pieceMetadata?.featuredImageUrl,
        pieceForPublish.title,
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
