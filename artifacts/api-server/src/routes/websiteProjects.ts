import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  brandProfilesTable,
  projectRoadmapsTable,
  roadmapsTable,
  contentStrategiesTable,
  contentItemsTable,
  seoArticlesTable,
  geoAuditsTable,
  competitorAnalysesTable,
  keywordAnalysesTable,
  trackedKeywordsTable,
} from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { scrapeBrandProfile } from "../services/brandScraper";
import { parseAutopilotSettings } from "../lib/autopilotScheduler";
import type { AutopilotSettings } from "@workspace/db";

const router: IRouter = Router();

const CreateProjectBody = z.object({
  name: z.string().min(1, "Project name is required"),
  url: z.string().url("Must be a valid URL"),
});

const ContentStyleBody = z.object({
  tonePreset: z
    .enum(["professional", "casual", "technical", "conversational"])
    .optional(),
  personaName: z.string().optional(),
  defaultWordCount: z.number().int().min(300).max(3000).optional(),
  primaryLanguage: z.string().optional(),
  forbiddenWords: z.array(z.string()).optional(),
  readingLevel: z.enum(["general", "intermediate", "expert"]).optional(),
});

const UpdateBrandProfileBody = z.object({
  companyName: z.string().optional(),
  industry: z.string().optional(),
  targetAudience: z.string().optional(),
  voiceTone: z.string().optional(),
  primaryKeywords: z.array(z.string()).optional(),
  competitorUrls: z.array(z.string()).optional(),
  contentStyle: ContentStyleBody.optional(),
});

// Brand Voice Storage endpoints
const UpdateBrandVoiceBody = z.object({
  writingExamples: z.array(z.string()).optional(),
  brandGlossary: z.array(z.string()).optional(),
  antiPatterns: z.array(z.string()).optional(),
  typicalStructure: z.string().optional(),
  doWords: z.array(z.string()).optional(),
  dontWords: z.array(z.string()).optional(),
});

const AutopilotSettingsBody = z.object({
  enabled: z.boolean().optional(),
  cadence: z.enum(["daily", "weekly"]).optional(),
  timezone: z.string().min(1).optional(),
  publishMode: z.enum(["manual", "draft", "live"]).optional(),
  preferredRunHour: z.number().int().min(0).max(23).optional(),
  autoQueueOpportunities: z.boolean().optional(),
  opportunityScoreThreshold: z.number().int().min(0).max(100).optional(),
});

const AnalyzeWritingExamplesBody = z.object({
  writingExamples: z
    .array(z.string())
    .min(1, "At least one writing example is required"),
});

type CrawlData = {
  sitemapType: "urlset" | "sitemapindex";
  pageUrls: string[];
  lastCrawledAt: string;
};

async function fetchXml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function extractLocs(xml: string): string[] {
  return (xml.match(/<loc>\s*(.*?)\s*<\/loc>/g) ?? [])
    .map((m) => m.replace(/<\/?loc>/g, "").trim())
    .filter(Boolean);
}

async function fetchSitemapInfo(
  url: string,
): Promise<{
  sitemapUrl: string | null;
  pageCount: number;
  crawlData: CrawlData | null;
}> {
  const baseUrl = new URL(url).origin;

  await assertPublicUrl(baseUrl);

  const candidates = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap/sitemap.xml`,
  ];

  for (const candidate of candidates) {
    const text = await fetchXml(candidate);
    if (!text) continue;

    if (text.includes("<sitemapindex")) {
      const subSitemapUrls = extractLocs(text);
      const allPageUrls: string[] = [];

      for (const subUrl of subSitemapUrls.slice(0, 10)) {
        try {
          await assertPublicUrl(subUrl);
        } catch {
          continue;
        }
        const subText = await fetchXml(subUrl);
        if (subText && subText.includes("<urlset")) {
          allPageUrls.push(...extractLocs(subText));
        }
      }

      const crawlData: CrawlData = {
        sitemapType: "sitemapindex",
        pageUrls: allPageUrls.slice(0, 200),
        lastCrawledAt: new Date().toISOString(),
      };
      return {
        sitemapUrl: candidate,
        pageCount: allPageUrls.length,
        crawlData,
      };
    }

    if (text.includes("<urlset")) {
      const pageUrls = extractLocs(text);
      const crawlData: CrawlData = {
        sitemapType: "urlset",
        pageUrls: pageUrls.slice(0, 200),
        lastCrawledAt: new Date().toISOString(),
      };
      return { sitemapUrl: candidate, pageCount: pageUrls.length, crawlData };
    }
  }

  return { sitemapUrl: null, pageCount: 0, crawlData: null };
}

async function runBrandScrape(
  projectId: number,
  url: string,
  log: { error: (obj: unknown, msg: string) => void },
  overwrite = false,
): Promise<void> {
  await db
    .update(websiteProjectsTable)
    .set({ scrapeStatus: "pending" })
    .where(eq(websiteProjectsTable.id, projectId));

  try {
    await assertPublicUrl(url);
    const extract = await scrapeBrandProfile(url);

    const existing = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, projectId))
      .limit(1);

    if (existing.length > 0) {
      const current = existing[0];
      const updates: Record<string, unknown> = {};

      if (overwrite) {
        updates.companyName = extract.companyName;
        updates.industry = extract.industry;
        updates.targetAudience = extract.targetAudience;
        updates.voiceTone = extract.voiceTone;
        updates.primaryKeywords = extract.primaryKeywords;
        updates.competitorUrls = extract.competitorUrls;
      } else {
        if (!current.companyName && extract.companyName)
          updates.companyName = extract.companyName;
        if (!current.industry && extract.industry)
          updates.industry = extract.industry;
        if (!current.targetAudience && extract.targetAudience)
          updates.targetAudience = extract.targetAudience;
        if (!current.voiceTone && extract.voiceTone)
          updates.voiceTone = extract.voiceTone;
        if (
          (!current.primaryKeywords || current.primaryKeywords.length === 0) &&
          extract.primaryKeywords.length > 0
        )
          updates.primaryKeywords = extract.primaryKeywords;
        if (
          (!current.competitorUrls || current.competitorUrls.length === 0) &&
          extract.competitorUrls.length > 0
        )
          updates.competitorUrls = extract.competitorUrls;
      }

      if (Object.keys(updates).length > 0) {
        await db
          .update(brandProfilesTable)
          .set(updates)
          .where(eq(brandProfilesTable.websiteProjectId, projectId));
      }
    } else {
      await db.insert(brandProfilesTable).values({
        websiteProjectId: projectId,
        companyName: extract.companyName,
        industry: extract.industry,
        targetAudience: extract.targetAudience,
        voiceTone: extract.voiceTone,
        primaryKeywords: extract.primaryKeywords,
        competitorUrls: extract.competitorUrls,
      });
    }

    await db
      .update(websiteProjectsTable)
      .set({ scrapeStatus: "done", scrapeData: extract })
      .where(eq(websiteProjectsTable.id, projectId));
  } catch (err) {
    log.error(err, "Brand scrape failed");
    await db
      .update(websiteProjectsTable)
      .set({ scrapeStatus: "failed" })
      .where(eq(websiteProjectsTable.id, projectId));
  }
}

router.get("/website-projects", requireAuth, async (req, res) => {
  try {
    const projects = await db
      .select()
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.userId, req.user!.userId));

    res.json(projects);
  } catch (err) {
    req.log.error(err, "Failed to list website projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/website-projects", requireAuth, async (req, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { name, url } = parsed.data;

  try {
    const [project] = await db
      .insert(websiteProjectsTable)
      .values({
        userId: req.user!.userId,
        name,
        url,
        crawlStatus: "pending",
        scrapeStatus: "pending",
      })
      .returning();

    res.status(201).json(project);

    fetchSitemapInfo(url)
      .then(async ({ sitemapUrl, pageCount, crawlData }) => {
        await db
          .update(websiteProjectsTable)
          .set({ sitemapUrl, pageCount, crawlData, crawlStatus: "done" })
          .where(eq(websiteProjectsTable.id, project.id));

        await runBrandScrape(project.id, url, req.log);
      })
      .catch(async (err) => {
        req.log.error(err, "Sitemap fetch failed");
        await db
          .update(websiteProjectsTable)
          .set({ crawlStatus: "failed", scrapeStatus: "failed" })
          .where(eq(websiteProjectsTable.id, project.id));
      });
  } catch (err) {
    req.log.error(err, "Failed to create website project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/website-projects/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const [project] = await db
      .select()
      .from(websiteProjectsTable)
      .where(
        and(
          eq(websiteProjectsTable.id, id),
          eq(websiteProjectsTable.userId, req.user!.userId),
        ),
      )
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, id))
      .limit(1);

    res.json({ ...project, brandProfile: brandProfile ?? null });
  } catch (err) {
    req.log.error(err, "Failed to get website project");
    res.status(500).json({ error: "Internal server error" });
  }
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

router.delete("/website-projects/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(
        and(
          eq(websiteProjectsTable.id, id),
          eq(websiteProjectsTable.userId, req.user!.userId),
        ),
      )
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    await db
      .delete(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err, "Failed to delete website project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put(
  "/website-projects/:id/brand-profile",
  requireAuth,
  async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    const parsed = UpdateBrandProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
      return;
    }

    try {
      const [project] = await db
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, id),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const existing = await db
        .select({ id: brandProfilesTable.id })
        .from(brandProfilesTable)
        .where(eq(brandProfilesTable.websiteProjectId, id))
        .limit(1);

      if (parsed.data.contentStyle !== undefined) {
        await db
          .update(websiteProjectsTable)
          .set({ contentStyle: parsed.data.contentStyle })
          .where(eq(websiteProjectsTable.id, id));
        if (existing.length > 0) {
          await db
            .update(brandProfilesTable)
            .set({ updatedAt: new Date() })
            .where(eq(brandProfilesTable.websiteProjectId, id));
        }
      }

      const updates: Record<string, unknown> = {};
      if (parsed.data.companyName !== undefined)
        updates.companyName = parsed.data.companyName;
      if (parsed.data.industry !== undefined)
        updates.industry = parsed.data.industry;
      if (parsed.data.targetAudience !== undefined)
        updates.targetAudience = parsed.data.targetAudience;
      if (parsed.data.voiceTone !== undefined)
        updates.voiceTone = parsed.data.voiceTone;
      if (parsed.data.primaryKeywords !== undefined)
        updates.primaryKeywords = parsed.data.primaryKeywords;
      if (parsed.data.competitorUrls !== undefined)
        updates.competitorUrls = parsed.data.competitorUrls;
      const hasBrandUpdates = Object.keys(updates).length > 0;

      let brandProfile;
      if (existing.length > 0) {
        if (hasBrandUpdates) {
          [brandProfile] = await db
            .update(brandProfilesTable)
            .set(updates)
            .where(eq(brandProfilesTable.websiteProjectId, id))
            .returning();
        } else {
          [brandProfile] = await db
            .select()
            .from(brandProfilesTable)
            .where(eq(brandProfilesTable.websiteProjectId, id))
            .limit(1);
        }
      } else {
        [brandProfile] = await db
          .insert(brandProfilesTable)
          .values({
            websiteProjectId: id,
            companyName: parsed.data.companyName ?? "",
            industry: parsed.data.industry ?? "",
            targetAudience: parsed.data.targetAudience ?? "",
            voiceTone: parsed.data.voiceTone ?? "",
            primaryKeywords: parsed.data.primaryKeywords ?? [],
            competitorUrls: parsed.data.competitorUrls ?? [],
          })
          .returning();
      }

      const [updatedProject] = await db
        .select({ contentStyle: websiteProjectsTable.contentStyle })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, id))
        .limit(1);

      res.json({
        ...brandProfile,
        contentStyle: updatedProject?.contentStyle ?? null,
      });
    } catch (err) {
      req.log.error(err, "Failed to update brand profile");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Brand Voice Storage endpoints
router.get(
  "/website-projects/:id/brand-profile/voice",
  requireAuth,
  async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    try {
      const [project] = await db
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, id),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const [brandProfile] = await db
        .select()
        .from(brandProfilesTable)
        .where(eq(brandProfilesTable.websiteProjectId, id))
        .limit(1);

      if (!brandProfile) {
        res.status(404).json({ error: "Brand profile not found" });
        return;
      }

      res.json({
        writingExamples: brandProfile.writingExamples,
        brandGlossary: brandProfile.brandGlossary,
        antiPatterns: brandProfile.antiPatterns,
        typicalStructure: brandProfile.typicalStructure,
        doWords: brandProfile.doWords,
        dontWords: brandProfile.dontWords,
      });
    } catch (err) {
      req.log.error(err, "Failed to get brand voice settings");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.put(
  "/website-projects/:id/brand-profile/voice",
  requireAuth,
  async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    const parsed = UpdateBrandVoiceBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
      return;
    }

    try {
      const [project] = await db
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, id),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const [existing] = await db
        .select()
        .from(brandProfilesTable)
        .where(eq(brandProfilesTable.websiteProjectId, id))
        .limit(1);

      let brandProfile;
      if (existing) {
        [brandProfile] = await db
          .update(brandProfilesTable)
          .set(parsed.data)
          .where(eq(brandProfilesTable.websiteProjectId, id))
          .returning();
      } else {
        [brandProfile] = await db
          .insert(brandProfilesTable)
          .values({
            websiteProjectId: id,
            writingExamples: parsed.data.writingExamples ?? [],
            brandGlossary: parsed.data.brandGlossary ?? [],
            antiPatterns: parsed.data.antiPatterns ?? [],
            typicalStructure: parsed.data.typicalStructure ?? "",
            doWords: parsed.data.doWords ?? [],
            dontWords: parsed.data.dontWords ?? [],
            companyName: "",
            industry: "",
            targetAudience: "",
            voiceTone: "",
            primaryKeywords: [],
            competitorUrls: [],
          })
          .returning();
      }

      res.json({
        writingExamples: brandProfile.writingExamples,
        brandGlossary: brandProfile.brandGlossary,
        antiPatterns: brandProfile.antiPatterns,
        typicalStructure: brandProfile.typicalStructure,
        doWords: brandProfile.doWords,
        dontWords: brandProfile.dontWords,
      });
    } catch (err) {
      req.log.error(err, "Failed to update brand voice settings");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/website-projects/:id/brand-profile/voice/analyze",
  requireAuth,
  async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    const parsed = AnalyzeWritingExamplesBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
      return;
    }

    try {
      const [project] = await db
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, id),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      // In a real implementation, we would use AI to analyze the writing examples
      // For now, we'll extract some basic patterns
      const { writingExamples } = parsed.data;

      // Simple analysis: extract common words, estimate structure
      const allText = writingExamples.join(" ").toLowerCase();
      const words: string[] = allText.match(/\b\w+\b/g) ?? [];

      // Count word frequencies
      const wordFreq: Record<string, number> = {};
      words.forEach((word) => {
        if (word.length > 3) {
          // Ignore very short words
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });

      // Get top 10 frequent words as potential glossary terms
      const sortedWords = Object.entries(wordFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);

      // Extract potential sentence structure hints
      const hasQuestions = writingExamples.some((text) => text.includes("?"));
      const hasColons = writingExamples.some((text) => text.includes(":"));
      const avgLength =
        writingExamples.reduce((sum, text) => sum + text.length, 0) /
        writingExamples.length;

      let suggestedStructure = "Hook → Insight → CTA";
      if (hasQuestions && hasColons) {
        suggestedStructure = "Question → Explanation → Example → CTA";
      } else if (hasQuestions) {
        suggestedStructure = "Question → Insight → CTA";
      } else if (avgLength > 200) {
        suggestedStructure = "Story → Lesson → Application";
      }

      // In a real implementation, we would save these to the database
      // For now, we'll return the analysis results
      res.json({
        suggestedGlossary: sortedWords,
        suggestedStructure: suggestedStructure,
        analysis: {
          totalExamples: writingExamples.length,
          averageLength: Math.round(avgLength),
          hasQuestions,
          hasColons,
          commonWords: sortedWords.slice(0, 5),
        },
      });
    } catch (err) {
      req.log.error(err, "Failed to analyze writing examples");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/website-projects/:id/scrape-brand",
  requireAuth,
  async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    try {
      const [project] = await db
        .select()
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, id),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      res.json({ message: "Scrape started" });

      await runBrandScrape(id, project.url, req.log, true);
    } catch (err) {
      req.log.error(err, "Failed to trigger brand scrape");
    }
  },
);

router.get("/website-projects/:id/content", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(
        and(
          eq(websiteProjectsTable.id, id),
          eq(websiteProjectsTable.userId, req.user!.userId),
        ),
      )
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [
      contentStrategies,
      seoArticles,
      geoAudits,
      competitorAnalyses,
      keywordAnalyses,
      trackedKeywords,
      pinnedRoadmapLinks,
    ] = await Promise.all([
        db
          .select()
          .from(contentStrategiesTable)
          .where(eq(contentStrategiesTable.websiteProjectId, id))
          .orderBy(desc(contentStrategiesTable.createdAt)),
        db
          .select()
          .from(seoArticlesTable)
          .where(eq(seoArticlesTable.websiteProjectId, id))
          .orderBy(desc(seoArticlesTable.createdAt)),
        db
          .select()
          .from(geoAuditsTable)
          .where(eq(geoAuditsTable.websiteProjectId, id))
          .orderBy(desc(geoAuditsTable.createdAt)),
        db
          .select()
          .from(competitorAnalysesTable)
          .where(eq(competitorAnalysesTable.websiteProjectId, id))
          .orderBy(desc(competitorAnalysesTable.createdAt)),
        db
          .select()
          .from(keywordAnalysesTable)
          .where(eq(keywordAnalysesTable.websiteProjectId, id))
          .orderBy(desc(keywordAnalysesTable.createdAt)),
        db
          .select()
          .from(trackedKeywordsTable)
          .where(
            and(
              eq(trackedKeywordsTable.websiteProjectId, id),
              eq(trackedKeywordsTable.isActive, true),
            ),
          )
          .orderBy(desc(trackedKeywordsTable.createdAt)),
        db
          .select({ roadmapId: projectRoadmapsTable.roadmapId })
          .from(projectRoadmapsTable)
          .where(eq(projectRoadmapsTable.projectId, id)),
      ]);

    const roadmapIds = pinnedRoadmapLinks.map((r) => r.roadmapId);
    const roadmaps =
      roadmapIds.length > 0
        ? await db
            .select()
            .from(roadmapsTable)
            .where(inArray(roadmapsTable.id, roadmapIds))
            .orderBy(desc(roadmapsTable.createdAt))
        : [];

    const strategyIds = contentStrategies.map((s) => s.id);
    const contentItems =
      strategyIds.length > 0
        ? await db
            .select()
            .from(contentItemsTable)
            .where(inArray(contentItemsTable.strategyId, strategyIds))
            .orderBy(contentItemsTable.day)
        : [];

    res.json({
      contentStrategies,
      contentItems,
      seoArticles,
      geoAudits,
      competitorAnalyses,
      keywordAnalyses,
      trackedKeywords,
      roadmaps,
    });
  } catch (err) {
    req.log.error(err, "Failed to get project content");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/website-projects/:id/roadmaps/:roadmapId",
  requireAuth,
  async (req, res) => {
    const projectId = Number(req.params.id);
    const roadmapId = Number(req.params.roadmapId);
    if (isNaN(projectId) || isNaN(roadmapId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    try {
      const [project] = await db
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, projectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const [roadmap] = await db
        .select({ id: roadmapsTable.id })
        .from(roadmapsTable)
        .where(eq(roadmapsTable.id, roadmapId))
        .limit(1);
      if (!roadmap) {
        res.status(404).json({ error: "Roadmap not found" });
        return;
      }

      await db
        .insert(projectRoadmapsTable)
        .values({ projectId, roadmapId })
        .onConflictDoNothing();
      res.status(201).json({ message: "Roadmap pinned to project" });
    } catch (err) {
      req.log.error(err, "Failed to pin roadmap to project");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete(
  "/website-projects/:id/roadmaps/:roadmapId",
  requireAuth,
  async (req, res) => {
    const projectId = Number(req.params.id);
    const roadmapId = Number(req.params.roadmapId);
    if (isNaN(projectId) || isNaN(roadmapId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    try {
      const [project] = await db
        .select({ id: websiteProjectsTable.id })
        .from(websiteProjectsTable)
        .where(
          and(
            eq(websiteProjectsTable.id, projectId),
            eq(websiteProjectsTable.userId, req.user!.userId),
          ),
        )
        .limit(1);

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      await db
        .delete(projectRoadmapsTable)
        .where(
          and(
            eq(projectRoadmapsTable.projectId, projectId),
            eq(projectRoadmapsTable.roadmapId, roadmapId),
          ),
        );
      res.json({ message: "Roadmap unpinned from project" });
    } catch (err) {
      req.log.error(err, "Failed to unpin roadmap from project");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
