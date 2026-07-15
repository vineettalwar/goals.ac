import type { ReactNode } from "react";

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

function scrapeBadgeLabel(status: string | null): string {
  if (status === "complete") return "Ready";
  return status ?? "New";
}

function scrapeBadgeClass(status: string | null): string {
  return status === "complete"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-muted text-muted-foreground";
}

function ProjectLink({
  renderLink,
  ...props
}: ProjectLinkProps & { renderLink: (props: ProjectLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
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
    <div className="max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each project is a website with its own content strategy, roadmap, and studio.
          </p>
          {quotaLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">{quotaLabel}</p>
          ) : null}
        </div>
        {newProjectAction}
      </div>

      {projects.length === 0 ? (
        <ProjectsEmptyState newProjectAction={newProjectAction} />
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="paper-card flex items-center gap-4 p-5 transition-colors hover:bg-secondary/20"
            >
              <ProjectLink
                renderLink={renderLink}
                href={projectDetailPath(project.id)}
                className="flex min-w-0 flex-1 items-center gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5 text-muted-foreground"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{project.name}</p>
                    <span
                      className={`inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold ${scrapeBadgeClass(project.scrapeStatus)}`}
                    >
                      {scrapeBadgeLabel(project.scrapeStatus)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{project.url}</p>
                  {project.industry ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{project.industry}</p>
                  ) : null}
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <path d="M15 3h6v6" />
                  <path d="M10 14 21 3" />
                </svg>
              </ProjectLink>
              {onDeleteProject ? (
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-700"
                  aria-label={`Delete ${project.name}`}
                  onClick={() => onDeleteProject(project)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectsEmptyState({ newProjectAction }: { newProjectAction: ReactNode }) {
  return (
    <div className="paper-card flex flex-col items-center justify-center gap-4 p-16 text-center">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-10 w-10 text-muted-foreground/40"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <div>
        <p className="font-medium">No projects yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a project to generate content strategies, roadmaps, and SEO articles for your
          website.
        </p>
      </div>
      {newProjectAction}
    </div>
  );
}
