import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { seoArticlesTable, websiteProjectsTable } from "@workspace/db/schema";
import type { ContentStyle } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { generateSeoArticleContent } from "@/lib/ai/seo-content-generator";
import { loadUserAiSettings } from "@/lib/content-pieces-helpers";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
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

  const limited = rateLimitResponse(
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

  if (websiteProjectId) {
    const [proj] = await db
      .select({ id: websiteProjectsTable.id, contentStyle: websiteProjectsTable.contentStyle })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, websiteProjectId), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);
    if (!proj) return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    validatedProjectId = websiteProjectId;
    projectContentStyle = proj.contentStyle as ContentStyle | null;
  }

  try {
    const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
    const articleContent = await generateSeoArticleContent(
      brandName,
      websiteUrl,
      industry,
      location,
      stage,
      userApiKey,
      projectContentStyle,
      aiProviderOptions,
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

    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate SEO article. Please try again." }, { status: 503 });
  }
}
