import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import {
  db,
  trackedKeywordsTable,
  keywordRankSnapshotsTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { requireProjectAccess } from "../lib/projectAccess";
import { isSerpConfigured } from "@workspace/serp-provider";
import { QUEUES, enqueue } from "@workspace/jobs";

const router: IRouter = Router();

const CreateTrackedKeywordBody = z.object({
  website_project_id: z.number().int().positive(),
  keyword: z.string().min(1).max(200),
  target_url: z.string().url().optional(),
  location: z.string().min(1).optional(),
  language: z.string().min(2).max(10).optional(),
  device: z.enum(["desktop", "mobile"]).optional(),
});

router.post("/tracked-keywords", requireAuth, async (req, res) => {
  const parsed = CreateTrackedKeywordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: " + parsed.error.message });
    return;
  }

  if (!isSerpConfigured()) {
    res.status(503).json({
      error: "Rank tracking is not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.",
    });
    return;
  }

  const { website_project_id, keyword, target_url, location, language, device } = parsed.data;
  const access = await requireProjectAccess(website_project_id, req.user!.userId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  try {
    const [row] = await db
      .insert(trackedKeywordsTable)
      .values({
        websiteProjectId: website_project_id,
        keyword: keyword.trim().toLowerCase(),
        targetUrl: target_url ?? null,
        location: location ?? "United States",
        language: language ?? "en",
        device: device ?? "desktop",
      })
      .returning();

    await enqueue(QUEUES.keywordRankCheck, { trackedKeywordId: row.id });

    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create tracked keyword");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tracked-keywords", requireAuth, async (req, res) => {
  const projectId = Number(req.query.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "projectId query parameter is required" });
    return;
  }

  const access = await requireProjectAccess(projectId, req.user!.userId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  try {
    const keywords = await db
      .select()
      .from(trackedKeywordsTable)
      .where(
        and(
          eq(trackedKeywordsTable.websiteProjectId, projectId),
          eq(trackedKeywordsTable.isActive, true),
        ),
      )
      .orderBy(desc(trackedKeywordsTable.createdAt));

    const withLatest = await Promise.all(
      keywords.map(async (kw) => {
        const [latest] = await db
          .select()
          .from(keywordRankSnapshotsTable)
          .where(eq(keywordRankSnapshotsTable.trackedKeywordId, kw.id))
          .orderBy(desc(keywordRankSnapshotsTable.checkedAt))
          .limit(1);
        return { ...kw, latestSnapshot: latest ?? null };
      }),
    );

    res.json({ trackedKeywords: withLatest });
  } catch (err) {
    req.log.error({ err }, "Failed to list tracked keywords");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tracked-keywords/:id/snapshots", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid tracked keyword id" });
    return;
  }

  try {
    const [kw] = await db
      .select()
      .from(trackedKeywordsTable)
      .where(eq(trackedKeywordsTable.id, id))
      .limit(1);

    if (!kw) {
      res.status(404).json({ error: "Tracked keyword not found" });
      return;
    }

    const access = await requireProjectAccess(kw.websiteProjectId, req.user!.userId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const snapshots = await db
      .select()
      .from(keywordRankSnapshotsTable)
      .where(eq(keywordRankSnapshotsTable.trackedKeywordId, id))
      .orderBy(desc(keywordRankSnapshotsTable.checkedAt));

    res.json({ trackedKeyword: kw, snapshots });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch rank snapshots");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tracked-keywords/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid tracked keyword id" });
    return;
  }

  try {
    const [kw] = await db
      .select()
      .from(trackedKeywordsTable)
      .where(eq(trackedKeywordsTable.id, id))
      .limit(1);

    if (!kw) {
      res.status(404).json({ error: "Tracked keyword not found" });
      return;
    }

    const access = await requireProjectAccess(kw.websiteProjectId, req.user!.userId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    await db
      .update(trackedKeywordsTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(trackedKeywordsTable.id, id));

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to deactivate tracked keyword");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
