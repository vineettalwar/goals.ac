import { db } from "@workspace/db";
import {
  contentPiecesTable,
  briefsTable,
  goalsTable,
  CONTENT_FORMAT_TYPES,
  type ContentFormatType,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireProjectAccess } from "@/lib/org-access";
import {
  buildCacheKey,
  type BrandContext,
} from "@workspace/content-engine/content-studio-generator";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand-context-loader";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/user-ai-provider";
import type { AiProviderOptions } from "@workspace/ai-providers";
import { z } from "zod";

export const GenerateBody = z.object({
  formatType: z.enum(CONTENT_FORMAT_TYPES as unknown as [ContentFormatType, ...ContentFormatType[]]),
  targetKeyword: z.string().min(1, "Target keyword is required"),
  angleHint: z.string().optional(),
  plannedDate: z.string().optional(),
  briefId: z.number().int().positive().optional(),
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
  const brand = await loadBrandContextForProject(projectId, userId);
  if (!brand) return null;
  return { brand, projectId };
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

export { buildCacheKey };

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
  return rows.map((row) => row.title).filter(Boolean);
}

export async function insertGeneratedContentPiece(params: {
  projectId: number;
  briefId?: number;
  formatType: ContentFormatType;
  result: GeneratedPieceResult;
  cacheKey: string;
  plannedDate?: string | null;
}) {
  const { projectId, briefId, formatType, result, cacheKey, plannedDate } = params;

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
      pieceMetadata: result.pieceMetadata ?? null,
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
