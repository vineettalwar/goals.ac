import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db/schema";
import { desc, inArray } from "drizzle-orm";
import type {
  DashboardAutopilotSettings,
  DashboardCommandCenter,
  DashboardPiece,
  DashboardProject,
  DashboardArticleUsage,
} from "@workspace/app-shell/dashboard/types";
import { parseAutopilotSettings } from "@workspace/content-engine/support/autopilot/autopilot-scheduler";
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
  articleUsage: DashboardArticleUsage | null;
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
  const scopedProjectIds = activeProjectId ? [activeProjectId] : accessibleIds;
  const nameByIdPromise =
    accessibleIds.length > 0
      ? db
          .select({
            id: websiteProjectsTable.id,
            name: websiteProjectsTable.name,
            url: websiteProjectsTable.url,
          })
          .from(websiteProjectsTable)
          .where(inArray(websiteProjectsTable.id, accessibleIds))
          .orderBy(websiteProjectsTable.id)
      : Promise.resolve(
          [] as Array<{ id: number; name: string; url: string }>,
        );

  const activeProjectPromise = activeProjectId
    ? getAccessibleProject(activeProjectId, userId)
    : Promise.resolve(null);
  // Command center + usage deferred to client — keep soft-nav to project list + pieces fast.
  const piecesPromise =
    scopedProjectIds.length > 0
      ? db
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
          .orderBy(desc(contentPiecesTable.updatedAt))
      : Promise.resolve(
          [] as Array<{
            id: number;
            title: string | null;
            status: string;
            targetKeyword: string | null;
            wordCount: number | null;
            websiteProjectId: number;
          }>,
        );

  const [projectRows, project, pieceRows] = await Promise.all([
    nameByIdPromise,
    activeProjectPromise,
    piecesPromise,
  ]);

  const projects = projectRows.map(mapProject);
  const nameById = new Map(projects.map((p) => [p.id, p.name]));

  let activeProject: DashboardProject | null = null;
  let autopilotSettings: DashboardAutopilotSettings | null = null;

  if (project) {
    activeProject = mapProject(project);
    autopilotSettings = parseAutopilotSettings(project.autopilotSettings);
  }

  const pieces: DashboardPiece[] = pieceRows.map((row) => ({
    id: row.id,
    title: row.title ?? "",
    status: row.status,
    targetKeyword: row.targetKeyword,
    wordCount: row.wordCount,
    websiteProjectId: row.websiteProjectId,
    projectName: nameById.get(row.websiteProjectId),
  }));

  return {
    projects,
    activeProject,
    pieces,
    autopilotSettings,
    commandCenter: null,
    articleUsage: null,
  };
}
