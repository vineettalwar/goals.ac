import type { ReactNode } from "react";
import { ArrowRight, FileText, FolderOpen, Plus, Zap } from "lucide-react";
import { cn } from "../cn";
import {
  contentPiecePath,
  countByStatus,
  type DashboardLinkProps,
  type DashboardPiece,
  type DashboardProject,
} from "./types";

function DashLink({
  renderLink,
  ...props
}: DashboardLinkProps & {
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  return <>{renderLink(props)}</>;
}

function Badge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const STATUS_BADGE: Record<string, string> = {
    ready: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    published: "bg-primary text-primary-foreground",
    generating: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    pending: "bg-muted text-muted-foreground",
    draft: "bg-muted text-muted-foreground",
    failed: "bg-red-500/15 text-red-700 dark:text-red-300",
  };
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
