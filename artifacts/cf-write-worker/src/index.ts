import { setD1Binding } from "@workspace/db";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { wireCfEdgeEnv } from "@workspace/cf-edge/wire";
import { corsPreflight, withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { kvPutJson } from "@workspace/cf-edge/kv-cache";
import { verifySessionClaims } from "@workspace/cf-edge/jwt";
import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";
import { z } from "zod";

export interface Env extends CfEdgeBindings {
  DB_DIALECT: string;
  CF_EDGE_HTTP: string;
  FORCE_QUEUE_WRITES: string;
  AUTH_SECRET: string;
}

const contentGenerateBody = z.object({
  contentItemId: z.number().int().positive(),
  projectId: z.number().int().positive(),
  generateVariants: z.boolean().optional(),
  schedulePublish: z.boolean().optional(),
});

const contentPublishBody = z.object({
  contentPieceId: z.number().int().positive(),
});

const scrapeBody = z.object({
  projectId: z.number().int().positive(),
});

async function trackJob(env: Env, jobId: string, queue: string, meta: Record<string, unknown>) {
  await kvPutJson(env.AI_CACHE, `job:status:${jobId}`, {
    jobId,
    queue,
    status: "queued",
    ...meta,
    updatedAt: new Date().toISOString(),
  }, 86_400);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    wireCfEdgeEnv(env);
    setD1Binding(env.DB);
    const preflight = corsPreflight(request);
    if (preflight) return preflight;

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/" && request.method === "GET") {
      return withCors(request, Response.json({ status: "ok", worker: "goals-ac-write" }));
    }

    const session = await verifySessionClaims(request, env.AUTH_SECRET);
    if (!session?.id) {
      return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const userId = Number.parseInt(session.id, 10);

    try {
      if (path === "/api/content-pieces/generate" && request.method === "POST") {
        const parsed = contentGenerateBody.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return withCors(request, Response.json({ error: "Invalid body" }, { status: 400 }));
        }
        const jobId = await sendToCfQueue(QUEUES.contentGenerate, {
          ...parsed.data,
          userId,
        });
        const id = jobId ?? `cf:${QUEUES.contentGenerate}:${Date.now()}`;
        await trackJob(env, id, QUEUES.contentGenerate, { userId, projectId: parsed.data.projectId });
        return withCors(request, acceptedJobResponse(id, QUEUES.contentGenerate));
      }

      const publishMatch = path.match(/^\/api\/content-pieces\/(\d+)\/publish$/);
      if (publishMatch && request.method === "POST") {
        const parsed = contentPublishBody.safeParse({
          contentPieceId: Number.parseInt(publishMatch[1]!, 10),
        });
        if (!parsed.success) {
          return withCors(request, Response.json({ error: "Invalid body" }, { status: 400 }));
        }
        const jobId = await sendToCfQueue(QUEUES.contentPublish, {
          contentPieceId: parsed.data.contentPieceId,
          userId,
        });
        const id = jobId ?? `cf:${QUEUES.contentPublish}:${Date.now()}`;
        await trackJob(env, id, QUEUES.contentPublish, { userId });
        return withCors(request, acceptedJobResponse(id, QUEUES.contentPublish));
      }

      const scrapeMatch = path.match(/^\/api\/website-projects\/(\d+)\/scrape$/);
      if (scrapeMatch && request.method === "POST") {
        const projectId = Number.parseInt(scrapeMatch[1]!, 10);
        const parsed = scrapeBody.safeParse({ projectId });
        if (!parsed.success) {
          return withCors(request, Response.json({ error: "Invalid body" }, { status: 400 }));
        }
        const jobId = await sendToCfQueue(QUEUES.brandVoiceIndex, {
          projectId: parsed.data.projectId,
        });
        const id = jobId ?? `cf:${QUEUES.brandVoiceIndex}:${Date.now()}`;
        await trackJob(env, id, QUEUES.brandVoiceIndex, { userId, projectId });
        return withCors(request, acceptedJobResponse(id, QUEUES.brandVoiceIndex));
      }

      const syncMatch = path.match(/^\/api\/website-projects\/(\d+)\/search-properties\/gsc\/sync$/);
      if (syncMatch && request.method === "POST") {
        const projectId = Number.parseInt(syncMatch[1]!, 10);
        const jobId = await sendToCfQueue(QUEUES.gscSearchAnalyticsSync, { projectId, userId });
        const id = jobId ?? `cf:${QUEUES.gscSearchAnalyticsSync}:${Date.now()}`;
        await trackJob(env, id, QUEUES.gscSearchAnalyticsSync, { userId, projectId });
        return withCors(request, acceptedJobResponse(id, QUEUES.gscSearchAnalyticsSync));
      }

      const ga4Match = path.match(/^\/api\/website-projects\/(\d+)\/analytics-properties\/ga4\/sync$/);
      if (ga4Match && request.method === "POST") {
        const projectId = Number.parseInt(ga4Match[1]!, 10);
        const jobId = await sendToCfQueue(QUEUES.ga4AnalyticsSync, { projectId, userId });
        const id = jobId ?? `cf:${QUEUES.ga4AnalyticsSync}:${Date.now()}`;
        await trackJob(env, id, QUEUES.ga4AnalyticsSync, { userId, projectId });
        return withCors(request, acceptedJobResponse(id, QUEUES.ga4AnalyticsSync));
      }

      if (path === "/api/geo-audits/generate" && request.method === "POST") {
        const body = await request.json().catch(() => null) as { projectId?: number } | null;
        if (!body?.projectId) {
          return withCors(request, Response.json({ error: "projectId required" }, { status: 400 }));
        }
        const jobId = await sendToCfQueue(QUEUES.geoReauditSweep, { projectId: body.projectId });
        const id = jobId ?? `cf:${QUEUES.geoReauditSweep}:${Date.now()}`;
        await trackJob(env, id, QUEUES.geoReauditSweep, { userId, projectId: body.projectId });
        return withCors(request, acceptedJobResponse(id, QUEUES.geoReauditSweep));
      }

      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    } catch (err) {
      console.error("[goals-ac-write]", path, err);
      return withCors(request, Response.json({ error: "Internal server error" }, { status: 500 }));
    }
  },
};
