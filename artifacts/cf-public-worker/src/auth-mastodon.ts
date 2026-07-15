import type { GoalsD1Database } from "@workspace/db/d1";
import {
  fetchMastodonAccount,
  normalizeMastodonInstance,
  registerMastodonApp,
} from "@workspace/connectors/mastodon";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import type { KvNamespaceBinding } from "@workspace/cf-edge/bindings";
import { kvGetJson, kvPutJson } from "@workspace/cf-edge/kv-cache";
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

type MastodonAuthEnv = SocialOAuthEnv & {
  AI_CACHE?: KvNamespaceBinding;
};

const CALLBACK_PATH = "/api/auth/mastodon/callback";
const MASTODON_SESSION_TTL_SEC = 10 * 60;
const MASTODON_SESSION_PREFIX = "mastodon_oauth:";

type MastodonOAuthSession = {
  mastodonInstance: string;
  mastodonClientId: string;
  mastodonClientSecret: string;
  projectId: number;
  userId: number;
};

function randomSessionToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function handleMastodonAuthStart(
  request: Request,
  env: MastodonAuthEnv,
): Promise<Response> {
  const encryptionError = requireEncryptionConfigured(env);
  if (encryptionError) return encryptionError;

  const appOrigin = appOriginFromRequest(request);
  const sessionResult = await requireSessionUserId(request, env, appOrigin);
  if (sessionResult instanceof Response) return sessionResult;
  const userId = sessionResult;

  const url = new URL(request.url);
  const projectId = parseProjectIdParam(url.searchParams.get("projectId"));
  const instanceRaw = url.searchParams.get("instance")?.trim();
  if (projectId == null) {
    return Response.json({ error: "projectId query param is required" }, { status: 400 });
  }
  if (!instanceRaw) {
    return Response.json(
      { error: "instance query param is required (e.g. https://mastodon.social)" },
      { status: 400 },
    );
  }

  let instanceUrl: string;
  try {
    instanceUrl = normalizeMastodonInstance(instanceRaw);
    await assertPublicUrl(instanceUrl);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Invalid Mastodon instance URL" },
      { status: 400 },
    );
  }

  const redirectUri = resolveOAuthRedirectUri(request, CALLBACK_PATH);
  let clientId: string;
  let clientSecret: string;
  try {
    const registration = await registerMastodonApp(instanceUrl, redirectUri);
    clientId = registration.clientId;
    clientSecret = registration.clientSecret;
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Mastodon app registration failed" },
      { status: 503 },
    );
  }

  const mastodonToken = randomSessionToken();
  await kvPutJson(
    env.AI_CACHE,
    `${MASTODON_SESSION_PREFIX}${mastodonToken}`,
    {
      mastodonInstance: instanceUrl,
      mastodonClientId: clientId,
      mastodonClientSecret: clientSecret,
      projectId,
      userId,
    } satisfies MastodonOAuthSession,
    MASTODON_SESSION_TTL_SEC,
  );

  const secret = env.AUTH_SECRET!.trim();
  const state = await signSocialOAuthState(
    {
      projectId,
      userId,
      platform: "mastodon",
      appOrigin,
      nonce: crypto.randomUUID(),
      mastodonToken,
      mastodonInstance: instanceUrl,
      mastodonClientId: clientId,
    },
    secret,
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read write:statuses",
    state,
  });

  return redirectResponse(`${instanceUrl}/oauth/authorize?${params}`);
}

export async function handleMastodonAuthCallback(
  request: Request,
  env: MastodonAuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const stateParam = url.searchParams.get("state");

  const secret = env.AUTH_SECRET?.trim();
  if (!secret) {
    return redirectResponse(integrationsRedirectUrl(appOriginFromRequest(request), 0, { mastodon: "error" }));
  }

  const state = stateParam ? await verifySocialOAuthState(stateParam, secret) : null;
  const appOrigin = state?.appOrigin ?? appOriginFromRequest(request);
  const projectId = state?.projectId ?? 0;

  if (
    oauthError ||
    !code ||
    !state ||
    state.platform !== "mastodon" ||
    !state.mastodonInstance ||
    !state.mastodonClientId ||
    !state.mastodonToken
  ) {
    return redirectResponse(integrationsRedirectUrl(appOrigin, projectId, { mastodon: "error" }));
  }

  const session = await kvGetJson<MastodonOAuthSession>(
    env.AI_CACHE,
    `${MASTODON_SESSION_PREFIX}${state.mastodonToken}`,
  );
  if (
    !session ||
    session.userId !== state.userId ||
    session.projectId !== state.projectId
  ) {
    return redirectResponse(
      integrationsRedirectUrl(appOrigin, state.projectId, { mastodon: "error" }),
    );
  }

  try {
    await assertPublicUrl(session.mastodonInstance);
    const redirectUri = resolveOAuthRedirectUri(request, CALLBACK_PATH);
    const tokenRes = await fetch(`${session.mastodonInstance}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: session.mastodonClientId,
        client_secret: session.mastodonClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return redirectResponse(
        integrationsRedirectUrl(appOrigin, state.projectId, { mastodon: "error" }),
      );
    }

    const account = await fetchMastodonAccount(session.mastodonInstance, tokenData.access_token);
    const project = await getAccessibleProject(state.projectId, state.userId);
    if (!project) {
      return redirectResponse(
        integrationsRedirectUrl(appOrigin, state.projectId, { mastodon: "error" }),
      );
    }

    const existing = loadExistingCreds(project);
    existing.mastodon = {
      instanceUrl: session.mastodonInstance,
      accessToken: tokenData.access_token,
      accountId: account.id,
      username: account.username,
      clientId: session.mastodonClientId,
      clientSecret: session.mastodonClientSecret,
    };
    await saveSocialProjectCreds(state.projectId, state.userId, existing, database);

    return redirectResponse(
      integrationsRedirectUrl(appOrigin, state.projectId, { mastodon: "connected" }),
    );
  } catch (err) {
    console.error("[auth-mastodon] callback failed", err);
    return redirectResponse(
      integrationsRedirectUrl(appOrigin, state.projectId, { mastodon: "error" }),
    );
  }
}
