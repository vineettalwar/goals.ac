import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { seoArticlesTable } from "@workspace/db/schema";
import type { ContentStyle } from "@workspace/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import { generateSeoArticleContent } from "@/lib/ai/seo-content-generator";
import { loadUserAiSettings } from "@/lib/content/content-pieces-helpers";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand-context-loader";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { z } from "zod";

const GenerateBody = z.object({
  brandName: z.string().min(1),
  websiteUrl: z.string().url(),
  industry: z.string().min(1),
  location: z.string().min(1),
  stage: z.string().min(1),
  roadmapId: z.number().int().positive().optional(),
  websiteProjectId: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = GenerateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing required fields: " + parsed.error.message },
      { status: 400 },
    );
  }

  const { brandName, websiteUrl, industry, location, stage, roadmapId, websiteProjectId } = parsed.data;

  let validatedProjectId: number | null = null;
  let projectContentStyle: ContentStyle | null = null;
  let projectBrand = undefined;

  if (websiteProjectId) {
    const proj = await getAccessibleProject(websiteProjectId, userId!);
    if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    validatedProjectId = websiteProjectId;
    projectContentStyle = proj.contentStyle as ContentStyle | null;
    projectBrand = (await loadBrandContextForProject(websiteProjectId)) ?? undefined;
  }

  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "execution",
    quotaKind: "article",
  });
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const articleContent = await generateSeoArticleContent(
      brandName,
      websiteUrl,
      industry,
      location,
      stage,
      userApiKey,
      projectContentStyle,
      aiProviderOptions,
      validatedProjectId ?? undefined,
      projectBrand,
    );

    const wordCount = articleContent.content.split(/\s+/).filter(Boolean).length;

    const [inserted] = await db
      .insert(seoArticlesTable)
      .values({
        roadmapId: roadmapId ?? null,
        websiteProjectId: validatedProjectId,
        brandName,
        websiteUrl,
        industry,
        location,
        stage,
        title: articleContent.title,
        metaDescription: articleContent.meta_description,
        primaryKeyword: articleContent.primary_keyword,
        secondaryKeywords: articleContent.secondary_keywords,
        content: articleContent.content,
        wordCount,
        status: "draft",
      })
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "seo_article_generation",
      usedByok: billingPrep.usedByok,
      tier: "execution",
    });

    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    await cancelAiBilling(billingPrep.ctx, "generation_failed");
    return NextResponse.json({ error: "Failed to generate SEO article. Please try again." }, { status: 503 });
  }
}
