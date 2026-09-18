'use server';

import { getSession } from "@/auth";
import { loadDashboardData } from "@/lib/dashboard/load-dashboard-data";
import { resolveActiveProjectId } from "@/lib/active-project/server";
import { getSupportOrganizationId } from "@/lib/org/project-scope";

export type DashboardPageData = Awaited<ReturnType<typeof loadDashboardData>>;

export async function fetchDashboardData(): Promise<DashboardPageData | null> {
  const session = await getSession();
  if (!session) return null;

  const userId = parseInt(session.user.id, 10);
  const supportOrganizationId = getSupportOrganizationId(session);
  const activeProjectId = await resolveActiveProjectId(userId, supportOrganizationId);
  
  return loadDashboardData(userId, activeProjectId, supportOrganizationId);
}