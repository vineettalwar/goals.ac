import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { companiesTable, scheduledArticlesTable, brandProfilesTable, websiteProjectsTable, contentPiecesTable, seoArticlesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { generateTopicalMap } from "@/lib/ai/topical-map-generator";
import { loadUserAiSettings } from "@/lib/content-pieces-helpers";
import { logger } from "@/lib/logger";
import type { ScrapeData } from "@/lib/project-detail-types";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const Body = z.object({
  companyId: z.number().int().positive().optional(),
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
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { companyId, websiteProjectId } = parsed.data;

  try {
    let companyData: { name: string; industry: string; description: string; targetAudience: string; websiteUrl: string };
    let existingTitles: string[] = [];

    if (companyId) {
      const [company] = await db
        .select()
        .from(companiesTable)
        .where(eq(companiesTable.id, companyId))
        .limit(1);

      if (!company || company.userId !== userId!) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }

      companyData = {
        name: company.name,
        industry: company.industry ?? "",
        description: company.description ?? "",
        targetAudience: company.targetAudience ?? "",
        websiteUrl: company.websiteUrl ?? "",
      };

      const articles = await db
        .select({ title: scheduledArticlesTable.title })
        .from(scheduledArticlesTable)
        .where(eq(scheduledArticlesTable.companyId, companyId));
      existingTitles = articles.map((a) => a.title).filter((t): t is string => t !== null);
    } else if (websiteProjectId) {
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

      companyData = {
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

      existingTitles = [...pieces, ...seoArticles]
        .map((row) => row.title)
        .filter((title): title is string => Boolean(title));
    } else {
      return NextResponse.json({ error: "Either companyId or websiteProjectId is required" }, { status: 400 });
    }

    const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);

    const result = await generateTopicalMap(
      {
        company: companyData,
        existingArticleTitles: existingTitles,
      },
      { userApiKey, aiProviderOptions },
    );

    return NextResponse.json({ map: result });
  } catch (err) {
    logger.error({ err, companyId, websiteProjectId }, "Topical map generation failed");
    return NextResponse.json({ error: "Failed to generate topical map" }, { status: 500 });
  }
}
