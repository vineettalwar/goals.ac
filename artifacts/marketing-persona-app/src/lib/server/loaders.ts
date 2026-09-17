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
} from "@workspace/content-engine/support/publishing/cms-integrations";
import { getUsageSummaryForUser } from "@/lib/billing/usage";
import type { CmsConnectionSnapshot } from "@/lib/projects/publishing-destinations";
import type { WebsiteProject } from "@/lib/projects/project-detail-types";
import { getAccessibleProject, getOrgMembership, isSuperAdmin, requireProjectAccess } from "@/lib/org/org-access";
import { isSiteAdmin } from "@/lib/org/org-access-shared";

import type { ContentPieceMetadata } from "@workspace/db";
import { sanitizeAiProse } from "@workspace/content-engine";

export interface ContentPieceRecord {
  id: number;
  title: string;
  formatType: string;
  targetKeyword: string;
  bodyMarkdown: string;
  status: string;
  plannedDate: string | null;
  wordCount: number;
  websiteProjectId: number;
  publishedUrl: string | null;
  createdAt: string;
  pieceMetadata?: ContentPieceMetadata | null;
  briefId?: number | null;
}

function sanitizePieceMetadata(
  metadata: ContentPieceMetadata | null | undefined,
): ContentPieceMetadata | null {
  if (!metadata) return null;
  return {
    ...metadata,
    seoTitle: metadata.seoTitle ? sanitizeAiProse(metadata.seoTitle) : metadata.seoTitle,
    metaDescription: metadata.metaDescription
      ? sanitizeAiProse(metadata.metaDescription)
      : metadata.metaDescription,
    ogTitle: metadata.ogTitle ? sanitizeAiProse(metadata.ogTitle) : metadata.ogTitle,
    ogDescription: metadata.ogDescription
      ? sanitizeAiProse(metadata.ogDescription)
      : metadata.ogDescription,
    faqSection: metadata.faqSection?.map((faq) => ({
      question: sanitizeAiProse(faq.question),
      answer: sanitizeAiProse(faq.answer),
    })),
  };
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
    title: sanitizeAiProse(piece.title),
    formatType: piece.formatType,
    targetKeyword: piece.targetKeyword ?? "",
    bodyMarkdown: sanitizeAiProse(piece.bodyMarkdown ?? ""),
    status: piece.status,
    plannedDate: piece.plannedDate ?? null,
    wordCount: piece.wordCount,
    websiteProjectId: piece.websiteProjectId,
    publishedUrl: piece.publishedUrl ?? null,
    createdAt: piece.createdAt.toISOString(),
    pieceMetadata: sanitizePieceMetadata(piece.pieceMetadata),
    briefId: piece.briefId ?? null,
  };
});

export const loadCmsConnectionsForProject = cache(async (
  projectId: number,
  userId: number,
): Promise<CmsConnectionSnapshot> => {
  const project = await getAccessibleProject(projectId, userId);
  if (!project?.cmsIntegrations) return {};

  const decrypted = decryptCmsCredentials(project.cmsIntegrations as CmsIntegrationCredentials);
  return maskCmsCredentials(
    decrypted,
    project.cmsIntegrations as Record<string, unknown>,
  );
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
    email: string;
    role: string;
    orgRole: string | null;
    avatarUrl: string | null;
    hasGoogleId: boolean;
    hasPassword: boolean;
  } | null;
  canManageAiSettings: boolean;
}

export const loadSettingsInitialData = cache(async (userId: number): Promise<SettingsInitialData> => {
  const [user, usage, membership] = await Promise.all([
    db
      .select({
        email: usersTable.email,
        googleId: usersTable.googleId,
        passwordHash: usersTable.passwordHash,
        role: usersTable.role,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .then((rows) => rows[0]),
    getUsageSummaryForUser(userId),
    getOrgMembership(userId),
  ]);

  const canManageAiSettings =
    isSiteAdmin(membership?.orgRole) || isSuperAdmin(user?.role);

  return {
    usage,
    me: user
      ? {
          email: user.email,
          role: user.role,
          orgRole: membership?.orgRole ?? null,
          avatarUrl: user.avatarUrl ?? null,
          hasGoogleId: Boolean(user.googleId),
          hasPassword: Boolean(user.passwordHash),
        }
      : null,
    canManageAiSettings,
  };
});
