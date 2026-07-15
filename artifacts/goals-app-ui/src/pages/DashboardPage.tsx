import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardView } from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import { useDashboardData } from "@/hooks/use-dashboard-data";

function dashboardGreeting(name?: string | null) {
  const hour = new Date().getHours();
  const time =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name?.trim().split(" ")[0];
  return first ? `${time}, ${first}` : time;
}

function dashboardSubtitle(
  activeProjectName: string | null,
  projectCount: number,
): string | null {
  if (activeProjectName) return activeProjectName;
  if (projectCount === 0) {
    return "Create a project to generate and publish content";
  }
  return null;
}

export function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { projectId, projects, loading: projectsLoading } = useActiveProject();
  const { loading, error, activeProject, pieces, autopilotSettings, commandCenter, articleUsage } =
    useDashboardData(projectId, projects);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  if ((authLoading && !user) || (projectsLoading && projects.length === 0) || (loading && !activeProject && pieces.length === 0)) {
    return <p className="p-8 text-muted-foreground">Loading…</p>;
  }

  const activeProjectId = activeProject?.id ?? null;

  return (
    <>
      {error ? (
        <p className="px-4 pt-8 text-sm text-red-700 sm:px-6 lg:px-8">{error}</p>
      ) : null}
      <DashboardView
        greeting={dashboardGreeting(user?.name)}
        subtitle={dashboardSubtitle(activeProject?.name ?? null, projects.length)}
        projectCount={activeProjectId ? 1 : projects.length}
        scopedToActiveProject={Boolean(activeProjectId)}
        activeProject={activeProject}
        activeProjectId={activeProjectId}
        pieces={pieces}
        autopilotSettings={autopilotSettings}
        commandCenter={commandCenter}
        articleUsage={articleUsage}
        renderLink={({ href, className, children }) => (
          <Link to={href} className={className}>
            {children}
          </Link>
        )}
      />
    </>
  );
}
