import { publishToDrupal } from "@workspace/connectors/drupal";
import { publishToGoalsAcPlugin } from "@workspace/connectors/goals-ac-plugin";
import type { CanonicalContent } from "../content/canonical-content";
import type { CmsIntegrationCredentials } from "../support/publishing/cms-integrations";
import { getOutputModes, resolveOutputMode } from "../support/publishing/platform-output-modes";
import { mapSeoToPluginMeta } from "../support/publishing/seo-field-mapper";
import { contentTagsFromCanonical, resolveSeoFromCanonical, seoTitle } from "./adapter-helpers";
import { markdownToDrupalLayoutSections } from "./drupal-layout-builder";
import { markdownToHtml } from "./markdown-html";
import { mapPluginStatus } from "./plugin-shared";
import type { CmsAdapter, PlatformPayload, PublishOpts, RenderOptions, RenderResult } from "./types";

function seoFromDrupalPayload(payload: PlatformPayload) {
  if (payload.kind !== "drupal") return {};
  return {
    seoTitle: payload.meta?.seoTitle ?? payload.title,
    metaDescription: payload.meta?.description,
  };
}

export const drupalAdapter: CmsAdapter = {
  platform: "drupal",
  capabilities: {
    drafts: true,
    scheduling: false,
    updates: true,
    categories: true,
    featuredImage: false,
    schemaInjection: true,
    outputModes: getOutputModes("drupal").map((m) => m.value),
  },

  async render(content: CanonicalContent, opts?: RenderOptions): Promise<RenderResult> {
    const outputMode = resolveOutputMode({
      platform: "drupal",
      explicit: opts?.outputMode,
      creds: opts?.creds,
      entitlements: opts?.entitlements,
    }) as "body_html" | "layout_builder";

    const seo = resolveSeoFromCanonical(content);
    const tags = contentTagsFromCanonical(content);
    const title = seoTitle(content, seo);
    const previewHtml = await markdownToHtml(content.markdown);
    const meta = {
      ...(seo.metaDescription ? { description: seo.metaDescription } : {}),
      seoTitle: seo.seoTitle ?? content.meta.title,
    };

    if (outputMode === "layout_builder") {
      const sections = await markdownToDrupalLayoutSections(content.markdown);
      return {
        payload: {
          kind: "drupal",
          outputMode: "layout_builder",
          title,
          layout: { sections },
          meta,
          tags,
        },
        warnings: [],
        previewHtml,
        previewJson: { outputMode, sectionCount: sections.length },
      };
    }

    const html = await markdownToHtml(content.markdown);
    return {
      payload: {
        kind: "drupal",
        outputMode: "body_html",
        title,
        content: html,
        meta: { ...meta, tags: tags.join(",") },
        tags,
      },
      warnings: [],
      previewHtml: html,
    };
  },

  async publish(creds: CmsIntegrationCredentials, payload: PlatformPayload, opts?: PublishOpts) {
    if (payload.kind !== "drupal") throw new Error("Invalid payload for Drupal adapter.");
    if (!creds.drupal) throw new Error("Drupal is not connected.");

    const status = mapPluginStatus(opts?.status);
    const seo = seoFromDrupalPayload(payload);
    const tags = payload.tags ?? (payload.meta?.tags ? payload.meta.tags.split(",").filter(Boolean) : []);

    if (creds.drupal.connectionType === "plugin") {
      if (!creds.drupal.siteKey) throw new Error("Drupal plugin credentials are incomplete.");

      const result = await publishToGoalsAcPlugin(
        { siteUrl: creds.drupal.siteUrl, siteKey: creds.drupal.siteKey, platform: "drupal" },
        {
          title: payload.title,
          content: payload.outputMode === "body_html" ? (payload.content ?? "") : "",
          status: status === "publish" ? "publish" : status,
          tags,
          output_mode: payload.outputMode,
          meta: mapSeoToPluginMeta(seo),
          seo: seo as Record<string, string | undefined>,
          ...(payload.outputMode === "layout_builder" && payload.layout
            ? {
                layout: payload.layout,
                layout_storage_field: "layout_builder__layout",
              }
            : {}),
        },
        { markdown: false, idempotencyKey: opts?.idempotencyKey },
      );
      return { url: result.url, remoteId: result.remote_id };
    }

    if (payload.outputMode === "layout_builder") {
      throw new Error("Layout Builder mode requires the goals.ac Drupal plugin.");
    }

    const result = await publishToDrupal(
      {
        siteUrl: creds.drupal.siteUrl,
        authType: creds.drupal.authType ?? "basic",
        username: creds.drupal.username,
        password: creds.drupal.password,
        accessToken: creds.drupal.accessToken,
      },
      payload.title,
      payload.content ?? "",
      status === "publish" ? "published" : "draft",
      creds.drupal.contentType ?? "article",
      payload.meta?.description,
      tags,
    );
    return { url: result.url, remoteId: result.nodeId };
  },
};
