import { setD1Binding } from "@workspace/db";
import { wireCfEdgeEnv } from "@workspace/cf-edge/wire";
import { applyDataForSeoPlatformEnv } from "@workspace/content-engine/support/integrations/dataforseo-credentials";
import { corsPreflight, withCors } from "@workspace/cf-edge/cors";
import { kvPutJson } from "@workspace/cf-edge/kv-cache";
import { requireWorkerSession, workerSessionErrorBody } from "@workspace/cf-edge/session";
import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";
import { setContentMediaR2Binding } from "@workspace/media";
import { handleAdminWrite } from "./admin-routes";
import { handleCmsIntegrationsTest } from "./cms-integrations-test";
import { handleContentPiecesWrite } from "./content-pieces";
import { handleContentPiecesQueueWrite } from "./content-pieces-queue";
import { handleContentPiecesAiWrite } from "./content-pieces-ai";
import { handleContentPiecesWorkflowWrite } from "./content-pieces-workflow";
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
import { handleAnalyticsPropertiesWrite } from "./analytics-properties";
import { handleCmsIntegrationsWrite } from "./cms-integrations";
import { handleStudioWrite } from "./studio-routes";
import { handleKeywordWrite } from "./keyword-routes";
import { handleSocialWrite } from "./social-routes";
import { handleBillingCreditsWrite } from "./billing-credits";
import { handleOrgSecurityWrite, handleMfaRoutes } from "./org-security-routes";
import { handleInviteAcceptPost } from "./invite-routes";
import { handleVisibilityWrite } from "./visibility-routes";
import { handleGscUrlInspectionWrite } from "./gsc-url-inspection-routes";
import { handleSiteAuditWrite } from "./site-audit-routes";
import { handleBacklinksWrite } from "./backlinks-routes";
import { handleTrackedKeywordsWrite } from "./tracked-keywords-routes";
import { handleCompetitorAnalysisWrite } from "./competitor-analysis-routes";
import { handleContentStrategiesWrite } from "./content-strategies-routes";
import { handleGeoAuditWrite } from "./geo-audit-routes";
import { handleOnboardingFastLaneWrite } from "./onboarding-fast-lane-routes";
import { handleResearchWrite } from "./research-routes";
import { handleBrandVoiceWrite } from "./brand-voice-routes";
import { handleLegacyWrite } from "./legacy-routes";
import { handleProjectCredentialsWrite } from "./project-credentials-routes";
import { handleRoadmapPinWrite } from "./roadmap-pin-routes";
import { handleWordpressTestWrite } from "./wordpress-test-routes";
import { edgeNotImplementedResponse, isUnimplementedGeneratePath } from "@workspace/cf-edge/edge-not-implemented";

export interface Env extends CfEdgeBindings {
  DB_DIALECT: string;
  CF_EDGE_HTTP: string;
  FORCE_QUEUE_WRITES: string;
  AUTH_SECRET: string;
  GEMINI_KEY_ENCRYPTION_SECRET: string;
  GEMINI_API_KEY?: string;
  AI_INTEGRATIONS_GEMINI_API_KEY?: string;
  AI_PROVIDER?: string;
  DATAFORSEO_LOGIN?: string;
  DATAFORSEO_PASSWORD?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  BING_WEBMASTER_CLIENT_ID?: string;
  APP_URL?: string;
  CONTENT_MEDIA_R2?: import("@workspace/media").ContentMediaR2Binding;
  CONTENT_MEDIA_PUBLIC_BASE_URL?: string;
}

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
    await applyDataForSeoPlatformEnv();
    if (env.CONTENT_MEDIA_R2) setContentMediaR2Binding(env.CONTENT_MEDIA_R2);
    const preflight = corsPreflight(request);
    if (preflight) return preflight;

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/" && request.method === "GET") {
      return withCors(request, Response.json({ status: "ok", worker: "goals-ac-write" }));
    }

    const auth = await requireWorkerSession(request, env.AUTH_SECRET, { path, method: request.method });
    if (!auth.ok) {
      return withCors(request, Response.json(workerSessionErrorBody(auth), { status: auth.status }));
    }
    const session = auth.session;
    const userId = auth.userId;

    try {
      const adminHandled = await handleAdminWrite(request, path, session.role, session, env.AUTH_SECRET);
      if (adminHandled) return adminHandled;

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

      const projectsHandled = await handleWebsiteProjectsWrite(
        request,
        path,
        userId,
        (jobId, queue, meta) => trackJob(env, jobId, queue, meta),
      );
      if (projectsHandled) return projectsHandled;

      const orgMembersHandled = await handleOrgMembersWrite(request, path, userId);
      if (orgMembersHandled) return orgMembersHandled;

      const billingPortalHandled = await handleBillingPortalPost(request, path, userId);
      if (billingPortalHandled) return billingPortalHandled;

      const billingCheckoutHandled = await handleBillingCheckoutPost(request, path, userId);
      if (billingCheckoutHandled) return billingCheckoutHandled;

      const searchPropertiesHandled = await handleSearchPropertiesWrite(
        request,
        path,
        userId,
        env,
        (jobId, queue, meta) => trackJob(env, jobId, queue, meta),
      );
      if (searchPropertiesHandled) return searchPropertiesHandled;

      const analyticsPropertiesHandled = await handleAnalyticsPropertiesWrite(
        request,
        path,
        userId,
        env,
        (jobId, queue, meta) => trackJob(env, jobId, queue, meta),
      );
      if (analyticsPropertiesHandled) return analyticsPropertiesHandled;

      const studioHandled = await handleStudioWrite(request, path, userId);
      if (studioHandled) return studioHandled;

      const keywordHandled = await handleKeywordWrite(request, path, userId);
      if (keywordHandled) return keywordHandled;

      const socialHandled = await handleSocialWrite(request, path, userId, env);
      if (socialHandled) return socialHandled;

      const billingCreditsHandled = await handleBillingCreditsWrite(request, path, userId);
      if (billingCreditsHandled) return billingCreditsHandled;

      const orgSecurityHandled = await handleOrgSecurityWrite(request, path, userId);
      if (orgSecurityHandled) return orgSecurityHandled;

      const mfaHandled = await handleMfaRoutes(request, path, userId, env.AUTH_SECRET);
      if (mfaHandled) return mfaHandled;

      const inviteHandled = await handleInviteAcceptPost(request, path, userId);
      if (inviteHandled) return inviteHandled;

      const contentPiecesHandled = await handleContentPiecesWrite(request, path, userId, (jobId, queue, meta) =>
        trackJob(env, jobId, queue, meta),
      );
      if (contentPiecesHandled) return contentPiecesHandled;

      const contentPiecesQueueHandled = await handleContentPiecesQueueWrite(
        request,
        path,
        userId,
        (jobId, queue, meta) => trackJob(env, jobId, queue, meta),
      );
      if (contentPiecesQueueHandled) return contentPiecesQueueHandled;

      const contentPiecesWorkflowHandled = await handleContentPiecesWorkflowWrite(request, path, userId);
      if (contentPiecesWorkflowHandled) return contentPiecesWorkflowHandled;

      const contentPiecesAiHandled = await handleContentPiecesAiWrite(request, path, userId);
      if (contentPiecesAiHandled) return contentPiecesAiHandled;

      const visibilityHandled = await handleVisibilityWrite(request, path, userId);
      if (visibilityHandled) return visibilityHandled;

      const gscInspectionHandled = await handleGscUrlInspectionWrite(request, path, userId);
      if (gscInspectionHandled) return gscInspectionHandled;

      const siteAuditHandled = await handleSiteAuditWrite(request, path, userId);
      if (siteAuditHandled) return siteAuditHandled;

      const backlinksHandled = await handleBacklinksWrite(request, path, userId);
      if (backlinksHandled) return backlinksHandled;

      const trackedKeywordsHandled = await handleTrackedKeywordsWrite(
        request,
        path,
        userId,
        (jobId, queue, meta) => trackJob(env, jobId, queue, meta),
      );
      if (trackedKeywordsHandled) return trackedKeywordsHandled;

      const competitorAnalysisHandled = await handleCompetitorAnalysisWrite(request, path, userId);
      if (competitorAnalysisHandled) return competitorAnalysisHandled;

      const contentStrategiesHandled = await handleContentStrategiesWrite(
        request,
        path,
        userId,
        (jobId, queue, meta) => trackJob(env, jobId, queue, meta),
      );
      if (contentStrategiesHandled) return contentStrategiesHandled;

      const geoAuditHandled = await handleGeoAuditWrite(
        request,
        path,
        userId,
        env,
        (jobId, queue, meta) => trackJob(env, jobId, queue, meta),
      );
      if (geoAuditHandled) return geoAuditHandled;

      const fastLaneHandled = await handleOnboardingFastLaneWrite(
        request,
        path,
        userId,
        (jobId, queue, meta) => trackJob(env, jobId, queue, meta),
      );
      if (fastLaneHandled) return fastLaneHandled;

      const researchHandled = await handleResearchWrite(request, path, userId);
      if (researchHandled) return researchHandled;

      const brandVoiceHandled = await handleBrandVoiceWrite(request, path, userId);
      if (brandVoiceHandled) return brandVoiceHandled;

      const legacyHandled = await handleLegacyWrite(request, path, userId);
      if (legacyHandled) return legacyHandled;

      const projectCredentialsHandled = await handleProjectCredentialsWrite(request, path, userId);
      if (projectCredentialsHandled) return projectCredentialsHandled;

      const roadmapPinHandled = await handleRoadmapPinWrite(request, path, userId);
      if (roadmapPinHandled) return roadmapPinHandled;

      const wordpressTestHandled = await handleWordpressTestWrite(request, path, userId);
      if (wordpressTestHandled) return wordpressTestHandled;

      if (isUnimplementedGeneratePath(path, request.method)) {
        return withCors(request, edgeNotImplementedResponse(request));
      }

      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    } catch (err) {
      console.error("[goals-ac-write]", path, err);
      return withCors(request, Response.json({ error: "Internal server error" }, { status: 500 }));
    }
  },
};
