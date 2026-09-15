import type { Metadata } from "next";
import { getSession } from "@/auth";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { isSiteAdmin, isSuperAdmin, listAccessibleProjects } from "@/lib/org/org-access";
import { getSupportOrganizationId } from "@/lib/org/project-scope";
import { loadPartnerOutcomesByProjectId } from "@/lib/org/partner-report";
import {
  PartnerWorkspaceClient,
  type PartnerProjectRow,
} from "@/components/partner/partner-workspace-client";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const session = await getSession();
  if (!session) return null;

  const userId = parseInt(session.user.id, 10);
  const supportOrganizationId = getSupportOrganizationId(session);
  const canAccess =
    isSuperAdmin(session.user.role) ||
    isSiteAdmin(session.user.orgRole) ||
    supportOrganizationId != null;

  if (!canAccess) {
    redirect("/dashboard");
  }

  const projects = await listAccessibleProjects(userId, supportOrganizationId);
  const cappedProjects = projects.slice(0, 20);
  const projectIds = cappedProjects.map((p) => p.id);
  const [pieceCounts, outcomesById] = await Promise.all([
    projectIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            projectId: contentPiecesTable.websiteProjectId,
            publishedCount: sql<number>`count(*) filter (where ${contentPiecesTable.status} = 'published')`.mapWith(
              Number,
            ),
            draftCount: sql<number>`count(*) filter (where ${contentPiecesTable.status} != 'published')`.mapWith(
              Number,
            ),
          })
          .from(contentPiecesTable)
          .where(inArray(contentPiecesTable.websiteProjectId, projectIds))
          .groupBy(contentPiecesTable.websiteProjectId),
    loadPartnerOutcomesByProjectId(projectIds),
  ]);

  const countByProject = new Map(
    pieceCounts.map((row) => [
      row.projectId,
      { published: row.publishedCount, draft: row.draftCount },
    ]),
  );

  const rows: PartnerProjectRow[] = cappedProjects
    .map((project) => {
      const counts = countByProject.get(project.id) ?? { published: 0, draft: 0 };
      const outcomes = outcomesById.get(project.id);
      return {
        id: project.id,
        name: project.name,
        url: project.url,
        publishedCount: counts.published,
        draftCount: counts.draft,
        draftsNeedingReview: outcomes?.draftsNeedingReview ?? 0,
        generatingPieces: outcomes?.generatingPieces ?? 0,
        recentPublishFail: outcomes?.recentPublishFail ?? 0,
      };
    })
    .sort(
      (a, b) =>
        b.draftsNeedingReview + b.recentPublishFail - (a.draftsNeedingReview + a.recentPublishFail),
    );

  return <PartnerWorkspaceClient projects={rows} />;
}
