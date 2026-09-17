import { db } from "@workspace/db";
import { organizationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getOrgMembership, listAccessibleProjects } from "@/lib/org/org-access";
import { loadPartnerOutcomesByProjectId } from "@/lib/org/partner-outcomes";

const PROJECT_CAP = 20;

export type PartnerReportProject = {
  id: number;
  name: string;
  url: string | null;
  draftsNeedingReview: number;
  generatingPieces: number;
  latestGeoScore: number | null;
  llmCitationRate: number | null;
  recentPublishOk: number;
  recentPublishFail: number;
  internalLinkCoverage: number | null;
};

export type PartnerReport = {
  organizationName: string | null;
  generatedAt: string;
  projects: PartnerReportProject[];
};

export async function loadPartnerReport(
  userId: number,
  supportOrganizationId?: number | null,
  organizationNameHint?: string | null,
): Promise<PartnerReport> {
  const projects = await listAccessibleProjects(userId, supportOrganizationId);
  const capped = projects.slice(0, PROJECT_CAP);

  let organizationName = organizationNameHint ?? null;
  if (!organizationName) {
    const membership = await getOrgMembership(userId);
    if (membership) {
      const [org] = await db
        .select({ name: organizationsTable.name })
        .from(organizationsTable)
        .where(eq(organizationsTable.id, membership.organizationId))
        .limit(1);
      organizationName = org?.name ?? null;
    }
  }

  const outcomes = await loadPartnerOutcomesByProjectId(capped.map((p) => p.id));
  const rows: PartnerReportProject[] = capped.map((project) => {
    const summary = outcomes.get(project.id);
    return {
      id: project.id,
      name: project.name,
      url: project.url,
      draftsNeedingReview: summary?.draftsNeedingReview ?? 0,
      generatingPieces: summary?.generatingPieces ?? 0,
      // Slim list path skips geo / LLM / link map (command-center only).
      latestGeoScore: null,
      llmCitationRate: null,
      recentPublishOk: 0,
      recentPublishFail: summary?.recentPublishFail ?? 0,
      internalLinkCoverage: null,
    };
  });

  return {
    organizationName,
    generatedAt: new Date().toISOString(),
    projects: rows,
  };
}

export { loadPartnerOutcomesByProjectId } from "@/lib/org/partner-outcomes";
