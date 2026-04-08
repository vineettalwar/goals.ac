import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { roadmapsTable, leadCapturesTable } from "@workspace/db";
import { eq, desc, count, and } from "drizzle-orm";
import {
  GenerateRoadmapBody,
  CaptureLeadForRoadmapBody,
} from "@workspace/api-zod";
import { generateRoadmapContent, generateSlug } from "../services/roadmapGenerator";
import { fireLeadshWebhook } from "../services/leadshWebhook";

const router: IRouter = Router();

router.get("/roadmaps", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    const industry = req.query.industry as string | undefined;
    const location = req.query.location as string | undefined;

    const conditions = [];
    if (industry) conditions.push(eq(roadmapsTable.industry, industry));
    if (location) conditions.push(eq(roadmapsTable.location, location));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [roadmaps, totalResult] = await Promise.all([
      db
        .select({
          id: roadmapsTable.id,
          slug: roadmapsTable.slug,
          industry: roadmapsTable.industry,
          location: roadmapsTable.location,
          stage: roadmapsTable.stage,
          viewCount: roadmapsTable.viewCount,
          createdAt: roadmapsTable.createdAt,
        })
        .from(roadmapsTable)
        .where(where)
        .orderBy(desc(roadmapsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(roadmapsTable).where(where),
    ]);

    res.json({
      roadmaps,
      total: totalResult[0]?.count ?? 0,
    });
  } catch (err) {
    req.log.error(err, "Failed to list roadmaps");
    res.status(500).json({ error: "Failed to list roadmaps" });
  }
});

router.post("/roadmaps/generate", async (req, res) => {
  const parsed = GenerateRoadmapBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: " + parsed.error.message });
    return;
  }

  const { industry, location, stage } = parsed.data;

  try {
    const slug = generateSlug(industry, location, stage);

    const existing = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      req.log.info({ slug }, "Returning cached roadmap");
      res.json(existing[0]);
      return;
    }

    req.log.info({ industry, location, stage }, "Generating new roadmap with Gemini");

    let content;
    try {
      content = await generateRoadmapContent(industry, location, stage);
    } catch (err) {
      req.log.error(err, "Gemini generation failed");
      res.status(503).json({
        error: "Roadmap generation temporarily unavailable. Please try again shortly.",
      });
      return;
    }

    const [inserted] = await db
      .insert(roadmapsTable)
      .values({ slug, industry, location, stage, content })
      .onConflictDoNothing({ target: roadmapsTable.slug })
      .returning();

    if (inserted) {
      res.json(inserted);
      return;
    }

    const [race] = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    res.json(race);
  } catch (err) {
    req.log.error(err, "Failed to generate roadmap");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/roadmaps/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const roadmap = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (roadmap.length === 0) {
      res.status(404).json({ error: "Roadmap not found" });
      return;
    }

    await db
      .update(roadmapsTable)
      .set({ viewCount: (roadmap[0].viewCount ?? 0) + 1 })
      .where(eq(roadmapsTable.id, roadmap[0].id));

    res.json({ ...roadmap[0], viewCount: (roadmap[0].viewCount ?? 0) + 1 });
  } catch (err) {
    req.log.error(err, "Failed to get roadmap");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/roadmaps/:slug/leads", async (req, res) => {
  const parsed = CaptureLeadForRoadmapBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: " + parsed.error.message });
    return;
  }

  const { name, email, companyUrl } = parsed.data;
  const { slug } = req.params;

  try {
    const roadmap = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (roadmap.length === 0) {
      res.status(404).json({ error: "Roadmap not found" });
      return;
    }

    const roadmapId = roadmap[0].id;

    const existing = await db
      .select()
      .from(leadCapturesTable)
      .where(
        and(
          eq(leadCapturesTable.roadmapId, roadmapId),
          eq(leadCapturesTable.email, email),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(201).json({ id: existing[0].id, message: "Lead already captured" });
      return;
    }

    const [lead] = await db
      .insert(leadCapturesTable)
      .values({ roadmapId, name, email, companyUrl })
      .returning({ id: leadCapturesTable.id });

    fireLeadshWebhook(
      {
        roadmapSlug: slug,
        industry: roadmap[0].industry,
        location: roadmap[0].location,
        stage: roadmap[0].stage,
        lead: { name, email, companyUrl },
      },
      req.log
    );

    res.status(201).json({ id: lead.id, message: "Lead captured successfully" });
  } catch (err) {
    req.log.error(err, "Failed to capture lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
