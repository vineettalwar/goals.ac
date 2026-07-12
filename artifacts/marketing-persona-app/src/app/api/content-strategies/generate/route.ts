import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentStrategiesTable, contentItemsTable, roadmapsTable, websiteProjectsTable } from "@workspace/db/schema";
import type { ContentStyle } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { generateContentStrategy } from "@/lib/ai/content-strategy-generator";
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
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { roadmapId, websiteProjectId } = parsed.data;

  const [roadmap] = await db
    .select()
    .from(roadmapsTable)
    .where(eq(roadmapsTable.id, roadmapId))
    .limit(1);

  if (!roadmap) {
    return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
  }

  let validatedProjectId: number | null = null;
  let projectContentStyle: ContentStyle | null = null;

  if (websiteProjectId) {
    const [proj] = await db
      .select({ id: websiteProjectsTable.id, contentStyle: websiteProjectsTable.contentStyle })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, websiteProjectId), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);

    if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    validatedProjectId = websiteProjectId;
    projectContentStyle = proj.contentStyle as ContentStyle | null;
  }

  const { industry, location, stage } = roadmap;
  const now = new Date();
  const month = parsed.data.month ?? now.getMonth() + 1;
  const year = parsed.data.year ?? now.getFullYear();

  try {
    const items = await generateContentStrategy(industry, location, stage, null, projectContentStyle);

    const [strategy] = await db
      .insert(contentStrategiesTable)
      .values({ roadmapId, websiteProjectId: validatedProjectId, industry, location, stage, month, year })
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

    const savedItems = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.strategyId, strategy.id))
      .orderBy(contentItemsTable.day);

    return NextResponse.json({ strategy: { ...strategy, items: savedItems } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to generate content strategy" }, { status: 500 });
  }
}
