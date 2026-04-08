import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contentStrategiesTable, contentItemsTable, roadmapsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { generateContentStrategy } from "../services/contentStrategyGenerator";

const router: IRouter = Router();

const GenerateContentStrategyBody = z.object({
  roadmap_id: z.number().int().positive(),
  industry: z.string().min(1),
  location: z.string().min(1),
  stage: z.string().min(1),
});

const UpdateItemStatusBody = z.object({
  status: z.enum(["draft", "prepared", "published"]),
});

router.post("/content-strategies/generate", async (req, res) => {
  const parsed = GenerateContentStrategyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request: " + parsed.error.message });
    return;
  }

  const { roadmap_id, industry, location, stage } = parsed.data;

  try {
    const roadmap = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.id, roadmap_id))
      .limit(1);

    if (roadmap.length === 0) {
      res.status(404).json({ error: "Roadmap not found" });
      return;
    }

    req.log.info({ roadmap_id, industry, location, stage }, "Generating content strategy with Gemini");

    let items;
    try {
      items = await generateContentStrategy(industry, location, stage);
    } catch (err) {
      req.log.error(err, "Gemini content strategy generation failed");
      res.status(503).json({
        error: "Content strategy generation temporarily unavailable. Please try again shortly.",
      });
      return;
    }

    const now = new Date();
    const [strategy] = await db
      .insert(contentStrategiesTable)
      .values({
        roadmapId: roadmap_id,
        industry,
        location,
        stage,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      })
      .returning();

    await db.insert(contentItemsTable).values(
      items.map((item) => ({
        strategyId: strategy.id,
        day: item.day,
        title: item.title,
        format: item.format,
        topicAngle: item.topic_angle,
        primaryKeyword: item.primary_keyword,
        status: "draft" as const,
      })),
    );

    const contentItems = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.strategyId, strategy.id))
      .orderBy(contentItemsTable.day);

    res.json({ ...strategy, items: contentItems });
  } catch (err) {
    req.log.error(err, "Failed to generate content strategy");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/content-strategies", async (req, res) => {
  try {
    const strategies = await db
      .select()
      .from(contentStrategiesTable)
      .orderBy(contentStrategiesTable.createdAt);

    res.json(strategies);
  } catch (err) {
    req.log.error(err, "Failed to list content strategies");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/content-strategies/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid strategy id" });
      return;
    }

    const [strategy] = await db
      .select()
      .from(contentStrategiesTable)
      .where(eq(contentStrategiesTable.id, id))
      .limit(1);

    if (!strategy) {
      res.status(404).json({ error: "Content strategy not found" });
      return;
    }

    const items = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.strategyId, id))
      .orderBy(contentItemsTable.day);

    res.json({ ...strategy, items });
  } catch (err) {
    req.log.error(err, "Failed to get content strategy");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/content-strategies/:id/items/:itemId", async (req, res) => {
  try {
    const strategyId = Number(req.params.id);
    const itemId = Number(req.params.itemId);

    if (isNaN(strategyId) || isNaN(itemId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = UpdateItemStatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request: " + parsed.error.message });
      return;
    }

    const [item] = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, itemId))
      .limit(1);

    if (!item || item.strategyId !== strategyId) {
      res.status(404).json({ error: "Content item not found" });
      return;
    }

    const [updated] = await db
      .update(contentItemsTable)
      .set({ status: parsed.data.status })
      .where(eq(contentItemsTable.id, itemId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error(err, "Failed to update content item status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
