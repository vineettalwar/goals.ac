import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import type { ContentFormatType } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import {
  generateContentPiece,
  buildCacheKey,
} from "@workspace/content-engine/content-studio-generator";
import {
  assertPieceOwner,
  loadProjectBrand,
  loadUserApiKey,
  wordCountFromMarkdown,
} from "@/lib/content-pieces-helpers";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const RegenerateBody = z.object({
  angleHint: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return limited;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const parsed = RegenerateBody.safeParse(body);

  const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  if (ownerError === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const ctx = await loadProjectBrand(piece!.websiteProjectId, userId!);
  if (!ctx) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const angleHint = parsed.success ? parsed.data.angleHint : undefined;
  const userApiKey = await loadUserApiKey(userId!);

  try {
    const result = await generateContentPiece(
      piece!.formatType as ContentFormatType,
      ctx.brand,
      piece!.targetKeyword ?? "",
      angleHint,
      true,
      userApiKey,
    );

    const cacheKeyStr = buildCacheKey(piece!.formatType, piece!.targetKeyword ?? "", ctx.brand, angleHint);

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount: wordCountFromMarkdown(result.body_markdown),
        cacheKey: cacheKeyStr,
        status: "draft",
      })
      .where(eq(contentPiecesTable.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Regeneration failed" }, { status: 503 });
  }
}
