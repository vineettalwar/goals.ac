import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { SectionShell as AppSectionShell, type SectionTab } from "@workspace/app-shell";
import { useActiveProject } from "@/hooks/use-active-project";

type SectionShellProps = {
  title: string;
  description?: string;
  tabs?: SectionTab[];
  children: ReactNode;
  requireProject?: boolean;
};

export function SectionShell({
  title,
  description,
  tabs,
  children,
  requireProject = true,
}: SectionShellProps) {
  const { projects, projectId, activeProject, loading, error, setProjectId } = useActiveProject();
  const { pathname } = useLocation();

  return (
    <AppSectionShell
      title={title}
      description={description}
      tabs={tabs}
      currentPath={pathname}
      requireProject={requireProject}
      projects={projects}
      projectId={projectId}
      activeProject={activeProject}
      onProjectChange={setProjectId}
      projectsLoading={loading && projects.length === 0}
      projectsError={error}
      formatProjectLabel={(project) =>
        `${project.name} — ${project.url?.trim() || "No website"}`
      }
      renderLink={({ href, className, children: linkChildren }) => (
        <Link to={href} className={className}>
          {linkChildren}
        </Link>
      )}
    >
      {children}
    </AppSectionShell>
  );
}
