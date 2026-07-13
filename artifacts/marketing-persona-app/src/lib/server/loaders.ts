import { cache } from "react";
import { db } from "@workspace/db";
import {
  contentPiecesTable,
  websiteProjectsTable,
  brandProfilesTable,
  usersTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  type CmsIntegrationCredentials,
  decryptCmsCredentials,
  maskCmsCredentials,
} from "@workspace/content-engine/support/cms-integrations";
import { getOrgAiSettingsForUser, hasOrgBedrockCredentials, hasOrgSemrushCredentials } from "@workspace/content-engine/support/org-ai-settings";
import { decryptSecret } from "@workspace/security/encryption";
import { getUsageSummaryForUser } from "@/lib/usage";
import { buildAiProviderStatus, enrichOllamaStatus, finalizeAiProviderStatus, toAiProviderOptions } from "@/lib/ai-providers-status";
import type { CmsConnectionSnapshot } from "@/lib/publishing-destinations";
import type { WebsiteProject } from "@/lib/project-detail-types";
import { getAccessibleProject, getOrgMembership, isSuperAdmin, requireProjectAccess } from "@/lib/org-access";

import type { ContentPieceMetadata } from "@workspace/db";

export interface ContentPieceRecord {
  id: number;
  title: string;
  formatType: string;
  targetKeyword: string;
  bodyMarkdown: string;
  status: string;
  wordCount: number;
  websiteProjectId: number;
  publishedUrl: string | null;
  createdAt: string;
  pieceMetadata?: ContentPieceMetadata | null;
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

  const access = await requireProjectAccess(piece.websiteProjectId, userId);
  if (!access.ok) return null;

  return {
    id: piece.id,
    title: piece.title,
    formatType: piece.formatType,
    targetKeyword: piece.targetKeyword ?? "",
    bodyMarkdown: piece.bodyMarkdown ?? "",
    status: piece.status,
    wordCount: piece.wordCount,
    websiteProjectId: piece.websiteProjectId,
    publishedUrl: piece.publishedUrl ?? null,
    createdAt: piece.createdAt.toISOString(),
    pieceMetadata: piece.pieceMetadata ?? null,
  };
});

export const loadCmsConnectionsForProject = cache(async (
  projectId: number,
  userId: number,
): Promise<CmsConnectionSnapshot> => {
  const project = await getAccessibleProject(projectId, userId);
  if (!project?.cmsIntegrations) return {};

  const decrypted = decryptCmsCredentials(project.cmsIntegrations as CmsIntegrationCredentials);
  return maskCmsCredentials(decrypted);
});

export const loadWebsiteProjectForUser = cache(async (
  projectId: number,
  userId: number,
): Promise<WebsiteProject | null> => {
  const project = await getAccessibleProject(projectId, userId);
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
  bedrockCredentials: {
    hasCredentials: boolean;
    accessKeyLastFour: string | null;
    region: string | null;
    model: string | null;
  };
  semrushCredentials: {
    hasCredentials: boolean;
    apiKeyLastFour: string | null;
    database: string | null;
  };
  aiStatus: Awaited<ReturnType<typeof buildAiProviderStatus>> | null;
  canManageAiSettings: boolean;
}

export const loadSettingsInitialData = cache(async (userId: number): Promise<SettingsInitialData> => {
  const [user, usage, orgSettings, membership] = await Promise.all([
    db
      .select({
        googleId: usersTable.googleId,
        passwordHash: usersTable.passwordHash,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .then((rows) => rows[0]),
    getUsageSummaryForUser(userId),
    getOrgAiSettingsForUser(userId),
    getOrgMembership(userId),
  ]);

  const hasKey = Boolean(orgSettings?.encryptedGeminiKey);
  let lastFour: string | null = null;
  if (orgSettings?.encryptedGeminiKey) {
    try {
      lastFour = decryptSecret(orgSettings.encryptedGeminiKey).slice(-4);
    } catch {
      lastFour = "••••";
    }
  }

  const hasBedrockCredentials = hasOrgBedrockCredentials(orgSettings);
  let bedrockAccessKeyLastFour: string | null = null;
  if (orgSettings?.encryptedBedrockAccessKeyId) {
    try {
      bedrockAccessKeyLastFour = decryptSecret(orgSettings.encryptedBedrockAccessKeyId).slice(-4);
    } catch {
      bedrockAccessKeyLastFour = "••••";
    }
  }

  const hasSemrushCredentials = hasOrgSemrushCredentials(orgSettings);
  let semrushApiKeyLastFour: string | null = null;
  if (orgSettings?.encryptedSemrushApiKey) {
    try {
      semrushApiKeyLastFour = decryptSecret(orgSettings.encryptedSemrushApiKey).slice(-4);
    } catch {
      semrushApiKeyLastFour = "••••";
    }
  }

  const statusInput = orgSettings
    ? {
        aiProvider: orgSettings.aiProvider,
        ollamaBaseUrl: orgSettings.ollamaBaseUrl,
        ollamaModel: orgSettings.ollamaModel,
      }
    : undefined;
  const aiStatusPayload = buildAiProviderStatus(statusInput);
  await enrichOllamaStatus(aiStatusPayload, toAiProviderOptions(statusInput));
  const aiStatus = finalizeAiProviderStatus(aiStatusPayload, {
    hasUserGeminiKey: hasKey,
    hasOrgBedrockKey: hasBedrockCredentials,
    orgBedrockRegion: orgSettings?.bedrockRegion ?? null,
    orgBedrockModel: orgSettings?.bedrockModel ?? null,
  });

  const canManageAiSettings =
    membership?.orgRole === "site_admin" || isSuperAdmin(user?.role);

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
    bedrockCredentials: {
      hasCredentials: hasBedrockCredentials,
      accessKeyLastFour: bedrockAccessKeyLastFour,
      region: orgSettings?.bedrockRegion ?? null,
      model: orgSettings?.bedrockModel ?? null,
    },
    semrushCredentials: {
      hasCredentials: hasSemrushCredentials,
      apiKeyLastFour: semrushApiKeyLastFour,
      database: orgSettings?.semrushDatabase ?? "us",
    },
    aiStatus,
    canManageAiSettings,
  };
});
