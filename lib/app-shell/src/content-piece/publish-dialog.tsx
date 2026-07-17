import { useEffect, useState } from "react";
import { AlertCircle, Eye, Loader2, Send, X } from "lucide-react";
import { ContentExportPanel } from "./content-export-panel";
import {
  getConnectedDestinationsForFormat,
  getConnectionSummary,
  type CmsConnectionSnapshot,
  type ContentFormatType,
  type PublishDestinationId,
} from "./publish-destinations";
import { sanitizePreviewHtml } from "./sanitize-preview-html";
import {
  readShopifyThemeSnippetRequiredFor,
  shopifyOutputModeNeedsThemeSnippet,
  ShopifyThemeSnippetPreflight,
} from "./shopify-theme-snippet-preflight";
import {
  hasRasterDataImage,
  readTypo3MediaUploadCapable,
  Typo3MediaPreflight,
  NotionWebflowMediaPreflight,
} from "./typo3-media-preflight";

function isPublicHttpsImage(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export type RenderPreviewResult = {
  payloadKind?: string;
  previewHtml?: string | null;
  previewJson?: unknown;
  warnings?: Array<{ code?: string; message: string }>;
};

export function ContentPiecePublishDialog({
  open,
  onClose,
  formatType,
  loadConnections,
  onPublish,
  onRenderPreview,
  pieceTitle,
  pieceBodyMarkdown,
  pieceFeaturedImageUrl,
  publishing = false,
  integrationsHref,
  shopifyThemeLearnHref,
  plannedDate,
}: {
  open: boolean;
  onClose: () => void;
  formatType: string;
  loadConnections: () => Promise<CmsConnectionSnapshot>;
  onPublish: (platform: PublishDestinationId) => void | Promise<void>;
  onRenderPreview?: (platform: PublishDestinationId) => Promise<RenderPreviewResult>;
  pieceTitle?: string | null;
  pieceBodyMarkdown?: string | null;
  pieceFeaturedImageUrl?: string | null;
  publishing?: boolean;
  /** Link target when no CMS destinations are connected (e.g. /integrations). */
  integrationsHref?: string;
  /** Learn path for Shopify theme snippet install. */
  shopifyThemeLearnHref?: string;
  plannedDate?: string | null;
}) {
  const [platform, setPlatform] = useState<PublishDestinationId>("wordpress");
  const [connections, setConnections] = useState<CmsConnectionSnapshot | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [platformInitialized, setPlatformInitialized] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RenderPreviewResult | null>(null);
  const [shopifyThemeSnippetAck, setShopifyThemeSnippetAck] = useState(false);
  const [typo3MediaUploadAck, setTypo3MediaUploadAck] = useState(false);
  const [notionMediaAck, setNotionMediaAck] = useState(false);
  const [webflowMediaAck, setWebflowMediaAck] = useState(false);
  const [ghostMediaAck, setGhostMediaAck] = useState(false);
  const [instagramMediaAck, setInstagramMediaAck] = useState(false);
  const [joomlaMediaAck, setJoomlaMediaAck] = useState(false);

  useEffect(() => {
    if (!open) {
      setConnections(null);
      setLoadError(null);
      setPublishError(null);
      setPlatformInitialized(false);
      setPreview(null);
      setPreviewError(null);
      setShopifyThemeSnippetAck(false);
      setTypo3MediaUploadAck(false);
      setNotionMediaAck(false);
      setWebflowMediaAck(false);
      setJoomlaMediaAck(false);
      return;
    }

    let cancelled = false;
    setLoadingConnections(true);
    setLoadError(null);
    void loadConnections()
      .then((data) => {
        if (cancelled) return;
        setConnections(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load connections");
      })
      .finally(() => {
        if (!cancelled) setLoadingConnections(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, loadConnections]);

  const availableDestinations = connections
    ? getConnectedDestinationsForFormat(formatType as ContentFormatType, connections)
    : [];

  useEffect(() => {
    if (!open || platformInitialized || !availableDestinations[0]) return;
    setPlatform(availableDestinations[0].id);
    setPlatformInitialized(true);
  }, [open, platformInitialized, availableDestinations]);

  if (!open) return null;

  const selectedDestination = availableDestinations.find((d) => d.id === platform);
  const isExportOnly = Boolean(selectedDestination?.exportOnly);
  const shopifyConnection =
    platform === "shopify" && connections?.shopify && typeof connections.shopify === "object"
      ? (connections.shopify as Record<string, unknown>)
      : null;
  const shopifyOutputMode = shopifyConnection
    ? String(shopifyConnection.outputMode ?? "article_html")
    : null;
  const showShopifyThemeSnippetWarning =
    platform === "shopify" &&
    shopifyOutputModeNeedsThemeSnippet(
      shopifyOutputMode,
      readShopifyThemeSnippetRequiredFor(shopifyConnection),
    );
  const typo3Connection =
    platform === "typo3" && connections?.typo3 && typeof connections.typo3 === "object"
      ? (connections.typo3 as Record<string, unknown>)
      : null;
  const showTypo3MediaUploadWarning =
    platform === "typo3" &&
    hasRasterDataImage(pieceFeaturedImageUrl) &&
    !readTypo3MediaUploadCapable(typo3Connection);
  const showNotionMediaWarning =
    platform === "notion" && hasRasterDataImage(pieceFeaturedImageUrl);
  const showWebflowMediaWarning =
    platform === "webflow" && hasRasterDataImage(pieceFeaturedImageUrl);
  const showGhostMediaWarning =
    platform === "ghost" &&
    Boolean(pieceFeaturedImageUrl) &&
    !isPublicHttpsImage(pieceFeaturedImageUrl);
  const showInstagramMediaWarning =
    formatType === "instagram_post" && !isPublicHttpsImage(pieceFeaturedImageUrl);
  const showJoomlaMediaWarning =
    platform === "joomla" && hasRasterDataImage(pieceFeaturedImageUrl);
  // ponytail: only WordPress advertises native scheduling today (wordpress-adapter).
  // If another CMS gains scheduling: true, update here or import a browser-safe capabilities map.
  const nativeCmsScheduling = platform === "wordpress";
  const hasPublishable =
    availableDestinations.some((d) => !d.exportOnly) || availableDestinations.length > 0;
  const gridCols =
    availableDestinations.length <= 1
      ? "grid-cols-1"
      : availableDestinations.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2";

  async function handlePublish() {
    if (isExportOnly) return;
    setPublishError(null);
    try {
      await onPublish(platform);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to publish");
    }
  }

  async function handlePreview() {
    if (!onRenderPreview || isExportOnly) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await onRenderPreview(platform);
      setPreview(result);
    } catch (err) {
      setPreview(null);
      setPreviewError(err instanceof Error ? err.message : "Failed to render preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={() => !publishing && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-content-title"
        className="paper-card relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="publish-content-title" className="flex items-center gap-2 text-lg font-semibold">
              <Send className="h-4 w-4" aria-hidden />
              Publish content
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick where this piece should go.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={publishing}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-5">
          {loadingConnections ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : loadError ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{loadError}</span>
            </div>
          ) : !hasPublishable ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-4 py-6 text-center text-sm">
              <p className="font-medium text-foreground">No destinations connected</p>
              <p className="text-muted-foreground">
                Connect a CMS or social account in{" "}
                {integrationsHref ? (
                  <a href={integrationsHref} className="font-medium text-primary hover:underline">
                    Integrations
                  </a>
                ) : (
                  <strong>Integrations</strong>
                )}{" "}
                first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-sm font-medium">Platform</span>
                <div className={`grid gap-2 ${gridCols}`}>
                  {availableDestinations.map((dest) => (
                    <button
                      key={dest.id}
                      type="button"
                      onClick={() => {
                        setPlatform(dest.id);
                        setPublishError(null);
                        setPreview(null);
                        setPreviewError(null);
                        setShopifyThemeSnippetAck(false);
                        setTypo3MediaUploadAck(false);
                        setNotionMediaAck(false);
                        setWebflowMediaAck(false);
                        setJoomlaMediaAck(false);
                      }}
                      disabled={publishing}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus:outline-hidden disabled:opacity-50 ${
                        platform === dest.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {dest.label}
                      {dest.exportOnly ? (
                        <span className="ml-1 text-[10px] font-normal opacity-70">export</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              {plannedDate && !isExportOnly ? (
                <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    Publish timing
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This piece is scheduled for <strong>{plannedDate}</strong>.
                  </p>
                  {nativeCmsScheduling ? (
                    <>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong>Option 1:</strong> Mark Ready + keep scheduled — WordPress can honor
                        native scheduling when supported by the connection.
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong>Option 2:</strong> Publish now — go live immediately (ignores scheduled
                        date).
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong>Option 1:</strong> Mark Ready in the editor + keep scheduled — the
                        goals.ac daily sweep publishes on that date (this CMS has no native schedule
                        API).
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong>Option 2:</strong> Publish now — go live immediately (ignores scheduled
                        date).
                      </p>
                    </>
                  )}
                </div>
              ) : null}

              {selectedDestination && connections && !isExportOnly ? (
                <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">
                    Connected {selectedDestination.label}
                  </p>
                  {getConnectionSummary(platform, connections) ? (
                    <p className="text-muted-foreground">
                      <code className="break-all rounded bg-muted px-1 text-xs">
                        {getConnectionSummary(platform, connections)}
                      </code>
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedDestination.description}
                  </p>
                </div>
              ) : null}

              {showShopifyThemeSnippetWarning ? (
                <div className="space-y-2">
                  <ShopifyThemeSnippetPreflight learnHref={shopifyThemeLearnHref} />
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-border"
                      checked={shopifyThemeSnippetAck}
                      onChange={(e) => setShopifyThemeSnippetAck(e.target.checked)}
                      disabled={publishing}
                    />
                    <span>
                      Theme snippet installed — publish continues either way; check if you already
                      pasted the Liquid into the theme.
                    </span>
                  </label>
                </div>
              ) : null}

              {showTypo3MediaUploadWarning ? (
                <div className="space-y-2">
                  <Typo3MediaPreflight />
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-border"
                      checked={typo3MediaUploadAck}
                      onChange={(e) => setTypo3MediaUploadAck(e.target.checked)}
                      disabled={publishing}
                    />
                    <span>
                      Understood — inline FAL works; publish continues. Upgrade extension for proper FAL references.
                    </span>
                  </label>
                </div>
              ) : null}

              {showNotionMediaWarning ? (
                <div className="space-y-2">
                  <NotionWebflowMediaPreflight platform="notion" />
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-border"
                      checked={notionMediaAck}
                      onChange={(e) => setNotionMediaAck(e.target.checked)}
                      disabled={publishing}
                    />
                    <span>
                      Understood — publish continues. Use stock image or paste HTTPS URL for featured image.
                    </span>
                  </label>
                </div>
              ) : null}

              {showWebflowMediaWarning ? (
                <div className="space-y-2">
                  <NotionWebflowMediaPreflight platform="webflow" />
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-border"
                      checked={webflowMediaAck}
                      onChange={(e) => setWebflowMediaAck(e.target.checked)}
                      disabled={publishing}
                    />
                    <span>
                      Understood — publish continues. Use stock image or paste HTTPS URL for featured image.
                    </span>
                  </label>
                </div>
              ) : null}

              {showGhostMediaWarning ? (
                <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                  <p className="font-medium">Ghost featured image</p>
                  <p>
                    Ghost needs a public HTTPS image URL (data URIs are skipped). Publish continues
                    without feature_image unless you attach HTTPS media.
                  </p>
                  <label className="flex items-start gap-2 text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-border"
                      checked={ghostMediaAck}
                      onChange={(e) => setGhostMediaAck(e.target.checked)}
                      disabled={publishing}
                    />
                    <span>Understood — continue without a usable Ghost feature image.</span>
                  </label>
                </div>
              ) : null}

              {showInstagramMediaWarning ? (
                <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                  <p className="font-medium">Instagram image required</p>
                  <p>
                    Instagram publish needs a public HTTPS featured image. Attach one before publishing
                    or acknowledge that publish may fail.
                  </p>
                  <label className="flex items-start gap-2 text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-border"
                      checked={instagramMediaAck}
                      onChange={(e) => setInstagramMediaAck(e.target.checked)}
                      disabled={publishing}
                    />
                    <span>Understood — I will add an image or accept a publish error.</span>
                  </label>
                </div>
              ) : null}

              {showJoomlaMediaWarning ? (
                <div className="space-y-2">
                  <NotionWebflowMediaPreflight platform="joomla" />
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-border"
                      checked={joomlaMediaAck}
                      onChange={(e) => setJoomlaMediaAck(e.target.checked)}
                      disabled={publishing}
                    />
                    <span>
                      Understood — publish continues. Joomla skips non-HTTPS featured images.
                    </span>
                  </label>
                </div>
              ) : null}

              {isExportOnly && (platform === "medium" || platform === "substack") ? (
                <ContentExportPanel
                  platform={platform}
                  title={pieceTitle}
                  bodyMarkdown={pieceBodyMarkdown}
                />
              ) : null}

              {!isExportOnly && onRenderPreview ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => void handlePreview()}
                    disabled={publishing || previewLoading}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                  >
                    {previewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                    {previewLoading ? "Rendering preview…" : "Preview CMS output"}
                  </button>
                  {previewError ? (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>{previewError}</span>
                    </div>
                  ) : null}
                  {preview ? (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                      {preview.payloadKind ? (
                        <p className="text-xs text-muted-foreground">
                          Destination format:{" "}
                          <span className="font-medium text-foreground">{preview.payloadKind}</span>
                        </p>
                      ) : null}
                      {preview.warnings && preview.warnings.length > 0 ? (
                        <ul className="space-y-1 text-xs text-amber-700">
                          {preview.warnings.map((warning) => (
                            <li key={`${warning.code ?? ""}:${warning.message}`}>
                              {warning.message}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {preview.previewHtml ? (
                        <div
                          className="prose prose-sm max-h-56 max-w-none overflow-auto rounded-md border border-border bg-background p-3"
                          dangerouslySetInnerHTML={{
                            __html: sanitizePreviewHtml(preview.previewHtml),
                          }}
                        />
                      ) : null}
                      {!preview.previewHtml && preview.previewJson != null ? (
                        <pre className="max-h-56 overflow-auto rounded-md border border-border bg-background p-3 text-xs whitespace-pre-wrap">
                          {JSON.stringify(preview.previewJson, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {publishError ? (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{publishError}</span>
                </div>
              ) : null}

              {!isExportOnly ? (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => void handlePublish()}
                    disabled={
                      !selectedDestination ||
                      publishing ||
                      (showShopifyThemeSnippetWarning && !shopifyThemeSnippetAck) ||
                      (showTypo3MediaUploadWarning && !typo3MediaUploadAck) ||
                      (showNotionMediaWarning && !notionMediaAck) ||
                      (showWebflowMediaWarning && !webflowMediaAck) ||
                      (showGhostMediaWarning && !ghostMediaAck) ||
                      (showInstagramMediaWarning && !instagramMediaAck) ||
                      (showJoomlaMediaWarning && !joomlaMediaAck)
                    }
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Publishing…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" aria-hidden />
                        Publish to {selectedDestination?.label ?? "destination"}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={publishing}
                    className="inline-flex h-10 items-center rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-10 items-center rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-secondary"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
