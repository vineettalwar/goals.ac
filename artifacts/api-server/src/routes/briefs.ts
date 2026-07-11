import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { briefsTable, goalsTable, websiteProjectsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const FUNNEL_STAGES = ["tofu", "mofu", "bofu"] as const;
const STATUSES = ["draft", "approved", "generating", "done"] as const;

const CreateBriefBody = z.object({
  goalId: z.number().int().positive(),
  workingTitle: z.string().min(1, "Working title is required"),
  targetKeywordCluster: z.string().optional(),
  searchIntent: z.string().optional(),
  funnelStage: z.enum(FUNNEL_STAGES).optional(),
  outline: z.unknown().optional(),
  angle: z.string().optional(),
  cta: z.string().optional(),
  internalLinkTargets: z.unknown().optional(),
  successMetric: z.string().optional(),
  format: z.string().optional(),
  wordCount: z.number().int().optional(),
  status: z.enum(STATUSES).optional(),
});

const UpdateBriefBody = z
  .object({
    workingTitle: z.string().min(1, "Working title is required").optional(),
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

/** Looks up a goal and verifies the requesting user owns the project it belongs to. */
async function findOwnedGoal(goalId: number, userId: number) {
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, goalId)).limit(1);
  if (!goal) return null;

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, goal.projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);

  if (!project) return null;
  return goal;
}

router.get("/briefs", requireAuth, async (req, res) => {
  const goalId = Number(req.query.goalId);
  if (!req.query.goalId || isNaN(goalId)) {
    res.status(400).json({ error: "Invalid or missing goalId" });
    return;
  }

  try {
    const goal = await findOwnedGoal(goalId, req.user!.userId);
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    const briefs = await db
      .select()
      .from(briefsTable)
      .where(eq(briefsTable.goalId, goalId))
      .orderBy(desc(briefsTable.createdAt));

    res.json(briefs);
  } catch (err) {
    req.log.error(err, "Failed to list briefs");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/briefs", requireAuth, async (req, res) => {
  const parsed = CreateBriefBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { goalId, ...fields } = parsed.data;

  try {
    const goal = await findOwnedGoal(goalId, req.user!.userId);
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    const [brief] = await db
      .insert(briefsTable)
      .values({
        goalId,
        workingTitle: fields.workingTitle,
        targetKeywordCluster: fields.targetKeywordCluster,
        searchIntent: fields.searchIntent,
        funnelStage: fields.funnelStage,
        outline: fields.outline,
        angle: fields.angle,
        cta: fields.cta,
        internalLinkTargets: fields.internalLinkTargets,
        successMetric: fields.successMetric,
        format: fields.format,
        wordCount: fields.wordCount,
        ...(fields.status !== undefined ? { status: fields.status } : {}),
      })
      .returning();

    res.status(201).json(brief);
  } catch (err) {
    req.log.error(err, "Failed to create brief");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/briefs/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid brief id" });
    return;
  }

  try {
    const [brief] = await db.select().from(briefsTable).where(eq(briefsTable.id, id)).limit(1);

    if (!brief) {
      res.status(404).json({ error: "Brief not found" });
      return;
    }

    const goal = await findOwnedGoal(brief.goalId, req.user!.userId);
    if (!goal) {
      res.status(404).json({ error: "Brief not found" });
      return;
    }

    res.json(brief);
  } catch (err) {
    req.log.error(err, "Failed to get brief");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/briefs/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid brief id" });
    return;
  }

  const parsed = UpdateBriefBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  try {
    const [brief] = await db.select().from(briefsTable).where(eq(briefsTable.id, id)).limit(1);

    if (!brief) {
      res.status(404).json({ error: "Brief not found" });
      return;
    }

    const goal = await findOwnedGoal(brief.goalId, req.user!.userId);
    if (!goal) {
      res.status(404).json({ error: "Brief not found" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.workingTitle !== undefined) updates.workingTitle = parsed.data.workingTitle;
    if (parsed.data.targetKeywordCluster !== undefined) updates.targetKeywordCluster = parsed.data.targetKeywordCluster;
    if (parsed.data.searchIntent !== undefined) updates.searchIntent = parsed.data.searchIntent;
    if (parsed.data.funnelStage !== undefined) updates.funnelStage = parsed.data.funnelStage;
    if (parsed.data.outline !== undefined) updates.outline = parsed.data.outline;
    if (parsed.data.angle !== undefined) updates.angle = parsed.data.angle;
    if (parsed.data.cta !== undefined) updates.cta = parsed.data.cta;
    if (parsed.data.internalLinkTargets !== undefined) updates.internalLinkTargets = parsed.data.internalLinkTargets;
    if (parsed.data.successMetric !== undefined) updates.successMetric = parsed.data.successMetric;
    if (parsed.data.format !== undefined) updates.format = parsed.data.format;
    if (parsed.data.wordCount !== undefined) updates.wordCount = parsed.data.wordCount;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;

    const [updated] = await db.update(briefsTable).set(updates).where(eq(briefsTable.id, id)).returning();

    res.json(updated);
  } catch (err) {
    req.log.error(err, "Failed to update brief");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/briefs/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid brief id" });
    return;
  }

  try {
    const [brief] = await db
      .select({ id: briefsTable.id, goalId: briefsTable.goalId })
      .from(briefsTable)
      .where(eq(briefsTable.id, id))
      .limit(1);

    if (!brief) {
      res.status(404).json({ error: "Brief not found" });
      return;
    }

    const goal = await findOwnedGoal(brief.goalId, req.user!.userId);
    if (!goal) {
      res.status(404).json({ error: "Brief not found" });
      return;
    }

    await db.delete(briefsTable).where(eq(briefsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err, "Failed to delete brief");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
