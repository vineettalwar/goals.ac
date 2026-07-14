import { publishToWebhook, type WebhookArticlePayload } from "@workspace/connectors/webhook";
import type { CanonicalContent } from "../content/canonical-content";
import type { CmsIntegrationCredentials } from "../support/publishing/cms-integrations";
import { getOutputModes, resolveOutputMode } from "../support/publishing/platform-output-modes";
import {
  contentTagsFromCanonical,
  resolveSeoFromCanonical,
} from "./adapter-helpers";
import { markdownToHtml } from "./markdown-html";
import type { CmsAdapter, PlatformPayload, PublishOpts, RenderOptions, RenderResult } from "./types";

function buildWebhookPayload(
  content: CanonicalContent,
  status: "draft" | "publish",
  outputMode: string,
  bodyHtml: string,
  includeCanonical: boolean,
): WebhookArticlePayload {
  const tags = contentTagsFromCanonical(content);
  const seo = resolveSeoFromCanonical(content);
  const base = {
    title: content.meta.title,
    slug: content.meta.slug,
    publishedStatus: status,
    keywords: tags,
    metaDescription: seo.metaDescription,
    faq: includeCanonical ? content.meta.faq : undefined,
    citations: includeCanonical ? content.meta.citations : undefined,
    jsonLd: includeCanonical ? content.meta.schemaOrg : undefined,
  };

  if (outputMode === "html") {
    return { ...base, bodyMarkdown: "", bodyHtml };
  }
  if (outputMode === "markdown") {
    return { ...base, bodyMarkdown: content.markdown };
  }
  return { ...base, bodyMarkdown: content.markdown, bodyHtml };
}

export const webhookAdapter: CmsAdapter = {
  platform: "webhook",
  capabilities: {
    drafts: true,
    scheduling: false,
    updates: false,
    categories: false,
    featuredImage: false,
    schemaInjection: false,
    outputModes: getOutputModes("webhook").map((m) => m.value),
  },

  async render(content: CanonicalContent, opts?: RenderOptions): Promise<RenderResult> {
    const entitlements = opts?.entitlements;
    const outputMode = resolveOutputMode({
      platform: "webhook",
      explicit: opts?.outputMode,
      creds: opts?.creds,
      entitlements,
    });
    const includeCanonical =
      outputMode === "full" || (opts?.entitlements?.webhookIncludeCanonical ?? false);
    const status = opts?.status === "draft" ? "draft" : "publish";
    const bodyHtml = await markdownToHtml(content.markdown);
    const webhookBody = buildWebhookPayload(content, status, outputMode, bodyHtml, includeCanonical);

    if (includeCanonical) {
      webhookBody.canonical = {
        id: content.id,
        markdown: content.markdown,
        meta: content.meta as unknown as Record<string, unknown>,
        formatType: content.formatType,
      };
    }

    const payload: PlatformPayload = {
      kind: "webhook",
      event: "article.publish",
      body: webhookBody,
    };

    return {
      payload,
      warnings: [],
      previewHtml: bodyHtml,
      previewJson: webhookBody,
    };
  },

  async publish(creds: CmsIntegrationCredentials, payload: PlatformPayload, _opts?: PublishOpts) {
    if (!creds.webhook) {
      throw new Error("Webhook is not connected.");
    }
    if (payload.kind !== "webhook") {
      throw new Error("Invalid payload for webhook adapter.");
    }
    await publishToWebhook(creds.webhook, payload.body);
    return { url: creds.webhook.url };
  },
};
