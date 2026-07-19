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
        "block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/40",
        tone === "ok" && "border-emerald-200/80",
        tone === "warn" && "border-amber-200/80",
        tone === "bad" && "border-rose-200/80",
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
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
    <section className="paper-card mb-8 p-6" aria-labelledby="outcomes-heading">
      <div className="mb-4">
        <h2 id="outcomes-heading" className="text-sm font-semibold tracking-tight">
          Outcomes
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Articles shipped, publish health, AI citations, and GEO — one glance for partner demos.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
