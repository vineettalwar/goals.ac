import { publishToGhost, publishToGhostLexical } from "@workspace/connectors/ghost";
import type { CanonicalContent } from "../content/canonical-content";
import type { CmsIntegrationCredentials } from "../support/publishing/cms-integrations";
import { getOutputModes, resolveOutputMode } from "../support/publishing/platform-output-modes";
import { resolveSeoFromCanonical, seoTitle } from "./adapter-helpers";
import { markdownToGhostLexical } from "./ghost-lexical";
import { markdownToHtml } from "./markdown-html";
import type { CmsAdapter, PlatformPayload, PublishOpts, RenderOptions, RenderResult } from "./types";

export const ghostAdapter: CmsAdapter = {
  platform: "ghost",
  capabilities: {
    drafts: true,
    scheduling: false,
    updates: false,
    categories: false,
    featuredImage: true,
    schemaInjection: false,
    outputModes: getOutputModes("ghost").map((m) => m.value),
  },

  async render(content: CanonicalContent, opts?: RenderOptions): Promise<RenderResult> {
    const requestedMode = (opts?.outputMode ?? opts?.creds?.ghost?.outputMode ?? "html") as "html" | "lexical";
    const outputMode = resolveOutputMode({
      platform: "ghost",
      explicit: requestedMode,
      creds: opts?.creds,
      entitlements: opts?.entitlements,
    }) as "html" | "lexical";

    const warnings: RenderResult["warnings"] = [];
    if (outputMode === "html" && requestedMode === "lexical") {
      warnings.push({
        code: "output_mode_downgraded",
        message: "Lexical mode requires BYOK or Growth plan — using HTML instead.",
      });
    }

    const seo = resolveSeoFromCanonical(content);
    const title = seoTitle(content, seo);
    const meta = seo.metaDescription ? { description: seo.metaDescription } : undefined;
    const featuredImageUrl = content.pieceMetadata?.featuredImageUrl?.trim() || undefined;

    if (outputMode === "lexical") {
      const lexicalDoc = markdownToGhostLexical(content.markdown);
      const lexical = JSON.stringify(lexicalDoc);
      return {
        payload: {
          kind: "ghost",
          outputMode: "lexical",
          title,
          lexical,
          meta,
          featuredImageUrl,
        },
        warnings,
        previewJson: lexicalDoc,
      };
    }

    const html = await markdownToHtml(content.markdown);
    return {
      payload: {
        kind: "ghost",
        outputMode: "html",
        title,
        html,
        meta,
        featuredImageUrl,
      },
      warnings,
      previewHtml: html,
    };
  },

  async publish(creds: CmsIntegrationCredentials, payload: PlatformPayload, opts?: PublishOpts) {
    if (!creds.ghost) throw new Error("Ghost is not connected.");
    if (payload.kind !== "ghost") throw new Error("Invalid payload for Ghost adapter.");

    const status = opts?.status === "published" || opts?.status === "publish" ? "published" : "draft";
    const tags: string[] = [];

    if (payload.outputMode === "lexical") {
      if (!payload.lexical) throw new Error("Ghost lexical payload is missing content.");
      const result = await publishToGhostLexical(
        creds.ghost,
        payload.title,
        payload.lexical,
        status,
        payload.meta?.description,
        tags,
        payload.featuredImageUrl,
      );
      return { url: result.url };
    }

    if (!payload.html) throw new Error("Ghost HTML payload is missing content.");
    const result = await publishToGhost(
      creds.ghost,
      payload.title,
      "",
      status,
      payload.meta?.description,
      tags,
      payload.html,
      payload.featuredImageUrl,
    );
    return { url: result.url };
  },
};
