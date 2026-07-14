import { publishToWebflow, type WebflowPublishStatus } from "@workspace/connectors/webflow";
import type { CanonicalContent } from "../canonical-content";
import type { CmsIntegrationCredentials } from "../support/cms-integrations";
import { resolveSeoFromCanonical, seoTitle } from "./adapter-helpers";
import { markdownToHtml } from "./markdown-html";
import type { CmsAdapter, PlatformPayload, PublishOpts, RenderResult } from "./types";

export const webflowAdapter: CmsAdapter = {
  platform: "webflow",
  capabilities: {
    drafts: true,
    scheduling: false,
    updates: false,
    categories: false,
    featuredImage: false,
    schemaInjection: false,
  },

  async render(content: CanonicalContent): Promise<RenderResult> {
    const html = await markdownToHtml(content.markdown);
    const seo = resolveSeoFromCanonical(content);
    return {
      payload: { kind: "html", html, title: seoTitle(content, seo) },
      warnings: [],
      previewHtml: html,
    };
  },

  async publish(creds: CmsIntegrationCredentials, payload: PlatformPayload, opts?: PublishOpts) {
    if (!creds.webflow) throw new Error("Webflow is not connected.");
    if (payload.kind !== "html") throw new Error("Invalid payload for Webflow adapter.");
    let publishStatus: WebflowPublishStatus = creds.webflow.publishStatus ?? "draft";
    if (opts?.status === "publish" || opts?.status === "published") publishStatus = "live";
    if (opts?.status === "draft") publishStatus = "draft";

    const url = await publishToWebflow(
      creds.webflow.apiToken,
      creds.webflow.collectionId,
      creds.webflow.bodyFieldSlug,
      payload.title,
      "",
      { publishStatus, htmlContent: payload.html },
    );
    return { url };
  },
};
