import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { db, keywordAnalysesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { analyzeKeywords } from "@workspace/seo-tools/keywordAnalyzer";
import { modelForProviderTier, resolveProviderId } from "@workspace/ai-providers";
import { optionalAuth } from "../lib/auth";
import { getDecryptedUserGeminiKey } from "../lib/userApiKey";
import { resolveAiClientForUser } from "@workspace/content-engine/support/resolve-ai-client-for-user";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/user-ai-provider";
import { requireProjectAccess } from "../lib/projectAccess";
import { recordUsageEvent } from "../lib/usageEvents";

const router: IRouter = Router();

const KeywordAnalysisBody = z.object({
  keywords: z.array(z.string().min(1).max(200)).min(1).max(10),
  websiteUrl: z.string().url().optional(),
  website_project_id: z.number().int().positive().optional(),
});

router.post("/keyword-analysis", optionalAuth, async (req, res) => {
  const parsed = KeywordAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: " + parsed.error.message });
    return;
  }

  const { keywords, websiteUrl, website_project_id } = parsed.data;

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
    const aiProviderOptions = req.user ? await getUserAiProviderOptions(req.user.userId) : undefined;
    const analysis = await analyzeKeywords({ keywords, websiteUrl, userApiKey, aiProviderOptions });

    const [saved] = await db
      .insert(keywordAnalysesTable)
      .values({
        websiteProjectId: validatedProjectId,
        keywords,
        websiteUrl: websiteUrl ?? null,
        result: analysis,
      })
      .returning();

    if (req.user) {
      const providerId = resolveProviderId(aiProviderOptions);
      await recordUsageEvent({
        userId: req.user.userId,
        eventType: "keyword_analysis",
        tier: "planning",
        provider: providerId,
        model: modelForProviderTier(providerId, "planning"),
        usedByok: (await resolveAiClientForUser(req.user.userId)).usingUserKey,
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
    req.log.error({ err }, "Keyword analysis failed");
    res.status(500).json({ error: "Analysis failed" });
  }
});

router.get("/keyword-analyses/:id", optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid analysis id" });
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(keywordAnalysesTable)
      .where(eq(keywordAnalysesTable.id, id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Keyword analysis not found" });
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
    req.log.error({ err }, "Failed to fetch keyword analysis");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
