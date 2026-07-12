import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { briefsTable, goalsTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

const CreateBriefBody = z.object({
  goalId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  workingTitle: z.string().min(1),
  targetKeywordCluster: z.string().optional(),
  angle: z.string().optional(),
  outline: z.string().optional(),
  format: z.string().optional(),
}).refine((d) => d.goalId || d.projectId, { message: "goalId or projectId is required" });

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const projectId = Number(url.searchParams.get("projectId"));
  const goalId = Number(url.searchParams.get("goalId"));

  if (!isNaN(projectId)) {
    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const projectGoals = await db
      .select({ id: goalsTable.id })
      .from(goalsTable)
      .where(eq(goalsTable.projectId, projectId));

    if (projectGoals.length === 0) return NextResponse.json({ briefs: [] });

    const goalIds = projectGoals.map((g) => g.id);
    const briefs = await db
      .select()
      .from(briefsTable)
      .where(inArray(briefsTable.goalId, goalIds))
      .orderBy(desc(briefsTable.createdAt));

    return NextResponse.json({ briefs });
  }

  if (isNaN(goalId)) {
    return NextResponse.json({ error: "goalId or projectId is required" }, { status: 400 });
  }

  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, goalId)).limit(1);
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, goal.projectId), eq(websiteProjectsTable.userId, userId!)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const briefs = await db
    .select()
    .from(briefsTable)
    .where(eq(briefsTable.goalId, goalId))
    .orderBy(desc(briefsTable.createdAt));

  return NextResponse.json({ briefs });
}

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = CreateBriefBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  let resolvedGoalId = parsed.data.goalId;

  if (!resolvedGoalId && parsed.data.projectId) {
    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, parsed.data.projectId), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const [existingGoal] = await db
      .select({ id: goalsTable.id })
      .from(goalsTable)
      .where(eq(goalsTable.projectId, parsed.data.projectId))
      .limit(1);

    if (existingGoal) {
      resolvedGoalId = existingGoal.id;
    } else {
      const [newGoal] = await db
        .insert(goalsTable)
        .values({
          projectId: parsed.data.projectId,
          objective: "traffic",
          targetMetric: "Content pipeline",
          status: "active",
        })
        .returning();
      resolvedGoalId = newGoal.id;
    }
  }

  if (!resolvedGoalId) return NextResponse.json({ error: "Could not resolve goal" }, { status: 400 });

  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, resolvedGoalId)).limit(1);
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, goal.projectId), eq(websiteProjectsTable.userId, userId!)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const [brief] = await db
    .insert(briefsTable)
    .values({
      goalId: resolvedGoalId,
      workingTitle: parsed.data.workingTitle,
      targetKeywordCluster: parsed.data.targetKeywordCluster,
      angle: parsed.data.angle ?? parsed.data.outline,
      format: parsed.data.format ?? "blog_post",
      status: "draft",
    })
    .returning();

  return NextResponse.json(brief, { status: 201 });
}
