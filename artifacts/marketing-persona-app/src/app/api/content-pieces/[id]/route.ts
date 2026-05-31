import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const PatchBody = z.object({
  title: z.string().optional(),
  bodyMarkdown: z.string().optional(),
  status: z.enum(["draft", "ready"]).optional(),
  plannedDate: z.string().regex(ISO_DATE_RE, "plannedDate must be a valid ISO date (YYYY-MM-DD)").nullable().optional(),
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
    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);

    if (!piece) return NextResponse.json({ error: "Content piece not found" }, { status: 404 });

    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);

    if (!project) return NextResponse.json({ error: "Access denied" }, { status: 403 });

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
    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);

    if (!piece) return NextResponse.json({ error: "Content piece not found" }, { status: 404 });

    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);

    if (!project) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const updates: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.bodyMarkdown !== undefined) {
      updates.bodyMarkdown = parsed.data.bodyMarkdown;
      updates.wordCount = parsed.data.bodyMarkdown.split(/\s+/).filter(Boolean).length;
    }
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.plannedDate !== undefined) updates.plannedDate = parsed.data.plannedDate;

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
