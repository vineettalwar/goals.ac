import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import type { ContentFormatType } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import {
  generateContentPiece,
} from "@workspace/content-engine/content-studio-generator";
import {
  GenerateBody,
  loadProjectBrand,
  loadUserAiSettings,
  buildPieceCacheKey,
  wordCountFromMarkdown,
} from "@/lib/content-pieces-helpers";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const ALLOWED_STATUSES = ["draft", "ready", "published"] as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const ctx = await loadProjectBrand(projectId, userId!);
  if (!ctx) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");
  const status =
    statusFilter && ALLOWED_STATUSES.includes(statusFilter as (typeof ALLOWED_STATUSES)[number])
      ? (statusFilter as (typeof ALLOWED_STATUSES)[number])
      : null;

  const pieces = await db
    .select()
    .from(contentPiecesTable)
    .where(
      status
        ? and(eq(contentPiecesTable.websiteProjectId, projectId), eq(contentPiecesTable.status, status))
        : eq(contentPiecesTable.websiteProjectId, projectId),
    )
    .orderBy(desc(contentPiecesTable.createdAt));

  return NextResponse.json({ pieces });
}

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
  const projectId = Number(idStr);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = GenerateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { formatType, targetKeyword, angleHint, plannedDate } = parsed.data;
  const ctx = await loadProjectBrand(projectId, userId!);
  if (!ctx) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const bypassCache = req.headers.get("x-bypass-cache") === "true";
  const cacheKeyStr = buildPieceCacheKey(formatType, targetKeyword, ctx.brand, angleHint);

  if (!bypassCache) {
    const [existing] = await db
      .select()
      .from(contentPiecesTable)
      .where(and(eq(contentPiecesTable.websiteProjectId, projectId), eq(contentPiecesTable.cacheKey, cacheKeyStr)))
      .limit(1);
    if (existing) {
      return NextResponse.json(existing, { headers: { "X-Cache": "HIT" } });
    }
  }

  try {
    const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
    const result = await generateContentPiece(
      formatType as ContentFormatType,
      ctx.brand,
      targetKeyword,
      angleHint,
      bypassCache,
      userApiKey,
      aiProviderOptions,
    );

    const [inserted] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: projectId,
        formatType: formatType as ContentFormatType,
        title: result.title,
        targetKeyword: result.target_keyword,
        bodyMarkdown: result.body_markdown,
        wordCount: wordCountFromMarkdown(result.body_markdown),
        status: "draft",
        cacheKey: cacheKeyStr,
        plannedDate: plannedDate ?? null,
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    console.error("Content piece generation failed:", err);
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Failed to generate content. Please try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
