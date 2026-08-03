import { db } from "@workspace/db";
import {
  contentPiecesTable,
  briefsTable,
  goalsTable,
  websiteProjectsTable,
  organizationsTable,
  CONTENT_FORMAT_TYPES,
  type ContentFormatType,
} from "@workspace/db/schema";
import type { ContentPieceMetadata } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/org/org-access";
import {
  buildCacheKey,
  type BrandContext,
  type ContentGenerationContext,
} from "@workspace/content-engine/content/content-studio-generator";
import { decryptCmsCredentials, type CmsIntegrationCredentials } from "@workspace/content-engine/support/publishing/cms-integrations";
import { getDefaultOutputMode } from "@workspace/content-engine/support/publishing/platform-output-modes";
import { resolveDefaultIntendedPlatform } from "@workspace/content-engine/support/publishing/intended-destination";
import { parsePublishingSettings } from "@workspace/content-engine/support/publishing/publishing-settings";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand/brand-context-loader";
import { evaluateProjectVoiceReady } from "@workspace/content-engine/brand/project-voice-ready";
import { loadCompetitorGenerationContext } from "@workspace/content-engine/support/competitor/competitor-generation-context";
import {
  normalizeCompetitorUrl,
  normalizeCompetitorUrlList,
} from "@workspace/content-engine/support/competitor/competitor-url";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import type { AiProviderOptions } from "@workspace/ai-providers";
import { z } from "zod";

export const GenerateBody = z
  .object({
    formatType: z.enum(CONTENT_FORMAT_TYPES as unknown as [ContentFormatType, ...ContentFormatType[]]),
    targetKeyword: z.string().min(1, "Target keyword is required"),
    angleHint: z.string().optional(),
    plannedDate: z.string().optional(),
    briefId: z.number().int().positive().optional(),
    /** Optional hint — does not lock publish destination */
    intendedPublishPlatform: z.string().min(1).optional(),
    intendedOutputMode: z.string().min(1).optional(),
    intendedEditorMode: z.enum(["classic", "gutenberg", "elementor", "divi"]).optional(),
    /** Optional Bedrock model override for this generation */
    bedrockModel: z.string().trim().min(1).optional(),
    /** When true and caller can manage AI settings, also save bedrockModel as org default */
    saveBedrockModel: z.boolean().optional(),
    /** Primary competitor URL to differentiate against for this piece */
    competitorFocusUrl: z
      .string()
      .optional()
      .transform((raw) => (raw?.trim() ? normalizeCompetitorUrl(raw) : undefined))
      .pipe(z.string().url().optional()),
    /** Up to 5 competitor URLs for this piece (first = primary when focus omitted) */
    competitorUrls: z
      .array(z.string())
      .max(5)
      .optional()
      .transform((raw) => {
        if (!raw?.length) return undefined;
        const normalized = normalizeCompetitorUrlList(raw);
        return normalized.length > 0 ? normalized : undefined;
      }),
  })
  .transform((data) => {
    const competitorUrls = data.competitorUrls;
    const competitorFocusUrl = data.competitorFocusUrl ?? competitorUrls?.[0];
    return { ...data, competitorFocusUrl, competitorUrls };
  });

export type GenerateBodyInput = z.infer<typeof GenerateBody>;

export async function loadBriefForProject(briefId: number, projectId: number, userId: number) {
  const [brief] = await db.select().from(briefsTable).where(eq(briefsTable.id, briefId)).limit(1);
  if (!brief) return null;

  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, brief.goalId)).limit(1);
  if (!goal || goal.projectId !== projectId) return null;

  const access = await requireProjectAccess(projectId, userId);
  if (!access.ok) return null;

  return brief;
}

export function resolveFormatFromBrief(format: string | null | undefined): ContentFormatType {
  if (format && CONTENT_FORMAT_TYPES.includes(format as ContentFormatType)) {
    return format as ContentFormatType;
  }
  return "blog_post";
}

export function buildAngleHintFromBrief(brief: {
  workingTitle: string;
  angle: string | null;
  targetKeywordCluster: string | null;
}): string {
  const parts = [`Title: ${brief.workingTitle}`];
  if (brief.targetKeywordCluster) parts.push(`Keywords: ${brief.targetKeywordCluster}`);
  if (brief.angle) parts.push(brief.angle);
  return parts.join("\n");
}

export async function markBriefGenerated(briefId: number) {
  await db
    .update(briefsTable)
    .set({ status: "done", updatedAt: new Date() })
    .where(eq(briefsTable.id, briefId));
}

export async function loadProjectBrand(
  projectId: number,
  userId: number,
): Promise<{ brand: BrandContext; projectId: number } | null> {
  const access = await requireProjectAccess(projectId, userId);
  if (!access.ok) return null;

  const brand = await loadBrandContextForProject(projectId);
  if (!brand) return null;
  return { brand, projectId };
}

/** 409 payload when brand/platform voice is missing. */
export async function loadProjectVoiceGate(projectId: number) {
  const [project] = await db
    .select({ scrapeStatus: websiteProjectsTable.scrapeStatus })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  const brand = await loadBrandContextForProject(projectId);
  const evaluation = evaluateProjectVoiceReady({
    scrapeStatus: project?.scrapeStatus ?? null,
    voiceTone: brand?.voiceTone,
    writingExamples: brand?.writingExamples,
    brandVoiceSkill: brand?.brandVoiceSkill,
    platformVoices: brand?.platformVoices,
  });

  return { evaluation, brand };
}

export function voiceRequiredJsonBody(evaluation: ReturnType<typeof evaluateProjectVoiceReady>) {
  return {
    code: "voice_required" as const,
    error: evaluation.building
      ? "Brand voice is still scanning. Try again in a moment."
      : "Add a brand voice (or connect social) before generating.",
    scrapeStatus: evaluation.scrapeStatus,
    hasBrandVoice: evaluation.hasBrandVoice,
    hasPlatformVoice: evaluation.hasPlatformVoice,
    building: evaluation.building,
  };
}

export async function loadUserAiSettings(userId: number): Promise<{
  userApiKey: string | null;
  aiProviderOptions: AiProviderOptions;
}> {
  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId),
    getUserAiProviderOptions(userId),
  ]);
  return { userApiKey, aiProviderOptions };
}

/** Apply optional Bedrock model override for this generation. */
export function withBedrockModelOverride(
  options: AiProviderOptions,
  bedrockModel?: string | null,
): AiProviderOptions {
  const model = bedrockModel?.trim();
  if (!model) return options;
  return {
    ...options,
    bedrock: {
      ...(options.bedrock ?? {}),
      model,
    },
  };
}

export async function persistOrgBedrockModel(
  organizationId: number,
  model: string,
): Promise<void> {
  const { resetAiProviderClient } = await import("@workspace/ai-providers");
  await db
    .update(organizationsTable)
    .set({ bedrockModel: model.trim() })
    .where(eq(organizationsTable.id, organizationId));
  resetAiProviderClient();
}

export { buildCacheKey };

function connectionOutputMode(
  platform: string,
  creds: CmsIntegrationCredentials,
): string | undefined {
  switch (platform) {
    case "wordpress":
      return creds.wordpress?.outputMode ?? creds.wordpress?.editorMode;
    case "ghost":
      return creds.ghost?.outputMode;
    case "drupal":
      return creds.drupal?.outputMode;
    case "typo3":
      return creds.typo3?.outputMode;
    case "shopify":
      return creds.shopify?.outputMode;
    case "joomla":
      return creds.joomla?.outputMode;
    case "webhook":
      return creds.webhook?.outputMode;
    default:
      return undefined;
  }
}

export function wordCountFromMarkdown(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

interface GeneratedPieceResult {
  title: string;
  target_keyword: string;
  body_markdown: string;
  pieceMetadata?: {
    metaDescription?: string;
    faqSection?: { question: string; answer: string }[];
    citations?: { text: string; url: string; source: string }[];
    internalLinkSuggestions?: { anchorText: string; suggestedSlug: string; rationale?: string }[];
    jsonLdSchema?: object;
  };
}

export async function loadExistingPieceTitles(projectId: number): Promise<string[]> {
  const rows = await db
    .select({ title: contentPiecesTable.title })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.websiteProjectId, projectId))
    .orderBy(desc(contentPiecesTable.createdAt))
    .limit(20);
  return rows.flatMap((row) => (row.title ? [row.title] : []));
}

export async function loadGenerationContext(
  projectId: number,
  input: Pick<
    GenerateBodyInput,
    | "formatType"
    | "intendedPublishPlatform"
    | "intendedOutputMode"
    | "intendedEditorMode"
    | "competitorFocusUrl"
    | "competitorUrls"
  >,
): Promise<ContentGenerationContext & { resolvedIntendedPlatform?: string }> {
  const [project] = await db
    .select({
      cmsIntegrations: websiteProjectsTable.cmsIntegrations,
      publishingSettings: websiteProjectsTable.publishingSettings,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
  const publishing = parsePublishingSettings(project?.publishingSettings);
  const pieceCompetitorUrls = input.competitorUrls?.length
    ? normalizeCompetitorUrlList(input.competitorUrls)
    : undefined;
  const competitorFocusUrl = input.competitorFocusUrl ?? pieceCompetitorUrls?.[0];
  const [existingPieceTitles, competitorContext] = await Promise.all([
    loadExistingPieceTitles(projectId),
    loadCompetitorGenerationContext(projectId, competitorFocusUrl, pieceCompetitorUrls),
  ]);

  const resolvedIntendedPlatform =
    input.intendedPublishPlatform ??
    resolveDefaultIntendedPlatform(input.formatType, creds, publishing.primaryBlogDestination);

  let intendedOutputMode = input.intendedOutputMode;
  let intendedEditorMode = input.intendedEditorMode;
  if (resolvedIntendedPlatform) {
    const fromConnection = connectionOutputMode(resolvedIntendedPlatform, creds);
    if (!intendedOutputMode && fromConnection) {
      intendedOutputMode = fromConnection;
    }
    if (!intendedEditorMode && resolvedIntendedPlatform === "wordpress") {
      const wpMode = creds.wordpress?.editorMode ?? creds.wordpress?.outputMode;
      if (wpMode) intendedEditorMode = wpMode;
    }
  }

  return {
    existingPieceTitles,
    intendedPublishPlatform: input.intendedPublishPlatform ?? undefined,
    intendedOutputMode: input.intendedPublishPlatform
      ? intendedOutputMode ?? getDefaultOutputMode(resolvedIntendedPlatform ?? "")
      : undefined,
    intendedEditorMode: input.intendedPublishPlatform ? intendedEditorMode : undefined,
    resolvedIntendedPlatform: input.intendedPublishPlatform
      ? resolvedIntendedPlatform ?? undefined
      : undefined,
    competitorPromptBlock: competitorContext.promptBlock || undefined,
    competitorFocusUrl: competitorContext.focusUrl,
    competitorUrls: pieceCompetitorUrls,
  };
}

export async function insertGeneratedContentPiece(params: {
  projectId: number;
  briefId?: number;
  formatType: ContentFormatType;
  result: GeneratedPieceResult;
  cacheKey: string;
  plannedDate?: string | null;
  intendedPublishPlatform?: string;
  intendedOutputMode?: ContentPieceMetadata["intendedOutputMode"];
  intendedEditorMode?: ContentPieceMetadata["intendedEditorMode"];
}) {
  const {
    projectId,
    briefId,
    formatType,
    result,
    cacheKey,
    plannedDate,
    intendedPublishPlatform,
    intendedOutputMode,
    intendedEditorMode,
  } = params;

  const pieceMetadata: ContentPieceMetadata = {
    ...(result.pieceMetadata ?? {}),
    ...(intendedPublishPlatform ? { intendedPublishPlatform } : {}),
    ...(intendedOutputMode ? { intendedOutputMode } : {}),
    ...(intendedEditorMode ? { intendedEditorMode } : {}),
  };

  const [inserted] = await db
    .insert(contentPiecesTable)
    .values({
      websiteProjectId: projectId,
      briefId: briefId ?? null,
      formatType,
      title: result.title,
      targetKeyword: result.target_keyword,
      bodyMarkdown: result.body_markdown,
      wordCount: wordCountFromMarkdown(result.body_markdown),
      status: "draft",
      cacheKey,
      plannedDate: plannedDate ?? null,
      pieceMetadata: Object.keys(pieceMetadata).length > 0 ? pieceMetadata : null,
    })
    .returning();

  if (briefId) await markBriefGenerated(briefId);
  return inserted;
}

export async function assertPieceOwner(pieceId: number, userId: number) {
  const [piece] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, pieceId))
    .limit(1);

  if (!piece) return { piece: null, error: "not_found" as const };

  const access = await requireProjectAccess(piece.websiteProjectId, userId);
  if (!access.ok) return { piece: null, error: "forbidden" as const };
  return { piece, error: null };
}
