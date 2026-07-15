import type { GoalsD1Database } from "@workspace/db/d1";
import { generatePkce } from "@workspace/content-engine/support/social/social-tokens";
import { resolveTwitterOAuthCredentials } from "@workspace/content-engine/support/social/twitter-platform-credentials";
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

type TwitterAuthEnv = SocialOAuthEnv;

const CALLBACK_PATH = "/api/auth/twitter/callback";

function twitterBasicAuth(clientId: string, clientSecret: string): string {
  return btoa(`${clientId}:${clientSecret}`);
}

export async function handleTwitterAuthStart(
  request: Request,
  env: TwitterAuthEnv,
): Promise<Response> {
  const twitterApp = await resolveTwitterOAuthCredentials();
  if (!twitterApp) {
    return Response.json({ error: "X OAuth is not configured" }, { status: 503 });
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

  const { verifier, challenge } = generatePkce();
  const secret = env.AUTH_SECRET!.trim();
  const state = await signSocialOAuthState(
    {
      projectId,
      userId,
      platform: "twitter",
      appOrigin,
      nonce: crypto.randomUUID(),
      codeVerifier: verifier,
    },
    secret,
  );

  const params = new URLSearchParams({
    response_type: "code",
    client_id: twitterApp.clientId,
    redirect_uri: resolveOAuthRedirectUri(request, CALLBACK_PATH),
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return redirectResponse(`https://twitter.com/i/oauth2/authorize?${params}`);
}

export async function handleTwitterAuthCallback(
  request: Request,
  env: TwitterAuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const stateParam = url.searchParams.get("state");

  const secret = env.AUTH_SECRET?.trim();
  const twitterApp = await resolveTwitterOAuthCredentials();

  if (!secret || !twitterApp) {
    return redirectResponse(integrationsRedirectUrl(appOriginFromRequest(request), 0, { twitter: "error" }));
  }

  const state = stateParam ? await verifySocialOAuthState(stateParam, secret) : null;
  const appOrigin = state?.appOrigin ?? appOriginFromRequest(request);
  const projectId = state?.projectId ?? 0;

  if (
    oauthError ||
    !code ||
    !state ||
    state.platform !== "twitter" ||
    !state.codeVerifier
  ) {
    return redirectResponse(integrationsRedirectUrl(appOrigin, projectId, { twitter: "error" }));
  }

  try {
    const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${twitterBasicAuth(twitterApp.clientId, twitterApp.clientSecret)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: resolveOAuthRedirectUri(request, CALLBACK_PATH),
        code_verifier: state.codeVerifier,
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!tokenData.access_token) {
      return redirectResponse(
        integrationsRedirectUrl(appOrigin, state.projectId, { twitter: "error" }),
      );
    }

    const meRes = await fetch("https://api.x.com/2/users/me?user.fields=username", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const me = (await meRes.json()) as { data?: { id?: string; username?: string } };

    const project = await getAccessibleProject(state.projectId, state.userId);
    if (!project) {
      return redirectResponse(
        integrationsRedirectUrl(appOrigin, state.projectId, { twitter: "error" }),
      );
    }

    const existing = loadExistingCreds(project);
    existing.twitter = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
      userId: me.data?.id,
      screenName: me.data?.username,
    };
    await saveSocialProjectCreds(state.projectId, state.userId, existing, database);

    return redirectResponse(
      integrationsRedirectUrl(appOrigin, state.projectId, { twitter: "connected" }),
    );
  } catch (err) {
    console.error("[auth-twitter] callback failed", err);
    return redirectResponse(
      integrationsRedirectUrl(appOrigin, state.projectId, { twitter: "error" }),
    );
  }
}
