import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db/schema";
import { desc, inArray } from "drizzle-orm";
import type {
  DashboardAutopilotSettings,
  DashboardCommandCenter,
  DashboardPiece,
  DashboardProject,
} from "@workspace/app-shell";
import { parseAutopilotSettings } from "@workspace/content-engine/support/autopilot/autopilot-scheduler";
import { loadCommandCenterSummary } from "@workspace/content-engine/analytics/command-center-service";
import {
  getAccessibleProject,
  listAccessibleProjectIds,
} from "@/lib/org/org-access";

export type DashboardPageData = {
  projects: DashboardProject[];
  activeProject: DashboardProject | null;
  pieces: DashboardPiece[];
  autopilotSettings: DashboardAutopilotSettings | null;
  commandCenter: DashboardCommandCenter | null;
};

function mapProject(row: { id: number; name: string; url: string }): DashboardProject {
  return { id: row.id, name: row.name, url: row.url };
}

export async function loadDashboardData(
  userId: number,
  activeProjectId: number | null,
  supportOrganizationId?: number | null,
): Promise<DashboardPageData> {
  const accessibleIds = await listAccessibleProjectIds(userId, supportOrganizationId);

  let projects: DashboardProject[] = [];
  if (accessibleIds.length > 0) {
    const rows = await db
      .select({
        id: websiteProjectsTable.id,
        name: websiteProjectsTable.name,
        url: websiteProjectsTable.url,
      })
      .from(websiteProjectsTable)
      .where(inArray(websiteProjectsTable.id, accessibleIds))
      .orderBy(websiteProjectsTable.id);
    projects = rows.map(mapProject);
  }

  const scopedProjectIds = activeProjectId ? [activeProjectId] : accessibleIds;

  let activeProject: DashboardProject | null = null;
  let autopilotSettings: DashboardAutopilotSettings | null = null;
  let commandCenter: DashboardCommandCenter | null = null;

  if (activeProjectId) {
    const project = await getAccessibleProject(activeProjectId, userId);
    if (project) {
      activeProject = mapProject(project);
      autopilotSettings = parseAutopilotSettings(project.autopilotSettings);
      commandCenter = await loadCommandCenterSummary(activeProjectId);
    }
  }

  let pieces: DashboardPiece[] = [];
  if (scopedProjectIds.length > 0) {
    const nameById = new Map(projects.map((project) => [project.id, project.name]));

    const pieceRows = await db
      .select({
        id: contentPiecesTable.id,
        title: contentPiecesTable.title,
        status: contentPiecesTable.status,
        targetKeyword: contentPiecesTable.targetKeyword,
        wordCount: contentPiecesTable.wordCount,
        websiteProjectId: contentPiecesTable.websiteProjectId,
      })
      .from(contentPiecesTable)
      .where(inArray(contentPiecesTable.websiteProjectId, scopedProjectIds))
      .orderBy(desc(contentPiecesTable.updatedAt));

    pieces = pieceRows.map((row) => ({
      id: row.id,
      title: row.title ?? "",
      status: row.status,
      targetKeyword: row.targetKeyword,
      wordCount: row.wordCount,
      websiteProjectId: row.websiteProjectId,
      projectName: nameById.get(row.websiteProjectId),
    }));
  }

  return {
    projects,
    activeProject,
    pieces,
    autopilotSettings,
    commandCenter,
  };
}
