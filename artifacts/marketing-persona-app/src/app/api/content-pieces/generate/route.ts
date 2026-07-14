import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, CONTENT_FORMAT_TYPES } from "@workspace/db/schema";
import type { ContentFormatType } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { generateContentPiece, buildCacheKey, cacheGet } from "@/lib/ai/content-studio-generator";
import { loadProjectBrand } from "@/lib/content/content-pieces-helpers";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
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

  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = GenerateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { websiteProjectId, formatType, targetKeyword, plannedDate, angleHint } = parsed.data;

  try {
    const ctx = await loadProjectBrand(websiteProjectId, userId!);
    if (!ctx) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const brand = ctx.brand;
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

    const aiCached = await cacheGet(cacheKeyStr);
    if (aiCached) {
      const wordCount = aiCached.body_markdown.split(/\s+/).filter(Boolean).length;
      const [inserted] = await db
        .insert(contentPiecesTable)
        .values({
          websiteProjectId,
          formatType: formatType as ContentFormatType,
          title: aiCached.title,
          targetKeyword: aiCached.target_keyword,
          bodyMarkdown: aiCached.body_markdown,
          wordCount,
          status: "draft",
          cacheKey: cacheKeyStr,
          plannedDate: plannedDate ?? null,
          pieceMetadata: aiCached.pieceMetadata ?? null,
        })
        .returning();
      return NextResponse.json(inserted, { status: 201, headers: { "X-Cache": "HIT" } });
    }

    const billingPrep = await prepareAiBilling({
      userId: userId!,
      tier: "execution",
      quotaKind: "article",
    });
    if (!billingPrep.ok) return billingPrep.response;

    try {
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
          pieceMetadata: result.pieceMetadata ?? null,
        })
        .returning();

      await completeAiBilling(billingPrep.ctx, {
        userId: userId!,
        eventType: "content_generation",
        usedByok: billingPrep.usedByok,
        tier: "execution",
      });

      return NextResponse.json(inserted, { status: 201 });
    } catch (err) {
      await cancelAiBilling(billingPrep.ctx);
      throw err;
    }
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate content. Please try again." }, { status: 503 });
  }
}
