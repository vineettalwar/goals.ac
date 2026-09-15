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
import {
  loopMetaFromRun,
  runResearchThenDraftLoop,
  studioDraftFromKeyword,
  UNATTENDED_AGENT_LOOP_CAPS,
} from "../agent-loop";

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

  const generatedHolder: { value?: Awaited<ReturnType<typeof generateContentPiece>> } = {};
  const loop = await runResearchThenDraftLoop({
    projectId: resolvedProjectId,
    userId,
    keyword: item.primaryKeyword,
    caps: UNATTENDED_AGENT_LOOP_CAPS,
    generateDraft: async () => {
      const out = await studioDraftFromKeyword({
        projectId: resolvedProjectId,
        userId,
        format: primaryFormat,
        keyword: item.primaryKeyword,
        angleHint: item.topicAngle,
        bypassCache: false,
        userApiKey: options?.userApiKey,
        aiProviderOptions: options?.aiProviderOptions,
        brand,
      });
      generatedHolder.value = out.generated;
      return out.tool;
    },
  });
  const generated = generatedHolder.value;
  if (!generated) throw new Error(loop.stopReason ?? "Agent loop did not produce a draft");

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
      pieceMetadata: {
        ...(generated.pieceMetadata ?? {}),
        ...loopMetaFromRun(loop),
      },
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
