import { publishToGoalsAcPlugin } from "@workspace/connectors/goals-ac-plugin";
import { publishToShopify } from "@workspace/connectors/shopify";
import type { CanonicalContent } from "../content/canonical-content";
import type { CmsIntegrationCredentials } from "../support/publishing/cms-integrations";
import { getOutputModes, resolveOutputMode } from "../support/publishing/platform-output-modes";
import {
  contentTagsFromCanonical,
  mapSeoToPluginMeta,
  resolveSeoFromCanonical,
  seoTitle,
} from "./adapter-helpers";
import { mapPluginStatus } from "./plugin-shared";
import { markdownToHtml } from "./markdown-html";
import {
  markdownToShopifySections,
  shopifyHandleFromTitle,
} from "./shopify-sections";
import type { CmsAdapter, PlatformPayload, PublishOpts, RenderOptions, RenderResult } from "./types";

export const SHOPIFY_METAFIELD_NAMESPACE = "goals_ac";
export const SHOPIFY_METAFIELD_KEY = "content_sections";
export const SHOPIFY_PAGE_TEMPLATE_SUFFIX = "goals-ac";

type ShopifyOutputMode = "article_html" | "article_metafields" | "page_sections";

export const shopifyAdapter: CmsAdapter = {
  platform: "shopify",
  capabilities: {
    drafts: true,
    scheduling: false,
    updates: true,
    categories: false,
    featuredImage: true,
    schemaInjection: true,
    outputModes: getOutputModes("shopify").map((m) => m.value),
  },

  async render(content: CanonicalContent, opts?: RenderOptions): Promise<RenderResult> {
    const outputMode = resolveOutputMode({
      platform: "shopify",
      explicit: opts?.outputMode,
      creds: opts?.creds,
      entitlements: opts?.entitlements,
    }) as ShopifyOutputMode;

    const seo = resolveSeoFromCanonical(content);
    const tags = contentTagsFromCanonical(content);
    const title = seoTitle(content, seo);
    const html = await markdownToHtml(content.markdown);
    const featuredImageUrl = content.pieceMetadata?.featuredImageUrl?.trim() || undefined;
    const warnings: RenderResult["warnings"] = [];

    if (outputMode === "article_html") {
      return {
        payload: {
          kind: "shopify",
          outputMode: "article_html",
          title,
          content: content.markdown,
          meta: {
            ...(seo.metaDescription ? { description: seo.metaDescription } : {}),
            tags: tags.join(","),
            seoTitle: seo.seoTitle ?? content.meta.title,
          },
          tags,
          featuredImageUrl,
        },
        warnings,
        previewHtml: html,
      };
    }

    const sections = await markdownToShopifySections(content.markdown);

    if (outputMode === "article_metafields") {
      return {
        payload: {
          kind: "shopify",
          outputMode: "article_metafields",
          title,
          content: html,
          sections,
          meta: {
            ...(seo.metaDescription ? { description: seo.metaDescription } : {}),
            tags: tags.join(","),
            seoTitle: seo.seoTitle ?? content.meta.title,
          },
          tags,
          featuredImageUrl,
        },
        warnings,
        previewHtml: html,
        previewJson: { outputMode, sections },
      };
    }

    const handle = shopifyHandleFromTitle(title);
    return {
      payload: {
        kind: "shopify",
        outputMode: "page_sections",
        title,
        content: html,
        sections,
        handle,
        meta: {
          ...(seo.metaDescription ? { description: seo.metaDescription } : {}),
          tags: tags.join(","),
          seoTitle: seo.seoTitle ?? content.meta.title,
        },
        tags,
        featuredImageUrl,
      },
      warnings,
      previewHtml: html,
      previewJson: { outputMode, handle, sections },
    };
  },

  async publish(creds: CmsIntegrationCredentials, payload: PlatformPayload, opts?: PublishOpts) {
    if (payload.kind !== "shopify") throw new Error("Invalid payload for Shopify adapter.");
    if (!creds.shopify) throw new Error("Shopify is not connected.");

    const status = mapPluginStatus(opts?.status);
    const tags = payload.tags ?? (payload.meta?.tags ? payload.meta.tags.split(",").filter(Boolean) : []);
    const seo = {
      seoTitle: payload.meta?.seoTitle ?? payload.title,
      metaDescription: payload.meta?.description,
    };

    if (creds.shopify.connectionType === "plugin") {
      if (!creds.shopify.siteUrl || !creds.shopify.siteKey) {
        throw new Error("Shopify plugin credentials are incomplete.");
      }

      const pluginPayload = {
        title: payload.title,
        content: payload.content ?? "",
        status: status === "publish" ? ("publish" as const) : status,
        output_mode: payload.outputMode,
        sections: payload.sections,
        metafield_namespace: SHOPIFY_METAFIELD_NAMESPACE,
        metafield_key: SHOPIFY_METAFIELD_KEY,
        template_suffix: SHOPIFY_PAGE_TEMPLATE_SUFFIX,
        slug: payload.handle,
        blogId: creds.shopify.blogId,
        tags,
        meta: mapSeoToPluginMeta(seo),
        seo: seo as Record<string, string | undefined>,
        ...(payload.featuredImageUrl?.trim()
          ? { featuredImageUrl: payload.featuredImageUrl.trim() }
          : {}),
      };

      const useMarkdown = payload.outputMode === "article_html";
      const result = await publishToGoalsAcPlugin(
        { siteUrl: creds.shopify.siteUrl, siteKey: creds.shopify.siteKey, platform: "shopify" },
        pluginPayload,
        { markdown: useMarkdown, idempotencyKey: opts?.idempotencyKey },
      );
      return { url: result.url, remoteId: result.remote_id };
    }

    if (payload.outputMode !== "article_html") {
      throw new Error(
        `${payload.outputMode} requires the goals.ac Shopify plugin. Connect via plugin mode.`,
      );
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
      payload.title,
      payload.content ?? "",
      status === "publish" ? "published" : "draft",
      payload.meta?.description,
      tags,
      payload.featuredImageUrl,
      payload.title,
    );
    return { url: result.url, remoteId: result.articleId };
  },
};
