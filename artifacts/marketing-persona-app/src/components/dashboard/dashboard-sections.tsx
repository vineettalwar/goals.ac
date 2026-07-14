import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  contentPiecesTable,
  contentItemsTable,
  contentStrategiesTable,
} from "@workspace/db/schema";
import { eq, and, count, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { contentPiecePath } from "@/lib/projects/content-piece-path";
import { Zap, FileText, FolderOpen, ArrowRight, Plus, Eye, Link2, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseAutopilotSettings } from "@workspace/content-engine/support/autopilot-scheduler";
import { loadProjectVisibilitySummary } from "@/lib/projects/project-visibility-summary";
import { getProjectInternalLinkSummary } from "@/lib/projects/internal-links-summary";
import { getUsageSummaryForUser } from "@/lib/billing/usage";
import {
  getAccessibleProject,
  listAccessibleProjectIds,
  requireProjectAccess,
} from "@/lib/org/org-access";

const STATUS_BADGE: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  ready: "success",
  published: "default",
  generating: "warning",
  pending: "muted",
  failed: "destructive",
};

export function DashboardStatsSkeleton() {
  return (
    <div className="mb-8 grid grid-cols-3 gap-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="paper-card p-5 space-y-3">
          <div className="h-3 w-24 rounded bg-secondary" />
          <div className="h-8 w-16 rounded bg-secondary" />
        </div>
      ))}
    </div>
  );
}

export function DashboardVisibilitySkeleton() {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 animate-pulse">
      <div className="h-28 rounded-xl bg-secondary/50" />
      <div className="h-28 rounded-xl bg-secondary/50" />
    </div>
  );
}

export function DashboardDraftsSkeleton() {
  return <div className="mb-8 h-32 rounded-xl bg-secondary/40 animate-pulse" />;
}

export function DashboardArticlesSkeleton() {
  return <div className="mb-8 h-48 rounded-xl bg-secondary/40 animate-pulse" />;
}

export function DashboardProjectsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="paper-card h-20 bg-secondary/40" />
      ))}
    </div>
  );
}

export async function DashboardProjectSubtitle({
  userId,
  projectId,
}: {
  userId: number;
  projectId?: number | null;
}) {
  if (projectId) {
    const project = await getAccessibleProject(projectId, userId);
    if (project) {
      return <p className="mt-1 text-muted-foreground">{project.name}</p>;
    }
  }

  const projectIds = await listAccessibleProjectIds(userId);
  if (projectIds.length === 0) {
    return (
      <p className="mt-1 text-muted-foreground">
        Create a project to generate and publish content
      </p>
    );
  }

  return null;
}

export async function DashboardStats({
  userId,
  projectId,
}: {
  userId: number;
  projectId?: number | null;
}) {
  const scopedProjectIds = projectId
    ? [projectId]
    : await listAccessibleProjectIds(userId);

  if (scopedProjectIds.length === 0) {
    return (
      <div className="mb-8 paper-card p-6 flex items-center justify-between">
        <div>
          <p className="font-medium">Create your first project</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Add a website project to generate SEO content and publish to your CMS.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects">
            <Plus className="h-4 w-4 mr-1.5" /> New project
          </Link>
        </Button>
      </div>
    );
  }

  const pieceScope = inArray(contentPiecesTable.websiteProjectId, scopedProjectIds);

  const [draftResult, publishedResult] = await Promise.all([
    db
      .select({ value: count() })
      .from(contentPiecesTable)
      .where(and(pieceScope, eq(contentPiecesTable.status, "draft"))),
    db
      .select({ value: count() })
      .from(contentPiecesTable)
      .where(and(pieceScope, eq(contentPiecesTable.status, "published"))),
  ]);

  const draftCount = draftResult[0]?.value ?? 0;
  const publishedCount = publishedResult[0]?.value ?? 0;
  const projectCount = scopedProjectIds.length;

  return (
    <div className="mb-8 grid grid-cols-3 gap-4">
      <div className="paper-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Drafts
          </p>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-bold">{draftCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">pieces awaiting review</p>
      </div>
      <div className="paper-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Published
          </p>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-bold">{publishedCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">pieces live</p>
      </div>
      <div className="paper-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Projects
          </p>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-bold">{projectCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {projectId ? "active project" : "accessible projects"}
        </p>
      </div>
    </div>
  );
}

export async function DashboardAutopilotLink({
  userId,
  projectId,
}: {
  userId: number;
  projectId: number;
}) {
  const project = await getAccessibleProject(projectId, userId);
  if (!project) return null;

  const autopilotSettings = parseAutopilotSettings(project.autopilotSettings);
  const visibility = await loadProjectVisibilitySummary(projectId);

  const [strategyRows, pieceStats, scheduledItems, linkSummary, usage] = await Promise.all([
    db
      .select({ id: contentStrategiesTable.id })
      .from(contentStrategiesTable)
      .where(eq(contentStrategiesTable.websiteProjectId, projectId))
      .orderBy(desc(contentStrategiesTable.createdAt))
      .limit(1),
    db
      .select({
        status: contentPiecesTable.status,
        value: count(),
      })
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.websiteProjectId, projectId))
      .groupBy(contentPiecesTable.status),
    db
      .select({ value: count() })
      .from(contentItemsTable)
      .innerJoin(contentStrategiesTable, eq(contentItemsTable.strategyId, contentStrategiesTable.id))
      .where(
        and(
          eq(contentStrategiesTable.websiteProjectId, projectId),
          eq(contentItemsTable.status, "draft"),
        ),
      ),
    getProjectInternalLinkSummary(projectId),
    getUsageSummaryForUser(userId),
  ]);

  const byStatus = Object.fromEntries(pieceStats.map((r) => [r.status, r.value]));
  const queuedCalendar = scheduledItems[0]?.value ?? 0;
  const generating = byStatus.generating ?? 0;
  const drafts = byStatus.draft ?? 0;
  const published = byStatus.published ?? byStatus.ready ?? 0;

  const formatDelta = (delta: number | null) => {
    if (delta == null || delta === 0) return null;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta}`;
  };

  const visibilityDeltaLabel = formatDelta(visibility.visibilityDelta);
  const geoDeltaLabel = formatDelta(visibility.geoScoreDelta);

  return (
    <div className="mb-8 paper-card p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-primary" /> Autopilot activity
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {autopilotSettings?.enabled
              ? `${autopilotSettings.cadence === "daily" ? "Daily" : "Weekly"} · ${autopilotSettings.publishMode} publish mode${
                  autopilotSettings.cadence === "daily" ? " · ~1 article/day when calendar has topics" : ""
                }`
              : "Autopilot is off — enable in Publishing settings"}
          </p>
          {!usage.usesByok && (
            <p className="text-xs text-muted-foreground mt-1">
              {usage.articlesThisMonth} articles generated this month
              {usage.quota != null ? ` (platform key)` : ""}
            </p>
          )}
          {usage.usesByok && (
            <p className="text-xs text-muted-foreground mt-1">BYOK — unlimited AI generations</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button asChild variant="outline" size="sm">
            <Link href="/search/visibility">Visibility</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${projectId}?tab=publishing`}>Manage</Link>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
        <div className="rounded-lg bg-secondary/40 px-3 py-3">
          <p className="text-2xl font-bold">{queuedCalendar}</p>
          <p className="text-xs text-muted-foreground mt-1">Calendar queued</p>
        </div>
        <div className="rounded-lg bg-secondary/40 px-3 py-3">
          <p className="text-2xl font-bold">{generating + drafts}</p>
          <p className="text-xs text-muted-foreground mt-1">Drafts / generating</p>
        </div>
        <div className="rounded-lg bg-secondary/40 px-3 py-3">
          <p className="text-2xl font-bold">{published}</p>
          <p className="text-xs text-muted-foreground mt-1">Published</p>
        </div>
        <div className="rounded-lg bg-violet-50/80 dark:bg-violet-500/10 px-3 py-3">
          <p className="text-2xl font-bold">{visibility.visibilityScore}%</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            AI visibility
            {visibilityDeltaLabel && (
              <span className={`inline-flex items-center gap-0.5 ${visibility.visibilityDelta! > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {visibility.visibilityDelta! > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {visibilityDeltaLabel}
              </span>
            )}
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50/80 dark:bg-emerald-500/10 px-3 py-3">
          <p className="text-2xl font-bold">
            {visibility.latestGeoScore ?? "—"}
            {visibility.latestGeoScore != null && (
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            GEO score
            {geoDeltaLabel && (
              <span className={`inline-flex items-center gap-0.5 ${visibility.geoScoreDelta! > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {visibility.geoScoreDelta! > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {geoDeltaLabel}
              </span>
            )}
          </p>
        </div>
        <div className="rounded-lg bg-secondary/40 px-3 py-3">
          <p className="text-2xl font-bold">{linkSummary.coverageScore}%</p>
          <p className="text-xs text-muted-foreground mt-1">Link coverage</p>
        </div>
        <div className="rounded-lg bg-secondary/40 px-3 py-3">
          <p className="text-2xl font-bold">{linkSummary.suggestionCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Link suggestions</p>
        </div>
        <div className="rounded-lg bg-secondary/40 px-3 py-3">
          <p className="text-2xl font-bold">{linkSummary.appliedInternalLinks}</p>
          <p className="text-xs text-muted-foreground mt-1">Links in drafts</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <Link href="/search/visibility" className="inline-flex items-center gap-1 text-primary hover:underline">
          <Eye className="h-3 w-3" /> AI visibility dashboard
        </Link>
        <Link href="/audit" className="text-primary hover:underline">GEO audit →</Link>
        {linkSummary.pageCount > 0 && (
          <Link href="/search/site" className="inline-flex items-center gap-1 text-primary hover:underline">
            <Link2 className="h-3 w-3" /> Internal link hub
          </Link>
        )}
      </div>
      {strategyRows.length === 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          No content calendar yet.{" "}
          <Link href={`/projects/${projectId}?tab=strategy`} className="text-primary hover:underline">
            Generate a 30-day plan →
          </Link>
        </p>
      )}
    </div>
  );
}

export async function DashboardVisibility({
  userId,
  projectId,
}: {
  userId: number;
  projectId: number;
}) {
  const project = await getAccessibleProject(projectId, userId);
  if (!project) return null;

  const summary = await loadProjectVisibilitySummary(project.id);
  const visibilityScore = summary.visibilityScore;
  const geoScore = summary.latestGeoScore;

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2">
      <Link
        href="/search/visibility"
        className="block rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-500/5 p-4 hover:border-violet-300 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-800 dark:text-violet-300">
          <Eye className="h-4 w-4" /> AI Visibility
        </div>
        <p className="text-2xl font-bold mt-1">{visibilityScore != null ? `${visibilityScore}%` : "—"}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Brand citation rate across ChatGPT, Perplexity, Claude, Gemini
        </p>
      </Link>
      <Link
        href="/audit"
        className="block rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-4 hover:border-emerald-300 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          GEO Score
        </div>
        <p className="text-2xl font-bold mt-1">
          {geoScore ?? "—"}
          {geoScore != null && (
            <span className="text-base font-normal text-muted-foreground">/100</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Latest technical GEO audit</p>
      </Link>
    </div>
  );
}

export async function DashboardDrafts({
  userId,
  projectId,
}: {
  userId: number;
  projectId: number;
}) {
  const access = await requireProjectAccess(projectId, userId);
  if (!access.ok) return null;

  const drafts = await db
    .select({
      id: contentPiecesTable.id,
      title: contentPiecesTable.title,
      projectName: websiteProjectsTable.name,
    })
    .from(contentPiecesTable)
    .innerJoin(
      websiteProjectsTable,
      eq(contentPiecesTable.websiteProjectId, websiteProjectsTable.id),
    )
    .where(
      and(
        eq(websiteProjectsTable.id, projectId),
        eq(contentPiecesTable.status, "draft"),
      ),
    )
    .orderBy(desc(contentPiecesTable.updatedAt))
    .limit(10);

  if (drafts.length === 0) return null;

  return (
    <div className="mb-8 paper-card border-l-4 border-l-(--accent-warm) p-4">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-(--accent-warm)" />
        <span className="text-sm font-semibold text-foreground">
          {drafts.length} draft{drafts.length !== 1 ? "s" : ""} need your review
        </span>
      </div>
      <div className="space-y-1">
        {drafts.slice(0, 5).map((draft) => (
          <Link
            key={draft.id}
            href={contentPiecePath(projectId, draft.id)}
            className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary/60"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm font-medium text-foreground">
              {draft.title}
            </span>
            {draft.projectName && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {draft.projectName}
              </span>
            )}
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export async function DashboardRecentArticles({
  userId,
  projectId,
}: {
  userId: number;
  projectId?: number | null;
}) {
  if (!projectId) return null;

  const access = await requireProjectAccess(projectId, userId);
  if (!access.ok) return null;

  const recentArticles = await db
    .select({
      id: contentPiecesTable.id,
      title: contentPiecesTable.title,
      targetKeyword: contentPiecesTable.targetKeyword,
      status: contentPiecesTable.status,
      wordCount: contentPiecesTable.wordCount,
    })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.websiteProjectId, projectId))
    .orderBy(desc(contentPiecesTable.updatedAt))
    .limit(5);

  if (recentArticles.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent content</h2>
        <Link
          href={`/projects/${projectId}/content-studio`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="paper-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Keyword</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Words</th>
            </tr>
          </thead>
          <tbody>
            {recentArticles.map((article, i) => (
              <tr
                key={article.id}
                className={i < recentArticles.length - 1 ? "border-b border-border" : ""}
              >
                <td className="px-4 py-3">
                  <Link
                    href={contentPiecePath(projectId, article.id)}
                    className="hover:underline font-medium line-clamp-1"
                  >
                    {article.title ?? "Untitled"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {article.targetKeyword ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_BADGE[article.status] ?? "muted"} className="capitalize">
                    {article.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
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

export async function DashboardProjects({
  userId,
  projectId,
}: {
  userId: number;
  projectId: number;
}) {
  const project = await getAccessibleProject(projectId, userId);
  const projects = project ? [project] : [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Active project</h2>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {projects.length === 0 ? (
        <div className="paper-card p-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            No projects yet. Create one to use the content studio and roadmaps.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/projects">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="paper-card p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{project.url}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
