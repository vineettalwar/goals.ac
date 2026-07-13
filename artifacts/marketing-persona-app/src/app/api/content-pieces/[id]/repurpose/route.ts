import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import type { ContentFormatType } from "@workspace/db/schema";
import { requireAuth } from "@/lib/require-auth";
import { repurposeContentPiece } from "@workspace/content-engine/content-studio-generator";
import {
  assertPieceOwner,
  loadProjectBrand,
  loadUserAiSettings,
  wordCountFromMarkdown,
} from "@/lib/content-pieces-helpers";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";
import { CONTENT_FORMAT_TYPES } from "@workspace/db/schema";

const RepurposeBody = z.object({
  targetFormat: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  existingContent: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return limited;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = RepurposeBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  if (ownerError === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const projectCtx = await loadProjectBrand(piece!.websiteProjectId, userId!);
  if (!projectCtx) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
  const sourceContent = parsed.data.existingContent ?? piece!.bodyMarkdown ?? "";

  try {
    const result = await repurposeContentPiece(
      parsed.data.targetFormat as ContentFormatType,
      projectCtx.brand,
      sourceContent,
      piece!.targetKeyword ?? "",
      userApiKey,
      aiProviderOptions,
    );

    const [inserted] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: piece!.websiteProjectId,
        formatType: parsed.data.targetFormat as ContentFormatType,
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount: wordCountFromMarkdown(result.body_markdown),
        status: "draft",
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Repurpose failed" }, { status: 503 });
  }
}
