import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { briefsTable, goalsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/org/org-access";
import { z } from "zod";

const FUNNEL_STAGES = ["tofu", "mofu", "bofu"] as const;
const STATUSES = ["draft", "approved", "generating", "done"] as const;

const UpdateBriefBody = z
  .object({
    workingTitle: z.string().min(1).optional(),
    targetKeywordCluster: z.string().nullable().optional(),
    searchIntent: z.string().nullable().optional(),
    funnelStage: z.enum(FUNNEL_STAGES).nullable().optional(),
    outline: z.unknown().optional(),
    angle: z.string().nullable().optional(),
    cta: z.string().nullable().optional(),
    internalLinkTargets: z.unknown().optional(),
    successMetric: z.string().nullable().optional(),
    format: z.string().nullable().optional(),
    wordCount: z.number().int().nullable().optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Request body must include at least one field to update",
  });

async function findOwnedBrief(id: number, userId: number) {
  const [brief] = await db.select().from(briefsTable).where(eq(briefsTable.id, id)).limit(1);
  if (!brief) return null;

  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, brief.goalId)).limit(1);
  if (!goal) return null;

  const access = await requireProjectAccess(goal.projectId, userId);
  if (!access.ok) return null;

  return brief;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const id = Number((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid brief id" }, { status: 400 });

  const brief = await findOwnedBrief(id, userId!);
  if (!brief) return NextResponse.json({ error: "Brief not found" }, { status: 404 });

  return NextResponse.json(brief);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const id = Number((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid brief id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateBriefBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const brief = await findOwnedBrief(id, userId!);
  if (!brief) return NextResponse.json({ error: "Brief not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) updates[key] = value;
  }

  const [updated] = await db.update(briefsTable).set(updates).where(eq(briefsTable.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const id = Number((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid brief id" }, { status: 400 });

  const brief = await findOwnedBrief(id, userId!);
  if (!brief) return NextResponse.json({ error: "Brief not found" }, { status: 404 });

  await db.delete(briefsTable).where(eq(briefsTable.id, id));
  return new NextResponse(null, { status: 204 });
}
