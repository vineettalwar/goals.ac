import { publishToGoalsAcPlugin } from "@workspace/connectors/goals-ac-plugin";
import { publishToJoomla } from "@workspace/connectors/joomla";
import type { CanonicalContent } from "../content/canonical-content";
import type { CmsIntegrationCredentials } from "../support/publishing/cms-integrations";
import { getOutputModes } from "../support/publishing/platform-output-modes";
import { resolveOutputMode } from "../support/publishing/platform-output-modes";
import { mapSeoToJoomlaMeta, mapSeoToPluginMeta } from "../support/publishing/seo-field-mapper";
import {
  mapPluginStatus,
  renderMarkdownHtmlPayload,
  seoFromHtmlPayload,
  shouldPreRenderHtml,
} from "./plugin-shared";
import type { CmsAdapter, PlatformPayload, PublishOpts, RenderOptions, RenderResult } from "./types";

function httpsFeaturedUrl(content: CanonicalContent): string | undefined {
  const raw = content.pieceMetadata?.featuredImageUrl?.trim();
  return raw?.startsWith("https://") ? raw : undefined;
}

export const joomlaAdapter: CmsAdapter = {
  platform: "joomla",
  capabilities: {
    drafts: true,
    scheduling: false,
    updates: true,
    categories: true,
    featuredImage: true,
    schemaInjection: true,
    outputModes: getOutputModes("joomla").map((m) => m.value),
  },

  async render(content: CanonicalContent, opts?: RenderOptions): Promise<RenderResult> {
    const outputMode = resolveOutputMode({
      platform: "joomla",
      explicit: opts?.outputMode,
      creds: opts?.creds,
      entitlements: opts?.entitlements,
    });
    const result = await renderMarkdownHtmlPayload(
      content,
      shouldPreRenderHtml("joomla", opts?.creds, outputMode),
    );
    const featuredImageUrl = httpsFeaturedUrl(content);
    if (!featuredImageUrl || result.payload.kind !== "html") return result;
    return {
      ...result,
      payload: { ...result.payload, featuredImageUrl },
    };
  },

  async publish(creds: CmsIntegrationCredentials, payload: PlatformPayload, opts?: PublishOpts) {
    if (payload.kind !== "html") throw new Error("Invalid payload for Joomla adapter.");
    if (!creds.joomla) throw new Error("Joomla is not connected.");

    const status = mapPluginStatus(opts?.status);
    const markdown = payload.html;
    const title = payload.title;
    const tags = payload.meta?.tags ? payload.meta.tags.split(",").filter(Boolean) : [];
    const seo = seoFromHtmlPayload(payload);
    const joomlaMeta = mapSeoToJoomlaMeta(seo);
    const outputMode = creds.joomla.outputMode ?? "markdown";
    const useMarkdown = outputMode !== "html";
    const featuredImageUrl = payload.featuredImageUrl?.trim() || undefined;

    if (creds.joomla.connectionType === "plugin") {
      if (!creds.joomla.siteKey) throw new Error("Joomla plugin credentials are incomplete.");
      const result = await publishToGoalsAcPlugin(
        { siteUrl: creds.joomla.siteUrl, siteKey: creds.joomla.siteKey, platform: "joomla" },
        {
          title,
          content: markdown,
          status: status === "publish" ? "publish" : "draft",
          output_mode: outputMode,
          meta: mapSeoToPluginMeta(seo),
          seo: { ...seo, ...joomlaMeta } as Record<string, string | undefined>,
          ...(featuredImageUrl ? { featuredImageUrl } : {}),
        },
        { markdown: useMarkdown, idempotencyKey: opts?.idempotencyKey },
      );
      return { url: result.url, remoteId: result.remote_id };
    }

    if (!creds.joomla.apiToken) throw new Error("Joomla API credentials are incomplete.");
    const result = await publishToJoomla(
      { siteUrl: creds.joomla.siteUrl, apiToken: creds.joomla.apiToken },
      title,
      markdown,
      status === "publish" ? "publish" : "draft",
      creds.joomla.categoryId,
      payload.meta?.description,
      tags,
      featuredImageUrl,
    );
    return { url: result.url, remoteId: result.articleId };
  },
};
