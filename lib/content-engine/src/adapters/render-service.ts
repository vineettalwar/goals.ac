import { buildCanonicalContent, type CanonicalContent } from "../content/canonical-content";
import type { PublishableContentPiece } from "../support/publishing/cms-publish";
import type { CmsIntegrationCredentials, WordPressEditorMode } from "../support/publishing/cms-integrations";
import { resolveOutputMode } from "../support/publishing/platform-output-modes";
import { resolvePublishEntitlements, type PublishEntitlements } from "../support/publishing/publish-entitlements";
import { getAdapter, getAdapterCapabilities } from "./registry";
import type { PlatformPayload, RenderOptions, RenderResult } from "./types";
import { prepareWordPressPayload } from "./wordpress-adapter";

export interface RenderPreviewResult {
  platform: string;
  payloadKind: PlatformPayload["kind"];
  previewHtml?: string;
  previewJson?: unknown;
  warnings: RenderResult["warnings"];
  capabilities: ReturnType<typeof getAdapterCapabilities>;
}

export interface RenderContentInput {
  piece: PublishableContentPiece;
  platform: string;
  creds?: CmsIntegrationCredentials;
  outputMode?: string;
  /** @deprecated Use outputMode */
  editorMode?: WordPressEditorMode;
  entitlements?: PublishEntitlements;
  status?: RenderOptions["status"];
}

function resolveRenderOutputMode(input: RenderContentInput, entitlements: PublishEntitlements): string {
  const pieceMeta = input.piece.pieceMetadata as { intendedOutputMode?: string; intendedEditorMode?: string } | null | undefined;
  const explicit = input.outputMode ?? input.editorMode;
  return resolveOutputMode({
    platform: input.platform,
    explicit,
    creds: input.creds,
    pieceIntended: pieceMeta?.intendedOutputMode ?? pieceMeta?.intendedEditorMode,
    entitlements,
  });
}

export async function renderContentForPlatform(input: RenderContentInput): Promise<RenderPreviewResult> {
  const content = buildCanonicalContent(input.piece);
  const entitlements = input.entitlements ?? resolvePublishEntitlements({ plan: "starter" });
  const adapter = getAdapter(input.platform);

  if (!adapter) {
    return {
      platform: input.platform,
      payloadKind: "html",
      warnings: [{ code: "no_adapter", message: `No render adapter for platform: ${input.platform}` }],
      capabilities: null,
    };
  }

  const outputMode = resolveRenderOutputMode(input, entitlements);
  const editorMode = (input.platform === "wordpress" ? outputMode : input.editorMode) as WordPressEditorMode | undefined;

  let renderResult: RenderResult;

  if (input.platform === "wordpress" && input.creds) {
    const prepared = await prepareWordPressPayload(content, input.creds, {
      outputMode,
      editorMode,
      entitlements,
      status: input.status,
    });
    renderResult = prepared.render;
  } else {
    renderResult = await adapter.render(content, {
      outputMode,
      editorMode,
      entitlements,
      status: input.status,
      creds: input.creds,
    });
  }

  return {
    platform: input.platform,
    payloadKind: renderResult.payload.kind,
    previewHtml: renderResult.previewHtml,
    previewJson: renderResult.previewJson,
    warnings: renderResult.warnings,
    capabilities: adapter.capabilities,
  };
}

export async function renderAndPublish(
  input: RenderContentInput & { creds: CmsIntegrationCredentials; idempotencyKey?: string },
): Promise<{ url: string; payload: PlatformPayload; warnings: RenderResult["warnings"] }> {
  const adapter = getAdapter(input.platform);
  if (!adapter) {
    throw new Error(`No adapter for platform: ${input.platform}`);
  }

  const entitlements = input.entitlements ?? resolvePublishEntitlements({ plan: "starter" });
  const content = buildCanonicalContent(input.piece);
  const outputMode = resolveRenderOutputMode(input, entitlements);
  const editorMode = (input.platform === "wordpress" ? outputMode : input.editorMode) as WordPressEditorMode | undefined;

  let renderResult: RenderResult;
  let featuredImageId: number | undefined;
  let featuredMediaId: number | undefined;

  if (input.platform === "wordpress") {
    const prepared = await prepareWordPressPayload(content, input.creds, {
      outputMode,
      editorMode,
      entitlements,
      status: input.status,
    });
    renderResult = prepared.render;
    featuredImageId = prepared.featuredImageId;
    featuredMediaId = prepared.featuredImageId;
  } else {
    renderResult = await adapter.render(content, {
      outputMode,
      editorMode,
      entitlements,
      status: input.status,
      creds: input.creds,
    });
  }

  const wpStatus =
    input.status === "draft" ? "draft" : input.status === "published" ? "published" : "publish";

  const remote = await adapter.publish(input.creds, renderResult.payload, {
    status: wpStatus,
    featuredImageId,
    featuredMediaId,
    idempotencyKey: input.idempotencyKey,
  });

  return { url: remote.url, payload: renderResult.payload, warnings: renderResult.warnings };
}

export type { CanonicalContent, PublishEntitlements, PlatformPayload, RenderResult };
