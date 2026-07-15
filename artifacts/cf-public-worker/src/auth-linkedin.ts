import type { GoalsD1Database } from "@workspace/db/d1";
import { fetchLinkedInAuthorUrn } from "@workspace/connectors/linkedin";
import { resolveLinkedInOAuthCredentials } from "@workspace/content-engine/support/social/linkedin-platform-credentials";
import { getAccessibleProject } from "@workspace/cf-edge/project-access";
import {
  appOriginFromRequest,
  integrationsRedirectUrl,
  loadExistingCreds,
  parseProjectIdParam,
  redirectResponse,
  requireEncryptionConfigured,
  requireSessionUserId,
  resolveOAuthRedirectUri,
  saveSocialProjectCreds,
  signSocialOAuthState,
  verifySocialOAuthState,
  type SocialOAuthEnv,
} from "./auth-social-shared";

type LinkedInAuthEnv = SocialOAuthEnv;

const CALLBACK_PATH = "/api/auth/linkedin/callback";

export async function handleLinkedInAuthStart(
  request: Request,
  env: LinkedInAuthEnv,
): Promise<Response> {
  const linkedInApp = await resolveLinkedInOAuthCredentials();
  if (!linkedInApp) {
    return Response.json({ error: "LinkedIn OAuth is not configured" }, { status: 503 });
  }

  const encryptionError = requireEncryptionConfigured(env);
  if (encryptionError) return encryptionError;

  const appOrigin = appOriginFromRequest(request);
  const sessionResult = await requireSessionUserId(request, env, appOrigin);
  if (sessionResult instanceof Response) return sessionResult;
  const userId = sessionResult;

  const url = new URL(request.url);
  const projectId = parseProjectIdParam(url.searchParams.get("projectId"));
  if (projectId == null) {
    return Response.json({ error: "projectId query param is required" }, { status: 400 });
  }

  const secret = env.AUTH_SECRET!.trim();
  const state = await signSocialOAuthState(
    {
      projectId,
      userId,
      platform: "linkedin",
      appOrigin,
      nonce: crypto.randomUUID(),
    },
    secret,
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id: linkedInApp.clientId,
    redirect_uri: resolveOAuthRedirectUri(request, CALLBACK_PATH),
    state,
    scope: "openid profile w_member_social email",
  });

  return redirectResponse(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
}

export async function handleLinkedInAuthCallback(
  request: Request,
  env: LinkedInAuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const stateParam = url.searchParams.get("state");

  const secret = env.AUTH_SECRET?.trim();
  const linkedInApp = await resolveLinkedInOAuthCredentials();

  if (!secret || !linkedInApp) {
    return redirectResponse(integrationsRedirectUrl(appOriginFromRequest(request), 0, { linkedin: "error" }));
  }

  const state = stateParam ? await verifySocialOAuthState(stateParam, secret) : null;
  const appOrigin = state?.appOrigin ?? appOriginFromRequest(request);
  const projectId = state?.projectId ?? 0;

  if (oauthError || !code || !state || state.platform !== "linkedin") {
    return redirectResponse(integrationsRedirectUrl(appOrigin, projectId, { linkedin: "error" }));
  }

  try {
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: resolveOAuthRedirectUri(request, CALLBACK_PATH),
        client_id: linkedInApp.clientId,
        client_secret: linkedInApp.clientSecret,
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!tokenData.access_token) {
      return redirectResponse(
        integrationsRedirectUrl(appOrigin, state.projectId, { linkedin: "error" }),
      );
    }

    const authorUrn = await fetchLinkedInAuthorUrn(tokenData.access_token);
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileRes.json()) as { name?: string };

    const project = await getAccessibleProject(state.projectId, state.userId);
    if (!project) {
      return redirectResponse(
        integrationsRedirectUrl(appOrigin, state.projectId, { linkedin: "error" }),
      );
    }

    const existing = loadExistingCreds(project);
    existing.linkedin = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      authorUrn,
      displayName: profile.name,
    };
    await saveSocialProjectCreds(state.projectId, state.userId, existing, database);

    return redirectResponse(
      integrationsRedirectUrl(appOrigin, state.projectId, { linkedin: "connected" }),
    );
  } catch (err) {
    console.error("[auth-linkedin] callback failed", err);
    return redirectResponse(
      integrationsRedirectUrl(appOrigin, state.projectId, { linkedin: "error" }),
    );
  }
}
