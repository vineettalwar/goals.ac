import { marked } from "marked";
import { publishToGhost } from "@workspace/connectors/ghost";
import { publishToWebhook } from "@workspace/connectors/webhook";
import { publishToShopify } from "@workspace/connectors/shopify";
import { publishToDrupal } from "@workspace/connectors/drupal";
import { publishToJoomla } from "@workspace/connectors/joomla";
import { publishToGoalsAcPlugin } from "@workspace/connectors/goals-ac-plugin";
import { publishToWordPress } from "@workspace/connectors/wordpress";
import type { CmsIntegrationCredentials, CmsPublishPlatform } from "./cmsIntegrations";
import { resolveWordPressConnectionType } from "./cmsIntegrations";

export interface PublishableContentPiece {
  id?: number;
  title: string;
  bodyMarkdown: string;
  targetKeyword?: string | null;
  formatType?: string | null;
}

function contentTags(piece: PublishableContentPiece): string[] {
  const tags: string[] = [];
  if (piece.targetKeyword) tags.push(piece.targetKeyword);
  if (piece.formatType) tags.push(piece.formatType.replace(/_/g, " "));
  return tags;
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

  if (connectionType === "plugin") {
    if (!creds.wordpress.siteKey) {
      throw new Error("WordPress plugin credentials are incomplete.");
    }
    const result = await publishToGoalsAcPlugin(
      {
        siteUrl: creds.wordpress.siteUrl,
        siteKey: creds.wordpress.siteKey,
        platform: "wordpress",
      },
      {
        title: piece.title,
        content: piece.bodyMarkdown,
        status: status === "publish" ? "publish" : "draft",
        tags,
      },
      {
        markdown: true,
        idempotencyKey: piece.id ? `piece-${piece.id}` : undefined,
      },
    );
    return result.url;
  }

  if (!creds.wordpress.username || !creds.wordpress.appPassword) {
    throw new Error("WordPress API credentials are incomplete.");
  }

  const result = await publishToWordPress(
    {
      siteUrl: creds.wordpress.siteUrl,
      username: creds.wordpress.username,
      appPassword: creds.wordpress.appPassword,
    },
    piece.title,
    piece.bodyMarkdown,
    status,
    undefined,
    undefined,
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

  switch (platform) {
    case "ghost": {
      if (!creds.ghost) {
        throw new Error("Ghost is not connected. Configure it in Project Settings → Publishing.");
      }
      const result = await publishToGhost(
        creds.ghost,
        piece.title,
        piece.bodyMarkdown,
        status,
        undefined,
        tags,
      );
      return result.url;
    }
    case "webhook": {
      if (!creds.webhook) {
        throw new Error("Webhook is not connected. Configure it in Project Settings → Publishing.");
      }
      const bodyHtml = await marked(piece.bodyMarkdown);
      await publishToWebhook(creds.webhook, {
        title: piece.title,
        bodyMarkdown: piece.bodyMarkdown,
        bodyHtml,
        publishedStatus: status === "published" ? "publish" : "draft",
        keywords: tags,
      });
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
          },
          {
            markdown: true,
            idempotencyKey: piece.id ? `piece-${piece.id}` : undefined,
          },
        );
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
        piece.title,
        piece.bodyMarkdown,
        status,
        undefined,
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
          },
          {
            markdown: true,
            idempotencyKey: piece.id ? `piece-${piece.id}` : undefined,
          },
        );
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
        piece.title,
        piece.bodyMarkdown,
        status,
        creds.drupal.contentType ?? "article",
        undefined,
        tags,
      );
      return result.url;
    }
    case "joomla": {
      if (!creds.joomla) {
        throw new Error("Joomla is not connected. Configure it in Project Settings → Publishing.");
      }
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
          },
          {
            markdown: true,
            idempotencyKey: piece.id ? `piece-${piece.id}` : undefined,
          },
        );
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
        piece.title,
        piece.bodyMarkdown,
        status === "published" ? "publish" : "draft",
        creds.joomla.categoryId,
        undefined,
        tags,
      );
      return result.url;
    }
    default: {
      const exhaustive: never = platform;
      throw new Error(`Unsupported CMS platform: ${exhaustive}`);
    }
  }
}
