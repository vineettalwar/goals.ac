import type { ReactNode } from "react";
import { Globe, ExternalLink, Trash2 } from "lucide-react";
import { APP_SHELL_PAGE } from "../shell-constants";

export type ProjectLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export type ProjectListItem = {
  id: number;
  name: string;
  url: string;
  scrapeStatus: string | null;
  industry: string | null;
};

export function projectDetailPath(projectId: number | string): string {
  return `/projects/${projectId}`;
}

function getScrapeStatus(status: string | null): { label: string; className: string } {
  if (status === "complete") return { label: "Ready", className: "bg-emerald-100 text-emerald-800" };
  return { label: status ?? "New", className: "bg-muted text-muted-foreground" };
}

function ProjectLink({
  renderLink,
  ...props
}: ProjectLinkProps & { renderLink: (props: ProjectLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
}

function DeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-700"
      aria-label={label}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

export function ProjectsView({
  quotaLabel,
  projects,
  newProjectAction,
  renderLink,
  onDeleteProject,
}: {
  quotaLabel: string | null;
  projects: ProjectListItem[];
  newProjectAction: ReactNode;
  renderLink: (props: ProjectLinkProps) => ReactNode;
  onDeleteProject?: (project: ProjectListItem) => void;
}) {
  return (
    <div className={APP_SHELL_PAGE}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each project is a website with its own content strategy, roadmap, and studio.
          </p>
          {quotaLabel ? <p className="mt-1 text-xs text-muted-foreground">{quotaLabel}</p> : null}
        </div>
        {newProjectAction}
      </div>

      {projects.length === 0 ? (
        <ProjectsEmptyState newProjectAction={newProjectAction} />
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => {
            const status = getScrapeStatus(project.scrapeStatus);
            return (
              <div
                key={project.id}
                className="flex items-center gap-4 rounded-lg p-5 transition-colors hover:bg-secondary/20"
              >
                <ProjectLink
                  renderLink={renderLink}
                  href={projectDetailPath(project.id)}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{project.name}</p>
                      <span
                        className={`inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{project.url}</p>
                    {project.industry ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{project.industry}</p>
                    ) : null}
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </ProjectLink>
                {onDeleteProject ? (
                  <DeleteButton onClick={() => onDeleteProject(project)} label={`Delete ${project.name}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectsEmptyState({ newProjectAction }: { newProjectAction: ReactNode }) {
  return (
    <div className="py-12">
      <p className="font-medium">No projects yet</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Create a project to plan strategy, roadmaps, and SEO articles for your site.
      </p>
      <div className="mt-5">{newProjectAction}</div>
    </div>
  );
}
