import { AlertCircle, Eye, Loader2 } from "lucide-react";
import type { PublishReadinessIssueView } from "./blocked-error";
import type { RenderPreviewResult } from "./dialog-types";

export function PublishDialogPreview({
  publishing,
  previewLoading,
  previewError,
  preview,
  previewHtmlSafe,
  previewJsonText,
  onPreview,
}: {
  publishing: boolean;
  previewLoading: boolean;
  previewError: string | null;
  preview: RenderPreviewResult | null;
  previewHtmlSafe: string;
  previewJsonText: string | null;
  onPreview: () => void;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onPreview}
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
                <li key={`${warning.code ?? ""}:${warning.message}`}>{warning.message}</li>
              ))}
            </ul>
          ) : null}
          {previewHtmlSafe ? (
            <div
              className="prose prose-sm max-h-56 max-w-none overflow-auto rounded-md border border-border bg-background p-3"
              dangerouslySetInnerHTML={{ __html: previewHtmlSafe }}
            />
          ) : null}
          {previewJsonText ? (
            <pre className="max-h-56 overflow-auto rounded-md border border-border bg-background p-3 text-xs whitespace-pre-wrap">
              {previewJsonText}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function PublishDialogBlockers({
  publishing,
  blockers,
  overrideReason,
  onOverrideReasonChange,
}: {
  publishing: boolean;
  blockers: PublishReadinessIssueView[];
  overrideReason: string;
  onOverrideReasonChange: (value: string) => void;
}) {
  if (blockers.length === 0) return null;
  return (
    <div className="space-y-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
      <p className="flex items-start gap-2 font-medium">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>Content not ready to publish</span>
      </p>
      <ul className="list-disc space-y-1 pl-6 text-destructive/90">
        {blockers.map((blocker) => (
          <li key={`${blocker.message}:${blocker.detail ?? ""}`}>
            {blocker.message}
            {blocker.detail ? (
              <span className="mt-0.5 block text-xs text-destructive/80">{blocker.detail}</span>
            ) : null}
          </li>
        ))}
      </ul>
      <label className="block space-y-1 pt-1 text-xs font-normal text-muted-foreground">
        <span>Override reason (10+ characters) to publish anyway</span>
        <textarea
          value={overrideReason}
          onChange={(e) => onOverrideReasonChange(e.target.value)}
          disabled={publishing}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
        />
      </label>
    </div>
  );
}
