import { db } from "@workspace/db";
import {
  contentPiecesTable,
  contentItemsTable,
  contentStrategiesTable,
  websiteProjectsTable,
  brandProfilesTable,
  type ContentFormatType,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  generateContentPiece,
  repurposeContentPiece,
  type BrandContext,
} from "./content-studio-generator";
import { getUserAiProviderOptions } from "./support/user-ai-provider";
import {
  decryptCmsCredentials,
  getConnectedSocialPlatforms,
  type CmsIntegrationCredentials,
  type SocialPlatform,
} from "./support/cms-integrations";

const FORMAT_MAP: Record<string, ContentFormatType> = {
  "linkedin post": "linkedin_post",
  "twitter thread": "twitter_thread",
  "instagram post": "instagram_post",
  "facebook post": "facebook_post",
  "blog article": "blog_post",
  "blog post": "blog_post",
  "news article": "news_article",
  "tutorial": "tutorial",
  "guide": "guide",
  "case study": "blog_post",
  "newsletter": "email_sequence",
  "video script": "tutorial",
  "podcast outline": "tutorial",
  "whitepaper": "whitepaper",
  "press release": "press_release",
};

const PLATFORM_FORMAT: Record<SocialPlatform, ContentFormatType> = {
  linkedin: "linkedin_post",
  twitter: "twitter_thread",
  instagram: "instagram_post",
  facebook: "facebook_post",
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
  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);

  return {
    companyName: brand?.companyName ?? project.name,
    websiteUrl: project.url,
    industry: brand?.industry ?? "",
    targetAudience: brand?.targetAudience ?? "",
    voiceTone: brand?.voiceTone ?? "",
    primaryKeywords: brand?.primaryKeywords ?? [],
    contentStyle: (project.contentStyle as BrandContext["contentStyle"]) ?? null,
  };
}

export interface GenerateFromItemResult {
  primaryPieceId: number;
  variantPieceIds: number[];
}

export async function generateFromContentItem(
  itemId: number,
  projectId: number,
  userId: number,
  options?: { generateVariants?: boolean; userApiKey?: string | null; aiProviderOptions?: Awaited<ReturnType<typeof getUserAiProviderOptions>> },
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
      wordCount: generated.body_markdown.split(/\s+/).filter(Boolean).length,
      plannedDate,
      publishPlatform: null,
    })
    .returning();

  const variantPieceIds: number[] = [];
  const creds = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
  const connectedPlatforms = getConnectedSocialPlatforms(creds);

  if (options?.generateVariants !== false && connectedPlatforms.length > 0) {
    for (const platform of connectedPlatforms) {
      const variantFormat = PLATFORM_FORMAT[platform];
      if (variantFormat === primaryFormat) continue;

      const repurposed = await repurposeContentPiece(
        variantFormat,
        brand,
        generated.body_markdown,
        item.primaryKeyword,
        options?.userApiKey,
        options?.aiProviderOptions,
      );

      const [variant] = await db
        .insert(contentPiecesTable)
        .values({
          websiteProjectId: resolvedProjectId,
          contentItemId: item.id,
          parentPieceId: primary.id,
          formatType: variantFormat,
          title: repurposed.title || `${item.title} (${platform})`,
          targetKeyword: item.primaryKeyword,
          bodyMarkdown: repurposed.body_markdown,
          status: "draft",
          wordCount: repurposed.body_markdown.split(/\s+/).filter(Boolean).length,
          plannedDate,
          publishPlatform: platform,
        })
        .returning();
      variantPieceIds.push(variant.id);
    }
  }

  await db
    .update(contentItemsTable)
    .set({ status: "prepared" })
    .where(eq(contentItemsTable.id, item.id));

  return { primaryPieceId: primary.id, variantPieceIds };
}
