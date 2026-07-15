import type { ReactNode } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "../cn";
import {
  auditDetailPath,
  formatAuditDate,
  geoScoreBadgeClass,
  type AuditLinkProps,
  type GeoAuditDetail,
  type GeoAuditListItem,
  type GeoIssue,
} from "./types";

function AuditLink({
  renderLink,
  ...props
}: AuditLinkProps & { renderLink: (props: AuditLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
}

function GeoScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold",
        geoScoreBadgeClass(score),
        className,
      )}
    >
      Score {score}
    </span>
  );
}

function IssueStatusBadge({ status }: { status: GeoIssue["status"] }) {
  const styles: Record<GeoIssue["status"], string> = {
    pass: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-800",
    fail: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

export function GeoAuditListView({
  audits,
  error,
  loading,
  renderLink,
}: {
  audits: GeoAuditListItem[];
  error?: string | null;
  loading?: boolean;
  renderLink: (props: AuditLinkProps) => ReactNode;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading audits…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  if (audits.length === 0) {
    return (
      <div className="paper-card p-8 text-center text-sm text-muted-foreground">
        No GEO audits yet. Run an audit from AI visibility or the marketing tools.
      </div>
    );
  }

  return (
    <div className="paper-card divide-y overflow-hidden">
      {audits.map((audit) => (
        <AuditLink
          key={audit.id}
          renderLink={renderLink}
          href={auditDetailPath(audit.id)}
          className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/30"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{audit.url}</p>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatAuditDate(audit.createdAt)}</p>
          </div>
          <GeoScoreBadge score={audit.geoScore} />
        </AuditLink>
      ))}
    </div>
  );
}

export function GeoAuditDetailView({
  audit,
  error,
  loading,
  renderLink,
}: {
  audit: GeoAuditDetail | null;
  error?: string | null;
  loading?: boolean;
  renderLink: (props: AuditLinkProps) => ReactNode;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading audit…</p>;
  }

  return (
    <div className="max-w-4xl">
      <AuditLink
        renderLink={renderLink}
        href="/audit"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> GEO audits
      </AuditLink>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      {!audit && !error ? (
        <p className="mt-4 text-sm text-muted-foreground">Audit not found.</p>
      ) : null}

      {audit ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">GEO audit</h1>
              <a
                href={audit.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {audit.url}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="mt-1 text-xs text-muted-foreground">{formatAuditDate(audit.createdAt)}</p>
            </div>
            <GeoScoreBadge score={audit.geoScore} className="text-sm" />
          </div>

          {Array.isArray(audit.issues) && audit.issues.length > 0 ? (
            <div className="paper-card overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">Issues ({audit.issues.length})</h2>
              </div>
              <div className="divide-y">
                {audit.issues.map((issue, index) => (
                  <div key={`${issue.check}-${index}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{issue.check}</p>
                      <IssueStatusBadge status={issue.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p>
                    {issue.fix ? (
                      <p className="mt-1 text-xs text-foreground/80">{issue.fix}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <details className="paper-card">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
              Raw audit data
            </summary>
            <pre className="overflow-auto border-t border-border p-4 text-xs">
              {JSON.stringify(audit, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}
