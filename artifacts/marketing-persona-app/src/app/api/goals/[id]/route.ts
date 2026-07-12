import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { goalsTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

const OBJECTIVES = ["traffic", "leads", "sales", "authority"] as const;
const STATUSES = ["draft", "active", "achieved", "archived"] as const;

const UpdateGoalBody = z
  .object({
    objective: z.enum(OBJECTIVES).optional(),
    targetMetric: z.string().min(1).optional(),
    baseline: z.string().nullable().optional(),
    deadline: z.coerce.date().nullable().optional(),
    icp: z.string().nullable().optional(),
    priority: z.number().int().optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Request body must include at least one field to update",
  });

async function findOwnedGoal(id: number, userId: number) {
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id)).limit(1);
  if (!goal) return null;

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, goal.projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);

  return project ? goal : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const id = Number((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid goal id" }, { status: 400 });

  const goal = await findOwnedGoal(id, userId!);
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  return NextResponse.json(goal);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const id = Number((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid goal id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateGoalBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const goal = await findOwnedGoal(id, userId!);
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) updates[key] = value;
  }

  const [updated] = await db.update(goalsTable).set(updates).where(eq(goalsTable.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const id = Number((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid goal id" }, { status: 400 });

  const goal = await findOwnedGoal(id, userId!);
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  await db.delete(goalsTable).where(eq(goalsTable.id, id));
  return new NextResponse(null, { status: 204 });
}
