import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable, brandProfilesTable, CONTENT_FORMAT_TYPES } from "@workspace/db/schema";
import type { ContentFormatType } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { generateContentPiece, buildCacheKey, type BrandContext } from "@/lib/ai/content-studio-generator";
import { z } from "zod";

const GenerateBody = z.object({
  websiteProjectId: z.number().int().positive(),
  formatType: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  targetKeyword: z.string().min(1, "Target keyword is required"),
  plannedDate: z.string().optional(),
  angleHint: z.string().optional(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = GenerateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { websiteProjectId, formatType, targetKeyword, plannedDate, angleHint } = parsed.data;

  try {
    const [project] = await db
      .select()
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, websiteProjectId), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, websiteProjectId))
      .limit(1);

    const brand: BrandContext = {
      companyName: brandProfile?.companyName ?? project.name,
      websiteUrl: project.url,
      industry: brandProfile?.industry ?? "",
      targetAudience: brandProfile?.targetAudience ?? "",
      voiceTone: brandProfile?.voiceTone ?? "",
      primaryKeywords: brandProfile?.primaryKeywords ?? [],
      contentStyle: project.contentStyle ?? null,
    };

    const cacheKeyStr = buildCacheKey(formatType, targetKeyword, brand, angleHint);

    // Check DB cache
    const [existing] = await db
      .select()
      .from(contentPiecesTable)
      .where(and(eq(contentPiecesTable.websiteProjectId, websiteProjectId), eq(contentPiecesTable.cacheKey, cacheKeyStr)))
      .limit(1);

    if (existing) {
      return NextResponse.json(existing, { headers: { "X-Cache": "HIT" } });
    }

    const result = await generateContentPiece(formatType as ContentFormatType, brand, targetKeyword, angleHint);
    const wordCount = result.body_markdown.split(/\s+/).filter(Boolean).length;

    const [inserted] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId,
        formatType: formatType as ContentFormatType,
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount,
        status: "draft",
        cacheKey: cacheKeyStr,
        plannedDate: plannedDate ?? null,
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate content. Please try again." }, { status: 503 });
  }
}
