import { Router, type IRouter } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  keywordOpportunitiesTable,
  keywordRankAlertsTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { requireProjectAccess } from "../lib/projectAccess";
import {
  discoverOpportunities,
  queueOpportunityToStrategy,
} from "../services/keywordOpportunityService";
import { enqueue, QUEUES } from "@workspace/jobs";

const router: IRouter = Router();

router.get("/website-projects/:id/keyword-opportunities", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const access = await requireProjectAccess(id, req.user!.userId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  try {
    const status = typeof req.query.status === "string" ? req.query.status : "open";
    const opportunities = await db
      .select()
      .from(keywordOpportunitiesTable)
      .where(
        and(
          eq(keywordOpportunitiesTable.websiteProjectId, id),
          eq(keywordOpportunitiesTable.status, status as "open" | "queued" | "dismissed"),
        ),
      )
      .orderBy(desc(keywordOpportunitiesTable.opportunityScore));

    res.json({ opportunities });
  } catch (err) {
    req.log.error(err, "Failed to list keyword opportunities");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/website-projects/:id/keyword-opportunities/discover", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const access = await requireProjectAccess(id, req.user!.userId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const asyncMode = req.body?.async === true;

  try {
    if (asyncMode) {
      await enqueue(QUEUES.keywordOpportunitySweep, { projectId: id, userId: req.user!.userId });
      res.status(202).json({ queued: true });
      return;
    }

    const inserted = await discoverOpportunities(id, req.user!.userId);
    res.json({ inserted });
  } catch (err) {
    req.log.error(err, "Failed to discover keyword opportunities");
    res.status(502).json({ error: err instanceof Error ? err.message : "Discovery failed" });
  }
});

router.post("/keyword-opportunities/:id/queue", requireAuth, async (req, res) => {
  const oppId = Number(req.params.id);
  if (isNaN(oppId)) {
    res.status(400).json({ error: "Invalid opportunity id" });
    return;
  }

  try {
    const [opp] = await db
      .select()
      .from(keywordOpportunitiesTable)
      .where(eq(keywordOpportunitiesTable.id, oppId))
      .limit(1);
    if (!opp) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }

    const access = await requireProjectAccess(opp.websiteProjectId, req.user!.userId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const result = await queueOpportunityToStrategy(oppId, req.user!.userId);
    res.json(result);
  } catch (err) {
    req.log.error(err, "Failed to queue keyword opportunity");
    res.status(502).json({ error: err instanceof Error ? err.message : "Queue failed" });
  }
});

router.patch("/keyword-opportunities/:id", requireAuth, async (req, res) => {
  const oppId = Number(req.params.id);
  const parsed = z.object({ status: z.enum(["open", "queued", "dismissed"]) }).safeParse(req.body);
  if (isNaN(oppId) || !parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  try {
    const [opp] = await db
      .select()
      .from(keywordOpportunitiesTable)
      .where(eq(keywordOpportunitiesTable.id, oppId))
      .limit(1);
    if (!opp) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }

    const access = await requireProjectAccess(opp.websiteProjectId, req.user!.userId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const [updated] = await db
      .update(keywordOpportunitiesTable)
      .set({ status: parsed.data.status })
      .where(eq(keywordOpportunitiesTable.id, oppId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error(err, "Failed to update keyword opportunity");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/website-projects/:id/keyword-alerts", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const access = await requireProjectAccess(id, req.user!.userId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  try {
    const alerts = await db
      .select()
      .from(keywordRankAlertsTable)
      .where(
        and(
          eq(keywordRankAlertsTable.websiteProjectId, id),
          eq(keywordRankAlertsTable.status, "open"),
        ),
      )
      .orderBy(desc(keywordRankAlertsTable.createdAt));

    res.json({ alerts });
  } catch (err) {
    req.log.error(err, "Failed to list keyword alerts");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/keyword-rank-alerts/:id", requireAuth, async (req, res) => {
  const alertId = Number(req.params.id);
  const parsed = z.object({ status: z.enum(["open", "dismissed", "actioned"]) }).safeParse(req.body);
  if (isNaN(alertId) || !parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  try {
    const [alert] = await db
      .select()
      .from(keywordRankAlertsTable)
      .where(eq(keywordRankAlertsTable.id, alertId))
      .limit(1);
    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    const access = await requireProjectAccess(alert.websiteProjectId, req.user!.userId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const [updated] = await db
      .update(keywordRankAlertsTable)
      .set({ status: parsed.data.status })
      .where(eq(keywordRankAlertsTable.id, alertId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error(err, "Failed to update keyword alert");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
