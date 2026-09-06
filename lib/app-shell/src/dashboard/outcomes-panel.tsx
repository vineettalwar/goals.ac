"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Eye, FileText, ScanSearch, XCircle } from "lucide-react";
import { cn } from "../cn";
import { formatCitationDelta, formatGeoTrend, formatPublishHealth } from "./outcomes-format";
import type { DashboardCommandCenter, DashboardLinkProps } from "./types";

export { formatCitationDelta, formatGeoTrend, formatPublishHealth } from "./outcomes-format";

function DashLink({
  renderLink,
  ...props
}: DashboardLinkProps & {
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

type TileProps = {
  label: string;
  value: string;
  hint?: string | null;
  href: string;
  renderLink: (props: DashboardLinkProps) => ReactNode;
  icon: ReactNode;
  tone?: "default" | "ok" | "warn" | "bad";
};

function OutcomeTile({ label, value, hint, href, renderLink, icon, tone = "default" }: TileProps) {
  return (
    <DashLink
      renderLink={renderLink}
      href={href}
      className={cn(
        "group relative flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-5 transition-[background-color,border-color,box-shadow] duration-200 ease-out",
        "hover:border-primary/20 hover:bg-secondary/30 hover:shadow-[0_4px_14px_rgba(0,0,0,0.04)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
        tone === "ok" && "border-emerald-200/70 bg-emerald-500/[0.03]",
        tone === "warn" && "border-amber-200/70 bg-amber-500/[0.03]",
        tone === "bad" && "border-rose-200/70 bg-rose-500/[0.03]",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-primary transition-colors group-hover:bg-primary/10",
            tone === "ok" && "bg-emerald-500/10 text-emerald-700",
            tone === "warn" && "bg-amber-500/10 text-amber-700",
            tone === "bad" && "bg-rose-500/10 text-rose-700",
          )}
        >
          {icon}
        </span>
      </div>
      <p
        className={cn(
          "text-2xl font-bold tabular-nums tracking-tight text-foreground break-words",
          value === "—" && "text-muted-foreground/70",
          value === "No publishes yet" && "text-lg leading-snug text-muted-foreground",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground text-pretty">{hint}</p>
      ) : null}
    </DashLink>
  );
}

/**
 * Partner-demo outcomes row: articles → publish health → AI citations → GEO.
 * Data from `loadCommandCenterSummary`.
 */
export function OutcomesPanel({
  projectId,
  commandCenter,
  renderLink,
}: {
  projectId: number;
  commandCenter: DashboardCommandCenter;
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  const published = commandCenter.publishedCount ?? 0;
  const drafts = commandCenter.draftCount ?? commandCenter.draftsNeedingReview ?? 0;
  const health = commandCenter.publishHealth ?? { ok: 0, failed: 0, lastAt: null };
  const publishTone =
    health.failed > 0 ? "bad" : health.ok > 0 ? "ok" : "default";
  const geoTrend = formatGeoTrend(commandCenter.latestGeoScore, commandCenter.previousGeoScore);
  const citationHint =
    formatCitationDelta(commandCenter.llmCitationDelta) ?? "Cited across recent LLM checks";

  return (
    <section aria-labelledby="outcomes-heading">
      <div className="mb-3">
        <h2 id="outcomes-heading" className="text-base font-semibold tracking-tight">
          Outcomes
        </h2>
        <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground text-pretty">
          Articles shipped, publish health, AI citations, and GEO — one glance for partner demos.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OutcomeTile
          label="Articles"
          value={String(published)}
          hint={`${drafts} draft${drafts === 1 ? "" : "s"} in queue`}
          href={`/projects/${projectId}/content-studio`}
          renderLink={renderLink}
          icon={<FileText className="h-3.5 w-3.5" aria-hidden />}
        />
        <OutcomeTile
          label="Publish health"
          value={formatPublishHealth(health)}
          hint={health.lastAt ? `Last ${new Date(health.lastAt).toLocaleDateString()}` : null}
          href={`/projects/${projectId}?tab=publishing`}
          renderLink={renderLink}
          icon={
            health.failed > 0 ? (
              <XCircle className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            )
          }
          tone={publishTone}
        />
        <OutcomeTile
          label="AI citations"
          value={
            commandCenter.llmCitationRate != null
              ? `${commandCenter.llmCitationRate}%`
              : "—"
          }
          hint={citationHint}
          href="/search/visibility"
          renderLink={renderLink}
          icon={<Eye className="h-3.5 w-3.5" aria-hidden />}
        />
        <OutcomeTile
          label="GEO score"
          value={
            commandCenter.latestGeoScore != null
              ? String(commandCenter.latestGeoScore)
              : "—"
          }
          hint={geoTrend}
          href="/audit"
          renderLink={renderLink}
          icon={<ScanSearch className="h-3.5 w-3.5" aria-hidden />}
        />
      </div>
    </section>
  );
}
