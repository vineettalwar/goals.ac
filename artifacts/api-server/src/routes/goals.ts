import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { goalsTable, websiteProjectsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const OBJECTIVES = ["traffic", "leads", "sales", "authority"] as const;
const STATUSES = ["draft", "active", "achieved", "archived"] as const;

const CreateGoalBody = z.object({
  projectId: z.number().int().positive(),
  objective: z.enum(OBJECTIVES),
  targetMetric: z.string().min(1, "Target metric is required"),
  baseline: z.string().optional(),
  deadline: z.coerce.date().optional(),
  icp: z.string().optional(),
  priority: z.number().int().optional(),
  status: z.enum(STATUSES).optional(),
});

const UpdateGoalBody = z
  .object({
    objective: z.enum(OBJECTIVES).optional(),
    targetMetric: z.string().min(1, "Target metric is required").optional(),
    baseline: z.string().nullable().optional(),
    deadline: z.coerce.date().nullable().optional(),
    icp: z.string().nullable().optional(),
    priority: z.number().int().optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Request body must include at least one field to update",
  });

router.get("/goals", requireAuth, async (req, res) => {
  const projectId = Number(req.query.projectId);
  if (!req.query.projectId || isNaN(projectId)) {
    res.status(400).json({ error: "Invalid or missing projectId" });
    return;
  }

  try {
    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const goals = await db
      .select()
      .from(goalsTable)
      .where(eq(goalsTable.projectId, projectId))
      .orderBy(desc(goalsTable.createdAt));

    res.json(goals);
  } catch (err) {
    req.log.error(err, "Failed to list goals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/goals", requireAuth, async (req, res) => {
  const parsed = CreateGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { projectId, objective, targetMetric, baseline, deadline, icp, priority, status } = parsed.data;

  try {
    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [goal] = await db
      .insert(goalsTable)
      .values({
        projectId,
        objective,
        targetMetric,
        baseline,
        deadline,
        icp,
        ...(priority !== undefined ? { priority } : {}),
        ...(status !== undefined ? { status } : {}),
      })
      .returning();

    res.status(201).json(goal);
  } catch (err) {
    req.log.error(err, "Failed to create goal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/goals/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid goal id" });
    return;
  }

  try {
    const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id)).limit(1);

    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, goal.projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    res.json(goal);
  } catch (err) {
    req.log.error(err, "Failed to get goal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/goals/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid goal id" });
    return;
  }

  const parsed = UpdateGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  try {
    const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id)).limit(1);

    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, goal.projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.objective !== undefined) updates.objective = parsed.data.objective;
    if (parsed.data.targetMetric !== undefined) updates.targetMetric = parsed.data.targetMetric;
    if (parsed.data.baseline !== undefined) updates.baseline = parsed.data.baseline;
    if (parsed.data.deadline !== undefined) updates.deadline = parsed.data.deadline;
    if (parsed.data.icp !== undefined) updates.icp = parsed.data.icp;
    if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;

    const [updated] = await db.update(goalsTable).set(updates).where(eq(goalsTable.id, id)).returning();

    res.json(updated);
  } catch (err) {
    req.log.error(err, "Failed to update goal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/goals/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid goal id" });
    return;
  }

  try {
    const [goal] = await db
      .select({ id: goalsTable.id, projectId: goalsTable.projectId })
      .from(goalsTable)
      .where(eq(goalsTable.id, id))
      .limit(1);

    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, goal.projectId), eq(websiteProjectsTable.userId, req.user!.userId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    await db.delete(goalsTable).where(eq(goalsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err, "Failed to delete goal");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
