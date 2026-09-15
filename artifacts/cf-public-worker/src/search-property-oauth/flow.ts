import { and, eq } from "drizzle-orm";
import type { GoalsD1Database } from "@workspace/db/d1";
import {
  searchPropertyConnectionsTable,
  type SearchPropertyProvider,
} from "@workspace/db/schema-sqlite";
import { requireProjectAccess, getAccessibleProject } from "@workspace/cf-edge/project-access";
import { encryptSecret } from "@workspace/security/encryption";
import { resolveBingWebmasterOAuthCredentials } from "@workspace/platform-admin";
import {
  BING_OAUTH_AUTHORIZE_URL,
  listPropertiesForProvider,
  pickSearchProperty,
} from "@workspace/cf-edge/search-property-client";
import {
  defaultProjectIntegrationsUrl,
  normalizeReturnUrl,
} from "../oauth-app-return-url";
import type { SearchPropertyAuthEnv, StoredTokens } from "./types";
import {
  redirectResponse,
  redirectToIntegrations,
  requireAuthSecret,
  requireSessionUserId,
  resolveSearchPropertyRedirectUri,
  signSearchOAuthState,
  verifySearchOAuthState,
} from "./state";
import { assertGoogleIntegrationsEnabled, exchangeGoogleCode } from "./google";
import { assertBingWebmasterEnabled, exchangeBingCode } from "./bing";

function encryptStoredTokens(tokens: StoredTokens): string {
  return encryptSecret(JSON.stringify(tokens));
}

async function upsertConnection(
  database: GoalsD1Database,
  params: {
    projectId: number;
    provider: SearchPropertyProvider;
    propertyUrl: string | null;
    accountEmail: string | null;
    tokens: StoredTokens;
    propertyVerified: boolean;
  },
): Promise<void> {
  const encryptedTokens = encryptStoredTokens(params.tokens);
  const [existing] = await database
    .select({ id: searchPropertyConnectionsTable.id })
    .from(searchPropertyConnectionsTable)
    .where(
      and(
        eq(searchPropertyConnectionsTable.projectId, params.projectId),
        eq(searchPropertyConnectionsTable.provider, params.provider),
      ),
    )
    .limit(1);

  if (existing) {
    await database
      .update(searchPropertyConnectionsTable)
      .set({
        propertyUrl: params.propertyUrl,
        accountEmail: params.accountEmail,
        encryptedTokens,
        propertyVerified: params.propertyVerified,
      })
      .where(eq(searchPropertyConnectionsTable.id, existing.id));
    return;
  }

  await database.insert(searchPropertyConnectionsTable).values({
    projectId: params.projectId,
    provider: params.provider,
    propertyUrl: params.propertyUrl,
    accountEmail: params.accountEmail,
    encryptedTokens,
    propertyVerified: params.propertyVerified,
  });
}

function callbackStatus(properties: string[], matched: string | null): string {
  if (matched) return "connected";
  if (properties.length > 0) return "pick_property";
  return "no_properties";
}

export async function handleSearchPropertyCallback(
  request: Request,
  env: SearchPropertyAuthEnv,
  database: GoalsD1Database,
  provider: SearchPropertyProvider,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const secret = requireAuthSecret(env);
  const state = stateParam && secret ? await verifySearchOAuthState(stateParam, secret) : null;
  const fallbackReturn = defaultProjectIntegrationsUrl(state?.projectId);
  const returnUrl = state
    ? normalizeReturnUrl(state.returnUrl, request, state.projectId)
    : fallbackReturn;

  if (!secret) {
    return new Response("Auth is not configured", { status: 503 });
  }

  if (oauthError || !code || !state) {
    return new Response(
      provider === "google_search_console"
        ? "Google Search Console authorization failed"
        : "Bing Webmaster authorization failed",
      { status: 400 },
    );
  }

  if (state.provider !== provider) {
    return redirectToIntegrations(returnUrl, provider, "error");
  }

  const sessionUserId = await requireSessionUserId(request, env);
  if (sessionUserId == null || sessionUserId !== state.userId) {
    return new Response("Unauthorized OAuth callback", { status: 401 });
  }

  const project = await getAccessibleProject(state.projectId, state.userId);
  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const redirectUri = resolveSearchPropertyRedirectUri(request, provider);

  try {
    if (provider === "google_search_console") {
      const tokens = await exchangeGoogleCode(env, code, redirectUri);
      const properties = await listPropertiesForProvider(provider, tokens.accessToken);
      const matched = pickSearchProperty(project.url, properties);
      await upsertConnection(database, {
        projectId: project.id,
        provider,
        propertyUrl: matched,
        accountEmail: tokens.email ?? null,
        tokens,
        propertyVerified: Boolean(matched),
      });
      return redirectToIntegrations(returnUrl, provider, callbackStatus(properties, matched));
    }

    const tokens = await exchangeBingCode(env, code, redirectUri);
    const properties = await listPropertiesForProvider(provider, tokens.accessToken);
    const matched = pickSearchProperty(project.url, properties);
    await upsertConnection(database, {
      projectId: project.id,
      provider,
      propertyUrl: matched,
      accountEmail: null,
      tokens,
      propertyVerified: Boolean(matched),
    });
    return redirectToIntegrations(returnUrl, provider, callbackStatus(properties, matched));
  } catch {
    return redirectToIntegrations(returnUrl, provider, "error");
  }
}

export async function startSearchPropertyOAuth(
  request: Request,
  env: SearchPropertyAuthEnv,
  database: GoalsD1Database,
  provider: SearchPropertyProvider,
): Promise<Response> {
  const secret = requireAuthSecret(env);
  if (!secret) {
    return Response.json({ error: "Auth is not configured" }, { status: 503 });
  }

  const userId = await requireSessionUserId(request, env);
  if (userId == null) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const projectId = Number(url.searchParams.get("projectId"));
  if (!Number.isFinite(projectId)) {
    return Response.json({ error: "projectId query param is required" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId);
  if (!access.ok) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const returnUrl = normalizeReturnUrl(url.searchParams.get("returnUrl"), request, projectId);
  const state = await signSearchOAuthState(
    { projectId, userId, provider, returnUrl },
    secret,
  );
  const redirectUri = resolveSearchPropertyRedirectUri(request, provider);

  if (provider === "google_search_console") {
    await assertGoogleIntegrationsEnabled(database);
    const clientId = env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      return Response.json(
        { error: "Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)" },
        { status: 503 },
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return redirectResponse(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  await assertBingWebmasterEnabled(database);
  const bing = await resolveBingWebmasterOAuthCredentials(env);
  if (!bing) {
    return Response.json(
      { error: "Bing Webmaster OAuth is not configured (BING_WEBMASTER_CLIENT_ID)" },
      { status: 503 },
    );
  }

  const params = new URLSearchParams({
    client_id: bing.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "webmaster.read",
    state,
  });

  return redirectResponse(`${BING_OAUTH_AUTHORIZE_URL}?${params}`);
}
