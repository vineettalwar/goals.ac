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
import { AutopilotActivityPanel, formatArticleUsageLabel } from "./autopilot-activity-panel";
import {
  contentPiecePath,
  countByStatus,
  type DashboardArticleUsage,
  type DashboardAutopilotSettings,
  type DashboardCommandCenter,
  type DashboardLinkProps,
  type DashboardPiece,
  type DashboardProject,
} from "./types";

export { AutopilotActivityPanel, formatArticleUsageLabel } from "./autopilot-activity-panel";

const STATUS_BADGE: Record<string, string> = {
  ready: "bg-emerald-100 text-emerald-800",
  published: "bg-primary text-primary-foreground",
  generating: "bg-amber-100 text-amber-800",
  pending: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  failed: "bg-red-100 text-red-800",
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
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="paper-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Drafts</p>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-bold">{draftCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">pieces awaiting review</p>
      </div>
      <div className="paper-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Published</p>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-bold">{publishedCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">pieces live</p>
      </div>
      <div className="paper-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-bold">{projectCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {scopedToActiveProject ? "active project" : "accessible projects"}
        </p>
      </div>
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
  return (
    <div className="paper-card mb-8 p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary" /> Content command center
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ideas, calendar, drafts, and visibility — one place to steer the pipeline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DashLink
            renderLink={renderLink}
            href="/search/keywords"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium"
          >
            Keywords
          </DashLink>
          <DashLink
            renderLink={renderLink}
            href="/research"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium"
          >
            Research
          </DashLink>
          <DashLink
            renderLink={renderLink}
            href={`/projects/${projectId}/content-studio`}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium"
          >
            Studio
          </DashLink>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DashLink
          renderLink={renderLink}
          href="/search/keywords"
          className="rounded-lg bg-secondary/40 px-3 py-3 text-center transition-colors hover:bg-secondary/60"
        >
          <p className="text-2xl font-bold">{commandCenter.openOpportunities}</p>
          <p className="mt-1 text-xs text-muted-foreground">Open ideas</p>
        </DashLink>
        <DashLink
          renderLink={renderLink}
          href="/strategy/calendar"
          className="rounded-lg bg-secondary/40 px-3 py-3 text-center transition-colors hover:bg-secondary/60"
        >
          <p className="text-2xl font-bold">{commandCenter.calendarDraftItems}</p>
          <p className="mt-1 text-xs text-muted-foreground">Calendar slots</p>
        </DashLink>
        <div className="rounded-lg bg-secondary/40 px-3 py-3 text-center">
          <p className="text-2xl font-bold">{commandCenter.draftsNeedingReview}</p>
          <p className="mt-1 text-xs text-muted-foreground">Drafts to review</p>
        </div>
        <DashLink
          renderLink={renderLink}
          href="/search/visibility"
          className="rounded-lg bg-secondary/40 px-3 py-3 text-center transition-colors hover:bg-secondary/60"
        >
          <p className="text-2xl font-bold">
            {commandCenter.llmCitationRate != null ? `${commandCenter.llmCitationRate}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">LLM citation rate</p>
        </DashLink>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <DashLink
          renderLink={renderLink}
          href="/audit"
          className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center gap-2 text-sm">
            <ScanSearch className="h-4 w-4 text-muted-foreground" />
            <span>GEO score</span>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            {commandCenter.latestGeoScore != null ? `${commandCenter.latestGeoScore}/100` : "Run audit"}
          </span>
        </DashLink>
        <DashLink
          renderLink={renderLink}
          href="/search/site"
          className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>Internal links</span>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            {commandCenter.internalLinkCoverage != null
              ? `${commandCenter.internalLinkCoverage}%`
              : "—"}
          </span>
        </DashLink>
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span>Autopilot</span>
          </div>
          <span className="text-sm font-medium">
            {autopilotSettings?.enabled
              ? `${autopilotSettings.cadence === "daily" ? "Daily" : "Weekly"}`
              : "Off"}
          </span>
        </div>
      </div>

      {commandCenter.topOpportunities.length > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top opportunities
          </p>
          <div className="space-y-2">
            {commandCenter.topOpportunities.map((opp) => (
              <DashLink
                key={opp.id}
                renderLink={renderLink}
                href={`/search/keywords?keyword=${encodeURIComponent(opp.keyword)}`}
                className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50"
              >
                <Lightbulb className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm">{opp.keyword}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {opp.opportunityScore}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </DashLink>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DashboardAutopilotSection({
  projectId,
  settings,
  pieces,
  commandCenter,
  articleUsage,
  renderLink,
}: {
  projectId: number;
  settings: DashboardAutopilotSettings | null;
  pieces: DashboardPiece[];
  commandCenter?: DashboardCommandCenter | null;
  articleUsage?: DashboardArticleUsage | null;
  renderLink: (props: DashboardLinkProps) => ReactNode;
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
      />
    );
  }

  const byStatus = countByStatus(pieces);
  const generating = byStatus.generating ?? 0;
  const drafts = byStatus.draft ?? 0;
  const published = (byStatus.published ?? 0) + (byStatus.ready ?? 0);

  return (
    <div className="paper-card mb-8 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-primary" /> Autopilot activity
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {settings?.enabled
              ? `${settings.cadence === "daily" ? "Daily" : "Weekly"} · ${settings.publishMode ?? "review"} publish mode`
              : "Autopilot is off — enable on the Autopilot page"}
          </p>
          {articleUsage ? (
            <p className="mt-1.5 inline-flex items-center rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              <FileText className="mr-1.5 h-3 w-3 shrink-0" />
              {formatArticleUsageLabel(articleUsage)}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <DashLink
            renderLink={renderLink}
            href="/search/visibility"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium"
          >
            Visibility
          </DashLink>
          <DashLink
            renderLink={renderLink}
            href={`/projects/${projectId}?tab=publishing`}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-medium"
          >
            Manage
          </DashLink>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
        <div className="rounded-lg bg-secondary/40 px-3 py-3">
          <p className="text-2xl font-bold">{generating + drafts}</p>
          <p className="mt-1 text-xs text-muted-foreground">Drafts / generating</p>
        </div>
        <div className="rounded-lg bg-secondary/40 px-3 py-3">
          <p className="text-2xl font-bold">{published}</p>
          <p className="mt-1 text-xs text-muted-foreground">Published</p>
        </div>
        <div className="rounded-lg bg-secondary/40 px-3 py-3">
          <p className="text-2xl font-bold">{pieces.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Total pieces</p>
        </div>
      </div>
    </div>
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
    <div className="paper-card mb-8 border-l-4 border-l-(--accent-warm) p-4">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-(--accent-warm)" />
        <span className="text-sm font-semibold text-foreground">
          {drafts.length} draft{drafts.length !== 1 ? "s" : ""} need your review
        </span>
      </div>
      <div className="space-y-1">
        {drafts.slice(0, 5).map((draft) => (
          <DashLink
            key={draft.id}
            renderLink={renderLink}
            href={contentPiecePath(draft.websiteProjectId, draft.id)}
            className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary/60"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm font-medium text-foreground">{draft.title}</span>
            {draft.projectName ? (
              <span className="shrink-0 text-xs text-muted-foreground">{draft.projectName}</span>
            ) : null}
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </DashLink>
        ))}
      </div>
    </div>
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
  const recent = pieces.slice(0, 5);
  if (recent.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent content</h2>
        <DashLink
          renderLink={renderLink}
          href={`/projects/${projectId}/content-studio`}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View all <ArrowRight className="h-3 w-3" />
        </DashLink>
      </div>
      <div className="paper-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Keyword</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Words</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((article, index) => (
              <tr
                key={article.id}
                className={index < recent.length - 1 ? "border-b border-border" : ""}
              >
                <td className="px-4 py-3">
                  <DashLink
                    renderLink={renderLink}
                    href={contentPiecePath(projectId, article.id)}
                    className="line-clamp-1 font-medium hover:underline"
                  >
                    {article.title || "Untitled"}
                  </DashLink>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {article.targetKeyword ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge status={article.status} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
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
}) {
  const drafts = pieces.filter((piece) => piece.status === "draft");

  return (
    <div className="max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{greeting}</h1>
        {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
      </div>

      <DashboardStatsSection
        projectCount={projectCount}
        scopedToActiveProject={scopedToActiveProject}
        pieces={pieces}
        renderLink={renderLink}
      />

      {activeProjectId && commandCenter ? (
        <DashboardCommandCenterSection
          projectId={activeProjectId}
          commandCenter={commandCenter}
          autopilotSettings={autopilotSettings}
          renderLink={renderLink}
        />
      ) : null}

      {activeProjectId && commandCenter ? (
        <AutopilotActivityPanel
          projectId={activeProjectId}
          settings={autopilotSettings}
          commandCenter={commandCenter}
          pieces={pieces}
          articleUsage={articleUsage}
          renderLink={renderLink}
        />
      ) : activeProjectId ? (
        <DashboardAutopilotSection
          projectId={activeProjectId}
          settings={autopilotSettings}
          pieces={pieces}
          articleUsage={articleUsage}
          renderLink={renderLink}
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
  );
}
