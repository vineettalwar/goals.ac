import { and, eq } from "drizzle-orm";
import type { GoalsD1Database } from "@workspace/db/d1";
import { analyticsPropertyConnectionsTable } from "@workspace/db/schema-sqlite";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import {
  encryptStoredTokens,
  ga4PropertyMatchesProject,
  listGa4PropertiesForConnection,
  type Ga4PropertySummary,
  type StoredTokens,
} from "@workspace/cf-edge/analytics-property-client";
import { getAccessibleProject, requireProjectAccess } from "@workspace/cf-edge/project-access";
import {
  assertGoogleIntegrationsEnabled,
  defaultProjectIntegrationsUrl,
  exchangeGoogleCode,
  normalizeReturnUrl,
  redirectResponse,
  requireAuthSecret,
  requireSessionUserId,
  signSearchOAuthState,
  verifySearchOAuthState,
  type SearchPropertyAuthEnv,
} from "./search-property-oauth-shared";

const PROD_API_ORIGIN = "https://api.goals.ac";
const UNSELECTED_PROPERTY_ID = "";

function resolveGoogleAnalyticsRedirectUri(request: Request): string {
  const url = new URL(request.url);
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${url.origin}/api/auth/google-analytics/callback`;
  }
  return `${PROD_API_ORIGIN}/api/auth/google-analytics/callback`;
}

function callbackStatus(properties: Ga4PropertySummary[], matched: Ga4PropertySummary | null): string {
  if (matched) return "connected";
  if (properties.length > 0) return "pick_property";
  return "no_properties";
}

function redirectToIntegrations(returnUrl: string, status: string): Response {
  const url = new URL(returnUrl);
  url.searchParams.set("ga4", status);
  return redirectResponse(url.toString());
}

async function upsertGa4Connection(
  database: GoalsD1Database,
  params: {
    projectId: number;
    propertyId: string;
    propertyName: string | null;
    streamId: string | null;
    accountEmail: string | null;
    tokens: StoredTokens;
    propertyVerified: boolean;
  },
): Promise<void> {
  const encryptedTokens = encryptStoredTokens(params.tokens);
  const [existing] = await database
    .select({ id: analyticsPropertyConnectionsTable.id })
    .from(analyticsPropertyConnectionsTable)
    .where(
      and(
        eq(analyticsPropertyConnectionsTable.projectId, params.projectId),
        eq(analyticsPropertyConnectionsTable.provider, "google_analytics_4"),
      ),
    )
    .limit(1);

  if (existing) {
    await database
      .update(analyticsPropertyConnectionsTable)
      .set({
        propertyId: params.propertyId,
        propertyName: params.propertyName,
        streamId: params.streamId,
        accountEmail: params.accountEmail,
        encryptedTokens,
        propertyVerified: params.propertyVerified,
      })
      .where(eq(analyticsPropertyConnectionsTable.id, existing.id));
    return;
  }

  await database.insert(analyticsPropertyConnectionsTable).values({
    projectId: params.projectId,
    provider: "google_analytics_4",
    propertyId: params.propertyId,
    propertyName: params.propertyName,
    streamId: params.streamId,
    accountEmail: params.accountEmail,
    encryptedTokens,
    propertyVerified: params.propertyVerified,
  });
}

export async function handleGoogleAnalyticsAuthStart(
  request: Request,
  env: SearchPropertyAuthEnv,
  database: GoalsD1Database,
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

  try {
    await assertGoogleIntegrationsEnabled(database);
    const clientId = env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      return Response.json(
        { error: "Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)" },
        { status: 503 },
      );
    }

    const returnUrl = normalizeReturnUrl(url.searchParams.get("returnUrl"), request);
    const state = await signSearchOAuthState(
      { projectId, userId, provider: "google_search_console", returnUrl },
      secret,
    );
    const redirectUri = resolveGoogleAnalyticsRedirectUri(request);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return redirectResponse(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Google Analytics OAuth failed" },
      { status: 503 },
    );
  }
}

export async function handleGoogleAnalyticsAuthCallback(
  request: Request,
  env: SearchPropertyAuthEnv,
  database: GoalsD1Database,
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
    return new Response("Google Analytics authorization failed", { status: 400 });
  }

  const sessionUserId = await requireSessionUserId(request, env);
  if (sessionUserId == null || sessionUserId !== state.userId) {
    return new Response("Unauthorized OAuth callback", { status: 401 });
  }

  const project = await getAccessibleProject(state.projectId, state.userId);
  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const redirectUri = resolveGoogleAnalyticsRedirectUri(request);

  try {
    const tokens = await exchangeGoogleCode(env, code, redirectUri);
    const properties = await listGa4PropertiesForConnection(tokens.accessToken);
    const matched =
      properties.find((property) =>
        ga4PropertyMatchesProject(project.url, property.streamUri),
      ) ?? null;

    await upsertGa4Connection(database, {
      projectId: project.id,
      propertyId: matched?.propertyId ?? UNSELECTED_PROPERTY_ID,
      propertyName: matched?.propertyName ?? null,
      streamId: matched?.streamId ?? null,
      accountEmail: tokens.email ?? null,
      tokens,
      propertyVerified: Boolean(matched),
    });

    if (matched) {
      try {
        await sendToCfQueue(QUEUES.ga4AnalyticsSync, {
          projectId: project.id,
          userId: state.userId,
        });
      } catch {
        // sync can be triggered manually from integrations
      }
    }

    return redirectToIntegrations(returnUrl, callbackStatus(properties, matched));
  } catch {
    return redirectToIntegrations(returnUrl, "error");
  }
}
