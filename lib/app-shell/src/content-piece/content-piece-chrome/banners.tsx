import { Loader2 } from "lucide-react";
import type {
  ContentPieceDetail,
  ContentPieceGeneratingState,
  ContentPiecePublishingState,
} from "../types";

export function ContentPieceStatusBanners({
  actionMessage,
  generateError,
  generateMessage,
  piece,
  generating,
  generatingState,
  staleGenerating,
  onResetGeneration,
  publishingState,
}: {
  actionMessage: string | null;
  generateError: boolean;
  generateMessage: string | null;
  piece: ContentPieceDetail;
  generating: boolean;
  generatingState: ContentPieceGeneratingState | null;
  staleGenerating: boolean;
  onResetGeneration?: () => void | Promise<void>;
  publishingState: ContentPiecePublishingState | null;
}) {
  return (
    <>
      {actionMessage && !generateError ? (
        <p className="text-sm text-muted-foreground" role="status">
          {actionMessage}
        </p>
      ) : null}

      {generateError ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-800 dark:text-red-200"
          role="alert"
        >
          {generateMessage}
        </div>
      ) : null}

      {piece.status === "generating" && (generating || generatingState) && !staleGenerating ? (
        <div
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-100">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            {generatingState?.message ?? "Generating content…"}
          </div>
          {generatingState?.jobStatus ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Job status: {generatingState.jobStatus}
            </p>
          ) : null}
        </div>
      ) : null}

      {staleGenerating ? (
        <div
          className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-800 dark:text-red-200"
          role="alert"
        >
          <p className="font-medium">Generation did not complete.</p>
          <p className="mt-1 text-sm">
            AI may not be configured. Add your API key in Integrations → AI, then try again.
          </p>
          {onResetGeneration ? (
            <button
              type="button"
              onClick={() => void onResetGeneration()}
              className="mt-3 inline-flex h-9 items-center rounded-lg border border-input bg-card px-3 text-sm font-medium hover:bg-secondary"
            >
              Reset to draft
            </button>
          ) : null}
        </div>
      ) : null}

      {piece.pieceMetadata?.source === "refresh" ? (
        <div
          className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm"
          role="status"
        >
          <p className="font-medium">Refresh piece — Diagnose → Fix → Stay</p>
          <p className="mt-1 text-muted-foreground">
            {piece.pieceMetadata.intendedPublishPlatform === "wordpress"
              ? "Imported from a live page. Score it, Fix gaps / Humanize, then publish an update to WordPress (confirm the post target first)."
              : "Imported from a live page. Score it, Fix gaps / Humanize, then copy or export the markdown — in-place CMS update is WordPress-only for now."}
          </p>
          {piece.pieceMetadata.sourceUrl ? (
            <a
              href={piece.pieceMetadata.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-primary hover:underline break-all"
            >
              {piece.pieceMetadata.sourceUrl}
            </a>
          ) : null}
          {piece.pieceMetadata.extractTruncated ? (
            <p className="mt-2 text-amber-800 dark:text-amber-200">
              Body was truncated on import. Long sections may need a paste refresh.
            </p>
          ) : null}
        </div>
      ) : null}

      {publishingState ? (
        <div
          className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            {publishingState.message}
          </div>
          {publishingState.jobStatus ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Job status: {publishingState.jobStatus}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
