import { markdownToNotionBlocks, publishToNotion } from "@workspace/connectors/notion";
import type { CanonicalContent } from "../content/canonical-content";
import type { CmsIntegrationCredentials } from "../support/publishing/cms-integrations";
import type { CmsAdapter, PlatformPayload, PublishOpts, RenderResult } from "./types";

export const notionAdapter: CmsAdapter = {
  platform: "notion",
  capabilities: {
    drafts: true,
    scheduling: false,
    updates: false,
    categories: false,
    featuredImage: true,
    schemaInjection: false,
  },

  async render(content: CanonicalContent): Promise<RenderResult> {
    const blocks = markdownToNotionBlocks(content.markdown);
    const warnings: RenderResult["warnings"] = [];

    const omittedImages = [...content.markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].filter(
      (m) => !m[1]!.trim().startsWith("https://"),
    ).length;
    if (omittedImages > 0) {
      warnings.push({
        code: "notion_images_omitted",
        message: `${omittedImages} image(s) omitted — Notion only supports https:// image URLs.`,
      });
    }

    const featuredRaw = content.pieceMetadata?.featuredImageUrl?.trim();
    const coverUrl = featuredRaw?.startsWith("https://") ? featuredRaw : undefined;

    if (featuredRaw && !coverUrl) {
      warnings.push({
        code: "notion_featured_skipped",
        message: `Featured image skipped — not an https:// URL.`,
      });
    }

    if (blocks.length > 100) {
      warnings.push({
        code: "notion_block_limit",
        message: `Notion allows 100 blocks per request; ${blocks.length} blocks will be truncated.`,
      });
    }

    return {
      payload: {
        kind: "notion_blocks",
        blocks: blocks.slice(0, 100),
        title: content.meta.title,
        coverUrl,
      },
      warnings,
      previewJson: { title: content.meta.title, blockCount: blocks.length, coverUrl },
    };
  },

  async publish(creds: CmsIntegrationCredentials, payload: PlatformPayload, opts?: PublishOpts) {
    if (!creds.notion) {
      throw new Error("Notion is not connected.");
    }
    if (payload.kind !== "notion_blocks") {
      throw new Error("Invalid payload for Notion adapter.");
    }
    const status = opts?.status === "published" || opts?.status === "publish" ? "published" : "draft";
    const url = await publishToNotion(
      creds.notion.integrationToken,
      creds.notion.databaseId,
      payload.title,
      "",
      { status, blocks: payload.blocks, coverUrl: payload.coverUrl },
    );
    return { url };
  },
};
