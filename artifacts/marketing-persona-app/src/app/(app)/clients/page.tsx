import type { Metadata } from "next";
import { getSession } from "@/auth";
import { redirect } from "next/navigation";
import { isSiteAdmin, isSuperAdmin, listAccessibleProjects } from "@/lib/org/org-access";
import { getSupportOrganizationId } from "@/lib/org/project-scope";
import { loadPartnerOutcomesByProjectId } from "@/lib/org/partner-outcomes";
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
  const outcomesById = await loadPartnerOutcomesByProjectId(cappedProjects.map((p) => p.id));

  const rows: PartnerProjectRow[] = cappedProjects
    .map((project) => {
      const outcomes = outcomesById.get(project.id);
      return {
        id: project.id,
        name: project.name,
        url: project.url,
        publishedCount: outcomes?.publishedCount ?? 0,
        draftCount: outcomes?.draftCount ?? 0,
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
