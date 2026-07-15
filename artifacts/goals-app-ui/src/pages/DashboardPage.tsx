import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  DashboardView,
  type DashboardAutopilotSavePayload,
  type DashboardAutopilotSettings,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { apiFetch } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";

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
  const queryClient = useQueryClient();
  const { projectId, projects, loading: projectsLoading } = useActiveProject();
  const { loading, error, activeProject, pieces, autopilotSettings, commandCenter, articleUsage } =
    useDashboardData(projectId, projects);

  const [settings, setSettings] = useState<DashboardAutopilotSettings | null>(autopilotSettings);
  const [savingAutopilot, setSavingAutopilot] = useState(false);
  const [saveAutopilotError, setSaveAutopilotError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    setSettings(autopilotSettings);
  }, [autopilotSettings, activeProject?.id]);

  const onSaveAutopilot = useCallback(
    async (payload: DashboardAutopilotSavePayload) => {
      if (!activeProject?.id) return;
      setSavingAutopilot(true);
      setSaveAutopilotError(null);
      try {
        const updated = await apiFetch<DashboardAutopilotSettings>(
          `/api/website-projects/${activeProject.id}/autopilot-settings`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        setSettings(updated);
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(projectId) });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.autopilot(String(activeProject.id)),
        });
      } catch (err) {
        setSaveAutopilotError(
          err instanceof Error ? err.message : "Failed to save autopilot settings",
        );
      } finally {
        setSavingAutopilot(false);
      }
    },
    [activeProject?.id, projectId, queryClient],
  );

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
        autopilotSettings={settings}
        commandCenter={commandCenter}
        articleUsage={articleUsage}
        onSaveAutopilot={activeProjectId ? onSaveAutopilot : undefined}
        savingAutopilot={savingAutopilot}
        saveAutopilotError={saveAutopilotError}
        renderLink={({ href, className, children }) => (
          <Link to={href} className={className}>
            {children}
          </Link>
        )}
      />
    </>
  );
}
