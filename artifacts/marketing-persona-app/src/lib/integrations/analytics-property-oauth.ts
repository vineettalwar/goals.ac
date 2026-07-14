import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { analyticsPropertyConnectionsTable, websiteProjectsTable } from "@workspace/db/schema";
import type { AnalyticsPropertyProvider } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { enqueue, QUEUES } from "@workspace/jobs";
import {
  assertOAuthSessionUser,
  decodeSignedOAuthState,
  encodeSignedOAuthState,
  type SignedOAuthPayload,
} from "@/lib/integrations/oauth-state";
import {
  encryptStoredTokens,
  exchangeGoogleCode,
  ga4PropertyMatchesProject,
  googleAnalyticsRedirectUri,
  listGa4PropertiesForConnection,
  type Ga4PropertySummary,
  type StoredTokens,
} from "./analytics-property-client";
import { assertGoogleIntegrationsEnabled } from "../platform/platform-settings";

type OAuthState = SignedOAuthPayload & {
  provider: AnalyticsPropertyProvider;
};

function encodeState(payload: { projectId: number; userId: number; provider: AnalyticsPropertyProvider }): string {
  return encodeSignedOAuthState({
    projectId: payload.projectId,
    userId: payload.userId,
    platform: payload.provider,
    provider: payload.provider,
  });
}

export function decodeAnalyticsOAuthState(state: string): OAuthState | null {
  return decodeSignedOAuthState<OAuthState>(state);
}

const UNSELECTED_PROPERTY_ID = "";

function appOrigin(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3001";
}

function redirectToIntegrations(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return NextResponse.redirect(`${appOrigin()}/integrations?${qs}`);
}

function callbackStatus(properties: Ga4PropertySummary[], matched: Ga4PropertySummary | null): string {
  if (matched) return "connected";
  if (properties.length > 0) return "pick_property";
  return "no_properties";
}

async function upsertConnection(params: {
  projectId: number;
  provider: AnalyticsPropertyProvider;
  propertyId: string;
  propertyName: string | null;
  streamId: string | null;
  accountEmail: string | null;
  tokens: StoredTokens;
  propertyVerified: boolean;
}) {
  const encryptedTokens = encryptStoredTokens(params.tokens);
  const [existing] = await db
    .select({ id: analyticsPropertyConnectionsTable.id })
    .from(analyticsPropertyConnectionsTable)
    .where(
      and(
        eq(analyticsPropertyConnectionsTable.projectId, params.projectId),
        eq(analyticsPropertyConnectionsTable.provider, params.provider),
      ),
    )
    .limit(1);

  if (existing) {
    await db
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

  await db.insert(analyticsPropertyConnectionsTable).values({
    projectId: params.projectId,
    provider: params.provider,
    propertyId: params.propertyId,
    propertyName: params.propertyName,
    streamId: params.streamId,
    accountEmail: params.accountEmail,
    encryptedTokens,
    propertyVerified: params.propertyVerified,
  });
}

export async function startGoogleAnalyticsOAuth(
  projectId: number,
  userId: number,
): Promise<NextResponse> {
  await assertGoogleIntegrationsEnabled();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
  }

  const state = encodeState({ projectId, userId, provider: "google_analytics_4" });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleAnalyticsRedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function handleGoogleAnalyticsCallback(
  code: string,
  state: string,
): Promise<NextResponse> {
  const decoded = decodeAnalyticsOAuthState(state);
  if (!decoded || decoded.provider !== "google_analytics_4") {
    return new NextResponse("Invalid OAuth state", { status: 400 });
  }

  try {
    await assertOAuthSessionUser(decoded.userId);
  } catch {
    return new NextResponse("Unauthorized OAuth callback", { status: 401 });
  }

  const [project] = await db
    .select({ id: websiteProjectsTable.id, url: websiteProjectsTable.url, userId: websiteProjectsTable.userId })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, decoded.projectId))
    .limit(1);

  if (!project || project.userId !== decoded.userId) {
    return new NextResponse("Project not found", { status: 404 });
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const properties = await listGa4PropertiesForConnection(tokens.accessToken);
    const matched =
      properties.find((property) => ga4PropertyMatchesProject(project.url, property.streamUri)) ?? null;

    await upsertConnection({
      projectId: project.id,
      provider: "google_analytics_4",
      propertyId: matched?.propertyId ?? UNSELECTED_PROPERTY_ID,
      propertyName: matched?.propertyName ?? null,
      streamId: matched?.streamId ?? null,
      accountEmail: tokens.email ?? null,
      tokens,
      propertyVerified: Boolean(matched),
    });

    if (matched) {
      try {
        await enqueue(QUEUES.ga4AnalyticsSync, { projectId: project.id, userId: decoded.userId });
      } catch {
        // sync can be triggered manually from integrations
      }
    }

    return redirectToIntegrations({
      ga4: callbackStatus(properties, matched),
    });
  } catch {
    return redirectToIntegrations({ ga4: "error" });
  }
}
