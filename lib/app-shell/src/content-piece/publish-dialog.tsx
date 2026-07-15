import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Send, X } from "lucide-react";
import {
  getConnectedDestinationsForFormat,
  getConnectionSummary,
  type CmsConnectionSnapshot,
  type ContentFormatType,
  type PublishDestinationId,
} from "./publish-destinations";

export function ContentPiecePublishDialog({
  open,
  onClose,
  formatType,
  loadConnections,
  onPublish,
  publishing = false,
  integrationsHref,
}: {
  open: boolean;
  onClose: () => void;
  formatType: string;
  loadConnections: () => Promise<CmsConnectionSnapshot>;
  onPublish: (platform: PublishDestinationId) => void | Promise<void>;
  publishing?: boolean;
  /** Link target when no CMS destinations are connected (e.g. /integrations). */
  integrationsHref?: string;
}) {
  const [platform, setPlatform] = useState<PublishDestinationId>("wordpress");
  const [connections, setConnections] = useState<CmsConnectionSnapshot | null>(null);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [platformInitialized, setPlatformInitialized] = useState(false);

  useEffect(() => {
    if (!open) {
      setConnections(null);
      setLoadError(null);
      setPublishError(null);
      setPlatformInitialized(false);
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
  const hasConnections = availableDestinations.length > 0;
  const gridCols =
    availableDestinations.length <= 1
      ? "grid-cols-1"
      : availableDestinations.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  async function handlePublish() {
    setPublishError(null);
    try {
      await onPublish(platform);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to publish");
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
        className="paper-card relative z-10 w-full max-w-lg p-6 shadow-lg"
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
          ) : !hasConnections ? (
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
                      }}
                      disabled={publishing}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus:outline-hidden disabled:opacity-50 ${
                        platform === dest.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {dest.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedDestination && connections ? (
                <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">
                    Connected {selectedDestination.label}
                  </p>
                  {getConnectionSummary(platform, connections) ? (
                    <p className="text-muted-foreground">
                      <code className="rounded bg-muted px-1 text-xs break-all">
                        {getConnectionSummary(platform, connections)}
                      </code>
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedDestination.description}
                  </p>
                </div>
              ) : null}

              {publishError ? (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{publishError}</span>
                </div>
              ) : null}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => void handlePublish()}
                  disabled={!hasConnections || publishing}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
