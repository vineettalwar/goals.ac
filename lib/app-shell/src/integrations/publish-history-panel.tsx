import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../cn";

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
};

export type PublishHistoryLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

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
}: {
  records: PublishHistoryRecord[];
  loading?: boolean;
  error?: string | null;
  pieceHref: (record: PublishHistoryRecord) => string;
  renderLink: (props: PublishHistoryLinkProps) => ReactNode;
  onRefresh?: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Publish history</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Recent CMS publishes for this project.
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
