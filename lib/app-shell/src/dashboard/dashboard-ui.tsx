"use client";

import type { ReactNode } from "react";
import {
  ArrowRight,
  FileText,
  FolderOpen,
  Lightbulb,
  Plus,
  ScanSearch,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "../cn";
import { APP_SHELL_PAGE_WIDE } from "../shell-constants";
import { AutopilotActivityPanel, formatArticleUsageLabel } from "./autopilot-activity-panel";
import {
  buildPipelineSlices,
  buildPublishActivitySeries,
  DashboardActivityChart,
  DashboardPipelineDonut,
} from "./dashboard-charts";
import { OutcomesPanel } from "./outcomes-panel";
import {
  contentPiecePath,
  countByStatus,
  type DashboardArticleUsage,
  type DashboardAutopilotSavePayload,
  type DashboardAutopilotSettings,
  type DashboardCommandCenter,
  type DashboardLinkProps,
  type DashboardPiece,
  type DashboardProject,
} from "./types";
import { AutopilotSettingsCompact } from "./autopilot-settings-compact";

export {
  AutopilotActivityPanel,
  formatArticleUsageLabel,
  formatInternalLinksChipLabel,
} from "./autopilot-activity-panel";
export { AutopilotSettingsCompact } from "./autopilot-settings-compact";
export { OutcomesPanel, formatCitationDelta, formatGeoTrend, formatPublishHealth } from "./outcomes-panel";

const STATUS_BADGE: Record<string, string> = {
  ready: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  published: "bg-primary text-primary-foreground",
  generating: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  pending: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  failed: "bg-red-500/15 text-red-700 dark:text-red-300",
};

function Badge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold capitalize",
        STATUS_BADGE[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {status}
    </span>
  );
}

function DashLink({
  renderLink,
  ...props
}: DashboardLinkProps & {
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

export function DashboardStatsSection({
  projectCount,
  scopedToActiveProject,
  pieces,
  renderLink,
}: {
  projectCount: number;
  scopedToActiveProject: boolean;
  pieces: DashboardPiece[];
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  if (projectCount === 0) {
    return (
      <div className="paper-card mb-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-medium">Create your first project</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Add a website project to generate SEO content and publish to your CMS.
          </p>
        </div>
        <DashLink
          renderLink={renderLink}
          href="/projects"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <Plus className="mr-1.5 h-4 w-4" /> New project
        </DashLink>
      </div>
    );
  }

  const byStatus = countByStatus(pieces);
  const draftCount = byStatus.draft ?? 0;
  const publishedCount = (byStatus.published ?? 0) + (byStatus.ready ?? 0);

  return (
    <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {(
        [
          {
            label: "Drafts",
            value: draftCount,
            hint: "pieces awaiting review",
            icon: <FileText className="h-4 w-4" aria-hidden />,
          },
          {
            label: "Published",
            value: publishedCount,
            hint: "pieces live",
            icon: <Zap className="h-4 w-4" aria-hidden />,
          },
          {
            label: "Projects",
            value: projectCount,
            hint: scopedToActiveProject ? "active project" : "accessible projects",
            icon: <FolderOpen className="h-4 w-4" aria-hidden />,
          },
        ] as const
      ).map((stat) => (
        <div key={stat.label} className="paper-card p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {stat.label}
            </p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
              {stat.icon}
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{stat.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
        </div>
      ))}
    </div>
  );
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

export function DashboardDraftsSection({
  drafts,
  renderLink,
}: {
  drafts: DashboardPiece[];
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  if (drafts.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-border bg-secondary/40 p-4 sm:p-5"
      aria-labelledby="drafts-review-heading"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]">
          <FileText className="h-4 w-4" aria-hidden />
        </span>
        <h2 id="drafts-review-heading" className="text-sm font-semibold text-foreground">
          {drafts.length} draft{drafts.length !== 1 ? "s" : ""} need your review
        </h2>
      </div>
      <div className="space-y-0.5">
        {drafts.slice(0, 5).map((draft) => (
          <DashLink
            key={draft.id}
            renderLink={renderLink}
            href={contentPiecePath(draft.websiteProjectId, draft.id)}
            className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-card/80"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex-1 truncate text-sm font-medium text-foreground">{draft.title}</span>
            {draft.projectName ? (
              <span className="shrink-0 text-xs text-muted-foreground">{draft.projectName}</span>
            ) : null}
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </DashLink>
        ))}
      </div>
    </section>
  );
}

export function DashboardRecentSection({
  projectId,
  pieces,
  renderLink,
}: {
  projectId: number;
  pieces: DashboardPiece[];
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  const recent = pieces.slice(0, 8);
  if (recent.length === 0) return null;

  const rowTone: Record<string, string> = {
    published: "bg-emerald-500/[0.06]",
    ready: "bg-emerald-500/[0.06]",
    generating: "bg-amber-500/[0.07]",
    failed: "bg-red-500/[0.07]",
    draft: "bg-secondary/40",
  };

  return (
    <div className="paper-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold">Recent content</h2>
        <DashLink
          renderLink={renderLink}
          href={`/projects/${projectId}/content-studio`}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all <ArrowRight className="h-3 w-3" />
        </DashLink>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Keyword</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Words</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((article, index) => (
              <tr
                key={article.id}
                className={cn(
                  "transition-colors hover:bg-secondary/50",
                  rowTone[article.status] ?? "",
                  index < recent.length - 1 ? "border-b border-border/70" : "",
                )}
              >
                <td className="px-4 py-3.5">
                  <DashLink
                    renderLink={renderLink}
                    href={contentPiecePath(projectId, article.id)}
                    className="line-clamp-1 font-medium hover:underline"
                  >
                    {article.title || "Untitled"}
                  </DashLink>
                </td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground">
                  {article.targetKeyword ?? "—"}
                </td>
                <td className="px-4 py-3.5">
                  <Badge status={article.status} />
                </td>
                <td className="px-4 py-3.5 text-xs tabular-nums text-muted-foreground">
                  {article.wordCount && article.wordCount > 0
                    ? article.wordCount.toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DashboardProjectsSection({
  project,
  renderLink,
}: {
  project: DashboardProject | null;
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Active project</h2>
        <DashLink
          renderLink={renderLink}
          href="/projects"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all <ArrowRight className="h-3 w-3" />
        </DashLink>
      </div>
      {!project ? (
        <div className="paper-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-sm text-muted-foreground">
            No projects yet. Create one to use the content studio and roadmaps.
          </p>
          <DashLink
            renderLink={renderLink}
            href="/projects"
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New project
          </DashLink>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DashLink
            renderLink={renderLink}
            href={`/projects/${project.id}`}
            className="paper-card flex items-center gap-3 p-4 transition-colors hover:bg-secondary/30"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{project.name}</p>
              <p className="truncate text-xs text-muted-foreground">{project.url}</p>
            </div>
          </DashLink>
        </div>
      )}
    </div>
  );
}

export function DashboardView({
  greeting,
  subtitle,
  projectCount,
  scopedToActiveProject,
  activeProject,
  activeProjectId,
  pieces,
  autopilotSettings,
  commandCenter,
  articleUsage,
  renderLink,
  onSaveAutopilot,
  savingAutopilot = false,
  saveAutopilotError = null,
}: {
  greeting: string;
  subtitle: string | null;
  projectCount: number;
  scopedToActiveProject: boolean;
  activeProject: DashboardProject | null;
  activeProjectId: number | null;
  pieces: DashboardPiece[];
  autopilotSettings: DashboardAutopilotSettings | null;
  commandCenter: DashboardCommandCenter | null;
  articleUsage?: DashboardArticleUsage | null;
  renderLink: (props: DashboardLinkProps) => ReactNode;
  onSaveAutopilot?: (payload: DashboardAutopilotSavePayload) => void | Promise<void>;
  savingAutopilot?: boolean;
  saveAutopilotError?: string | null;
}) {
  const drafts = pieces.filter((piece) => piece.status === "draft");
  const hasCommandCenter = Boolean(activeProjectId && commandCenter);
  const activitySeries = buildPublishActivitySeries(commandCenter?.recentPublishes ?? []);
  const pipelineSlices = buildPipelineSlices(pieces);
  const studioHref = activeProjectId
    ? `/projects/${activeProjectId}/content-studio`
    : "/projects";

  return (
    <div className={APP_SHELL_PAGE_WIDE}>
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-balance">{greeting}</h1>
          {subtitle ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
              {subtitle}
            </p>
          ) : null}
        </div>
        <DashLink
          renderLink={renderLink}
          href={studioHref}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          Open studio
        </DashLink>
      </header>

      {!hasCommandCenter ? (
        <DashboardStatsSection
          projectCount={projectCount}
          scopedToActiveProject={scopedToActiveProject}
          pieces={pieces}
          renderLink={renderLink}
        />
      ) : null}

      {hasCommandCenter && activeProjectId && commandCenter ? (
        <div className="space-y-4 sm:space-y-5">
          <OutcomesPanel
            projectId={activeProjectId}
            commandCenter={commandCenter}
            renderLink={renderLink}
          />

          <div className="grid min-w-0 gap-4 lg:grid-cols-12 lg:gap-5">
            <div className="paper-card min-w-0 p-5 sm:p-6 lg:col-span-8">
              <DashboardActivityChart
                data={activitySeries}
                totalLabel="Successful CMS publishes in recent history"
              />
            </div>
            <div className="paper-card min-w-0 p-5 sm:p-6 lg:col-span-4">
              <DashboardPipelineDonut slices={pipelineSlices} />
            </div>

            <div className="min-w-0 lg:col-span-8">
              <DashboardCommandCenterSection
                projectId={activeProjectId}
                commandCenter={commandCenter}
                autopilotSettings={autopilotSettings}
                renderLink={renderLink}
              />
            </div>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
              <DashLink
                renderLink={renderLink}
                href="/search/keywords"
                className="paper-card flex items-center justify-between gap-3 p-5 transition-colors hover:bg-secondary/30"
              >
                <div>
                  <p className="text-sm text-muted-foreground">Open ideas</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                    {commandCenter.openOpportunities}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Keyword opportunities</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-primary/15 text-primary">
                  <Lightbulb className="h-4 w-4" aria-hidden />
                </span>
              </DashLink>
              <DashLink
                renderLink={renderLink}
                href={`/projects/${activeProjectId}/content-studio`}
                className="paper-card flex items-center justify-between gap-3 p-5 transition-colors hover:bg-secondary/30"
              >
                <div>
                  <p className="text-sm text-muted-foreground">Drafts to review</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                    {commandCenter.draftsNeedingReview}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Waiting in studio</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-[var(--accent-warm)]/25 text-[var(--accent-warm)]">
                  <FileText className="h-4 w-4" aria-hidden />
                </span>
              </DashLink>
              {articleUsage ? (
                <div className="paper-card p-5 sm:col-span-2 lg:col-span-1">
                  <p className="text-sm text-muted-foreground">Article quota</p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">
                    {formatArticleUsageLabel(articleUsage)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="min-w-0 lg:col-span-5">
              <AutopilotActivityPanel
                projectId={activeProjectId}
                settings={autopilotSettings}
                commandCenter={commandCenter}
                pieces={pieces}
                articleUsage={articleUsage}
                renderLink={renderLink}
                onSaveAutopilot={onSaveAutopilot}
                savingAutopilot={savingAutopilot}
                saveAutopilotError={saveAutopilotError}
                compact
              />
            </div>

            <div className="min-w-0 lg:col-span-7">
              <DashboardRecentSection
                projectId={activeProjectId}
                pieces={pieces}
                renderLink={renderLink}
              />
            </div>

            {drafts.length > 0 ? (
              <div className="lg:col-span-12">
                <DashboardDraftsSection drafts={drafts} renderLink={renderLink} />
              </div>
            ) : null}

            <div className="lg:col-span-12">
              <DashboardProjectsSection project={activeProject} renderLink={renderLink} />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {activeProjectId ? (
            <DashboardAutopilotSection
              projectId={activeProjectId}
              settings={autopilotSettings}
              pieces={pieces}
              articleUsage={articleUsage}
              renderLink={renderLink}
              onSaveAutopilot={onSaveAutopilot}
              savingAutopilot={savingAutopilot}
              saveAutopilotError={saveAutopilotError}
            />
          ) : null}

          {activeProjectId ? (
            <DashboardDraftsSection drafts={drafts} renderLink={renderLink} />
          ) : null}

          {activeProjectId ? (
            <DashboardRecentSection
              projectId={activeProjectId}
              pieces={pieces}
              renderLink={renderLink}
            />
          ) : null}

          {activeProjectId ? (
            <DashboardProjectsSection project={activeProject} renderLink={renderLink} />
          ) : null}
        </div>
      )}
    </div>
  );
}
