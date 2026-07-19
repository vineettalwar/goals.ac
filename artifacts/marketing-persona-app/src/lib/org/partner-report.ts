import { loadCommandCenterSummary } from "@workspace/content-engine/analytics/command-center-service";
import { db } from "@workspace/db";
import { organizationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getOrgMembership, listAccessibleProjects } from "@/lib/org/org-access";

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
      latestGeoScore: summary?.latestGeoScore ?? null,
      llmCitationRate: summary?.llmCitationRate ?? null,
      recentPublishOk: summary?.recentPublishOk ?? 0,
      recentPublishFail: summary?.recentPublishFail ?? 0,
      internalLinkCoverage: summary?.internalLinkCoverage ?? null,
    };
  });

  return {
    organizationName,
    generatedAt: new Date().toISOString(),
    projects: rows,
  };
}

/** Map command-center fields onto partner project ids (cap applied). */
export async function loadPartnerOutcomesByProjectId(
  projectIds: number[],
): Promise<Map<number, Omit<PartnerReportProject, "id" | "name" | "url">>> {
  const capped = projectIds.slice(0, PROJECT_CAP);
  const map = new Map<number, Omit<PartnerReportProject, "id" | "name" | "url">>();
  await Promise.all(
    capped.map(async (id) => {
      const summary = await loadCommandCenterSummary(id);
      map.set(id, {
        draftsNeedingReview: summary.draftsNeedingReview,
        generatingPieces: summary.generatingPieces,
        latestGeoScore: summary.latestGeoScore,
        llmCitationRate: summary.llmCitationRate,
        recentPublishOk: summary.publishHealth?.ok ?? 0,
        recentPublishFail: summary.publishHealth?.failed ?? 0,
        internalLinkCoverage: summary.internalLinkCoverage,
      });
    }),
  );
  return map;
}
