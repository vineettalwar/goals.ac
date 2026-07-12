import { db } from "@workspace/db";
import { websiteProjectsTable, brandProfilesTable, contentPiecesTable, CONTENT_FORMAT_TYPES } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import {
  buildCacheKey,
  type BrandContext,
} from "@workspace/content-engine/content-studio-generator";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/user-api-key";
import { z } from "zod";

export const GenerateBody = z.object({
  formatType: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  targetKeyword: z.string().min(1, "Target keyword is required"),
  angleHint: z.string().optional(),
  plannedDate: z.string().optional(),
});

export async function loadProjectBrand(
  projectId: number,
  userId: number,
): Promise<{ brand: BrandContext; projectId: number } | null> {
  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);

  if (!project) return null;

  const [brandProfile] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  const brand: BrandContext = {
    companyName: brandProfile?.companyName ?? project.name,
    websiteUrl: project.url,
    industry: brandProfile?.industry ?? "",
    targetAudience: brandProfile?.targetAudience ?? "",
    voiceTone: brandProfile?.voiceTone ?? "",
    primaryKeywords: brandProfile?.primaryKeywords ?? [],
    contentStyle: project.contentStyle ?? null,
  };

  return { brand, projectId };
}

export async function loadUserApiKey(userId: number): Promise<string | null> {
  return getDecryptedUserGeminiKey(userId);
}

export function buildPieceCacheKey(
  formatType: string,
  targetKeyword: string,
  brand: BrandContext,
  angleHint?: string,
): string {
  return buildCacheKey(formatType, targetKeyword, brand, angleHint);
}

export function wordCountFromMarkdown(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

export async function assertPieceOwner(pieceId: number, userId: number) {
  const [piece] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, pieceId))
    .limit(1);

  if (!piece) return { piece: null, error: "not_found" as const };

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);

  if (!project) return { piece: null, error: "forbidden" as const };
  return { piece, error: null };
}
