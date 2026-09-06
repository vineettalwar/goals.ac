import type { ReactNode } from "react";
import {
  ArrowRight,
  FileText,
  Lightbulb,
  ScanSearch,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "../cn";
import { AutopilotActivityPanel, formatArticleUsageLabel } from "./autopilot-activity-panel";
import {
  type DashboardArticleUsage,
  type DashboardAutopilotSavePayload,
  type DashboardAutopilotSettings,
  type DashboardCommandCenter,
  type DashboardLinkProps,
  type DashboardPiece,
} from "./types";
import { AutopilotSettingsCompact } from "./autopilot-settings-compact";
import { countByStatus } from "./types";

function DashLink({
  renderLink,
  ...props
}: DashboardLinkProps & {
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

export function DashboardCommandCenterSection({
  projectId,
  commandCenter,
  autopilotSettings,
  renderLink,
}: {
  projectId: number;
  commandCenter: DashboardCommandCenter;
  autopilotSettings: DashboardAutopilotSettings | null;
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  const citation =
    commandCenter.llmCitationRate != null ? `${commandCenter.llmCitationRate}%` : "—";
  const geo =
    commandCenter.latestGeoScore != null ? `${commandCenter.latestGeoScore}/100` : null;
  const links =
    commandCenter.internalLinkCoverage != null
      ? `${commandCenter.internalLinkCoverage}%`
      : "—";
  const autopilotOn = Boolean(autopilotSettings?.enabled);

  return (
    <section className="paper-card overflow-hidden" aria-labelledby="command-center-heading">
      <div className="border-b border-border bg-secondary/25 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="command-center-heading" className="text-base font-semibold tracking-tight">
                Content command center
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground text-pretty">
                Ideas, calendar, drafts, and visibility — one place to steer the pipeline.
              </p>
            </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { href: "/search/keywords", label: "Keywords" },
                { href: "/search/refresh", label: "Refresh" },
                { href: "/research", label: "Research" },
                { href: `/projects/${projectId}/content-studio`, label: "Studio" },
              ] as const
            ).map((link) => (
              <DashLink
                key={link.href}
                renderLink={renderLink}
                href={link.href}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/25 hover:bg-secondary/50"
              >
                {link.label}
              </DashLink>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
          {(
            [
              {
                href: "/search/keywords",
                value: String(commandCenter.openOpportunities),
                label: "Open ideas",
                interactive: true,
              },
              {
                href: "/strategy/calendar",
                value: String(commandCenter.calendarDraftItems),
                label: "Calendar slots",
                interactive: true,
              },
              {
                href: null,
                value: String(commandCenter.draftsNeedingReview),
                label: "Drafts to review",
                interactive: false,
              },
              {
                href: "/search/visibility",
                value: citation,
                label: "LLM citation rate",
                interactive: true,
              },
            ] as const
          ).map((metric) => {
            const body = (
              <>
                <p
                  className={cn(
                    "text-2xl font-bold tabular-nums tracking-tight",
                    metric.value === "—" && "text-muted-foreground/70",
                  )}
                >
                  {metric.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.label}</p>
              </>
            );
            const cellClass =
              "bg-card px-3 py-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/25";
            if (metric.interactive && metric.href) {
              return (
                <DashLink
                  key={metric.label}
                  renderLink={renderLink}
                  href={metric.href}
                  className={cn(cellClass, "hover:bg-secondary/40")}
                >
                  {body}
                </DashLink>
              );
            }
            return (
              <div key={metric.label} className={cellClass}>
                {body}
              </div>
            );
          })}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          <DashLink
            renderLink={renderLink}
            href="/audit"
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3 transition-colors hover:bg-secondary/45"
          >
            <div className="flex items-center gap-2.5 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-card text-primary shadow-sm">
                <ScanSearch className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="font-medium">GEO score</span>
            </div>
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                geo ? "text-foreground" : "text-primary",
              )}
            >
              {geo ?? "Run audit"}
            </span>
          </DashLink>
          <DashLink
            renderLink={renderLink}
            href="/search/site"
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3 transition-colors hover:bg-secondary/45"
          >
            <div className="flex items-center gap-2.5 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-card text-primary shadow-sm">
                <Target className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="font-medium">Internal links</span>
            </div>
            <span className="text-sm font-semibold tabular-nums">{links}</span>
          </DashLink>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md bg-card shadow-sm",
                  autopilotOn ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Zap className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="font-medium">Autopilot</span>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                autopilotOn
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {autopilotOn
                ? `${autopilotSettings?.cadence === "daily" ? "Daily" : "Weekly"}`
                : "Off"}
            </span>
          </div>
        </div>

        {commandCenter.topOpportunities.length > 0 ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Top opportunities
            </p>
            <div className="space-y-0.5">
              {commandCenter.topOpportunities.map((opp) => {
                const isRefresh =
                  opp.source === "content_refresh" || opp.source === "rank_drop";
                const href = isRefresh
                  ? `/projects/${projectId}/content-studio?${new URLSearchParams({
                      optimize: "1",
                      keyword: opp.keyword,
                      ...(opp.competitorUrl ? { url: opp.competitorUrl } : {}),
                    }).toString()}`
                  : `/search/keywords?keyword=${encodeURIComponent(opp.keyword)}`;
                return (
                  <DashLink
                    key={opp.id}
                    renderLink={renderLink}
                    href={href}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/50"
                  >
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm">{opp.keyword}</span>
                    <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                      <TrendingUp className="h-3 w-3" aria-hidden />
                      {opp.opportunityScore}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </DashLink>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function DashboardAutopilotSection({
  projectId,
  settings,
  pieces,
  commandCenter,
  articleUsage,
  renderLink,
  onSaveAutopilot,
  savingAutopilot = false,
  saveAutopilotError = null,
}: {
  projectId: number;
  settings: DashboardAutopilotSettings | null;
  pieces: DashboardPiece[];
  commandCenter?: DashboardCommandCenter | null;
  articleUsage?: DashboardArticleUsage | null;
  renderLink: (props: DashboardLinkProps) => ReactNode;
  onSaveAutopilot?: (payload: DashboardAutopilotSavePayload) => void | Promise<void>;
  savingAutopilot?: boolean;
  saveAutopilotError?: string | null;
}) {
  if (commandCenter) {
    return (
      <AutopilotActivityPanel
        projectId={projectId}
        settings={settings}
        commandCenter={commandCenter}
        pieces={pieces}
        articleUsage={articleUsage}
        renderLink={renderLink}
        onSaveAutopilot={onSaveAutopilot}
        savingAutopilot={savingAutopilot}
        saveAutopilotError={saveAutopilotError}
      />
    );
  }

  const byStatus = countByStatus(pieces);
  const generating = byStatus.generating ?? 0;
  const drafts = byStatus.draft ?? 0;
  const published = (byStatus.published ?? 0) + (byStatus.ready ?? 0);

  const metaParts: string[] = [];
  if (settings?.enabled) {
    metaParts.push(
      `${settings.cadence === "daily" ? "Daily" : "Weekly"} · ${settings.publishMode ?? "review"}`,
    );
  }
  if (articleUsage) metaParts.push(formatArticleUsageLabel(articleUsage));

  return (
    <section className="paper-card overflow-hidden" aria-labelledby="autopilot-heading">
      <div className="border-b border-border bg-secondary/25 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h2 id="autopilot-heading" className="text-base font-semibold tracking-tight">
                Autopilot
              </h2>
              {metaParts.length > 0 ? (
                <p className="mt-1.5 text-sm text-muted-foreground">{metaParts.join(" · ")}</p>
              ) : null}
            </div>
          <div className="flex shrink-0 items-center gap-3 text-xs font-medium text-muted-foreground">
            <DashLink
              renderLink={renderLink}
              href="/search/visibility"
              className="transition-colors hover:text-foreground"
            >
              Visibility
            </DashLink>
            <span aria-hidden className="text-border">
              ·
            </span>
            <DashLink
              renderLink={renderLink}
              href={`/projects/${projectId}?tab=publishing`}
              className="transition-colors hover:text-foreground"
            >
              Publishing
            </DashLink>
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        {onSaveAutopilot ? (
          <AutopilotSettingsCompact
            projectId={projectId}
            settings={settings}
            saving={savingAutopilot}
            saveError={saveAutopilotError}
            onSave={onSaveAutopilot}
            renderLink={renderLink}
          />
        ) : null}
        <p className="text-sm text-muted-foreground">
          {generating + drafts} drafts
          <span className="mx-1.5 text-border">·</span>
          {published} published
          <span className="mx-1.5 text-border">·</span>
          {pieces.length} total
        </p>
      </div>
    </section>
  );
}
