import { publishToGoalsAcPlugin } from "@workspace/connectors/goals-ac-plugin";
import { publishToJoomla } from "@workspace/connectors/joomla";
import type { CanonicalContent } from "../canonical-content";
import type { CmsIntegrationCredentials } from "../support/cms-integrations";
import { getOutputModes } from "../support/platform-output-modes";
import { resolveOutputMode } from "../support/platform-output-modes";
import { mapSeoToJoomlaMeta, mapSeoToPluginMeta } from "../support/seo-field-mapper";
import { contentTagsFromCanonical } from "./adapter-helpers";
import {
  mapPluginStatus,
  renderMarkdownHtmlPayload,
  seoFromHtmlPayload,
  shouldPreRenderHtml,
} from "./plugin-shared";
import type { CmsAdapter, PlatformPayload, PublishOpts, RenderOptions, RenderResult } from "./types";

export const joomlaAdapter: CmsAdapter = {
  platform: "joomla",
  capabilities: {
    drafts: true,
    scheduling: false,
    updates: true,
    categories: true,
    featuredImage: false,
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
    return renderMarkdownHtmlPayload(content, shouldPreRenderHtml("joomla", opts?.creds, outputMode));
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
    );
    return { url: result.url, remoteId: result.articleId };
  },
};
