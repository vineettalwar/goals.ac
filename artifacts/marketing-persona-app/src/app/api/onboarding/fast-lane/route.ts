import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  companiesTable,
  contentItemsTable,
  contentPiecesTable,
  contentStrategiesTable,
  roadmapsTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import type { ContentStyle } from "@workspace/db/schema";
import { and, asc, count, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleProject } from "@/lib/org/org-access";
import { generateContentStrategy } from "@/lib/ai/content-strategy-generator";
import { generateRoadmap, generateSlug } from "@/lib/ai/roadmap-generator";
import { loadUserAiSettings } from "@/lib/content/content-pieces-helpers";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { enqueue, QUEUES } from "@workspace/jobs";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { loadProjectVisibilitySummary } from "@/lib/projects/project-visibility-summary";
import { z } from "zod";

const FAST_LANE_ARTICLE_COUNT = 3;
const DEFAULT_LOCATION = "Global";
const DEFAULT_STAGE = "Growth stage";

const Body = z.object({
  projectId: z.number().int().positive(),
});

async function resolveRoadmapForCompany(industry: string, userId: number, userApiKey?: string | null, aiProviderOptions?: unknown) {
  const slug = generateSlug(industry, DEFAULT_LOCATION, DEFAULT_STAGE);

  const [existing] = await db
    .select()
    .from(roadmapsTable)
    .where(eq(roadmapsTable.slug, slug))
    .limit(1);

  if (existing) return existing;

  const billingPrep = await prepareAiBilling({
    userId,
    tier: "planning",
    quotaKind: "roadmap",
    usedByok: Boolean(userApiKey),
  });
  if (!billingPrep.ok) {
    throw new Error("quota_exhausted");
  }

  try {
    const content = await generateRoadmap(
      industry,
      DEFAULT_LOCATION,
      DEFAULT_STAGE,
      userApiKey ?? undefined,
      aiProviderOptions as Parameters<typeof generateRoadmap>[4],
    );

    const [inserted] = await db
      .insert(roadmapsTable)
      .values({ slug, industry, location: DEFAULT_LOCATION, stage: DEFAULT_STAGE, content })
      .onConflictDoNothing({ target: roadmapsTable.slug })
      .returning();

    if (inserted) {
      await completeAiBilling(billingPrep.ctx, {
        userId,
        eventType: "roadmap_generation",
        usedByok: billingPrep.usedByok,
        tier: "planning",
      });
      return inserted;
    }

    await cancelAiBilling(billingPrep.ctx, "race_conflict");
    const [race] = await db.select().from(roadmapsTable).where(eq(roadmapsTable.slug, slug)).limit(1);
    if (race) return race;
    throw new Error("roadmap_failed");
  } catch {
    await cancelAiBilling(billingPrep.ctx, "generation_failed");
    throw new Error("roadmap_failed");
  }
}

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `fast-lane:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { projectId } = parsed.data;
  const project = await getAccessibleProject(projectId, userId!);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId!))
    .limit(1);

  const industry = company?.industry?.trim() || "Other";
  const projectContentStyle = project.contentStyle as ContentStyle | null;

  const existingStrategy = await db
    .select()
    .from(contentStrategiesTable)
    .where(
      and(
        eq(contentStrategiesTable.websiteProjectId, projectId),
      ),
    )
    .orderBy(contentStrategiesTable.createdAt)
    .limit(1);

  let strategyId: number;
  let itemIds: number[] = [];

  if (existingStrategy.length > 0) {
    strategyId = existingStrategy[0]!.id;
    const items = await db
      .select({ id: contentItemsTable.id })
      .from(contentItemsTable)
      .where(eq(contentItemsTable.strategyId, strategyId))
      .orderBy(asc(contentItemsTable.day))
      .limit(FAST_LANE_ARTICLE_COUNT);
    itemIds = items.map((i) => i.id);
  } else {
    const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);

    let roadmap;
    try {
      roadmap = await resolveRoadmapForCompany(industry, userId!, userApiKey, aiProviderOptions);
    } catch (err) {
      const message = err instanceof Error ? err.message : "setup_failed";
      if (message === "quota_exhausted") {
        return NextResponse.json(
          { error: "quota_exhausted", message: "Roadmap quota reached. Add BYOK in Settings or upgrade your plan." },
          { status: 402 },
        );
      }
      return NextResponse.json({ error: "Failed to prepare content plan" }, { status: 503 });
    }

    const billingPrep = await prepareAiBilling({
      userId: userId!,
      tier: "strategy",
      quotaKind: "article",
      usedByok: Boolean(userApiKey),
    });
    if (!billingPrep.ok) return billingPrep.response;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    try {
      const generatedItems = await generateContentStrategy(
        roadmap.industry,
        roadmap.location,
        roadmap.stage,
        userApiKey,
        projectContentStyle,
        aiProviderOptions,
      );

      const [strategy] = await db
        .insert(contentStrategiesTable)
        .values({
          roadmapId: roadmap.id,
          websiteProjectId: projectId,
          industry: roadmap.industry,
          location: roadmap.location,
          stage: roadmap.stage,
          month,
          year,
        })
        .returning();

      const insertedItems = await db
        .insert(contentItemsTable)
        .values(
          generatedItems.map((item) => ({
            strategyId: strategy.id,
            day: item.day,
            title: item.title,
            format: item.format,
            topicAngle: item.topic_angle,
            primaryKeyword: item.primary_keyword,
            status: "draft" as const,
          })),
        )
        .returning({ id: contentItemsTable.id, day: contentItemsTable.day });

      insertedItems.sort((a, b) => a.day - b.day);
      strategyId = strategy.id;
      itemIds = insertedItems.slice(0, FAST_LANE_ARTICLE_COUNT).map((i) => i.id);

      await completeAiBilling(billingPrep.ctx, {
        userId: userId!,
        eventType: "content_strategy_generation",
        usedByok: billingPrep.usedByok,
        tier: "strategy",
      });
    } catch {
      await cancelAiBilling(billingPrep.ctx, "generation_failed");
      return NextResponse.json({ error: "Failed to generate 30-day content plan" }, { status: 500 });
    }
  }

  const queued: number[] = [];
  for (const contentItemId of itemIds) {
    await enqueue(QUEUES.contentGenerate, {
      contentItemId,
      projectId,
      userId: userId!,
      generateVariants: false,
    });
    queued.push(contentItemId);
  }

  await db
    .update(websiteProjectsTable)
    .set({
      autopilotSettings: {
        enabled: true,
        cadence: "daily",
        publishMode: "draft",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        preferredRunHour: 9,
        autoQueueKeywordOpportunities: false,
        keywordOpportunityMinScore: 70,
      },
    })
    .where(eq(websiteProjectsTable.id, projectId));

  return NextResponse.json({
    strategyId,
    queuedItemIds: queued,
    articleCount: queued.length,
    crawlStatus: project.crawlStatus,
  });
}

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const projectId = Number(new URL(req.url).searchParams.get("projectId"));
  if (!projectId || isNaN(projectId)) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const project = await getAccessibleProject(projectId, userId!);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const pieceStats = await db
    .select({
      status: contentPiecesTable.status,
      value: count(),
    })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.websiteProjectId, projectId))
    .groupBy(contentPiecesTable.status);

  const byStatus = Object.fromEntries(pieceStats.map((r) => [r.status, r.value]));
  const visibility = await loadProjectVisibilitySummary(projectId);

  return NextResponse.json({
    crawlStatus: project.crawlStatus,
    projectId: project.id,
    url: project.url,
    articleProgress: {
      generating: byStatus.generating ?? 0,
      draft: byStatus.draft ?? 0,
      ready: byStatus.ready ?? 0,
      published: byStatus.published ?? 0,
      failed: byStatus.failed ?? 0,
    },
    visibility: {
      visibilityScore: visibility.visibilityScore,
      latestGeoScore: visibility.latestGeoScore,
    },
  });
}
