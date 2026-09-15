import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  brandProfilesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { runBrandScrapeWithDiscovery } from "@workspace/content-engine/support/brand/brand-scrape-orchestrator";

const router: IRouter = Router();

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

const AnalyzeWritingExamplesBody = z.object({
  writingExamples: z
    .array(z.string())
    .min(1, "At least one writing example is required"),
});

async function runBrandScrape(
  projectId: number,
  url: string,
  log: { error: (obj: unknown, msg: string) => void },
  overwrite = false,
): Promise<void> {
  try {
    await runBrandScrapeWithDiscovery(projectId, url, { overwrite, refreshSitemap: true });
  } catch (err) {
    log.error(err, "Brand scrape failed");
    await db
      .update(websiteProjectsTable)
      .set({ scrapeStatus: "failed" })
      .where(eq(websiteProjectsTable.id, projectId));
  }
}

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

export default router;
