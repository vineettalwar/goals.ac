import { prepareWordPressImages } from "@workspace/connectors/wordpress-images";
import { publishToWordPress } from "@workspace/connectors/wordpress";
import { publishToGoalsAcPlugin } from "@workspace/connectors/goals-ac-plugin";
import type { CanonicalContent } from "../content/canonical-content";
import type { CmsIntegrationCredentials, WordPressEditorMode } from "../support/publishing/cms-integrations";
import { resolveWordPressConnectionType } from "../support/publishing/cms-integrations";
import { resolveOutputMode, assertOutputModeAllowed } from "../support/publishing/platform-output-modes";
import {
  contentTagsFromCanonical,
  mapSeoToPluginMeta,
  mapSeoToWordPressRestMeta,
  resolveSeoFromCanonical,
  seoTitle,
} from "./adapter-helpers";
import { markdownToDiviShortcodes } from "./divi";
import { markdownToElementorData } from "./elementor";
import { markdownToGutenbergBlocks } from "./gutenberg";
import { markdownToHtml } from "./markdown-html";
import type { CmsAdapter, PlatformPayload, PublishOpts, RenderOptions, RenderResult } from "./types";

async function renderWordPressContent(
  content: CanonicalContent,
  editorMode: WordPressEditorMode,
): Promise<{ content: string; elementorData?: string; warnings: RenderResult["warnings"] }> {
  const warnings: RenderResult["warnings"] = [];

  switch (editorMode) {
    case "gutenberg": {
      const blocks = markdownToGutenbergBlocks(content.markdown);
      return { content: blocks, warnings };
    }
    case "elementor": {
      const el = await markdownToElementorData(content.markdown, content.meta.title);
      return { content: el.content, elementorData: el.elementorData, warnings };
    }
    case "divi": {
      const divi = await markdownToDiviShortcodes(content.markdown);
      return { content: divi, warnings };
    }
    case "classic":
    default: {
      const html = await markdownToHtml(content.markdown);
      return { content: html, warnings };
    }
  }
}

export const wordpressAdapter: CmsAdapter = {
  platform: "wordpress",
  capabilities: {
    drafts: true,
    scheduling: true,
    updates: true,
    categories: true,
    featuredImage: true,
    schemaInjection: true,
    editorModes: ["classic", "gutenberg", "elementor", "divi"],
    outputModes: ["classic", "gutenberg", "elementor", "divi"],
  },

  async render(content: CanonicalContent, opts?: RenderOptions): Promise<RenderResult> {
    const requestedMode = (opts?.outputMode ?? opts?.editorMode ?? "classic") as WordPressEditorMode;
    const editorMode = opts?.entitlements
      ? (assertOutputModeAllowed(requestedMode, "wordpress", opts.entitlements) as WordPressEditorMode)
      : requestedMode;

    const warnings: RenderResult["warnings"] = [];
    if (editorMode !== requestedMode) {
      warnings.push({
        code: "editor_mode_downgraded",
        message: `${requestedMode} mode requires BYOK or Growth plan — using classic HTML instead.`,
      });
    }

    const rendered = await renderWordPressContent(content, editorMode);
    warnings.push(...rendered.warnings);

    const seo = resolveSeoFromCanonical(content);
    const meta = mapSeoToWordPressRestMeta(seo);

    const payload: PlatformPayload = {
      kind: "wordpress",
      editorMode,
      content: rendered.content,
      title: seoTitle(content, seo),
      meta,
      elementorData: rendered.elementorData,
      tags: contentTagsFromCanonical(content),
    };

    const previewHtml =
      editorMode === "classic" || editorMode === "elementor"
        ? rendered.content
        : undefined;

    return {
      payload,
      warnings,
      previewHtml,
      previewJson: { editorMode, title: payload.title, contentLength: rendered.content.length },
    };
  },

  async publish(
    creds: CmsIntegrationCredentials,
    payload: PlatformPayload,
    opts?: PublishOpts,
  ) {
    if (!creds.wordpress) {
      throw new Error("WordPress is not connected.");
    }
    if (payload.kind !== "wordpress") {
      throw new Error("Invalid payload for WordPress adapter.");
    }

    const status = opts?.status === "draft" ? "draft" : "publish";
    const connectionType = resolveWordPressConnectionType(creds.wordpress);
    const seo = resolveSeoFromCanonical({ meta: { title: payload.title }, markdown: "", id: "" });

    if (connectionType === "plugin") {
      if (!creds.wordpress.siteKey) {
        throw new Error("WordPress plugin credentials are incomplete.");
      }
      const pluginCreds = {
        siteUrl: creds.wordpress.siteUrl,
        siteKey: creds.wordpress.siteKey,
        platform: "wordpress" as const,
      };

      const result = await publishToGoalsAcPlugin(
        pluginCreds,
        {
          title: payload.title,
          content: payload.content,
          status: status === "publish" ? "publish" : "draft",
          tags: payload.tags,
          featured_image_id: opts?.featuredImageId,
          meta: mapSeoToPluginMeta(seo),
          seo: seo as Record<string, string | undefined>,
          editor_mode: payload.editorMode,
          output_mode: payload.editorMode,
          elementor_data: payload.elementorData,
        },
        {
          markdown: false,
          idempotencyKey: opts?.idempotencyKey,
        },
      );
      return { url: result.url, remoteId: result.remote_id };
    }

    if (!creds.wordpress.username || !creds.wordpress.appPassword) {
      throw new Error("WordPress API credentials are incomplete.");
    }

    const wpMeta = payload.meta;
    const result = await publishToWordPress(
      {
        siteUrl: creds.wordpress.siteUrl,
        username: creds.wordpress.username,
        appPassword: creds.wordpress.appPassword,
      },
      payload.title,
      payload.content,
      status,
      seo.metaDescription,
      undefined,
      Object.keys(wpMeta).length > 0 ? wpMeta : undefined,
      { featuredMediaId: opts?.featuredMediaId, htmlContent: payload.content },
    );
    return { url: result.url };
  },
};

/** Prepare images and re-render WordPress payload with hosted URLs. */
export async function prepareWordPressPayload(
  content: CanonicalContent,
  creds: CmsIntegrationCredentials,
  renderOpts?: RenderOptions,
): Promise<{ render: RenderResult; featuredImageId?: number; hostedOgUrl?: string; updatedContent?: CanonicalContent }> {
  const render = await wordpressAdapter.render(content, renderOpts);
  if (render.payload.kind !== "wordpress") return { render };

  const hasImages = (content.pieceMetadata?.images?.length ?? 0) > 0;
  if (!hasImages || !creds.wordpress) return { render };

  const keyword = content.targetKeyword ?? content.meta.title;
  const connectionType = resolveWordPressConnectionType(creds.wordpress);

  if (connectionType === "plugin" && creds.wordpress.siteKey) {
    const prepared = await prepareWordPressImages({
      bodyMarkdown: content.markdown,
      targetKeyword: keyword,
      images: content.pieceMetadata?.images,
      pluginCreds: {
        siteUrl: creds.wordpress.siteUrl,
        siteKey: creds.wordpress.siteKey,
        platform: "wordpress",
      },
    });
    const updatedContent: CanonicalContent = {
      ...content,
      markdown: prepared.bodyMarkdown,
      pieceMetadata: prepared.updatedImages
        ? {
            ...content.pieceMetadata,
            images: prepared.updatedImages,
            featuredImageUrl: prepared.featuredHostedUrl ?? content.pieceMetadata?.featuredImageUrl,
            ogImageUrl: prepared.featuredHostedUrl ?? content.pieceMetadata?.ogImageUrl,
          }
        : content.pieceMetadata,
    };
    const rerender = await wordpressAdapter.render(updatedContent, renderOpts);
    return {
      render: rerender,
      featuredImageId: prepared.featuredImageId,
      hostedOgUrl: prepared.featuredHostedUrl,
      updatedContent,
    };
  }

  if (creds.wordpress.username && creds.wordpress.appPassword) {
    const prepared = await prepareWordPressImages({
      bodyMarkdown: content.markdown,
      targetKeyword: keyword,
      images: content.pieceMetadata?.images,
      wpCreds: {
        siteUrl: creds.wordpress.siteUrl,
        username: creds.wordpress.username,
        appPassword: creds.wordpress.appPassword,
      },
    });
    const updatedContent: CanonicalContent = {
      ...content,
      markdown: prepared.bodyMarkdown,
      pieceMetadata: prepared.updatedImages
        ? {
            ...content.pieceMetadata,
            images: prepared.updatedImages,
            featuredImageUrl: prepared.featuredHostedUrl ?? content.pieceMetadata?.featuredImageUrl,
            ogImageUrl: prepared.featuredHostedUrl ?? content.pieceMetadata?.ogImageUrl,
          }
        : content.pieceMetadata,
    };
    const rerender = await wordpressAdapter.render(updatedContent, renderOpts);
    return {
      render: rerender,
      featuredImageId: prepared.featuredImageId,
      hostedOgUrl: prepared.featuredHostedUrl,
      updatedContent,
    };
  }

  return { render };
}
