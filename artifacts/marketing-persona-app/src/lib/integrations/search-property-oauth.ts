import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { searchPropertyConnectionsTable, websiteProjectsTable } from "@workspace/db/schema";
import type { SearchPropertyProvider } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import {
  encryptStoredTokens,
  exchangeBingCode,
  exchangeGoogleCode,
  listPropertiesForProvider,
  propertyMatchesProject,
} from "./search-property-client";
import { assertBingWebmasterEnabled, assertGoogleIntegrationsEnabled } from "../platform/platform-settings";

type OAuthState = {
  projectId: number;
  userId: number;
  provider: SearchPropertyProvider;
};

type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
};

function encodeState(payload: OAuthState): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeState(state: string): OAuthState | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as OAuthState;
  } catch {
    return null;
  }
}

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

function redirectToProject(projectId: number, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return NextResponse.redirect(`${appOrigin()}/search/visibility?${qs}`);
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
): Promise<NextResponse> {
  await assertGoogleIntegrationsEnabled();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
  }

  const state = encodeState({ projectId, userId, provider: "google_search_console" });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri("google_search_console"),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function startBingWebmasterOAuth(
  projectId: number,
  userId: number,
): Promise<NextResponse> {
  await assertBingWebmasterEnabled();
  const clientId = process.env.BING_WEBMASTER_CLIENT_ID;
  if (!clientId) {
    throw new Error("Bing Webmaster OAuth is not configured (BING_WEBMASTER_CLIENT_ID)");
  }

  const state = encodeState({ projectId, userId, provider: "bing_webmaster" });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri("bing_webmaster"),
    response_type: "code",
    scope: "webmaster.read",
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

  const [project] = await db
    .select({ id: websiteProjectsTable.id, url: websiteProjectsTable.url, userId: websiteProjectsTable.userId })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, decoded.projectId))
    .limit(1);

  if (!project || project.userId !== decoded.userId) {
    return new NextResponse("Project not found", { status: 404 });
  }

  const param = provider === "google_search_console" ? "gsc" : "bing";

  try {
    if (provider === "google_search_console") {
      const tokens = await exchangeGoogleCode(code);
      const properties = await listPropertiesForProvider(provider, tokens.accessToken);
      const matched = properties.find((p) => propertyMatchesProject(project.url, p)) ?? null;
      await upsertConnection({
        projectId: project.id,
        provider,
        propertyUrl: matched,
        accountEmail: tokens.email ?? null,
        tokens,
        propertyVerified: Boolean(matched),
      });
      return redirectToProject(project.id, {
        [param]: callbackStatus(properties, matched),
      });
    }

    const tokens = await exchangeBingCode(code);
    const properties = await listPropertiesForProvider(provider, tokens.accessToken);
    const matched = properties.find((p) => propertyMatchesProject(project.url, p)) ?? null;
    await upsertConnection({
      projectId: project.id,
      provider,
      propertyUrl: matched,
      accountEmail: null,
      tokens,
      propertyVerified: Boolean(matched),
    });
    return redirectToProject(project.id, {
      [param]: callbackStatus(properties, matched),
    });
  } catch {
    return redirectToProject(project.id, { [param]: "error" });
  }
}
