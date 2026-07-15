import { and, eq } from "drizzle-orm";
import type { GoalsD1Database } from "@workspace/db/d1";
import { articleIdeaSourcesTable, usersTable } from "@workspace/db/schema-sqlite";
import {
  getOrgMembership,
  requireProjectAccess,
  requireSiteAdminAccess,
} from "@workspace/cf-edge/project-access";
import { encryptStoredTokens } from "@workspace/content-engine/support/integrations/gsc-connection";
import {
  assertGoogleIntegrationsEnabled,
  exchangeGoogleCode,
  normalizeReturnUrl,
  redirectResponse,
  requireSessionUserId,
  type SearchPropertyAuthEnv,
} from "./search-property-oauth-shared";

const PROD_API_ORIGIN = "https://api.goals.ac";
const DEFAULT_KEYWORDS_IMPORT_URL = "https://app.goals.ac/search/keywords?tab=import";

type SheetsOAuthState = {
  projectId: number;
  sourceId: number;
  userId: number;
  returnUrl: string;
};

function resolveGoogleSheetsRedirectUri(request: Request): string {
  const url = new URL(request.url);
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${url.origin}/api/auth/google-sheets/callback`;
  }
  return `${PROD_API_ORIGIN}/api/auth/google-sheets/callback`;
}

function encodeSheetsState(payload: SheetsOAuthState): string {
  return btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeSheetsState(state: string): SheetsOAuthState | null {
  try {
    const padded = state.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (padded.length % 4)) % 4;
    const json = atob(padded + "=".repeat(padLen));
    return JSON.parse(json) as SheetsOAuthState;
  } catch {
    return null;
  }
}

function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "super_admin" || role === "admin";
}

function isSiteAdmin(orgRole: string | null | undefined): boolean {
  return orgRole === "site_admin" || orgRole === "owner";
}

function redirectToKeywordsImport(returnUrl: string, status: string): Response {
  const url = new URL(returnUrl);
  url.searchParams.set("sheets", status);
  if (!url.searchParams.has("tab")) {
    url.searchParams.set("tab", "import");
  }
  return redirectResponse(url.toString());
}

async function authorizeSheetsAdmin(
  database: GoalsD1Database,
  userId: number,
  projectId: number,
): Promise<boolean> {
  const siteAdmin = await requireSiteAdminAccess(userId);
  if (!siteAdmin.ok) return false;

  const access = await requireProjectAccess(projectId, userId);
  if (!access.ok) return false;

  const [user] = await database
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (isSuperAdmin(user?.role)) return true;

  const membership = await getOrgMembership(userId);
  return Boolean(membership && isSiteAdmin(membership.orgRole));
}

export async function handleGoogleSheetsAuthStart(
  request: Request,
  env: SearchPropertyAuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  try {
    await assertGoogleIntegrationsEnabled(database);
    const userId = await requireSessionUserId(request, env);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const projectId = Number.parseInt(url.searchParams.get("projectId") ?? "", 10);
    const sourceId = Number.parseInt(url.searchParams.get("sourceId") ?? "", 10);
    if (!Number.isFinite(projectId) || !Number.isFinite(sourceId)) {
      return Response.json({ error: "projectId and sourceId are required" }, { status: 400 });
    }

    const authorized = await authorizeSheetsAdmin(database, userId, projectId);
    if (!authorized) {
      const returnUrl = normalizeReturnUrl(
        url.searchParams.get("returnUrl") ?? DEFAULT_KEYWORDS_IMPORT_URL,
        request,
      );
      return redirectToKeywordsImport(returnUrl, "forbidden");
    }

    const [source] = await database
      .select({ id: articleIdeaSourcesTable.id })
      .from(articleIdeaSourcesTable)
      .where(
        and(
          eq(articleIdeaSourcesTable.id, sourceId),
          eq(articleIdeaSourcesTable.projectId, projectId),
        ),
      )
      .limit(1);

    if (!source) {
      return Response.json({ error: "Source not found" }, { status: 404 });
    }

    const clientId = env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      return Response.json({ error: "Google OAuth is not configured" }, { status: 503 });
    }

    const returnUrl = normalizeReturnUrl(
      url.searchParams.get("returnUrl") ?? DEFAULT_KEYWORDS_IMPORT_URL,
      request,
    );
    const state = encodeSheetsState({ projectId, sourceId, userId, returnUrl });
    const redirectUri = resolveGoogleSheetsRedirectUri(request);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return redirectResponse(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Google Sheets OAuth failed" },
      { status: 503 },
    );
  }
}

export async function handleGoogleSheetsAuthCallback(
  request: Request,
  env: SearchPropertyAuthEnv,
  database: GoalsD1Database,
): Promise<Response> {
  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");

  if (oauthError || !code || !stateRaw) {
    return redirectToKeywordsImport(DEFAULT_KEYWORDS_IMPORT_URL, "error");
  }

  const decoded = decodeSheetsState(stateRaw);
  if (!decoded) {
    return new Response("Invalid OAuth state", { status: 400 });
  }

  const authorized = await authorizeSheetsAdmin(database, decoded.userId, decoded.projectId);
  if (!authorized) {
    return redirectToKeywordsImport(decoded.returnUrl, "forbidden");
  }

  const [source] = await database
    .select({ id: articleIdeaSourcesTable.id })
    .from(articleIdeaSourcesTable)
    .where(
      and(
        eq(articleIdeaSourcesTable.id, decoded.sourceId),
        eq(articleIdeaSourcesTable.projectId, decoded.projectId),
      ),
    )
    .limit(1);

  if (!source) {
    return new Response("Source not found", { status: 404 });
  }

  try {
    const redirectUri = resolveGoogleSheetsRedirectUri(request);
    const tokens = await exchangeGoogleCode(env, code, redirectUri);
    await database
      .update(articleIdeaSourcesTable)
      .set({
        encryptedConfig: encryptStoredTokens(tokens),
        syncStatus: "idle",
        syncError: null,
      })
      .where(eq(articleIdeaSourcesTable.id, decoded.sourceId));

    return redirectToKeywordsImport(decoded.returnUrl, "connected");
  } catch {
    return redirectToKeywordsImport(decoded.returnUrl, "error");
  }
}
