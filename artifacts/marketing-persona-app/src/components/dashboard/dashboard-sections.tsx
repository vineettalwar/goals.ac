import { db } from "@workspace/db";
import {
  companiesTable,
  scheduledArticlesTable,
  marketingPersonasTable,
  websiteProjectsTable,
  contentPiecesTable,
} from "@workspace/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import Link from "next/link";
import { Zap, FileText, Users, FolderOpen, ArrowRight, Plus, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseAutopilotSettings } from "@workspace/content-engine/support/autopilot-scheduler";
import { loadProjectVisibilitySummary } from "@/lib/project-visibility-summary";

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

export async function DashboardCompanySubtitle({ userId }: { userId: number }) {
  const [company] = await db
    .select({ name: companiesTable.name })
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);

  if (!company) return null;

  return (
    <p className="mt-1 text-muted-foreground">{company.name} · Content Autopilot</p>
  );
}

export async function DashboardStats({ userId }: { userId: number }) {
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);

  if (!company) {
    return (
      <div className="mb-8 paper-card p-6 flex items-center justify-between">
        <div>
          <p className="font-medium">Set up your autopilot</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Add your company to start generating SEO articles automatically.
          </p>
        </div>
        <Button asChild>
          <Link href="/onboarding">
            <Plus className="h-4 w-4 mr-1.5" /> Get started
          </Link>
        </Button>
      </div>
    );
  }

  const [personaResult, readyResult, publishedResult] = await Promise.all([
    db
      .select({ value: count() })
      .from(marketingPersonasTable)
      .where(eq(marketingPersonasTable.companyId, company.id)),
    db
      .select({ value: count() })
      .from(scheduledArticlesTable)
      .where(
        and(
          eq(scheduledArticlesTable.companyId, company.id),
          eq(scheduledArticlesTable.status, "ready"),
        ),
      ),
    db
      .select({ value: count() })
      .from(scheduledArticlesTable)
      .where(
        and(
          eq(scheduledArticlesTable.companyId, company.id),
          eq(scheduledArticlesTable.status, "published"),
        ),
      ),
  ]);

  const personaCount = personaResult[0]?.value ?? 0;
  const readyCount = readyResult[0]?.value ?? 0;
  const publishedCount = publishedResult[0]?.value ?? 0;

  return (
    <div className="mb-8 grid grid-cols-3 gap-4">
      <div className="paper-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ready to publish
          </p>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-bold">{readyCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">articles awaiting review</p>
      </div>
      <div className="paper-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Published
          </p>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-bold">{publishedCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">articles live</p>
      </div>
      <div className="paper-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Personas
          </p>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-bold">{personaCount}</p>
        <p className="mt-1 text-xs text-muted-foreground">audience profiles active</p>
      </div>
    </div>
  );
}

export async function DashboardAutopilotLink({ userId }: { userId: number }) {
  const [project] = await db
    .select({ autopilotSettings: websiteProjectsTable.autopilotSettings })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.userId, userId))
    .limit(1);

  if (!project) return null;

  const autopilotSettings = parseAutopilotSettings(project.autopilotSettings);

  return (
    <Link
      href="/autopilot"
      className="mb-8 block paper-card p-5 hover:bg-secondary/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-primary" /> Content Autopilot
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {autopilotSettings?.enabled
              ? `${autopilotSettings.cadence === "daily" ? "Daily" : "Weekly"} runs · ${autopilotSettings.publishMode} publish`
              : "Autopilot is off — enable scheduled generation and publishing"}
          </p>
        </div>
        <span className="text-xs text-primary shrink-0">Manage →</span>
      </div>
    </Link>
  );
}

export async function DashboardVisibility({ userId }: { userId: number }) {
  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.userId, userId))
    .limit(1);

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
        href="/search/visibility"
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

export async function DashboardDrafts({ userId }: { userId: number }) {
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
        eq(websiteProjectsTable.userId, userId),
        eq(contentPiecesTable.status, "draft"),
      ),
    )
    .orderBy(desc(contentPiecesTable.updatedAt))
    .limit(10);

  if (drafts.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-900/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="font-semibold text-sm text-amber-800 dark:text-amber-300">
          {drafts.length} draft{drafts.length !== 1 ? "s" : ""} need your review
        </span>
      </div>
      <div className="space-y-1">
        {drafts.slice(0, 5).map((draft) => (
          <Link
            key={draft.id}
            href={`/content-piece/${draft.id}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-800/20 transition-colors group"
          >
            <FileText className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
            <span className="text-sm font-medium text-amber-900 dark:text-amber-200 truncate flex-1">
              {draft.title}
            </span>
            {draft.projectName && (
              <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
                {draft.projectName}
              </span>
            )}
            <ArrowRight className="h-3.5 w-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export async function DashboardRecentArticles({ userId }: { userId: number }) {
  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);

  if (!company) return null;

  const recentArticles = await db
    .select()
    .from(scheduledArticlesTable)
    .where(eq(scheduledArticlesTable.companyId, company.id))
    .orderBy(desc(scheduledArticlesTable.createdAt))
    .limit(5);

  if (recentArticles.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent articles</h2>
        <Link
          href="/autopilot/articles"
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
                    href={`/autopilot/articles/${article.id}`}
                    className="hover:underline font-medium line-clamp-1"
                  >
                    {article.title ?? "Untitled"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {article.primaryKeyword ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_BADGE[article.status] ?? "muted"} className="capitalize">
                    {article.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {article.wordCount > 0 ? article.wordCount.toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export async function DashboardProjects({ userId }: { userId: number }) {
  const projects = await db
    .select()
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.userId, userId));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Website projects</h2>
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
          {projects.slice(0, 4).map((project) => (
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
