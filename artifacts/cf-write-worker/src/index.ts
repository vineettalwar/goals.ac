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
import { handleCmsIntegrationsWrite } from "./cms-integrations";
import { handleCmsIntegrationsTest } from "./cms-integrations-test";
import { handleContentPiecesWrite } from "./content-pieces";
import { handleAutopilotSettingsWrite } from "./autopilot-settings";
import { handleWebsiteProjectsWrite } from "./website-projects";
import { handleAuthMeWrite } from "./auth-me";
import { handleAuthChangePassword } from "./auth-change-password";
import { handleAuthDeleteAccount } from "./auth-delete-account";
import { handleAuthApiKeyWrite } from "./auth-api-key";
import { handleAiProvidersSettingsWrite } from "./ai-providers-settings";
import { handleAuthOpenaiWrite } from "./auth-openai";
import { handleAuthAnthropicWrite } from "./auth-anthropic";
import { handleAuthBedrockWrite } from "./auth-bedrock";
import { handleAuthSemrushWrite } from "./auth-semrush";
import { handleAuthDeeplWrite } from "./auth-deepl";
import { handleAuthStockWrite } from "./auth-stock";
import { handleOrgMembersWrite } from "./org-members";
import { handleBillingPortalPost } from "./billing-portal";
import { handleBillingCheckoutPost } from "./billing-checkout";
import { handleSearchPropertiesWrite } from "./search-properties";

export interface Env extends CfEdgeBindings {
  DB_DIALECT: string;
  CF_EDGE_HTTP: string;
  FORCE_QUEUE_WRITES: string;
  AUTH_SECRET: string;
  GEMINI_KEY_ENCRYPTION_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  BING_WEBMASTER_CLIENT_ID?: string;
  BING_WEBMASTER_CLIENT_SECRET?: string;
}

const contentGenerateBody = z
  .object({
    contentItemId: z.number().int().positive().optional(),
    contentPieceId: z.number().int().positive().optional(),
    projectId: z.number().int().positive(),
    generateVariants: z.boolean().optional(),
    schedulePublish: z.boolean().optional(),
  })
  .refine((data) => data.contentItemId != null || data.contentPieceId != null, {
    message: "contentItemId or contentPieceId required",
  });

const contentPublishBody = z.object({
  contentPieceId: z.number().int().positive(),
  platform: z.string().min(1).optional(),
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
      const cmsTestHandled = await handleCmsIntegrationsTest(request, path, userId);
      if (cmsTestHandled) return cmsTestHandled;

      const cmsHandled = await handleCmsIntegrationsWrite(request, path, userId);
      if (cmsHandled) return cmsHandled;

      const authMeHandled = await handleAuthMeWrite(request, path, userId);
      if (authMeHandled) return authMeHandled;

      const changePasswordHandled = await handleAuthChangePassword(request, path, userId);
      if (changePasswordHandled) return changePasswordHandled;

      const deleteAccountHandled = await handleAuthDeleteAccount(request, path, userId);
      if (deleteAccountHandled) return deleteAccountHandled;

      const apiKeyHandled = await handleAuthApiKeyWrite(request, path, userId);
      if (apiKeyHandled) return apiKeyHandled;

      const openaiHandled = await handleAuthOpenaiWrite(request, path, userId);
      if (openaiHandled) return openaiHandled;

      const anthropicHandled = await handleAuthAnthropicWrite(request, path, userId);
      if (anthropicHandled) return anthropicHandled;

      const bedrockHandled = await handleAuthBedrockWrite(request, path, userId);
      if (bedrockHandled) return bedrockHandled;

      const semrushHandled = await handleAuthSemrushWrite(request, path, userId);
      if (semrushHandled) return semrushHandled;

      const deeplHandled = await handleAuthDeeplWrite(request, path, userId);
      if (deeplHandled) return deeplHandled;

      const stockHandled = await handleAuthStockWrite(request, path, userId);
      if (stockHandled) return stockHandled;

      const aiProvidersHandled = await handleAiProvidersSettingsWrite(request, path, userId);
      if (aiProvidersHandled) return aiProvidersHandled;

      const autopilotHandled = await handleAutopilotSettingsWrite(request, path, userId);
      if (autopilotHandled) return autopilotHandled;

      const projectsHandled = await handleWebsiteProjectsWrite(request, path, userId);
      if (projectsHandled) return projectsHandled;

      const orgMembersHandled = await handleOrgMembersWrite(request, path, userId);
      if (orgMembersHandled) return orgMembersHandled;

      const billingPortalHandled = await handleBillingPortalPost(request, path, userId);
      if (billingPortalHandled) return billingPortalHandled;

      const billingCheckoutHandled = await handleBillingCheckoutPost(request, path, userId);
      if (billingCheckoutHandled) return billingCheckoutHandled;

      const searchPropertiesHandled = await handleSearchPropertiesWrite(request, path, userId, env);
      if (searchPropertiesHandled) return searchPropertiesHandled;

      const contentPiecesHandled = await handleContentPiecesWrite(request, path, userId, (jobId, queue, meta) =>
        trackJob(env, jobId, queue, meta),
      );
      if (contentPiecesHandled) return contentPiecesHandled;

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
        const body = (await request.json().catch(() => null)) as {
          contentPieceId?: number;
          platform?: string;
        } | null;
        const parsed = contentPublishBody.safeParse({
          contentPieceId: Number.parseInt(publishMatch[1]!, 10),
          platform: body?.platform,
        });
        if (!parsed.success) {
          return withCors(request, Response.json({ error: "Invalid body" }, { status: 400 }));
        }
        const jobId = await sendToCfQueue(QUEUES.contentPublish, {
          contentPieceId: parsed.data.contentPieceId,
          userId,
          platform: parsed.data.platform,
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
