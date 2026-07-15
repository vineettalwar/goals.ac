import type { GoalsD1Database } from "@workspace/db/d1";
import {
  exchangeMetaLongLivedToken,
  fetchMetaPages,
  type MetaPageInfo,
} from "@workspace/connectors/meta";
import { resolveMetaOAuthCredentials } from "@workspace/content-engine/support/social/meta-platform-credentials";
import {
  appOriginFromRequest,
  integrationsRedirectUrl,
  parseProjectIdParam,
  redirectResponse,
  requireEncryptionConfigured,
  requireSessionUserId,
  resolveOAuthRedirectUri,
  signSocialOAuthState,
  verifySocialOAuthState,
  type SocialOAuthEnv,
} from "./auth-social-shared";
import { storeMetaPagesSession } from "./auth-meta-pages";
import type { KvNamespaceBinding } from "@workspace/cf-edge/bindings";

type MetaAuthEnv = SocialOAuthEnv & {
  AI_CACHE?: KvNamespaceBinding;
};

const CALLBACK_PATH = "/api/auth/meta/callback";
const META_SCOPE =
  "pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,business_management";

function randomSessionToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function handleMetaAuthStart(
  request: Request,
  env: MetaAuthEnv,
): Promise<Response> {
  const metaApp = await resolveMetaOAuthCredentials();
  if (!metaApp) {
    return Response.json({ error: "Meta OAuth is not configured" }, { status: 503 });
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
      platform: "meta",
      appOrigin,
      nonce: crypto.randomUUID(),
    },
    secret,
  );

  const params = new URLSearchParams({
    client_id: metaApp.appId,
    redirect_uri: resolveOAuthRedirectUri(request, CALLBACK_PATH),
    state,
    scope: META_SCOPE,
    response_type: "code",
  });

  return redirectResponse(`https://www.facebook.com/v21.0/dialog/oauth?${params}`);
}

export async function handleMetaAuthCallback(
  request: Request,
  env: MetaAuthEnv,
  _database: GoalsD1Database,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const stateParam = url.searchParams.get("state");

  const secret = env.AUTH_SECRET?.trim();
  const metaApp = await resolveMetaOAuthCredentials();

  if (!secret || !metaApp) {
    return redirectResponse(integrationsRedirectUrl(appOriginFromRequest(request), 0, { meta: "error" }));
  }

  const state = stateParam ? await verifySocialOAuthState(stateParam, secret) : null;
  const appOrigin = state?.appOrigin ?? appOriginFromRequest(request);
  const projectId = state?.projectId ?? 0;

  if (oauthError || !code || !state || state.platform !== "meta") {
    return redirectResponse(integrationsRedirectUrl(appOrigin, projectId, { meta: "error" }));
  }

  try {
    const redirectUri = resolveOAuthRedirectUri(request, CALLBACK_PATH);
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${encodeURIComponent(metaApp.appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${encodeURIComponent(metaApp.appSecret)}&code=${encodeURIComponent(code)}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = (await tokenRes.json()) as { access_token?: string };

    if (!tokenData.access_token) {
      return redirectResponse(
        integrationsRedirectUrl(appOrigin, state.projectId, { meta: "error" }),
      );
    }

    let userAccessToken = tokenData.access_token;
    let tokenExpiresAt: number | undefined;
    try {
      const longLived = await exchangeMetaLongLivedToken(
        tokenData.access_token,
        metaApp.appId,
        metaApp.appSecret,
      );
      userAccessToken = longLived.accessToken;
      if (longLived.expiresIn) {
        tokenExpiresAt = Date.now() + longLived.expiresIn * 1000;
      }
    } catch {
      // Fall back to short-lived user token.
    }

    const pages = await fetchMetaPages(userAccessToken);
    if (pages.length === 0) {
      return redirectResponse(
        integrationsRedirectUrl(appOrigin, state.projectId, { meta: "no_pages" }),
      );
    }

    const pagesToken = randomSessionToken();
    await storeMetaPagesSession(env.AI_CACHE, pagesToken, {
      pages,
      userId: state.userId,
      projectId: state.projectId,
      tokenExpiresAt,
    });

    return redirectResponse(
      integrationsRedirectUrl(appOrigin, state.projectId, {
        meta: "select_page",
        token: pagesToken,
      }),
    );
  } catch (err) {
    console.error("[auth-meta] callback failed", err);
    return redirectResponse(
      integrationsRedirectUrl(appOrigin, state.projectId, { meta: "error" }),
    );
  }
}

export type MetaPagesSession = {
  pages: MetaPageInfo[];
  userId: number;
  projectId: number;
  tokenExpiresAt?: number;
};
