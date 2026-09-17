import { cache } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { brandProfilesTable, contentPiecesTable } from "@workspace/db/schema";
import type { AiProviderId } from "@workspace/ai-providers/config";
import type { BrandProfileSummary } from "@workspace/app-shell/studio";
import { evaluateProjectVoiceReady } from "@workspace/content-engine/brand/project-voice-ready";
import { parsePublishingSettings } from "@workspace/content-engine/support/publishing/publishing-settings";
import {
  getOrgAiSettingsForUser,
  hasOrgAnthropicCredentials,
  hasOrgBedrockCredentials,
  hasOrgGroqCredentials,
  hasOrgNvidiaCredentials,
  hasOrgOpenAICredentials,
  hasOrgOpenRouterCredentials,
} from "@workspace/content-engine/support/ai/org-ai-settings";
import {
  buildAiProviderStatus,
  finalizeAiProviderStatus,
} from "@/lib/platform/ai-providers-status";
import { getAccessibleProject } from "@/lib/org/org-access";
import { loadCmsConnectionsForProject } from "@/lib/server/loaders";
import type { StudioLoadResult } from "@/components/content-studio/content-studio-load-data";
import { isRefreshPiece } from "@/components/content-studio/content-studio-utils";
import { parseVoiceGateFromBrandProfile } from "@/components/content-studio/voice-gate";

/** Server seed for Content Studio — same payload as the 6-fetch client loader, without HTTP. */
export const loadContentStudioInitialData = cache(
  async (projectId: number, userId: number): Promise<StudioLoadResult | null> => {
    const project = await getAccessibleProject(projectId, userId);
    if (!project) return null;

    const [pieces, brand, orgSettings, cmsConnections] = await Promise.all([
      db
        .select()
        .from(contentPiecesTable)
        .where(eq(contentPiecesTable.websiteProjectId, projectId))
        .orderBy(desc(contentPiecesTable.createdAt)),
      db
        .select()
        .from(brandProfilesTable)
        .where(eq(brandProfilesTable.websiteProjectId, projectId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      getOrgAiSettingsForUser(userId),
      loadCmsConnectionsForProject(projectId, userId),
    ]);

    const statusInput = orgSettings
      ? {
          aiProvider: orgSettings.aiProvider,
          ollamaBaseUrl: orgSettings.ollamaBaseUrl,
          ollamaModel: orgSettings.ollamaModel,
          openrouterModel: orgSettings.openrouterModel,
          nvidiaModel: orgSettings.nvidiaModel,
        }
      : undefined;

    // Skip Ollama probe on soft-nav — status.ready for ollama may be optimistic until client refresh.
    const aiStatus = finalizeAiProviderStatus(buildAiProviderStatus(statusInput), {
      hasUserGeminiKey: Boolean(orgSettings?.encryptedGeminiKey),
      hasOrgBedrockKey: hasOrgBedrockCredentials(orgSettings),
      hasOrgOpenAIKey: hasOrgOpenAICredentials(orgSettings),
      hasOrgOpenRouterKey: hasOrgOpenRouterCredentials(orgSettings),
      hasOrgGroqKey: hasOrgGroqCredentials(orgSettings),
      hasOrgNvidiaKey: hasOrgNvidiaCredentials(orgSettings),
      hasOrgAnthropicKey: hasOrgAnthropicCredentials(orgSettings),
      orgBedrockRegion: orgSettings?.bedrockRegion ?? null,
      orgBedrockModel: orgSettings?.bedrockModel ?? null,
    });

    const voice = evaluateProjectVoiceReady({
      scrapeStatus: project.scrapeStatus,
      voiceTone: brand?.voiceTone,
      writingExamples: brand?.writingExamples,
      brandVoiceSkill: brand?.brandVoiceSkill,
      platformVoices: brand?.platformVoices,
    });

    const brandJson = {
      scrapeStatus: project.scrapeStatus,
      pageCount: project.pageCount ?? 0,
      companyName: brand?.companyName ?? "",
      industry: brand?.industry ?? "",
      targetAudience: brand?.targetAudience ?? "",
      brandMemory: brand?.brandMemory ?? null,
      voiceTone: brand?.voiceTone ?? "",
      primaryKeywords: brand?.primaryKeywords ?? [],
      writingExamples: brand?.writingExamples ?? [],
      doWords: brand?.doWords ?? [],
      dontWords: brand?.dontWords ?? [],
      discoveryMeta:
        (project.scrapeData as { discoveryMeta?: Record<string, unknown> } | null)?.discoveryMeta ??
        null,
      scanSources: brand?.brandMemory?.scanSources ?? [],
      brandVoiceSkill: brand?.brandVoiceSkill ?? "",
      skillLocked: brand?.skillLocked ?? false,
      lastIndexedAt: brand?.brandMemory?.lastIndexedAt ?? null,
      platformVoices: brand?.platformVoices ?? null,
      voiceReady: voice.ready,
      voiceBuilding: voice.building,
      hasBrandVoice: voice.hasBrandVoice,
      hasPlatformVoice: voice.hasPlatformVoice,
    };

    const publishing = parsePublishingSettings(project.publishingSettings);

    return {
      projectName: project.name ?? "",
      aiReady: Boolean(aiStatus.ready),
      activeProvider: (aiStatus.activeProvider ?? "gemini") as AiProviderId,
      orgBedrockModel: orgSettings?.bedrockModel ?? null,
      pieces: pieces.map((p) => {
        const row = {
          id: p.id,
          title: p.title,
          formatType: p.formatType,
          targetKeyword: p.targetKeyword ?? "",
          status: p.status,
          wordCount: p.wordCount ?? 0,
          plannedDate: p.plannedDate ?? null,
          createdAt: p.createdAt.toISOString(),
          publishedUrl: p.publishedUrl ?? null,
          pieceMetadata: p.pieceMetadata as { source?: string } | null,
        };
        return {
          ...row,
          source: "studio" as const,
          isRefresh: isRefreshPiece(row),
        };
      }),
      cmsConnections,
      primaryBlogDestination: publishing.primaryBlogDestination ?? null,
      brandProfile: brandJson as BrandProfileSummary,
      voiceGate: parseVoiceGateFromBrandProfile(brandJson as Record<string, unknown>),
    };
  },
);
