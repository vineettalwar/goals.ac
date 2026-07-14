import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertPieceOwner } from "@/lib/content/content-pieces-helpers";
import { z } from "zod";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const PatchBody = z.object({
  title: z.string().optional(),
  bodyMarkdown: z.string().optional(),
  status: z.enum(["draft", "ready"]).optional(),
  plannedDate: z.string().regex(ISO_DATE_RE, "plannedDate must be a valid ISO date (YYYY-MM-DD)").nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  approvalStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional(),
  evergreenConfig: z
    .object({
      enabled: z.boolean(),
      recycleIntervalDays: z.number().int().min(7).max(365),
      maxRecycles: z.number().int().min(1).max(50).optional(),
      recycleCount: z.number().int().min(0).optional(),
    })
    .nullable()
    .optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: "Request body must include at least one field to update" },
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
    if (ownerError === "not_found") return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
    if (ownerError === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

    return NextResponse.json(piece);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
    if (ownerError === "not_found") return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
    if (ownerError === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const updates: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.bodyMarkdown !== undefined) {
      updates.bodyMarkdown = parsed.data.bodyMarkdown;
      updates.wordCount = parsed.data.bodyMarkdown.split(/\s+/).filter(Boolean).length;
    }
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.plannedDate !== undefined) updates.plannedDate = parsed.data.plannedDate;
    if (parsed.data.scheduledAt !== undefined) {
      updates.scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
    }
    if (parsed.data.approvalStatus !== undefined) updates.approvalStatus = parsed.data.approvalStatus;
    if (parsed.data.evergreenConfig !== undefined) updates.evergreenConfig = parsed.data.evergreenConfig;

    const [updated] = await db
      .update(contentPiecesTable)
      .set(updates)
      .where(eq(contentPiecesTable.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  if (ownerError === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

  await db.delete(contentPiecesTable).where(eq(contentPiecesTable.id, id));
  return NextResponse.json({ ok: true });
}
