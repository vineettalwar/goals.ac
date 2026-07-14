import type { CanonicalContent } from "../canonical-content";
import type { CanonicalSeoFields } from "../support/seo-field-mapper";
import { contentTagsFromCanonical, resolveSeoFromCanonical, seoTitle } from "./adapter-helpers";
import { markdownToHtml } from "./markdown-html";
import type { PlatformPayload, PublishOpts, RenderOptions, RenderResult } from "./types";

export function mapPluginStatus(status?: PublishOpts["status"]): "draft" | "published" | "publish" {
  if (status === "draft") return "draft";
  if (status === "publish") return "publish";
  return "published";
}

export async function renderMarkdownHtmlPayload(
  content: CanonicalContent,
  preRenderHtml = false,
): Promise<RenderResult> {
  const html = await markdownToHtml(content.markdown);
  const seo = resolveSeoFromCanonical(content);
  const tags = contentTagsFromCanonical(content);
  return {
    payload: {
      kind: "html",
      html: preRenderHtml ? html : content.markdown,
      title: seoTitle(content, seo),
      meta: {
        ...(seo.metaDescription ? { description: seo.metaDescription } : {}),
        tags: tags.join(","),
        seoTitle: seo.seoTitle ?? content.meta.title,
      },
    },
    warnings: [],
    previewHtml: html,
  };
}

export function seoFromHtmlPayload(payload: PlatformPayload): CanonicalSeoFields {
  if (payload.kind !== "html") return {};
  return {
    seoTitle: payload.meta?.seoTitle ?? payload.title,
    metaDescription: payload.meta?.description,
  };
}

export function shouldPreRenderHtml(
  platform: string,
  creds: RenderOptions["creds"],
  outputMode?: string,
): boolean {
  const mode = outputMode ?? getCredsOutputMode(platform, creds);
  return mode === "html" || mode === "body_html" || mode === "body_text" || mode === "article_html";
}

function getCredsOutputMode(platform: string, creds?: RenderOptions["creds"]): string | undefined {
  if (!creds) return undefined;
  if (platform === "joomla") return creds.joomla?.outputMode;
  if (platform === "drupal") return creds.drupal?.outputMode;
  if (platform === "shopify") return creds.shopify?.outputMode;
  if (platform === "typo3") return creds.typo3?.outputMode;
  return undefined;
}
