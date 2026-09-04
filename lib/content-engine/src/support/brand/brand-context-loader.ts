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
import { describeStyleVector, isEmptyStyleVector } from "../../brand/style-vector";

/** Renders the measured style vector (when present and non-empty) into a
 * prompt-ready line to sit alongside the qualitative voice tone. Projects
 * scanned before the style vector existed simply get the qualitative tone
 * back unchanged. */
function withMeasuredStyle(
  voiceTone: string,
  brandMemory: BrandProfile["brandMemory"] | undefined,
): string {
  // Only ever an addition to a voice the project already has. The voice gate
  // (evaluateProjectVoiceReady) treats a non-empty voiceTone as proof that a
  // brand voice exists, so returning measured style for a project whose tone
  // is empty would quietly satisfy the gate and let generation run on a
  // project that never got a voice.
  if (!voiceTone.trim()) return voiceTone;

  const vector = brandMemory?.styleVector;
  if (!vector || isEmptyStyleVector(vector)) return voiceTone;

  const measured = describeStyleVector(vector);
  if (!measured) return voiceTone;

  return `${voiceTone.trim()}\n\n${measured}`;
}

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
    voiceTone: withMeasuredStyle(brandProfile?.voiceTone ?? "", brandProfile?.brandMemory),
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
