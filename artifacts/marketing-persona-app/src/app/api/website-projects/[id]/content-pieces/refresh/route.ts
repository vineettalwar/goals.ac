import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { createRefreshContentPiece } from "@workspace/content-engine/content/create-refresh-content-piece";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";

const RefreshBody = z.object({
  url: z.string().url(),
  targetKeyword: z.string().min(1).max(200),
  secondaryKeywords: z.array(z.string().min(1).max(100)).max(12).optional(),
  bodyMarkdown: z.string().min(1).max(200_000).optional(),
  titleHint: z.string().min(1).max(300).optional(),
  confirmCanonical: z.boolean().optional(),
  refreshOf: z.number().int().positive().optional(),
  cmsRemoteId: z.string().min(1).max(40).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `refresh-import:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return limited;

  const { id: idStr } = await params;
  const projectId = Number(idStr);
  if (isNaN(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const raw = await req.json().catch(() => null);
  const parsed = RefreshBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const result = await createRefreshContentPiece({
    projectId,
    ...parsed.data,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        ...(result.pasteFallback ? { pasteFallback: true } : {}),
        ...(result.needsCanonicalConfirm
          ? {
              needsCanonicalConfirm: true,
              enteredUrl: result.enteredUrl,
              fetchedCanonicalUrl: result.fetchedCanonicalUrl,
              title: result.title,
            }
          : {}),
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    piece: result.piece,
    warnings: result.warnings,
  });
}
