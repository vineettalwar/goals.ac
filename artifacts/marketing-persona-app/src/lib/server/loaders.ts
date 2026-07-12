import { cache } from "react";
import { db } from "@workspace/db";
import {
  contentPiecesTable,
  websiteProjectsTable,
  brandProfilesTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  maskCmsCredentials,
} from "@workspace/content-engine/support/cms-integrations";
import { decryptSecret } from "@workspace/security/encryption";
import { getUsageSummaryForUser } from "@/lib/usage";
import { buildAiProviderStatus, enrichOllamaStatus, finalizeAiProviderStatus, toAiProviderOptions } from "@/lib/ai-providers-status";
import type { CmsConnectionSnapshot } from "@/lib/publishing-destinations";
import type { WebsiteProject } from "@/lib/project-detail-types";

export interface ContentPieceRecord {
  id: number;
  title: string;
  formatType: string;
  targetKeyword: string;
  bodyMarkdown: string;
  status: string;
  wordCount: number;
  websiteProjectId: number;
  createdAt: string;
  pieceMetadata?: {
    metaDescription?: string;
    faqSection?: { question: string; answer: string }[];
    citations?: { text: string; url: string; source: string }[];
    internalLinkSuggestions?: { anchorText: string; suggestedSlug: string; rationale?: string }[];
    jsonLdSchema?: object;
  } | null;
}

export const loadContentPieceForUser = cache(async (
  pieceId: number,
  userId: number,
): Promise<ContentPieceRecord | null> => {
  const [piece] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, pieceId))
    .limit(1);

  if (!piece) return null;

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(
      and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, userId)),
    )
    .limit(1);

  if (!project) return null;

  return {
    id: piece.id,
    title: piece.title,
    formatType: piece.formatType,
    targetKeyword: piece.targetKeyword ?? "",
    bodyMarkdown: piece.bodyMarkdown ?? "",
    status: piece.status,
    wordCount: piece.wordCount,
    websiteProjectId: piece.websiteProjectId,
    createdAt: piece.createdAt.toISOString(),
    pieceMetadata: piece.pieceMetadata ?? null,
  };
});

export const loadCmsConnectionsForProject = cache(async (
  projectId: number,
  userId: number,
): Promise<CmsConnectionSnapshot> => {
  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);

  if (!project?.cmsIntegrations) return {};

  const decrypted = decryptCmsCredentials(project.cmsIntegrations as CmsIntegrationCredentials);
  return maskCmsCredentials(decrypted);
});

export const loadWebsiteProjectForUser = cache(async (
  projectId: number,
  userId: number,
): Promise<WebsiteProject | null> => {
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

  return {
    id: project.id,
    name: project.name,
    url: project.url,
    pageCount: project.pageCount ?? undefined,
    scrapeStatus: project.scrapeStatus,
    scrapeData: (project.scrapeData as WebsiteProject["scrapeData"]) ?? null,
    contentStyle: (project.contentStyle as WebsiteProject["contentStyle"]) ?? null,
    brandProfile: brandProfile
      ? {
          id: brandProfile.id,
          companyName: brandProfile.companyName ?? "",
          industry: brandProfile.industry ?? "",
          targetAudience: brandProfile.targetAudience ?? "",
          voiceTone: brandProfile.voiceTone ?? "",
          primaryKeywords: brandProfile.primaryKeywords ?? [],
          competitorUrls: brandProfile.competitorUrls ?? [],
          writingExamples: brandProfile.writingExamples ?? undefined,
          brandGlossary: brandProfile.brandGlossary ?? undefined,
          antiPatterns: brandProfile.antiPatterns ?? undefined,
          typicalStructure: brandProfile.typicalStructure ?? undefined,
          doWords: brandProfile.doWords ?? undefined,
          dontWords: brandProfile.dontWords ?? undefined,
          brandColors: brandProfile.brandColors ?? undefined,
          productOfferings: brandProfile.productOfferings ?? undefined,
          updatedAt: brandProfile.updatedAt?.toISOString(),
        }
      : null,
  };
});

export interface SettingsInitialData {
  usage: Awaited<ReturnType<typeof getUsageSummaryForUser>> | null;
  me: {
    hasGeminiKey: boolean;
    hasGoogleId: boolean;
    hasPassword: boolean;
  } | null;
  apiKey: { hasKey: boolean; lastFour: string | null };
  aiStatus: Awaited<ReturnType<typeof buildAiProviderStatus>> | null;
}

export const loadSettingsInitialData = cache(async (userId: number): Promise<SettingsInitialData> => {
  const [user, usage] = await Promise.all([
    db
      .select({
        encryptedGeminiKey: usersTable.encryptedGeminiKey,
        googleId: usersTable.googleId,
        passwordHash: usersTable.passwordHash,
        aiProvider: usersTable.aiProvider,
        ollamaBaseUrl: usersTable.ollamaBaseUrl,
        ollamaModel: usersTable.ollamaModel,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .then((rows) => rows[0]),
    getUsageSummaryForUser(userId),
  ]);

  let lastFour: string | null = null;
  const hasKey = Boolean(user?.encryptedGeminiKey);
  if (user?.encryptedGeminiKey) {
    try {
      lastFour = decryptSecret(user.encryptedGeminiKey).slice(-4);
    } catch {
      lastFour = "••••";
    }
  }

  const aiStatusPayload = buildAiProviderStatus(user ?? undefined);
  await enrichOllamaStatus(aiStatusPayload, toAiProviderOptions(user ?? undefined));
  const aiStatus = finalizeAiProviderStatus(aiStatusPayload, { hasUserGeminiKey: hasKey });

  return {
    usage,
    me: user
      ? {
          hasGeminiKey: hasKey,
          hasGoogleId: Boolean(user.googleId),
          hasPassword: Boolean(user.passwordHash),
        }
      : null,
    apiKey: { hasKey, lastFour },
    aiStatus,
  };
});
