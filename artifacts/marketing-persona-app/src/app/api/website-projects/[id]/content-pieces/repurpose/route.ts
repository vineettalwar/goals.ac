import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, CONTENT_FORMAT_TYPES } from "@workspace/db/schema";
import type { ContentFormatType } from "@workspace/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { repurposeContentPiece } from "@workspace/content-engine/content-studio-generator";
import {
  loadProjectBrand,
  loadUserAiSettings,
  wordCountFromMarkdown,
} from "@/lib/content/content-pieces-helpers";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { z } from "zod";

const RepurposeFromTextBody = z.object({
  targetFormat: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  existingContent: z.string().min(50, "Existing content must be at least 50 characters"),
  targetKeyword: z.string().min(1, "Target keyword is required"),
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
  const projectId = Number(idStr);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = RepurposeFromTextBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const ctx = await loadProjectBrand(projectId, userId!);
  if (!ctx) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "execution",
    quotaKind: "article",
    usedByok: Boolean(userApiKey),
  });
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const result = await repurposeContentPiece(
      parsed.data.targetFormat as ContentFormatType,
      ctx.brand,
      parsed.data.existingContent,
      parsed.data.targetKeyword,
      userApiKey,
      aiProviderOptions,
    );

    const [inserted] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: projectId,
        formatType: parsed.data.targetFormat as ContentFormatType,
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount: wordCountFromMarkdown(result.body_markdown),
        status: "draft",
      })
      .returning();

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "content_repurpose",
      usedByok: billingPrep.usedByok,
      tier: "execution",
    });

    return NextResponse.json(inserted, { status: 201 });
  } catch {
    await cancelAiBilling(billingPrep.ctx);
    return NextResponse.json({ error: "Failed to repurpose content" }, { status: 503 });
  }
}
