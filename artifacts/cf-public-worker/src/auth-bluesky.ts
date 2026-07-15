import { Agent } from "@atproto/api";
import type { GoalsD1Database } from "@workspace/db/d1";
import { getAccessibleProject } from "@workspace/cf-edge/project-access";
import {
  appOriginFromRequest,
  integrationsRedirectUrl,
  loadExistingCreds,
  parseProjectIdParam,
  redirectResponse,
  requireEncryptionConfigured,
  requireSessionUserId,
  saveSocialProjectCreds,
  signSocialOAuthState,
  verifySocialOAuthState,
  type SocialOAuthEnv,
} from "./auth-social-shared";
import {
  completeBlueskyCallback,
  getStoredBlueskySession,
  persistBlueskySession,
  startBlueskyAuthorize,
  type BlueskyOAuthEnv,
} from "./auth-bluesky-oauth";

type BlueskyAuthEnv = SocialOAuthEnv & BlueskyOAuthEnv;

export async function handleBlueskyAuthStart(
  request: Request,
  env: BlueskyAuthEnv,
): Promise<Response> {
  const encryptionError = requireEncryptionConfigured(env);
  if (encryptionError) return encryptionError;

  const appOrigin = appOriginFromRequest(request);
  const sessionResult = await requireSessionUserId(request, env, appOrigin);
  if (sessionResult instanceof Response) return sessionResult;
  const userId = sessionResult;

  const url = new URL(request.url);
  const projectId = parseProjectIdParam(url.searchParams.get("projectId"));
  const handle = url.searchParams.get("handle")?.trim();
  if (projectId == null) {
    return Response.json({ error: "projectId query param is required" }, { status: 400 });
  }
  if (!handle) {
    return Response.json(
      { error: "handle query param is required (e.g. you.bsky.social)" },
      { status: 400 },
    );
  }

  try {
    const secret = env.AUTH_SECRET!.trim();
    const state = await signSocialOAuthState(
      {
        projectId,
        userId,
        platform: "bluesky",
        appOrigin,
        nonce: crypto.randomUUID(),
      },
      secret,
    );
    const authorizeUrl = await startBlueskyAuthorize(request, env, handle, state);
    return redirectResponse(authorizeUrl);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Bluesky OAuth failed" },
      { status: 503 },
    );
  }
}

export async function handleBlueskyAuthCallback(
  request: Request,
  env: BlueskyAuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const stateParam = url.searchParams.get("state");

  const secret = env.AUTH_SECRET?.trim();
  if (!secret) {
    return redirectResponse(
      integrationsRedirectUrl(appOriginFromRequest(request), 0, { bluesky: "error" }),
    );
  }

  const state = stateParam ? await verifySocialOAuthState(stateParam, secret) : null;
  const appOrigin = state?.appOrigin ?? appOriginFromRequest(request);
  const projectId = state?.projectId ?? 0;

  if (oauthError || !code || !state || state.platform !== "bluesky") {
    return redirectResponse(integrationsRedirectUrl(appOrigin, projectId, { bluesky: "error" }));
  }

  try {
    const { session } = await completeBlueskyCallback(request, env, url.searchParams);
    const agent = new Agent(session);
    const profile = await agent.getProfile({ actor: session.did });

    const blueskyCreds = await persistBlueskySession(request, env, session, {
      handle: profile.data.handle,
    });
    if (!blueskyCreds.sessionJson) {
      const saved = await getStoredBlueskySession(env, request, session.did);
      if (saved) blueskyCreds.sessionJson = JSON.stringify(saved);
    }

    const project = await getAccessibleProject(state.projectId, state.userId);
    if (!project) {
      return redirectResponse(
        integrationsRedirectUrl(appOrigin, state.projectId, { bluesky: "error" }),
      );
    }

    const existing = loadExistingCreds(project);
    existing.bluesky = blueskyCreds;
    await saveSocialProjectCreds(state.projectId, state.userId, existing, database);

    return redirectResponse(
      integrationsRedirectUrl(appOrigin, state.projectId, { bluesky: "connected" }),
    );
  } catch (err) {
    console.error("[auth-bluesky] callback failed", err);
    return redirectResponse(
      integrationsRedirectUrl(appOrigin, state.projectId, { bluesky: "error" }),
    );
  }
}

export {
  getBlueskyClientMetadata,
  getBlueskyJwks,
} from "./auth-bluesky-oauth";
