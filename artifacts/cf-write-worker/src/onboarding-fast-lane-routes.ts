import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import { generateRoadmapSlug } from "@workspace/db";
import {
  companiesTable,
  contentItemsTable,
  contentStrategiesTable,
  roadmapsTable,
  websiteProjectsTable,
  type ContentStyle,
} from "@workspace/db/schema-sqlite";
import { generateContentStrategy } from "@workspace/content-engine/content/content-strategy-generator";
import { generateRoadmap } from "@workspace/content-engine/strategy/roadmap-generator";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import { rateLimitResponse, RATE_LIMITS } from "@workspace/content-engine/core/rate-limit";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { kickOffFastLaneVisibility } from "@workspace/content-engine/strategy/fast-lane-visibility";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { getAccessibleProject } from "./project-access";

const FAST_LANE_ARTICLE_COUNT = 3;
const DEFAULT_LOCATION = "Global";
const DEFAULT_STAGE = "Growth stage";

const postBody = z.object({
  projectId: z.number().int().positive(),
});

async function loadUserAiSettings(userId: number) {
  const [userApiKey, aiProviderOptions] = await Promise.all([
    getDecryptedUserGeminiKey(userId),
    getUserAiProviderOptions(userId),
  ]);
  return { userApiKey, aiProviderOptions };
}

async function resolveRoadmapForCompany(
  industry: string,
  userId: number,
  userApiKey?: string | null,
  aiProviderOptions?: unknown,
) {
  const slug = generateRoadmapSlug(industry, DEFAULT_LOCATION, DEFAULT_STAGE);

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

export async function handleOnboardingFastLaneWrite(
  request: Request,
  path: string,
  userId: number,
  trackJob: (jobId: string, queue: string, meta: Record<string, unknown>) => Promise<void>,
): Promise<Response | null> {
  if (path !== "/api/onboarding/fast-lane" || request.method !== "POST") {
    return null;
  }

  const limited = await rateLimitResponse(
    `fast-lane:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return withCors(request, limited);

  const parsed = postBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  const { projectId } = parsed.data;
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);

  const industry = company?.industry?.trim() || "Other";
  const projectContentStyle = project.contentStyle as ContentStyle | null;

  const existingStrategy = await db
    .select()
    .from(contentStrategiesTable)
    .where(eq(contentStrategiesTable.websiteProjectId, projectId))
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
    const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId);

    let roadmap;
    try {
      roadmap = await resolveRoadmapForCompany(industry, userId, userApiKey, aiProviderOptions);
    } catch (err) {
      const message = err instanceof Error ? err.message : "setup_failed";
      if (message === "quota_exhausted") {
        return withCors(
          request,
          Response.json(
            {
              error: "quota_exhausted",
              message: "Roadmap quota reached. Add BYOK in Settings or upgrade your plan.",
            },
            { status: 402 },
          ),
        );
      }
      return withCors(request, Response.json({ error: "Failed to prepare content plan" }, { status: 503 }));
    }

    const billingPrep = await prepareAiBilling({
      userId,
      tier: "strategy",
      quotaKind: "article",
    });
    if (!billingPrep.ok) return withCors(request, billingPrep.response);

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
        userId,
        eventType: "content_strategy_generation",
        usedByok: billingPrep.usedByok,
        tier: "strategy",
      });
    } catch {
      await cancelAiBilling(billingPrep.ctx, "generation_failed");
      return withCors(
        request,
        Response.json({ error: "Failed to generate 30-day content plan" }, { status: 500 }),
      );
    }
  }

  const queued: number[] = [];
  for (const contentItemId of itemIds) {
    const jobId = await sendToCfQueue(QUEUES.contentGenerate, {
      contentItemId,
      projectId,
      userId,
      generateVariants: false,
    });
    const id = jobId ?? `cf:${QUEUES.contentGenerate}:${contentItemId}:${Date.now()}`;
    await trackJob(id, QUEUES.contentGenerate, { userId, projectId, contentItemId });
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
        autoQueueOpportunities: true,
        opportunityScoreThreshold: 70,
      },
    })
    .where(eq(websiteProjectsTable.id, projectId));

  const visibilityKickoff = await kickOffFastLaneVisibility({
    projectId,
    projectUrl: project.url,
    queueVisibilityCheck: async () => {
      const jobId = await sendToCfQueue(QUEUES.llmVisibilityCheck, { projectId });
      const id = jobId ?? `cf:${QUEUES.llmVisibilityCheck}:${projectId}:${Date.now()}`;
      await trackJob(id, QUEUES.llmVisibilityCheck, { userId, projectId });
    },
  });

  return withCors(
    request,
    Response.json({
      strategyId,
      queuedItemIds: queued,
      articleCount: queued.length,
      crawlStatus: project.crawlStatus,
      visibilityKickoff,
    }),
  );
}
