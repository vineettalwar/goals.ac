import { publishToFramer } from "@workspace/connectors/framer";
import { publishToHubSpot } from "@workspace/connectors/hubspot";
import { publishToSquarespace } from "@workspace/connectors/squarespace";
import { publishToWix } from "@workspace/connectors/wix";
import type { CanonicalContent } from "../canonical-content";
import type { CmsIntegrationCredentials } from "../support/cms-integrations";
import { resolveSeoFromCanonical, seoTitle } from "./adapter-helpers";
import { markdownToHtml } from "./markdown-html";
import type { AdapterCapabilities, CmsAdapter, PlatformPayload, PublishOpts, RenderResult } from "./types";

type HtmlPublishPlatform = "wix" | "framer" | "squarespace" | "hubspot";

const CAPABILITIES: Record<HtmlPublishPlatform, AdapterCapabilities> = {
  wix: { drafts: true, scheduling: false, updates: false, categories: false, featuredImage: false, schemaInjection: false },
  framer: { drafts: true, scheduling: false, updates: false, categories: false, featuredImage: false, schemaInjection: false },
  squarespace: { drafts: true, scheduling: false, updates: false, categories: false, featuredImage: false, schemaInjection: false },
  hubspot: { drafts: true, scheduling: false, updates: true, categories: false, featuredImage: false, schemaInjection: false },
};

function mapStatus(status?: PublishOpts["status"]): "draft" | "published" {
  return status === "published" || status === "publish" ? "published" : "draft";
}

function createMarkdownPublishAdapter(platform: HtmlPublishPlatform): CmsAdapter {
  return {
    platform,
    capabilities: CAPABILITIES[platform],

    async render(content: CanonicalContent): Promise<RenderResult> {
      const html = await markdownToHtml(content.markdown);
      const seo = resolveSeoFromCanonical(content);
      return {
        payload: {
          kind: "html",
          html: content.markdown,
          title: seoTitle(content, seo),
          meta: seo.metaDescription ? { description: seo.metaDescription } : undefined,
        },
        warnings: [],
        previewHtml: html,
      };
    },

    async publish(creds: CmsIntegrationCredentials, payload: PlatformPayload, opts?: PublishOpts) {
      if (payload.kind !== "html") throw new Error(`Invalid payload for ${platform} adapter.`);
      const status = mapStatus(opts?.status);
      const markdown = payload.html;

      if (platform === "wix") {
        if (!creds.wix) throw new Error("Wix is not connected.");
        const result = await publishToWix(creds.wix, payload.title, markdown, status);
        return { url: result.url, remoteId: result.postId };
      }
      if (platform === "framer") {
        if (!creds.framer) throw new Error("Framer is not connected.");
        const result = await publishToFramer(creds.framer, payload.title, markdown, status);
        return { url: result.url, remoteId: result.itemId };
      }
      if (platform === "squarespace") {
        if (!creds.squarespace) throw new Error("Squarespace is not connected.");
        const result = await publishToSquarespace(creds.squarespace, payload.title, markdown, status);
        return { url: result.url, remoteId: result.postId };
      }
      if (platform === "hubspot") {
        if (!creds.hubspot) throw new Error("HubSpot is not connected.");
        const result = await publishToHubSpot(creds.hubspot, payload.title, markdown, status);
        return { url: result.url, remoteId: result.postId };
      }
      throw new Error(`Unsupported platform: ${platform}`);
    },
  };
}

export const wixAdapter = createMarkdownPublishAdapter("wix");
export const framerAdapter = createMarkdownPublishAdapter("framer");
export const squarespaceAdapter = createMarkdownPublishAdapter("squarespace");
export const hubspotAdapter = createMarkdownPublishAdapter("hubspot");
