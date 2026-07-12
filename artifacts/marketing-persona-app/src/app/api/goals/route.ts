import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { goalsTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

const OBJECTIVES = ["traffic", "leads", "sales", "authority"] as const;
const STATUSES = ["draft", "active", "achieved", "archived"] as const;

const CreateGoalBody = z.object({
  projectId: z.number().int().positive(),
  objective: z.enum(OBJECTIVES),
  targetMetric: z.string().min(1),
  baseline: z.string().optional(),
  deadline: z.coerce.date().optional(),
  icp: z.string().optional(),
  priority: z.number().int().optional(),
  status: z.enum(STATUSES).optional(),
});

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number(new URL(req.url).searchParams.get("projectId"));
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId!)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const goals = await db
    .select()
    .from(goalsTable)
    .where(eq(goalsTable.projectId, projectId))
    .orderBy(desc(goalsTable.createdAt));

  return NextResponse.json({ goals });
}

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = CreateGoalBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, parsed.data.projectId), eq(websiteProjectsTable.userId, userId!)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const [goal] = await db
    .insert(goalsTable)
    .values({
      projectId: parsed.data.projectId,
      objective: parsed.data.objective,
      targetMetric: parsed.data.targetMetric,
      baseline: parsed.data.baseline,
      deadline: parsed.data.deadline,
      icp: parsed.data.icp,
      priority: parsed.data.priority ?? 0,
      status: parsed.data.status ?? "draft",
    })
    .returning();

  return NextResponse.json(goal, { status: 201 });
}
