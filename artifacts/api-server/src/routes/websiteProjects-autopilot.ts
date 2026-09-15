import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { parseAutopilotSettings } from "../lib/autopilotScheduler";
import type { AutopilotSettings } from "@workspace/db";

const router: IRouter = Router();

const AutopilotSettingsBody = z.object({
  enabled: z.boolean().optional(),
  cadence: z.enum(["daily", "weekly"]).optional(),
  timezone: z.string().min(1).optional(),
  publishMode: z.enum(["manual", "draft", "live"]).optional(),
  preferredRunHour: z.number().int().min(0).max(23).optional(),
  autoQueueOpportunities: z.boolean().optional(),
  opportunityScoreThreshold: z.number().int().min(0).max(100).optional(),
});

router.get("/website-projects/:id/autopilot-settings", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const [project] = await db
      .select({ autopilotSettings: websiteProjectsTable.autopilotSettings })
      .from(websiteProjectsTable)
      .where(
        and(eq(websiteProjectsTable.id, id), eq(websiteProjectsTable.userId, req.user!.userId)),
      )
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(parseAutopilotSettings(project.autopilotSettings));
  } catch (err) {
    req.log.error(err, "Failed to get autopilot settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/website-projects/:id/autopilot-settings", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const parsed = AutopilotSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: " + parsed.error.message });
    return;
  }

  try {
    const [project] = await db
      .select({
        id: websiteProjectsTable.id,
        autopilotSettings: websiteProjectsTable.autopilotSettings,
      })
      .from(websiteProjectsTable)
      .where(
        and(eq(websiteProjectsTable.id, id), eq(websiteProjectsTable.userId, req.user!.userId)),
      )
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const current = parseAutopilotSettings(project.autopilotSettings);
    const updated: AutopilotSettings = {
      ...current,
      ...parsed.data,
    };

    await db
      .update(websiteProjectsTable)
      .set({ autopilotSettings: updated })
      .where(eq(websiteProjectsTable.id, id));

    res.json(updated);
  } catch (err) {
    req.log.error(err, "Failed to update autopilot settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
