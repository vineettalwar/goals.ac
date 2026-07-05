import { db } from "@workspace/db";
import { contentStrategiesTable, contentItemsTable, roadmapsTable, websiteProjectsTable } from "@workspace/db/schema";
import type { ContentStyle } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { generateContentStrategyWithProgress } from "@/lib/ai/content-strategy-generator";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const GenerateBody = z.object({
  roadmapId: z.number().int().positive(),
  websiteProjectId: z.number().int().positive().optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2020).max(2100).optional(),
});

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = GenerateBody.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request: " + parsed.error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { roadmapId, websiteProjectId } = parsed.data;

  const [roadmap] = await db
    .select()
    .from(roadmapsTable)
    .where(eq(roadmapsTable.id, roadmapId))
    .limit(1);

  if (!roadmap) {
    return new Response(
      JSON.stringify({ error: "Roadmap not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  let validatedProjectId: number | null = null;
  let projectContentStyle: ContentStyle | null = null;

  if (websiteProjectId) {
    const [proj] = await db
      .select({ id: websiteProjectsTable.id, contentStyle: websiteProjectsTable.contentStyle })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, websiteProjectId), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);

    if (!proj) {
      return new Response(
        JSON.stringify({ error: "You do not have access to this project" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
    validatedProjectId = websiteProjectId;
    projectContentStyle = proj.contentStyle as ContentStyle | null;
  }

  const { industry, location, stage } = roadmap;
  const now = new Date();
  const month = parsed.data.month ?? now.getMonth() + 1;
  const year = parsed.data.year ?? now.getFullYear();

  const sseHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  };

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        function send(event: string, data: unknown) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ event, ...data as object })}\n\n`),
          );
        }

        try {
          let items;
          try {
            items = await generateContentStrategyWithProgress(
              industry,
              location,
              stage,
              (batchNum, totalBatches, batchItems) => {
                send("progress", { batchNum, totalBatches, itemCount: batchItems.length });
              },
              projectContentStyle,
            );
          } catch (err) {
            send("error", { error: "Content strategy generation temporarily unavailable. Please try again." });
            controller.close();
            return;
          }

          const [strategy] = await db
            .insert(contentStrategiesTable)
            .values({
              roadmapId,
              websiteProjectId: validatedProjectId,
              industry,
              location,
              stage,
              month,
              year,
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

          send("done", { ...strategy, items: contentItems });
          controller.close();
        } catch (err) {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ event: "error", error: "Internal server error" })}\n\n`),
            );
          } catch { /* closed */ }
          controller.close();
        }
      },
    }),
    { headers: sseHeaders },
  );
}
