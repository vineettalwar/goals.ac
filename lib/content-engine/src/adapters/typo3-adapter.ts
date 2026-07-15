import {
  decodeRasterFeaturedDataUri,
  isRasterFeaturedDataUri,
} from "@workspace/connectors/wordpress-images";
import { publishToTypo3 } from "@workspace/connectors/typo3";
import { uploadGoalsAcPluginMedia } from "@workspace/connectors/goals-ac-plugin";
import type { CanonicalContent } from "../content/canonical-content";
import type { CmsIntegrationCredentials } from "../support/publishing/cms-integrations";
import { getOutputModes, resolveOutputMode } from "../support/publishing/platform-output-modes";
import { mapSeoToPluginMeta } from "../support/publishing/seo-field-mapper";
import {
  contentTagsFromCanonical,
  resolveSeoFromCanonical,
  seoTitle,
} from "./adapter-helpers";
import { markdownToHtml } from "./markdown-html";
import { mapPluginStatus } from "./plugin-shared";
import {
  markdownToTypo3ContentElements,
  prependTypo3FeaturedBase64,
  prependTypo3FeaturedUrl,
} from "./typo3-content-elements";
import type {
  CmsAdapter,
  PlatformPayload,
  PublishOpts,
  RenderOptions,
  RenderResult,
  Typo3ContentElement,
} from "./types";

type Typo3OutputMode = "body_text" | "content_elements";

/**
 * Prefer hosting the featured image via `/media` so the content publish
 * payload carries a URL instead of inline base64. Returns null on any
 * failure (e.g. older plugin installs without `/media`) — caller falls
 * back to embedding base64 directly.
 */
async function uploadTypo3FeaturedMedia(
  creds: { siteUrl: string; siteKey: string },
  decoded: { buffer: Buffer; mimeHint: "image/png" | "image/jpeg" },
  title: string,
): Promise<string | null> {
  try {
    const ext = decoded.mimeHint === "image/png" ? "png" : "jpg";
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "featured";
    const uploaded = await uploadGoalsAcPluginMedia(
      { siteUrl: creds.siteUrl, siteKey: creds.siteKey, platform: "typo3" },
      {
        filename: `${slug}.${ext}`,
        mimeType: decoded.mimeHint,
        dataBase64: decoded.buffer.toString("base64"),
        alt: title,
        title,
      },
    );
    return uploaded.sourceUrl || null;
  } catch {
    return null;
  }
}

export const typo3Adapter: CmsAdapter = {
  platform: "typo3",
  capabilities: {
    drafts: true,
    scheduling: false,
    updates: true,
    categories: false,
    featuredImage: false,
    schemaInjection: true,
    outputModes: getOutputModes("typo3").map((m) => m.value),
  },

  async render(content: CanonicalContent, opts?: RenderOptions): Promise<RenderResult> {
    const outputMode = resolveOutputMode({
      platform: "typo3",
      explicit: opts?.outputMode,
      creds: opts?.creds,
      entitlements: opts?.entitlements,
    }) as Typo3OutputMode;

    const seo = resolveSeoFromCanonical(content);
    const title = seoTitle(content, seo);
    const warnings: RenderResult["warnings"] = [];
    const requested = opts?.outputMode ?? opts?.creds?.typo3?.outputMode;
    if (requested && requested !== outputMode) {
      warnings.push({
        code: "output_mode_downgraded",
        message: `${requested} mode requires BYOK or Growth plan — using body_text instead.`,
      });
    }

    if (outputMode === "content_elements") {
      let contentElements = markdownToTypo3ContentElements(content.markdown);
      const featuredRaw = content.pieceMetadata?.featuredImageUrl?.trim();
      if (isRasterFeaturedDataUri(featuredRaw)) {
        const decoded = decodeRasterFeaturedDataUri(featuredRaw!);
        if (decoded) {
          const typo3Creds = opts?.creds?.typo3;
          const hostedUrl =
            typo3Creds?.siteUrl && typo3Creds?.siteKey
              ? await uploadTypo3FeaturedMedia(typo3Creds, decoded, title)
              : null;
          contentElements = hostedUrl
            ? prependTypo3FeaturedUrl(contentElements, { url: hostedUrl, alt: title })
            : prependTypo3FeaturedBase64(contentElements, {
                imageBase64: decoded.buffer.toString("base64"),
                imageMime: decoded.mimeHint,
                alt: title,
              });
        }
      }
      const payload: PlatformPayload = {
        kind: "typo3",
        outputMode: "content_elements",
        title,
        contentElements,
        meta: seo.metaDescription ? { description: seo.metaDescription } : undefined,
      };
      const previewHtml = await markdownToHtml(content.markdown);
      return {
        payload,
        warnings,
        previewHtml,
        previewJson: { outputMode, elementCount: contentElements.length, contentElements },
      };
    }

    const html = await markdownToHtml(content.markdown);
    const payload: PlatformPayload = {
      kind: "typo3",
      outputMode: "body_text",
      title,
      content: html,
      meta: {
        ...(seo.metaDescription ? { description: seo.metaDescription } : {}),
        tags: contentTagsFromCanonical(content).join(","),
        seoTitle: seo.seoTitle ?? content.meta.title,
      },
    };

    return {
      payload,
      warnings,
      previewHtml: html,
      previewJson: { outputMode, contentLength: html.length },
    };
  },

  async publish(creds: CmsIntegrationCredentials, payload: PlatformPayload, opts?: PublishOpts) {
    if (!creds.typo3) throw new Error("TYPO3 is not connected.");
    if (payload.kind !== "typo3") throw new Error("Invalid payload for TYPO3 adapter.");

    const status = mapPluginStatus(opts?.status);
    const outputMode = payload.outputMode;
    const seo = {
      seoTitle: payload.meta?.seoTitle ?? payload.title,
      metaDescription: payload.meta?.description,
    };

    const result = await publishToTypo3(
      creds.typo3,
      {
        title: payload.title,
        content: payload.content ?? "",
        status: status === "publish" ? "published" : "draft",
        outputMode,
        contentElements: payload.contentElements as Typo3ContentElement[] | undefined,
        meta: mapSeoToPluginMeta(seo),
      },
      {
        markdown: false,
        idempotencyKey: opts?.idempotencyKey,
      },
    );

    return { url: result.url, remoteId: result.postId };
  },
};
