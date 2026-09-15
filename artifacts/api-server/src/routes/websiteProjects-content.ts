import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
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
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

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
            .select({
              id: roadmapsTable.id,
              slug: roadmapsTable.slug,
              industry: roadmapsTable.industry,
              location: roadmapsTable.location,
              stage: roadmapsTable.stage,
              viewCount: roadmapsTable.viewCount,
            })
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
