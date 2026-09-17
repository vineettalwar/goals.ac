import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { searchPropertyConnectionsTable } from "@workspace/db/schema";
import type { SearchPropertyProvider } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { getAccessibleProject } from "@/lib/org/org-access";
import {
  assertOAuthSessionUser,
  decodeSignedOAuthState,
  encodeSignedOAuthState,
  type SignedOAuthPayload,
} from "@/lib/integrations/oauth/oauth-state";
import {
  encryptStoredTokens,
  exchangeBingCode,
  exchangeGoogleCode,
  listPropertiesForProvider,
  pickSearchProperty,
} from "../search/search-property-client";
import { assertBingWebmasterEnabled, assertGoogleIntegrationsEnabled } from "../../platform/platform-settings";
import { resolveBingWebmasterOAuthCredentials } from "../../platform/bing-webmaster-credentials";
import { resolveGoogleOAuthCredentials } from "../../platform/google-oauth-credentials";
import { resolveSameOriginReturnUrl } from "@workspace/cf-edge/oauth-return-url";

type OAuthState = SignedOAuthPayload & {
  provider: SearchPropertyProvider;
  returnUrl?: string;
};

function encodeState(payload: {
  projectId: number;
  userId: number;
  provider: SearchPropertyProvider;
  returnUrl?: string;
}): string {
  return encodeSignedOAuthState({
    projectId: payload.projectId,
    userId: payload.userId,
    platform: payload.provider,
    provider: payload.provider,
    returnUrl: payload.returnUrl,
  });
}

export function decodeState(state: string): OAuthState | null {
  const decoded = decodeSignedOAuthState<OAuthState>(state);
  if (!decoded) return null;
  return decoded;
}

type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
};

function appOrigin(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3001";
}

function redirectUri(provider: SearchPropertyProvider): string {
  const path =
    provider === "google_search_console"
      ? "/api/auth/google-search-console/callback"
      : "/api/auth/bing-webmaster/callback";
  return `${appOrigin()}${path}`;
}

export function resolveSearchOAuthReturnUrl(projectId: number, raw: string | null | undefined): string {
  return resolveSameOriginReturnUrl(appOrigin(), projectId, raw);
}

function redirectToProject(projectId: number, params: Record<string, string>, returnUrl?: string) {
  const target = new URL(resolveSearchOAuthReturnUrl(projectId, returnUrl));
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value);
  }
  return NextResponse.redirect(target.toString());
}

async function upsertConnection(params: {
  projectId: number;
  provider: SearchPropertyProvider;
  propertyUrl: string | null;
  accountEmail: string | null;
  tokens: StoredTokens;
  propertyVerified: boolean;
}) {
  const encryptedTokens = encryptStoredTokens(params.tokens);
  const [existing] = await db
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
    await db
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

  await db.insert(searchPropertyConnectionsTable).values({
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

export async function startGoogleSearchConsoleOAuth(
  projectId: number,
  userId: number,
  returnUrl?: string,
): Promise<NextResponse> {
  await assertGoogleIntegrationsEnabled();
  const google = await resolveGoogleOAuthCredentials();
  if (!google) {
    throw new Error("Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
  }

  const state = encodeState({
    projectId,
    userId,
    provider: "google_search_console",
    returnUrl: resolveSearchOAuthReturnUrl(projectId, returnUrl),
  });
  const params = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: redirectUri("google_search_console"),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    access_type: "offline",
    prompt: "select_account consent",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function startBingWebmasterOAuth(
  projectId: number,
  userId: number,
  returnUrl?: string,
): Promise<NextResponse> {
  await assertBingWebmasterEnabled();
  const bing = await resolveBingWebmasterOAuthCredentials();
  if (!bing) {
    throw new Error("Bing Webmaster OAuth is not configured (BING_WEBMASTER_CLIENT_ID)");
  }

  const state = encodeState({
    projectId,
    userId,
    provider: "bing_webmaster",
    returnUrl: resolveSearchOAuthReturnUrl(projectId, returnUrl),
  });
  const params = new URLSearchParams({
    client_id: bing.clientId,
    redirect_uri: redirectUri("bing_webmaster"),
    response_type: "code",
    // Microsoft's authorize example uses webmaster.manage.
    scope: "webmaster.manage",
    state,
  });

  return NextResponse.redirect(`https://www.bing.com/webmasters/oauth/authorize?${params}`);
}

export async function handleSearchPropertyCallback(
  provider: SearchPropertyProvider,
  code: string,
  state: string,
): Promise<NextResponse> {
  const decoded = decodeState(state);
  if (!decoded || decoded.provider !== provider) {
    return new NextResponse("Invalid OAuth state", { status: 400 });
  }

  try {
    await assertOAuthSessionUser(decoded.userId);
  } catch {
    return new NextResponse("Unauthorized OAuth callback", { status: 401 });
  }

  const project = await getAccessibleProject(decoded.projectId, decoded.userId);
  if (!project) {
    return new NextResponse("Project not found", { status: 404 });
  }

  const param = provider === "google_search_console" ? "gsc" : "bing";

  try {
    if (provider === "google_search_console") {
      const tokens = await exchangeGoogleCode(code);
      const properties = await listPropertiesForProvider(provider, tokens.accessToken);
      const matched = pickSearchProperty(project.url, properties);
      await upsertConnection({
        projectId: project.id,
        provider,
        propertyUrl: matched,
        accountEmail: tokens.email ?? null,
        tokens,
        propertyVerified: Boolean(matched),
      });
      return redirectToProject(
        project.id,
        {
          [param]: callbackStatus(properties, matched),
        },
        decoded.returnUrl,
      );
    }

    const tokens = await exchangeBingCode(code);
    // Persist tokens even when GetUserSites fails — otherwise Connect looks
    // "broken" (back to Not connected with no row saved).
    let properties: string[] = [];
    let listFailed = false;
    try {
      properties = await listPropertiesForProvider(provider, tokens.accessToken);
    } catch {
      listFailed = true;
    }
    const matched = pickSearchProperty(project.url, properties);
    await upsertConnection({
      projectId: project.id,
      provider,
      propertyUrl: matched,
      accountEmail: null,
      tokens,
      propertyVerified: Boolean(matched),
    });
    const status = matched
      ? "connected"
      : listFailed || properties.length > 0
        ? "pick_property"
        : "no_properties";
    return redirectToProject(project.id, { [param]: status }, decoded.returnUrl);
  } catch {
    return redirectToProject(project.id, { [param]: "error" }, decoded.returnUrl);
  }
}
