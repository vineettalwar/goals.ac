import { db } from "@workspace/db";
import {
  brandProfilesTable,
  organizationsTable,
  websiteProjectsTable,
  type BrandProfile,
  type ContentStyle,
  type OrgVertical,
  type WebsiteProject,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import {
  type HumanizationLevel,
  type UnifiedBrandContext,
  normalizeSiteHost,
} from "../../brand/brand-voice";

type CompanyLike = {
  name: string;
  websiteUrl: string;
  industry: string;
  targetAudience: string;
  humanizationLevel?: string | null;
  writingSample?: string | null;
};

function brandProfileToContext(
  project: Pick<WebsiteProject, "name" | "url" | "contentStyle">,
  brandProfile: BrandProfile | null | undefined,
  overrides?: Partial<UnifiedBrandContext>,
): UnifiedBrandContext {
  const contentStyle = (project.contentStyle as ContentStyle | null) ?? null;
  return {
    companyName: brandProfile?.companyName ?? project.name,
    websiteUrl: project.url,
    industry: brandProfile?.industry ?? "",
    targetAudience: brandProfile?.targetAudience ?? "",
    voiceTone: brandProfile?.voiceTone ?? "",
    primaryKeywords: brandProfile?.primaryKeywords ?? [],
    writingExamples: brandProfile?.writingExamples ?? [],
    brandGlossary: brandProfile?.brandGlossary ?? [],
    antiPatterns: brandProfile?.antiPatterns ?? [],
    typicalStructure: brandProfile?.typicalStructure ?? "",
    doWords: brandProfile?.doWords ?? [],
    dontWords: brandProfile?.dontWords ?? [],
    brandMemory: brandProfile?.brandMemory ?? null,
    platformVoices: brandProfile?.platformVoices ?? null,
    contentStyle,
    humanizationLevel: contentStyle?.humanizationLevel ?? "light",
    writingSample: contentStyle?.writingSample ?? null,
    brandVoiceSkill: brandProfile?.brandVoiceSkill ?? "",
    skillLocked: brandProfile?.skillLocked ?? false,
    ...overrides,
  };
}

/** Org vertical for a project, via its organization. Null when the project has no
 * organization or the organization has not set a vertical yet. */
export async function resolveOrgVerticalForProject(
  projectId: number,
): Promise<OrgVertical | null> {
  const [row] = await db
    .select({ vertical: organizationsTable.vertical })
    .from(websiteProjectsTable)
    .innerJoin(organizationsTable, eq(websiteProjectsTable.organizationId, organizationsTable.id))
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  return row?.vertical ?? null;
}

/** Caller must enforce project access (e.g. requireProjectAccess) when userId is set. */
export async function loadBrandContextForProject(
  projectId: number,
  _userId?: number,
): Promise<UnifiedBrandContext | null> {
  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) return null;

  const [brandProfile] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const vertical = await resolveOrgVerticalForProject(projectId);

  return brandProfileToContext(project, brandProfile, { projectId, vertical });
}

export async function findProjectIdForWebsiteUrl(
  userId: number,
  websiteUrl: string,
): Promise<number | null> {
  const targetHost = normalizeSiteHost(websiteUrl);
  const projects = await db
    .select({ id: websiteProjectsTable.id, url: websiteProjectsTable.url })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.userId, userId));

  for (const project of projects) {
    if (normalizeSiteHost(project.url) === targetHost) {
      return project.id;
    }
  }
  return null;
}

export async function loadBrandContextForCompany(
  userId: number,
  company: CompanyLike,
): Promise<UnifiedBrandContext> {
  const projectId = await findProjectIdForWebsiteUrl(userId, company.websiteUrl);
  if (projectId) {
    const projectBrand = await loadBrandContextForProject(projectId, userId);
    if (projectBrand) {
      const companyLevel = company.humanizationLevel as HumanizationLevel | undefined;
      return {
        ...projectBrand,
        humanizationLevel:
          projectBrand.contentStyle?.humanizationLevel ??
          (companyLevel === "off" || companyLevel === "light" || companyLevel === "strong"
            ? companyLevel
            : projectBrand.humanizationLevel),
        writingSample: projectBrand.writingSample ?? company.writingSample ?? null,
        writingExamples:
          (projectBrand.writingExamples ?? []).length > 0
            ? projectBrand.writingExamples ?? []
            : company.writingSample
              ? [company.writingSample]
              : [],
      };
    }
  }

  const companyLevel = company.humanizationLevel;
  return {
    companyName: company.name,
    websiteUrl: company.websiteUrl,
    industry: company.industry,
    targetAudience: company.targetAudience,
    voiceTone: "",
    primaryKeywords: [],
    writingExamples: company.writingSample ? [company.writingSample] : [],
    brandGlossary: [],
    antiPatterns: [],
    typicalStructure: "",
    doWords: [],
    dontWords: [],
    contentStyle: null,
    humanizationLevel:
      companyLevel === "off" || companyLevel === "light" || companyLevel === "strong"
        ? companyLevel
        : "light",
    writingSample: company.writingSample ?? null,
  };
}

export async function syncCompanyHumanizationToProject(
  userId: number,
  company: CompanyLike,
  humanizationLevel: HumanizationLevel,
  writingSample: string | null,
): Promise<void> {
  const projectId = await findProjectIdForWebsiteUrl(userId, company.websiteUrl);
  if (!projectId) return;

  const [project] = await db
    .select({ contentStyle: websiteProjectsTable.contentStyle })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);
  if (!project) return;

  const existing = (project.contentStyle as ContentStyle | null) ?? {};
  await db
    .update(websiteProjectsTable)
    .set({
      contentStyle: {
        ...existing,
        humanizationLevel,
        writingSample,
      },
    })
    .where(eq(websiteProjectsTable.id, projectId));
}
