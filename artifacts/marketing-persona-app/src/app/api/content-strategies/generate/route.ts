import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentStrategiesTable, contentItemsTable, roadmapsTable } from "@workspace/db/schema";
import type { ContentStyle } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import { generateContentStrategy } from "@/lib/ai/content-strategy-generator";
import { loadUserAiSettings } from "@/lib/content/content-pieces-helpers";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
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

  const limited = await rateLimitResponse(
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
    const proj = await getAccessibleProject(websiteProjectId, userId!);
    if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    validatedProjectId = websiteProjectId;
    projectContentStyle = proj.contentStyle as ContentStyle | null;
  }

  const { industry, location, stage } = roadmap;
  const now = new Date();
  const month = parsed.data.month ?? now.getMonth() + 1;
  const year = parsed.data.year ?? now.getFullYear();

  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "strategy",
    quotaKind: "article",
    usedByok: Boolean(userApiKey),
  });
  if (!billingPrep.ok) return billingPrep.response;

  try {
    const items = await generateContentStrategy(
      industry,
      location,
      stage,
      userApiKey,
      projectContentStyle,
      aiProviderOptions,
    );

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

    await completeAiBilling(billingPrep.ctx, {
      userId: userId!,
      eventType: "content_strategy_generation",
      usedByok: billingPrep.usedByok,
      tier: "strategy",
    });

    return NextResponse.json({ strategy: { ...strategy, items: savedItems } }, { status: 201 });
  } catch {
    await cancelAiBilling(billingPrep.ctx, "generation_failed");
    return NextResponse.json({ error: "Failed to generate content strategy" }, { status: 500 });
  }
}
