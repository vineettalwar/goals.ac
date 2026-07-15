import { setD1Binding } from "@workspace/db";
import { wireCfEdgeEnv } from "@workspace/cf-edge/wire";
import { corsPreflight, withCors } from "@workspace/cf-edge/cors";
import { kvGetJson } from "@workspace/cf-edge/kv-cache";
import { verifySessionClaims, type SessionClaims } from "@workspace/cf-edge/jwt";
import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";
import { handleAuthenticatedRead } from "./api-routes";
import { handleAdminRead } from "./admin-routes";
import { handleStudioRead } from "./studio-routes";
import { handleAnalyticsRead } from "./analytics-routes";
import { handleOrgSecurityRead } from "./org-security-routes";
import { handleBillingCreditsGet } from "./billing-credits-read";
import { handlePartnerRead } from "./partner-routes";
import { handleVisibilityRead } from "./visibility-routes";
import { handleGscSyncStatusGet } from "./search-properties";
import { handleKeywordRead } from "./keyword-routes";
import { handleOnboardingFastLaneRead } from "./onboarding-fast-lane-routes";
import { handleResearchRead } from "./research-routes";
import { handleBrandVoiceRead } from "./brand-voice-routes";

export interface Env extends CfEdgeBindings {
  DB_DIALECT: string;
  CF_EDGE_HTTP: string;
  AUTH_SECRET: string;
  GEMINI_KEY_ENCRYPTION_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  BING_WEBMASTER_CLIENT_ID?: string;
  STRIPE_CONNECT_CLIENT_ID?: string;
  STRIPE_SECRET_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
  UNSPLASH_ACCESS_KEY?: string;
  PEXELS_API_KEY?: string;
}

async function requireAuth(request: Request, env: Env) {
  const secret = env.AUTH_SECRET;
  if (!secret) return null;
  return verifySessionClaims(request, secret);
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
      return withCors(request, Response.json({ status: "ok", worker: "goals-ac-read" }));
    }

    if (path.match(/^\/api\/jobs\/[^/]+$/) && request.method === "GET") {
      const jobId = path.split("/").pop()!;
      const status = await kvGetJson(env.AI_CACHE, `job:status:${jobId}`);
      return withCors(
        request,
        Response.json(status ?? { jobId, status: "pending" }),
      );
    }

    const session = await requireAuth(request, env);
    if (!session?.id) {
      return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const userId = Number.parseInt(session.id, 10);

    try {
      const adminHandled = await handleAdminRead(request, path, session.role, userId, env);
      if (adminHandled) return adminHandled;

      const billingCreditsHandled = await handleBillingCreditsGet(request, path, userId);
      if (billingCreditsHandled) return billingCreditsHandled;

      const orgSecurityHandled = await handleOrgSecurityRead(request, path, userId);
      if (orgSecurityHandled) return orgSecurityHandled;

      const partnerHandled = await handlePartnerRead(request, path, userId, session);
      if (partnerHandled) return partnerHandled;

      const visibilityHandled = await handleVisibilityRead(request, path, userId);
      if (visibilityHandled) return visibilityHandled;

      const gscSyncStatusMatch = path.match(
        /^\/api\/website-projects\/(\d+)\/search-properties\/gsc\/sync-status$/,
      );
      if (gscSyncStatusMatch && request.method === "GET") {
        const projectId = Number.parseInt(gscSyncStatusMatch[1]!, 10);
        return handleGscSyncStatusGet(request, projectId, userId);
      }

      const studioHandled = await handleStudioRead(request, path, userId);
      if (studioHandled) return studioHandled;

      const analyticsHandled = await handleAnalyticsRead(request, path, userId, {
        GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
      });
      if (analyticsHandled) return analyticsHandled;

      const keywordHandled = await handleKeywordRead(request, path, userId);
      if (keywordHandled) return keywordHandled;

      const researchHandled = await handleResearchRead(request, path, userId);
      if (researchHandled) return researchHandled;

      const brandVoiceHandled = await handleBrandVoiceRead(request, path, userId);
      if (brandVoiceHandled) return brandVoiceHandled;

      const fastLaneHandled = await handleOnboardingFastLaneRead(request, path, userId);
      if (fastLaneHandled) return fastLaneHandled;

      const handled = await handleAuthenticatedRead(request, path, userId, env, session);
      if (handled) return handled;
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    } catch (err) {
      console.error("[goals-ac-read]", path, err);
      return withCors(request, Response.json({ error: "Internal server error" }, { status: 500 }));
    }
  },
};
