import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { scheduleSocialPiece } from "@workspace/content-engine/support/social/social-queue-service";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

const PatchBody = z.object({
  scheduledAt: z.string().datetime().nullable(),
  queuePosition: z.number().int().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id, pieceId: pieceIdStr } = await params;
  const projectId = Number(id);
  const pieceId = Number(pieceIdStr);
  if (isNaN(projectId) || isNaN(pieceId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const [piece] = await db
    .select({ id: contentPiecesTable.id })
    .from(contentPiecesTable)
    .where(
      and(
        eq(contentPiecesTable.id, pieceId),
        eq(contentPiecesTable.websiteProjectId, projectId),
      ),
    )
    .limit(1);

  if (!piece) {
    return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  }

  if (parsed.data.scheduledAt === null) {
    const [updated] = await db
      .update(contentPiecesTable)
      .set({ scheduledAt: null, queuePosition: null })
      .where(eq(contentPiecesTable.id, pieceId))
      .returning();
    return NextResponse.json(updated);
  }

  const updated = await scheduleSocialPiece({
    pieceId,
    scheduledAt: new Date(parsed.data.scheduledAt),
    queuePosition: parsed.data.queuePosition,
  });

  return NextResponse.json(updated);
}
