import { db } from "@workspace/db";
import {
  contentPiecesTable,
  contentItemsTable,
  contentStrategiesTable,
  websiteProjectsTable,
  type ContentFormatType,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  generateContentPiece,
  generateContentPieceWithAgents,
  repurposeContentPiece,
  type BrandContext,
} from "../content/content-studio-generator";
import { loadBrandContextForProject } from "../support/brand/brand-context-loader";
import { getUserAiProviderOptions } from "../support/ai/user-ai-provider";
import {
  decryptCmsCredentials,
  getConnectedSocialPlatforms,
  type CmsIntegrationCredentials,
  type SocialPlatform,
} from "../support/publishing/cms-integrations";
import { verticalRequiresReview } from "../verticals/vertical-presets";
import type { ContentPieceApprovalStatus } from "@workspace/db/schema";
import { patchPieceAgentTeamProgress } from "../agents/agent-team-progress-persist";
import type { ContentPieceMetadata } from "../content/content-piece-seo";

const FORMAT_MAP: Record<string, ContentFormatType> = {
  "linkedin post": "linkedin_post",
  "twitter thread": "twitter_thread",
  "instagram post": "instagram_post",
  "facebook post": "facebook_post",
  "bluesky post": "bluesky_post",
  "mastodon post": "mastodon_post",
  "blog article": "blog_post",
  "blog post": "blog_post",
  "news article": "news_article",
  "tutorial": "tutorial",
  "guide": "guide",
  "case study": "case_study",
  "comparison": "comparison",
  "alternatives": "comparison",
  "vs": "comparison",
  "listicle": "listicle",
  "list": "listicle",
  "newsletter": "email_sequence",
  "video script": "tutorial",
  "podcast outline": "tutorial",
  "whitepaper": "whitepaper",
  "press release": "press_release",
  "faq": "faq_article",
  "faq article": "faq_article",
  "pillar": "pillar_page",
  "pillar page": "pillar_page",
  "location page": "location_page",
};

const PLATFORM_FORMAT: Record<SocialPlatform, ContentFormatType> = {
  linkedin: "linkedin_post",
  twitter: "twitter_thread",
  instagram: "instagram_post",
  facebook: "facebook_post",
  bluesky: "bluesky_post",
  mastodon: "mastodon_post",
};

export function mapStrategyFormatToContentFormat(format: string): ContentFormatType {
  const normalized = format.trim().toLowerCase();
  return FORMAT_MAP[normalized] ?? "blog_post";
}

export function computePlannedDate(strategyYear: number, strategyMonth: number, day: number): string {
  const anchor = new Date(strategyYear, strategyMonth - 1, 1);
  const date = new Date(anchor);
  date.setDate(Math.min(day, 28));
  return date.toISOString().slice(0, 10);
}

async function loadBrandContext(projectId: number): Promise<BrandContext> {
  const brand = await loadBrandContextForProject(projectId);
  if (!brand) throw new Error("Project not found");
  return brand;
}

export interface GenerateFromItemResult {
  primaryPieceId: number;
  variantPieceIds: number[];
  generationUsage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export type GenerateFromContentItemOptions = {
  generateVariants?: boolean;
  userApiKey?: string | null;
  aiProviderOptions?: Awaited<ReturnType<typeof getUserAiProviderOptions>>;
  useAgentTeam?: boolean;
  agentFastMode?: boolean;
};

export async function generateFromContentItem(
  itemId: number,
  projectId: number,
  userId: number,
  options?: GenerateFromContentItemOptions,
): Promise<GenerateFromItemResult> {
  const [item] = await db
    .select()
    .from(contentItemsTable)
    .where(eq(contentItemsTable.id, itemId))
    .limit(1);
  if (!item) throw new Error("Content item not found");

  const [strategy] = await db
    .select()
    .from(contentStrategiesTable)
    .where(eq(contentStrategiesTable.id, item.strategyId))
    .limit(1);
  if (!strategy) throw new Error("Content strategy not found");

  const resolvedProjectId = strategy.websiteProjectId ?? projectId;
  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations, userId: websiteProjectsTable.userId })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, resolvedProjectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);
  if (!project) throw new Error("Project not found or access denied");

  const brand = await loadBrandContext(resolvedProjectId);
  const primaryFormat = mapStrategyFormatToContentFormat(item.format);
  const plannedDate = computePlannedDate(strategy.year, strategy.month, item.day);

  // D2 review gating: fails closed when brand.vertical could not be determined
  const requiresReview = verticalRequiresReview(brand.vertical) || !brand.vertical;
  const approvalStatus: ContentPieceApprovalStatus = requiresReview ? "pending_review" : "draft";

  if (options?.useAgentTeam) {
    return generateFromContentItemWithAgents({
      item,
      brand,
      primaryFormat,
      plannedDate,
      approvalStatus,
      resolvedProjectId,
      project,
      options,
    });
  }

  const generated = await generateContentPiece(
    primaryFormat,
    brand,
    item.primaryKeyword,
    item.topicAngle,
    false,
    options?.userApiKey,
    options?.aiProviderOptions,
  );

  const [primary] = await db
    .insert(contentPiecesTable)
    .values({
      websiteProjectId: resolvedProjectId,
      contentItemId: item.id,
      formatType: primaryFormat,
      title: generated.title || item.title,
      targetKeyword: item.primaryKeyword,
      bodyMarkdown: generated.body_markdown,
      status: "draft",
      approvalStatus,
      wordCount: generated.body_markdown.split(/\s+/).filter(Boolean).length,
      plannedDate,
      publishPlatform: null,
      pieceMetadata: generated.pieceMetadata ?? null,
    })
    .returning();

  const variantPieceIds = await maybeGenerateVariants({
    generateVariants: options?.generateVariants,
    connectedCreds: (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials,
    primary,
    primaryFormat,
    brand,
    item,
    plannedDate,
    approvalStatus,
    resolvedProjectId,
    userApiKey: options?.userApiKey,
    aiProviderOptions: options?.aiProviderOptions,
    bodyMarkdown: generated.body_markdown,
  });

  await db
    .update(contentItemsTable)
    .set({ status: "prepared" })
    .where(eq(contentItemsTable.id, item.id));

  return {
    primaryPieceId: primary.id,
    variantPieceIds,
    generationUsage: generated.generationUsage,
  };
}

async function generateFromContentItemWithAgents(params: {
  item: typeof contentItemsTable.$inferSelect;
  brand: BrandContext;
  primaryFormat: ContentFormatType;
  plannedDate: string;
  approvalStatus: ContentPieceApprovalStatus;
  resolvedProjectId: number;
  project: { cmsIntegrations: unknown; userId: number };
  options?: GenerateFromContentItemOptions;
}): Promise<GenerateFromItemResult> {
  const {
    item,
    brand,
    primaryFormat,
    plannedDate,
    approvalStatus,
    resolvedProjectId,
    project,
    options,
  } = params;

  await db
    .update(contentItemsTable)
    .set({ status: "generating" })
    .where(eq(contentItemsTable.id, item.id));

  // Stub row so pollers see agent progress before the draft exists.
  const [stub] = await db
    .insert(contentPiecesTable)
    .values({
      websiteProjectId: resolvedProjectId,
      contentItemId: item.id,
      formatType: primaryFormat,
      title: item.title,
      targetKeyword: item.primaryKeyword,
      bodyMarkdown: "",
      status: "generating",
      approvalStatus,
      wordCount: 0,
      plannedDate,
      publishPlatform: null,
      pieceMetadata: {
        agentTeamProgress: {
          agents: {},
          isRunning: true,
          updatedAt: new Date().toISOString(),
        },
      } satisfies ContentPieceMetadata,
    })
    .returning();

  try {
    const generated = await generateContentPieceWithAgents(
      primaryFormat,
      brand,
      item.primaryKeyword,
      item.topicAngle,
      {
        fastMode: options?.agentFastMode,
        userApiKey: options?.userApiKey,
        aiProviderOptions: options?.aiProviderOptions,
        projectId: resolvedProjectId,
        onAgentProgress: (event) => {
          void patchPieceAgentTeamProgress(stub.id, event);
        },
        onAgentEvent: (sseData) => {
          try {
            const parsed = JSON.parse(sseData) as { type: string; [key: string]: unknown };
            if (parsed.type === "pipeline_start" || parsed.type === "pipeline_complete") {
              void patchPieceAgentTeamProgress(stub.id, parsed);
            }
          } catch {
            // ignore malformed SSE meta
          }
        },
      },
    );

    const wordCount = generated.body_markdown.split(/\s+/).filter(Boolean).length;

    // Keep last polled agent snapshot; mark pipeline finished.
    const [latest] = await db
      .select({ pieceMetadata: contentPiecesTable.pieceMetadata })
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, stub.id))
      .limit(1);
    const latestMeta = (latest?.pieceMetadata ?? {}) as ContentPieceMetadata;
    const finalMeta: ContentPieceMetadata = {
      ...latestMeta,
      ...generated.pieceMetadata,
      agentTeamProgress: {
        agents: latestMeta.agentTeamProgress?.agents ?? {},
        isRunning: false,
        totalElapsedMs:
          generated.pieceMetadata?.agentPipelineDurationMs ??
          latestMeta.agentTeamProgress?.totalElapsedMs,
        updatedAt: new Date().toISOString(),
      },
    };

    await db
      .update(contentPiecesTable)
      .set({
        title: generated.title || item.title,
        bodyMarkdown: generated.body_markdown,
        wordCount,
        status: "draft",
        pieceMetadata: finalMeta,
      })
      .where(eq(contentPiecesTable.id, stub.id));

    const variantPieceIds = await maybeGenerateVariants({
      generateVariants: options?.generateVariants,
      connectedCreds: (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials,
      primary: stub,
      primaryFormat,
      brand,
      item,
      plannedDate,
      approvalStatus,
      resolvedProjectId,
      userApiKey: options?.userApiKey,
      aiProviderOptions: options?.aiProviderOptions,
      bodyMarkdown: generated.body_markdown,
    });

    await db
      .update(contentItemsTable)
      .set({ status: "prepared" })
      .where(eq(contentItemsTable.id, item.id));

    return {
      primaryPieceId: stub.id,
      variantPieceIds,
      generationUsage: generated.generationUsage,
    };
  } catch (err) {
    await db
      .update(contentPiecesTable)
      .set({ status: "failed" })
      .where(eq(contentPiecesTable.id, stub.id));
    await db
      .update(contentItemsTable)
      .set({ status: "failed" })
      .where(eq(contentItemsTable.id, item.id));
    throw err;
  }
}

async function maybeGenerateVariants(params: {
  generateVariants?: boolean;
  connectedCreds: CmsIntegrationCredentials;
  primary: { id: number };
  primaryFormat: ContentFormatType;
  brand: BrandContext;
  item: typeof contentItemsTable.$inferSelect;
  plannedDate: string;
  approvalStatus: ContentPieceApprovalStatus;
  resolvedProjectId: number;
  userApiKey?: string | null;
  aiProviderOptions?: Awaited<ReturnType<typeof getUserAiProviderOptions>>;
  bodyMarkdown: string;
}): Promise<number[]> {
  const variantPieceIds: number[] = [];
  if (params.generateVariants === false) return variantPieceIds;

  const creds = decryptCmsCredentials(params.connectedCreds);
  const connectedPlatforms = getConnectedSocialPlatforms(creds);

  for (const platform of connectedPlatforms) {
    const variantFormat = PLATFORM_FORMAT[platform];
    if (variantFormat === params.primaryFormat) continue;

    const repurposed = await repurposeContentPiece(
      variantFormat,
      params.brand,
      params.bodyMarkdown,
      params.item.primaryKeyword,
      params.userApiKey,
      params.aiProviderOptions,
    );

    const [variant] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: params.resolvedProjectId,
        contentItemId: params.item.id,
        parentPieceId: params.primary.id,
        formatType: variantFormat,
        title: repurposed.title || `${params.item.title} (${platform})`,
        targetKeyword: params.item.primaryKeyword,
        bodyMarkdown: repurposed.body_markdown,
        status: "draft",
        approvalStatus: params.approvalStatus,
        wordCount: repurposed.body_markdown.split(/\s+/).filter(Boolean).length,
        plannedDate: params.plannedDate,
        publishPlatform: platform,
        pieceMetadata: repurposed.pieceMetadata ?? null,
      })
      .returning();
    variantPieceIds.push(variant.id);
  }

  return variantPieceIds;
}
