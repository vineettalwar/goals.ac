import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  llmVisibilityPromptsTable,
  llmVisibilitySnapshotsTable,
  geoAuditsTable,
} from "@workspace/db/schema";
import type { VisibilitySettings } from "@workspace/db";
import { eq, and, desc, gte } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { parseVisibilitySettings } from "../lib/visibilitySettings";
import {
  seedPromptsForProject,
  runVisibilityCheckForProject,
} from "../services/llmVisibilityService";
import {
  computeVisibilityScore,
  aggregateSnapshotsByDate,
} from "@workspace/seo-tools/llmVisibilityChecker";
import { enqueue, QUEUES } from "@workspace/jobs";

const router: IRouter = Router();

const VisibilitySettingsBody = z.object({
  llmTrackingEnabled: z.boolean().optional(),
  geoReauditEnabled: z.boolean().optional(),
});

async function requireOwnedProject(projectId: number, userId: number) {
  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, projectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);
  return project ?? null;
}

router.get("/website-projects/:id/visibility-settings", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const project = await requireOwnedProject(id, req.user!.userId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(parseVisibilitySettings(project.visibilitySettings));
  } catch (err) {
    req.log.error(err, "Failed to get visibility settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/website-projects/:id/visibility-settings", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const parsed = VisibilitySettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: " + parsed.error.message });
    return;
  }

  try {
    const project = await requireOwnedProject(id, req.user!.userId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const current = parseVisibilitySettings(project.visibilitySettings);
    const updated: VisibilitySettings = { ...current, ...parsed.data };

    await db
      .update(websiteProjectsTable)
      .set({ visibilitySettings: updated })
      .where(eq(websiteProjectsTable.id, id));

    if (updated.llmTrackingEnabled && !current.llmTrackingEnabled) {
      const existing = await db
        .select({ id: llmVisibilityPromptsTable.id })
        .from(llmVisibilityPromptsTable)
        .where(eq(llmVisibilityPromptsTable.websiteProjectId, id))
        .limit(1);
      if (existing.length === 0) {
        await seedPromptsForProject(id);
      }
    }

    res.json(updated);
  } catch (err) {
    req.log.error(err, "Failed to update visibility settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/website-projects/:id/visibility", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const project = await requireOwnedProject(id, req.user!.userId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const since = new Date();
    since.setDate(since.getDate() - 90);

    const [snapshots, prompts, geoAudits] = await Promise.all([
      db
        .select()
        .from(llmVisibilitySnapshotsTable)
        .where(
          and(
            eq(llmVisibilitySnapshotsTable.websiteProjectId, id),
            gte(llmVisibilitySnapshotsTable.checkedAt, since),
          ),
        )
        .orderBy(desc(llmVisibilitySnapshotsTable.checkedAt)),
      db
        .select()
        .from(llmVisibilityPromptsTable)
        .where(eq(llmVisibilityPromptsTable.websiteProjectId, id)),
      db
        .select({
          id: geoAuditsTable.id,
          geoScore: geoAuditsTable.geoScore,
          createdAt: geoAuditsTable.createdAt,
        })
        .from(geoAuditsTable)
        .where(
          and(eq(geoAuditsTable.websiteProjectId, id), gte(geoAuditsTable.createdAt, since)),
        )
        .orderBy(desc(geoAuditsTable.createdAt)),
    ]);

    const latestBatch = snapshots.slice(0, prompts.length * 4);
    const citedLatest = latestBatch.filter((s) => s.cited).length;
    const visibilityScore = computeVisibilityScore(citedLatest, latestBatch.length || 1);

    const byEngine = ["chatgpt", "perplexity", "claude", "gemini"].map((engine) => {
      const engineSnaps = latestBatch.filter((s) => s.engine === engine);
      const cited = engineSnaps.filter((s) => s.cited).length;
      return {
        engine,
        cited,
        total: engineSnaps.length,
        score: computeVisibilityScore(cited, engineSnaps.length || 1),
      };
    });

    const competitorHeatmap = new Map<string, number>();
    for (const snap of latestBatch) {
      for (const comp of snap.competitorsMentioned ?? []) {
        competitorHeatmap.set(comp, (competitorHeatmap.get(comp) ?? 0) + 1);
      }
    }

    res.json({
      settings: parseVisibilitySettings(project.visibilitySettings),
      visibilityScore,
      promptCount: prompts.filter((p) => p.isActive).length,
      trend: aggregateSnapshotsByDate(snapshots),
      byEngine,
      competitorMentions: [...competitorHeatmap.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      geoScoreTrend: geoAudits
        .slice()
        .reverse()
        .map((a) => ({
          date: new Date(a.createdAt).toISOString().slice(0, 10),
          score: a.geoScore,
        })),
      latestGeoScore: geoAudits[0]?.geoScore ?? null,
      recentSnapshots: snapshots.slice(0, 20),
    });
  } catch (err) {
    req.log.error(err, "Failed to get visibility summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/website-projects/:id/visibility/seed-prompts", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const project = await requireOwnedProject(id, req.user!.userId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const existing = await db
      .select({ id: llmVisibilityPromptsTable.id })
      .from(llmVisibilityPromptsTable)
      .where(eq(llmVisibilityPromptsTable.websiteProjectId, id))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Prompts already exist for this project" });
      return;
    }

    const count = await seedPromptsForProject(id);
    const prompts = await db
      .select()
      .from(llmVisibilityPromptsTable)
      .where(eq(llmVisibilityPromptsTable.websiteProjectId, id));

    res.status(201).json({ seeded: count, prompts });
  } catch (err) {
    req.log.error(err, "Failed to seed visibility prompts");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/website-projects/:id/visibility/check-now", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const asyncMode = req.body?.async === true;

  try {
    const project = await requireOwnedProject(id, req.user!.userId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    if (asyncMode) {
      await enqueue(QUEUES.llmVisibilityCheck, { projectId: id });
      res.status(202).json({ queued: true });
      return;
    }

    const inserted = await runVisibilityCheckForProject(id);
    res.json({ inserted });
  } catch (err) {
    req.log.error(err, "Failed to run visibility check");
    res.status(502).json({ error: err instanceof Error ? err.message : "Check failed" });
  }
});

export default router;
