import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  brandProfilesTable,
  websiteProjectsTable,
  contentPiecesTable,
  seoArticlesTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { generateTopicalMap } from "@/lib/ai/topical-map-generator";
import { loadUserAiSettings } from "@/lib/content/content-pieces-helpers";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { logger } from "@/lib/utils/logger";
import type { ScrapeData } from "@/lib/projects/project-detail-types";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { z } from "zod";

const Body = z.object({
  websiteProjectId: z.number().int().positive(),
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
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { websiteProjectId } = parsed.data;

  try {
    const [project] = await db
      .select()
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, websiteProjectId))
      .limit(1);

    if (!project || project.userId !== userId!) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [brand] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, websiteProjectId))
      .limit(1);

    const scrapeData = project.scrapeData as ScrapeData | null;

    const companyData = {
      name: brand?.companyName ?? scrapeData?.companyName ?? project.name,
      industry: brand?.industry ?? scrapeData?.industry ?? "",
      description: "",
      targetAudience: brand?.targetAudience ?? scrapeData?.targetAudience ?? "",
      websiteUrl: project.url,
    };

    const [pieces, seoArticles] = await Promise.all([
      db
        .select({ title: contentPiecesTable.title })
        .from(contentPiecesTable)
        .where(eq(contentPiecesTable.websiteProjectId, websiteProjectId)),
      db
        .select({ title: seoArticlesTable.title })
        .from(seoArticlesTable)
        .where(eq(seoArticlesTable.websiteProjectId, websiteProjectId)),
    ]);

    const existingTitles = [...pieces, ...seoArticles]
      .map((row) => row.title)
      .filter((title): title is string => Boolean(title));

    const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
    const billingPrep = await prepareAiBilling({
      userId: userId!,
      tier: "planning",
      quotaKind: "article",
      usedByok: Boolean(userApiKey),
    });
    if (!billingPrep.ok) return billingPrep.response;

    try {
      const result = await generateTopicalMap(
        {
          company: companyData,
          existingArticleTitles: existingTitles,
        },
        { userApiKey, aiProviderOptions },
      );

      await completeAiBilling(billingPrep.ctx, {
        userId: userId!,
        eventType: "topical_map",
        usedByok: billingPrep.usedByok,
        tier: "planning",
        promptTokens: result.generationUsage?.promptTokens,
        outputTokens: result.generationUsage?.outputTokens,
        totalTokens: result.generationUsage?.totalTokens,
      });

      return NextResponse.json({ map: result });
    } catch (genErr) {
      await cancelAiBilling(billingPrep.ctx, "generation_failed");
      throw genErr;
    }
  } catch (err) {
    logger.error({ err, websiteProjectId }, "Topical map generation failed");
    return NextResponse.json({ error: "Failed to generate topical map" }, { status: 500 });
  }
}
