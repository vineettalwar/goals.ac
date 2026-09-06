import type { ReactNode } from "react";
import { cn } from "../cn";
import { APP_SHELL_PAGE } from "../shell-constants";
import type { SectionLinkProps, SectionProject, SectionTab } from "./types";

function SectionLink({
  renderLink,
  ...props
}: SectionLinkProps & { renderLink: (props: SectionLinkProps) => ReactNode }) {
  return <>{renderLink(props)}</>;
}

export function SectionTabNav({
  tabs,
  projectId: _projectId,
  renderLink,
}: {
  tabs: SectionTab[];
  projectId?: string;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  if (tabs.length === 0) return null;

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <SectionLink
          key={tab.to}
          renderLink={renderLink}
          href={tab.to}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
        >
          {tab.label}
        </SectionLink>
      ))}
    </nav>
  );
}

export function HubCard({
  href,
  title,
  hint,
  renderLink,
}: {
  href: string;
  title: string;
  hint: string;
  renderLink: (props: SectionLinkProps) => ReactNode;
}) {
  return (
    <SectionLink
      renderLink={renderLink}
      href={href}
      className="paper-card block p-4 transition-colors hover:bg-secondary/20"
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </SectionLink>
  );
}

export function DataPanel({
  title,
  empty,
  error,
  children,
}: {
  title: string;
  empty?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {error ? <p className="mb-2 text-sm text-red-700">{error}</p> : null}
      <div className="paper-card divide-y overflow-hidden">
        {children}
        {empty ? <p className="p-4 text-sm text-muted-foreground">{empty}</p> : null}
      </div>
    </section>
  );
}

export function DataRow({
  primary,
  secondary,
  href,
  renderLink,
}: {
  primary: string;
  secondary?: string;
  href?: string;
  renderLink?: (props: SectionLinkProps) => ReactNode;
}) {
  const className = "flex justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-secondary/20";
  const body = (
    <>
      <span className="truncate font-medium">{primary}</span>
      {secondary ? <span className="shrink-0 text-muted-foreground">{secondary}</span> : null}
    </>
  );

  if (href && renderLink) {
    return (
      <SectionLink renderLink={renderLink} href={href} className={className}>
        {body}
      </SectionLink>
    );
  }

  return <div className={className}>{body}</div>;
}

export function SectionShell({
  title,
  description,
  tabs,
  children,
  requireProject = true,
  renderLink,
  projectSwitcher,
  projects,
  projectId,
  activeProject,
  onProjectChange,
  projectsLoading,
  projectsError,
  formatProjectLabel,
}: {
  title: string;
  description: string;
  tabs?: SectionTab[];
  children: ReactNode;
  requireProject?: boolean;
  renderLink: (props: SectionLinkProps) => ReactNode;
  projectSwitcher?: ReactNode;
  projects?: SectionProject[];
  projectId?: string;
  activeProject?: SectionProject | null;
  onProjectChange?: (id: string) => void;
  projectsLoading?: boolean;
  projectsError?: string | null;
  formatProjectLabel?: (project: SectionProject) => string;
}) {
  const projectList = projects ?? [];
  const showBuiltInSwitcher =
    !projectSwitcher && requireProject && projectList.length > 0 && onProjectChange;

  return (
    <div className={APP_SHELL_PAGE}>
      <h1 className="mb-2 text-2xl font-bold">{title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{description}</p>

      {projectsError ? <p className="mb-4 text-sm text-red-700">{projectsError}</p> : null}

      {projectSwitcher}

      {showBuiltInSwitcher ? (
        <label className="mb-4 block max-w-md text-sm">
          <span className="mb-1 block font-medium">Active project</span>
          <select
            value={projectId ?? ""}
            onChange={(e) => onProjectChange?.(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            {projectList.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {formatProjectLabel ? formatProjectLabel(project) : project.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {tabs && tabs.length > 0 ? (
        <SectionTabNav tabs={tabs} projectId={projectId} renderLink={renderLink} />
      ) : null}

      {projectsLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {!projectsLoading && requireProject && projectList.length === 0 ? (
        <p className="text-sm text-muted-foreground">Create a project from the dashboard first.</p>
      ) : null}

      {!projectsLoading && (!requireProject || projectList.length > 0) ? (
        <>
          {activeProject && requireProject ? (
            <p className="mb-4 text-xs text-muted-foreground">
              Project: <span className="font-medium text-foreground">{activeProject.name}</span>
              {" · "}
              <SectionLink
                renderLink={renderLink}
                href={`/projects/${activeProject.id}`}
                className="font-medium text-primary hover:underline"
              >
                Open overview
              </SectionLink>
            </p>
          ) : null}
          {children}
        </>
      ) : null}
    </div>
  );
}

export function SectionDetailLayout({
  backHref,
  backLabel,
  title,
  error,
  notFoundMessage,
  children,
  renderLink,
  className,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  error?: string | null;
  notFoundMessage?: string;
  children?: ReactNode;
  renderLink: (props: SectionLinkProps) => ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(APP_SHELL_PAGE, className)}>
      <SectionLink
        renderLink={renderLink}
        href={backHref}
        className="text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        {backLabel}
      </SectionLink>
      <h1 className="mb-4 mt-4 text-2xl font-bold">{title}</h1>
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      {notFoundMessage ? <p className="text-sm text-muted-foreground">{notFoundMessage}</p> : null}
      {children}
    </div>
  );
}
