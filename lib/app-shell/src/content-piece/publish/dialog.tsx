import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Send, X } from "lucide-react";
import {
  getConnectedDestinationsForFormat,
  type CmsConnectionSnapshot,
  type ContentFormatType,
  type PublishDestinationId,
} from "../publish-destinations";
import { isPublishBlockedError, type PublishReadinessIssueView } from "./blocked-error";
import { sanitizePreviewHtml } from "../editor/sanitize-preview-html";
import {
  readShopifyThemeSnippetRequiredFor,
  shopifyOutputModeNeedsThemeSnippet,
} from "./shopify-theme-snippet-preflight";
import { hasRasterDataImage, readTypo3MediaUploadCapable } from "./typo3-media-preflight";
import { isPublicHttpsImage } from "./https-image";
import type { RenderPreviewResult } from "./dialog-types";
import {
  PublishDialogPreflights,
  type PublishDialogAcks,
} from "./dialog-preflights";
import { PublishDialogBlockers, PublishDialogPreview } from "./dialog-preview";

export type { RenderPreviewResult };

const EMPTY_ACKS: PublishDialogAcks = {
  shopifyThemeSnippet: false,
  typo3MediaUpload: false,
  notionMedia: false,
  webflowMedia: false,
  ghostMedia: false,
  instagramMedia: false,
  joomlaMedia: false,
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
  onPublish: (
    platform: PublishDestinationId,
    opts?: { overrideReason?: string },
  ) => void | Promise<void>;
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
  const [publishBlockers, setPublishBlockers] = useState<PublishReadinessIssueView[]>([]);
  const [overrideReason, setOverrideReason] = useState("");
  const [platformInitialized, setPlatformInitialized] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<RenderPreviewResult | null>(null);
  const [acks, setAcks] = useState<PublishDialogAcks>(EMPTY_ACKS);

  useEffect(() => {
    if (!open) {
      setConnections(null);
      setLoadError(null);
      setPublishError(null);
      setPublishBlockers([]);
      setOverrideReason("");
      setPlatformInitialized(false);
      setPreview(null);
      setPreviewError(null);
      setAcks(EMPTY_ACKS);
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
  const previewHtmlSafe = preview?.previewHtml ? sanitizePreviewHtml(preview.previewHtml) : "";
  const previewJsonText =
    preview && !previewHtmlSafe && preview.previewJson != null
      ? JSON.stringify(preview.previewJson, null, 2)
      : null;
  const gridCols =
    availableDestinations.length <= 1
      ? "grid-cols-1"
      : availableDestinations.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2";

  async function handlePublish() {
    if (isExportOnly) return;
    setPublishError(null);
    const reason = overrideReason.trim();
    try {
      await onPublish(platform, reason.length >= 10 ? { overrideReason: reason } : undefined);
    } catch (err) {
      if (isPublishBlockedError(err)) {
        setPublishBlockers(err.blockers);
        setPublishError(null);
        return;
      }
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

  function resetPlatform(id: PublishDestinationId) {
    setPlatform(id);
    setPublishError(null);
    setPublishBlockers([]);
    setOverrideReason("");
    setPreview(null);
    setPreviewError(null);
    setAcks(EMPTY_ACKS);
  }

  const publishDisabled =
    !selectedDestination ||
    publishing ||
    (publishBlockers.length > 0 && overrideReason.trim().length < 10) ||
    (showShopifyThemeSnippetWarning && !acks.shopifyThemeSnippet) ||
    (showTypo3MediaUploadWarning && !acks.typo3MediaUpload) ||
    (showNotionMediaWarning && !acks.notionMedia) ||
    (showWebflowMediaWarning && !acks.webflowMedia) ||
    (showGhostMediaWarning && !acks.ghostMedia) ||
    (showInstagramMediaWarning && !acks.instagramMedia) ||
    (showJoomlaMediaWarning && !acks.joomlaMedia);

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
                      onClick={() => resetPlatform(dest.id)}
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

              <PublishDialogPreflights
                publishing={publishing}
                plannedDate={plannedDate}
                isExportOnly={isExportOnly}
                nativeCmsScheduling={nativeCmsScheduling}
                selectedDestination={selectedDestination}
                platform={platform}
                connections={connections}
                shopifyThemeLearnHref={shopifyThemeLearnHref}
                pieceTitle={pieceTitle}
                pieceBodyMarkdown={pieceBodyMarkdown}
                acks={acks}
                onAck={(key, value) => setAcks((current) => ({ ...current, [key]: value }))}
                showShopifyThemeSnippetWarning={showShopifyThemeSnippetWarning}
                showTypo3MediaUploadWarning={showTypo3MediaUploadWarning}
                showNotionMediaWarning={showNotionMediaWarning}
                showWebflowMediaWarning={showWebflowMediaWarning}
                showGhostMediaWarning={showGhostMediaWarning}
                showInstagramMediaWarning={showInstagramMediaWarning}
                showJoomlaMediaWarning={showJoomlaMediaWarning}
              />

              {!isExportOnly && onRenderPreview ? (
                <PublishDialogPreview
                  publishing={publishing}
                  previewLoading={previewLoading}
                  previewError={previewError}
                  preview={preview}
                  previewHtmlSafe={previewHtmlSafe}
                  previewJsonText={previewJsonText}
                  onPreview={() => void handlePreview()}
                />
              ) : null}

              <PublishDialogBlockers
                publishing={publishing}
                blockers={publishBlockers}
                overrideReason={overrideReason}
                onOverrideReasonChange={setOverrideReason}
              />

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
                    disabled={publishDisabled}
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
                        {publishBlockers.length > 0
                          ? "Publish anyway"
                          : `Publish to ${selectedDestination?.label ?? "destination"}`}
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
