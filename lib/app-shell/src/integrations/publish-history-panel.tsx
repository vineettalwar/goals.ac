import { ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../cn";

export type GscInspectionSummary = {
  verdict: string | null;
  coverageState: string | null;
  indexingState: string | null;
  inspectedAt: string;
};

export type PublishHistoryRecord = {
  id: number;
  contentPieceId: number;
  websiteProjectId: number;
  provider: string;
  status: string;
  remoteUrl?: string | null;
  errorMessage?: string | null;
  publishedAt?: string | Date | null;
  createdAt: string | Date;
  pieceTitle?: string | null;
  outputMode?: string | null;
  /** Latest GSC URL inspection for the remoteUrl, if available. */
  gscInspection?: GscInspectionSummary | null;
};

export type PublishHistoryLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

function GscCoverageBadge({ inspection }: { inspection: GscInspectionSummary | null | undefined }) {
  if (!inspection) return null;
  const label = inspection.coverageState ?? inspection.verdict ?? "Pending…";
  const isIndexed =
    inspection.verdict === "PASS" ||
    (inspection.coverageState?.toLowerCase().includes("submitted") &&
      inspection.indexingState === "INDEXING_ALLOWED");
  const isError =
    inspection.verdict === "FAIL" ||
    inspection.coverageState?.toLowerCase().includes("error") ||
    inspection.coverageState?.toLowerCase().includes("excluded");
  const cls = isIndexed
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : isError
      ? "bg-destructive/10 text-destructive"
      : "bg-amber-500/10 text-amber-800 dark:text-amber-200";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs", cls)}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

function formatTimestamp(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusClass(status: string): string {
  switch (status) {
    case "published":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "failed":
      return "bg-destructive/10 text-destructive";
    case "pending":
      return "bg-amber-500/10 text-amber-800 dark:text-amber-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function PublishHistoryPanel({
  records,
  loading,
  error,
  pieceHref,
  renderLink,
  onRefresh,
  onInspect,
  inspecting,
}: {
  records: PublishHistoryRecord[];
  loading?: boolean;
  error?: string | null;
  pieceHref: (record: PublishHistoryRecord) => string;
  renderLink: (props: PublishHistoryLinkProps) => ReactNode;
  onRefresh?: () => void;
  /** Called when user clicks Inspect for a record with a remoteUrl. */
  onInspect?: (record: PublishHistoryRecord) => void;
  /** Set of record ids currently being inspected (shows spinner). */
  inspecting?: Set<number>;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Publishes</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Recent CMS and social publishes for this project.
          </p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-2.5 text-xs hover:bg-muted/50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="paper-card px-4 py-8 text-sm text-destructive">{error}</div>
      ) : loading && records.length === 0 ? (
        <div className="flex items-center gap-2 px-1 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading publish history…
        </div>
      ) : records.length === 0 ? (
        <div className="paper-card px-4 py-10 text-center text-sm text-muted-foreground">
          No publishes yet
        </div>
      ) : (
        <ul className="space-y-2">
          {records.map((record) => {
            const when = record.publishedAt ?? record.createdAt;
            const title = record.pieceTitle?.trim() || `Piece #${record.contentPieceId}`;
            return (
              <li key={record.id} className="paper-card px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1.5">
                    {renderLink({
                      href: pieceHref(record),
                      className: "text-sm font-medium hover:underline",
                      children: title,
                    })}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs capitalize">
                        {record.provider.replace(/_/g, " ")}
                      </span>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs capitalize",
                          statusClass(record.status),
                        )}
                      >
                        {record.status.replace(/_/g, " ")}
                      </span>
                      {record.outputMode ? (
                        <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs">
                          {record.outputMode}
                        </span>
                      ) : null}
                    </div>
                    {record.errorMessage ? (
                      <p className="text-xs text-destructive">{record.errorMessage}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs text-muted-foreground">
                    <time dateTime={typeof when === "string" ? when : when.toISOString()}>
                      {formatTimestamp(when)}
                    </time>
                    {record.remoteUrl ? (
                      <a
                        href={record.remoteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Live
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                    {record.remoteUrl ? (
                      <div className="flex flex-col items-end gap-1">
                        <GscCoverageBadge inspection={record.gscInspection} />
                        {onInspect ? (
                          <button
                            type="button"
                            disabled={inspecting?.has(record.id)}
                            onClick={() => onInspect(record)}
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline disabled:opacity-50"
                          >
                            {inspecting?.has(record.id) ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Search className="h-3 w-3" />
                            )}
                            {inspecting?.has(record.id) ? "Queued…" : "Inspect"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
