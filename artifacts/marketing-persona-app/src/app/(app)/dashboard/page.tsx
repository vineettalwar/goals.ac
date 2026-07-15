import { getSession } from "@/auth";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";
import { resolveActiveProjectId } from "@/lib/active-project/server";
import { loadDashboardData } from "@/lib/dashboard/load-dashboard-data";
import { getSupportOrganizationId } from "@/lib/org/project-scope";

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

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const userId = parseInt(session.user.id, 10);
  const supportOrganizationId = getSupportOrganizationId(session);
  const activeProjectId = await resolveActiveProjectId(userId, supportOrganizationId);
  const data = await loadDashboardData(userId, activeProjectId, supportOrganizationId);

  return (
    <DashboardPageClient
      greeting={dashboardGreeting(session.user.name)}
      subtitle={dashboardSubtitle(data.activeProject?.name ?? null, data.projects.length)}
      projects={data.projects}
      activeProject={data.activeProject}
      pieces={data.pieces}
      autopilotSettings={data.autopilotSettings}
      commandCenter={data.commandCenter}
    />
  );
}
