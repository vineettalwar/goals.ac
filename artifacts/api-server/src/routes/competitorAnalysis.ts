import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { db, competitorAnalysesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { analyzeCompetitor } from "@workspace/seo-tools/competitorAnalyzer";
import { modelForTier } from "@workspace/ai-providers";
import { optionalAuth } from "../lib/auth";
import { getDecryptedUserGeminiKey } from "../lib/userApiKey";
import { assertPublicUrlSync } from "@workspace/security/ssrf-guard";
import { requireProjectAccess } from "../lib/projectAccess";
import { recordUsageEvent } from "../lib/usageEvents";

const router: IRouter = Router();

const AnalyzeBody = z.object({
  competitorUrl: z.url("Must be a valid URL"),
  industry: z.string().min(1),
  location: z.string().min(1),
  stage: z.string().min(1),
  website_project_id: z.number().int().positive().optional(),
});

router.post("/competitor-analysis", optionalAuth, async (req, res) => {
  const parsed = AnalyzeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: " + parsed.error.message });
    return;
  }

  const { competitorUrl, industry, location, stage, website_project_id } = parsed.data;

  try {
    assertPublicUrlSync(competitorUrl);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid URL" });
    return;
  }

  let validatedProjectId: number | null = null;
  if (website_project_id) {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const access = await requireProjectAccess(website_project_id, req.user.userId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }
    validatedProjectId = website_project_id;
  }

  try {
    const userApiKey = req.user ? await getDecryptedUserGeminiKey(req.user.userId) : null;
    const analysis = await analyzeCompetitor({
      competitorUrl,
      industry,
      location,
      stage,
      userApiKey,
    });

    const [saved] = await db
      .insert(competitorAnalysesTable)
      .values({
        websiteProjectId: validatedProjectId,
        competitorUrl,
        industry,
        location,
        stage,
        result: analysis,
      })
      .returning();

    if (req.user) {
      await recordUsageEvent({
        userId: req.user.userId,
        eventType: "competitor_analysis",
        tier: "strategy",
        provider: "gemini",
        model: modelForTier("gemini", "strategy"),
        usedByok: Boolean(userApiKey),
      });
    }

    res.status(201).json({ id: saved.id, ...analysis });
  } catch (err) {
    if (err instanceof Error && err.message === "Analysis temporarily unavailable") {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.message === "Failed to parse analysis response") {
      res.status(500).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Competitor analysis failed");
    res.status(500).json({ error: "Analysis failed" });
  }
});

router.get("/competitor-analyses/:id", optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid analysis id" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(competitorAnalysesTable)
      .where(eq(competitorAnalysesTable.id, id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Competitor analysis not found" });
      return;
    }

    if (row.websiteProjectId) {
      if (!req.user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const access = await requireProjectAccess(row.websiteProjectId, req.user.userId);
      if (!access.ok) {
        res.status(access.status).json({ error: access.error });
        return;
      }
    }

    res.json({ id: row.id, ...row.result, createdAt: row.createdAt });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch competitor analysis");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
