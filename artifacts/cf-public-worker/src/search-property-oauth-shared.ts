import { and, eq } from "drizzle-orm";
import type { GoalsD1Database } from "@workspace/db/d1";
import {
  platformSettingsTable,
  searchPropertyConnectionsTable,
  type SearchPropertyProvider,
} from "@workspace/db/schema-sqlite";
import { requireProjectAccess, getAccessibleProject } from "@workspace/cf-edge/project-access";
import { verifySessionClaims } from "@workspace/cf-edge/jwt";
import { encryptSecret } from "@workspace/security/encryption";

const PROD_API_ORIGIN = "https://api.goals.ac";
const DEFAULT_APP_ORIGIN = "https://app.goals.ac";

export function defaultProjectIntegrationsUrl(projectId?: number | null): string {
  if (projectId != null && Number.isFinite(projectId)) {
    return `${DEFAULT_APP_ORIGIN}/projects/${projectId}/integrations`;
  }
  return `${DEFAULT_APP_ORIGIN}/projects`;
}

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export type SearchPropertyAuthEnv = {
  AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  BING_WEBMASTER_CLIENT_ID?: string;
  BING_WEBMASTER_CLIENT_SECRET?: string;
};

export type SearchOAuthStatePayload = {
  projectId: number;
  userId: number;
  provider: SearchPropertyProvider;
  returnUrl: string;
  exp: number;
  nonce: string;
};

export type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + "=".repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export function requireAuthSecret(env: SearchPropertyAuthEnv): string | null {
  const secret = env.AUTH_SECRET?.trim();
  return secret || null;
}

export function resolveCallbackPath(provider: SearchPropertyProvider): string {
  return provider === "google_search_console"
    ? "/api/auth/google-search-console/callback"
    : "/api/auth/bing-webmaster/callback";
}

export function resolveSearchPropertyRedirectUri(
  request: Request,
  provider: SearchPropertyProvider,
): string {
  const path = resolveCallbackPath(provider);
  const url = new URL(request.url);
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${url.origin}${path}`;
  }
  return `${PROD_API_ORIGIN}${path}`;
}

function isAllowedAppOrigin(origin: string, request: Request): boolean {
  if (origin === "https://app.goals.ac") return true;
  if (origin.endsWith(".goals-ac-app.pages.dev")) return true;

  const reqHost = new URL(request.url).hostname;
  if (reqHost === "localhost" || reqHost === "127.0.0.1") {
    try {
      const parsed = new URL(origin);
      return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  }
  return false;
}

export function normalizeReturnUrl(
  raw: string | null,
  request: Request,
  projectId?: number | null,
): string {
  if (!raw?.trim()) return defaultProjectIntegrationsUrl(projectId);
  try {
    const parsed = new URL(raw);
    if (isAllowedAppOrigin(parsed.origin, request)) {
      return parsed.toString();
    }
  } catch {
    // Invalid return URL — fall back to default.
  }
  return defaultProjectIntegrationsUrl(projectId);
}

export async function signSearchOAuthState(
  payload: Omit<SearchOAuthStatePayload, "exp" | "nonce">,
  secret: string,
): Promise<string> {
  const full: SearchOAuthStatePayload = {
    ...payload,
    exp: Date.now() + OAUTH_STATE_TTL_MS,
    nonce: crypto.randomUUID(),
  };
  const data = JSON.stringify(full);
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${toBase64Url(new TextEncoder().encode(data))}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySearchOAuthState(
  state: string,
  secret: string,
): Promise<SearchOAuthStatePayload | null> {
  const [dataPart, sigPart] = state.split(".");
  if (!dataPart || !sigPart) return null;

  const data = new TextDecoder().decode(fromBase64Url(dataPart));
  const key = await hmacKey(secret);
  const sigBytes = Uint8Array.from(fromBase64Url(sigPart));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(data),
  );
  if (!valid) return null;

  try {
    const parsed = JSON.parse(data) as SearchOAuthStatePayload;
    if (
      typeof parsed.projectId !== "number" ||
      typeof parsed.userId !== "number" ||
      typeof parsed.provider !== "string" ||
      typeof parsed.returnUrl !== "string" ||
      typeof parsed.exp !== "number" ||
      typeof parsed.nonce !== "string"
    ) {
      return null;
    }
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function redirectResponse(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location } });
}

export async function requireSessionUserId(
  request: Request,
  env: SearchPropertyAuthEnv,
): Promise<number | null> {
  const secret = requireAuthSecret(env);
  if (!secret) return null;
  const session = await verifySessionClaims(request, secret);
  if (!session?.id) return null;
  const userId = Number.parseInt(session.id, 10);
  return Number.isFinite(userId) ? userId : null;
}

export async function assertGoogleIntegrationsEnabled(
  database: GoalsD1Database,
): Promise<void> {
  try {
    const [row] = await database
      .select({ enabled: platformSettingsTable.googleIntegrationsEnabled })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.id, 1));
    if (row && !row.enabled) {
      throw new Error("Google integrations are disabled on this platform.");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("disabled")) throw err;
    // Unmigrated platform_settings — default to enabled.
  }
}

export async function assertBingWebmasterEnabled(database: GoalsD1Database): Promise<void> {
  try {
    const [row] = await database
      .select({ enabled: platformSettingsTable.bingWebmasterEnabled })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.id, 1));
    if (row && !row.enabled) {
      throw new Error("Bing Webmaster integration is disabled on this platform.");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("disabled")) throw err;
    // Unmigrated platform_settings — default to enabled.
  }
}

function normalizeHttpUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function normalizeHost(url: string): string {
  try {
    return new URL(normalizeHttpUrl(url)).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      ?.toLowerCase() ?? url;
  }
}

export function propertyMatchesProject(projectUrl: string, propertyUrl: string): boolean {
  const projectHost = normalizeHost(projectUrl);
  if (propertyUrl.startsWith("sc-domain:")) {
    return (
      projectHost ===
      propertyUrl
        .slice("sc-domain:".length)
        .replace(/^www\./i, "")
        .toLowerCase()
    );
  }
  try {
    return normalizeHost(propertyUrl) === projectHost;
  } catch {
    return false;
  }
}

async function listGscProperties(accessToken: string): Promise<string[]> {
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { siteEntry?: Array<{ siteUrl?: string }> };
  return (data.siteEntry ?? []).map((s) => s.siteUrl).filter((u): u is string => Boolean(u));
}

async function listBingSites(accessToken: string): Promise<string[]> {
  const res = await fetch("https://ssl.bing.com/webmaster/api.svc/json/GetUserSites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { d?: Array<{ Url?: string }> };
  return (data.d ?? []).map((s) => s.Url).filter((u): u is string => Boolean(u));
}

export async function listPropertiesForProvider(
  provider: SearchPropertyProvider,
  accessToken: string,
): Promise<string[]> {
  return provider === "google_search_console"
    ? listGscProperties(accessToken)
    : listBingSites(accessToken);
}

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

export function redirectToIntegrations(
  returnUrl: string,
  provider: SearchPropertyProvider,
  status: string,
): Response {
  const param = provider === "google_search_console" ? "gsc" : "bing";
  const url = new URL(returnUrl);
  url.searchParams.set(param, status);
  if (!url.searchParams.has("tab")) {
    url.searchParams.set("tab", "search");
  }
  return redirectResponse(url.toString());
}

export async function exchangeGoogleCode(
  env: SearchPropertyAuthEnv,
  code: string,
  redirectUri: string,
): Promise<StoredTokens & { email?: string }> {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Google token exchange failed");

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  let email: string | undefined;
  try {
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as { email?: string };
      email = profile.email;
    }
  } catch {
    // optional
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    tokenType: data.token_type,
    email,
  };
}

export async function exchangeBingCode(
  env: SearchPropertyAuthEnv,
  code: string,
  redirectUri: string,
): Promise<StoredTokens> {
  const clientId = env.BING_WEBMASTER_CLIENT_ID?.trim();
  const clientSecret = env.BING_WEBMASTER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Bing Webmaster OAuth is not configured");
  }

  const res = await fetch("https://www.bing.com/webmasters/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Bing token exchange failed");

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    tokenType: data.token_type,
  };
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
  const state = stateParam ? await verifySearchOAuthState(stateParam, secret) : null;
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
      const matched = properties.find((p) => propertyMatchesProject(project.url, p)) ?? null;
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
    const matched = properties.find((p) => propertyMatchesProject(project.url, p)) ?? null;
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

  const returnUrl = normalizeReturnUrl(url.searchParams.get("returnUrl"), request);
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
  const clientId = env.BING_WEBMASTER_CLIENT_ID?.trim();
  if (!clientId) {
    return Response.json(
      { error: "Bing Webmaster OAuth is not configured (BING_WEBMASTER_CLIENT_ID)" },
      { status: 503 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "webmaster.read",
    state,
  });

  return redirectResponse(`https://www.bing.com/webmasters/oauth/authorize?${params}`);
}
