import { withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { loadBrandContextForProject } from "@workspace/content-engine/support/brand/brand-context-loader";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import { createMultiPlatformBundle } from "@workspace/content-engine/support/social/social-queue-service";
import { scheduleSocialPiece } from "@workspace/content-engine/support/social/social-queue-service";
import { isValidSocialPlatform } from "@workspace/content-engine/platform-voice";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { requireProjectAccess } from "./project-access";
import type { Env } from "./index";

const composerBody = z.object({
  parentPieceId: z.number().int().positive(),
  platforms: z
    .array(z.enum(["linkedin", "twitter", "instagram", "facebook", "bluesky", "mastodon"]))
    .min(1),
});

const scheduleBody = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: z.string().optional(),
});

const scheduleSettingsBody = z.record(z.unknown());

async function trackJob(
  env: Env,
  jobId: string,
  queue: string,
  meta: Record<string, unknown>,
) {
  const { kvPutJson } = await import("@workspace/cf-edge/kv-cache");
  await kvPutJson(
    env.AI_CACHE,
    `job:status:${jobId}`,
    {
      jobId,
      queue,
      status: "queued",
      ...meta,
      updatedAt: new Date().toISOString(),
    },
    86_400,
  );
}

export async function handleSocialWrite(
  request: Request,
  path: string,
  userId: number,
  env: Env,
): Promise<Response | null> {
  const method = request.method;

  const composerMatch = path.match(/^\/api\/website-projects\/(\d+)\/social\/composer$/);
  if (composerMatch && method === "POST") {
    const projectId = Number.parseInt(composerMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    const body = await request.json().catch(() => null);
    const parsed = composerBody.safeParse(body);
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }

    const brand = await loadBrandContextForProject(projectId);
    if (!brand) {
      return withCors(request, Response.json({ error: "Brand context not found" }, { status: 404 }));
    }

    const platforms = parsed.data.platforms.filter((p) => isValidSocialPlatform(p));
    if (platforms.length === 0) {
      return withCors(request, Response.json({ error: "Select at least one platform" }, { status: 400 }));
    }

    const billingPrep = await prepareAiBilling({
      userId,
      tier: "execution",
      quotaKind: "article",
      companyId: projectId,
    });
    if (!billingPrep.ok) return withCors(request, billingPrep.response);

    try {
      const [userApiKey, aiProviderOptions] = await Promise.all([
        getDecryptedUserGeminiKey(userId),
        getUserAiProviderOptions(userId),
      ]);
      const pieces = await createMultiPlatformBundle({
        projectId,
        parentPieceId: parsed.data.parentPieceId,
        platforms,
        brand,
        userApiKey,
        aiProviderOptions,
      });

      await completeAiBilling(billingPrep.ctx, {
        userId,
        eventType: "social_composer",
        usedByok: billingPrep.usedByok,
        tier: "execution",
        companyId: projectId,
      });

      return withCors(
        request,
        Response.json({
          pieces: pieces.map((p) => ({
            ...p,
            scheduledAt: p.scheduledAt?.toISOString() ?? null,
          })),
        }),
      );
    } catch (err) {
      await cancelAiBilling(billingPrep.ctx);
      throw err;
    }
  }

  const queuePieceMatch = path.match(/^\/api\/website-projects\/(\d+)\/social\/queue\/(\d+)$/);
  if (queuePieceMatch && (method === "PATCH" || method === "DELETE")) {
    const projectId = Number.parseInt(queuePieceMatch[1]!, 10);
    const pieceId = Number.parseInt(queuePieceMatch[2]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    if (method === "DELETE") {
      await db
        .update(contentPiecesTable)
        .set({ scheduledAt: null, queuePosition: null, status: "draft" })
        .where(eq(contentPiecesTable.id, pieceId));
      return withCors(request, Response.json({ ok: true }));
    }

    const body = await request.json().catch(() => null);
    const parsed = scheduleBody.safeParse(body);
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }

    if (!parsed.data.scheduledAt) {
      return withCors(request, Response.json({ error: "scheduledAt required" }, { status: 400 }));
    }

    const piece = await scheduleSocialPiece({
      pieceId,
      scheduledAt: new Date(parsed.data.scheduledAt),
    });
    return withCors(request, Response.json(piece));
  }

  const scheduleSettingsMatch = path.match(/^\/api\/website-projects\/(\d+)\/social\/schedule-settings$/);
  if (scheduleSettingsMatch && method === "PATCH") {
    const projectId = Number.parseInt(scheduleSettingsMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    const body = await request.json().catch(() => null);
    const parsed = scheduleSettingsBody.safeParse(body);
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }
    await db
      .update(websiteProjectsTable)
      .set({ socialScheduleSettings: parsed.data })
      .where(eq(websiteProjectsTable.id, projectId));
    return withCors(request, Response.json({ ok: true, settings: parsed.data }));
  }

  const metricsSyncMatch = path.match(/^\/api\/website-projects\/(\d+)\/social\/metrics\/sync$/);
  if (metricsSyncMatch && method === "POST") {
    const projectId = Number.parseInt(metricsSyncMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    const jobId = await sendToCfQueue(QUEUES.socialMetricsSync, { projectId, userId });
    const id = jobId ?? `cf:${QUEUES.socialMetricsSync}:${Date.now()}`;
    await trackJob(env, id, QUEUES.socialMetricsSync, { userId, projectId });
    return withCors(request, acceptedJobResponse(id, QUEUES.socialMetricsSync));
  }

  const historySyncMatch = path.match(/^\/api\/website-projects\/(\d+)\/social\/history-sync$/);
  if (historySyncMatch && method === "POST") {
    const projectId = Number.parseInt(historySyncMatch[1]!, 10);
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    const jobId = await sendToCfQueue(QUEUES.socialHistorySync, { projectId, userId });
    const id = jobId ?? `cf:${QUEUES.socialHistorySync}:${Date.now()}`;
    await trackJob(env, id, QUEUES.socialHistorySync, { userId, projectId });
    return withCors(request, acceptedJobResponse(id, QUEUES.socialHistorySync));
  }

  const outputModeMatch = path.match(
    /^\/api\/website-projects\/(\d+)\/cms-integrations\/([^/]+)\/output-mode$/,
  );
  if (outputModeMatch && method === "PATCH") {
    const projectId = Number.parseInt(outputModeMatch[1]!, 10);
    const platform = outputModeMatch[2]!;
    const access = await requireProjectAccess(projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    const body = (await request.json().catch(() => null)) as { outputMode?: string } | null;
    if (!body?.outputMode) {
      return withCors(request, Response.json({ error: "outputMode required" }, { status: 400 }));
    }
    const [project] = await db
      .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const integrations = (project.cmsIntegrations ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    const current = integrations[platform] ?? {};
    integrations[platform] = { ...current, outputMode: body.outputMode };
    await db
      .update(websiteProjectsTable)
      .set({ cmsIntegrations: integrations })
      .where(eq(websiteProjectsTable.id, projectId));
    return withCors(request, Response.json({ ok: true, outputMode: body.outputMode }));
  }

  return null;
}
