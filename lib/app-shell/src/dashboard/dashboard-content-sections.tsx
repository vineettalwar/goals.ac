import type { ReactNode } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { cn } from "../cn";
import {
  contentPiecePath,
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

function Badge({ status }: { status: string }) {
  return (
    <span className="text-xs capitalize text-muted-foreground">{status}</span>
  );
}

export function DashboardStatsSection({
  projectCount,
  renderLink,
}: {
  projectCount: number;
  scopedToActiveProject: boolean;
  pieces: DashboardPiece[];
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  if (projectCount === 0) {
    return (
      <div 
        className={cn(
          "flex flex-col gap-4 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between",
          "paper-card-enhanced"
        )}
      >
        <div>
          <p className="font-medium">Create your first project</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Add a website to generate and publish SEO articles.
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
  return null;
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
      className="paper-card-enhanced"
      aria-labelledby="drafts-review-heading"
    >
      <h2 id="drafts-review-heading" className="mb-3 text-sm font-semibold">
        {drafts.length} draft{drafts.length !== 1 ? "s" : ""} to review
      </h2>
      <ul className="divide-y divide-border border-t border-border">
        {drafts.slice(0, 5).map((draft) => (
          <li key={draft.id}>
            <DashLink
              renderLink={renderLink}
              href={contentPiecePath(draft.websiteProjectId, draft.id)}
              className="group flex items-center gap-3 py-3 text-sm transition-colors hover:text-primary"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{draft.title}</span>
              {draft.projectName ? (
                <span className="shrink-0 text-xs text-muted-foreground">{draft.projectName}</span>
              ) : null}
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </DashLink>
          </li>
        ))}
      </ul>
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

  return (
    <section className="paper-card-enhanced">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold">Recent</h2>
        <DashLink
          renderLink={renderLink}
          href={`/projects/${projectId}/content-studio`}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </DashLink>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Title</th>
              <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Keyword</th>
              <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Status</th>
              <th className="py-2 text-left font-medium text-muted-foreground">Words</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((article, index) => (
              <tr
                key={article.id}
                className={cn(index < recent.length - 1 ? "border-b border-border/70" : "")}
              >
                <td className="py-3 pr-4">
                  <DashLink
                    renderLink={renderLink}
                    href={contentPiecePath(projectId, article.id)}
                    className="line-clamp-1 font-medium hover:underline"
                  >
                    {article.title || "Untitled"}
                  </DashLink>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">{article.targetKeyword ?? "—"}</td>
                <td className="py-3 pr-4">
                  <Badge status={article.status} />
                </td>
                <td className="py-3 tabular-nums text-muted-foreground">
                  {article.wordCount && article.wordCount > 0
                    ? article.wordCount.toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
    <section className="paper-card-enhanced">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold">Project</h2>
        <DashLink
          renderLink={renderLink}
          href="/projects"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          All projects
        </DashLink>
      </div>
      {!project ? (
        <p className="text-sm text-muted-foreground">
          No project selected.{" "}
          <DashLink renderLink={renderLink} href="/projects" className="font-medium text-foreground hover:underline">
            Create one
          </DashLink>
        </p>
      ) : (
        <DashLink
          renderLink={renderLink}
          href={`/projects/${project.id}`}
          className="block text-sm transition-colors hover:text-primary"
        >
          <span className="font-medium">{project.name}</span>
          <span className="mt-0.5 block truncate text-muted-foreground">{project.url}</span>
        </DashLink>
      )}
    </section>
  );
}
