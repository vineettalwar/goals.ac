import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { articleIdeaSourcesTable, usersTable, websiteProjectsTable } from "@workspace/db/schema";
import {
  encryptStoredTokens,
  exchangeGoogleSheetsCode,
  googleSheetsRedirectUri,
} from "@workspace/content-engine/support/gsc-connection";
import {
  getOrgMembership,
  isSiteAdmin,
  isSuperAdmin,
  requireProjectAccess,
} from "@/lib/org-access";

type OAuthState = {
  projectId: number;
  sourceId: number;
  userId: number;
};

function encodeState(payload: OAuthState): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeSheetsState(state: string): OAuthState | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as OAuthState;
  } catch {
    return null;
  }
}

function appOrigin(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3001";
}

export function startGoogleSheetsOAuth(
  projectId: number,
  sourceId: number,
  userId: number,
): NextResponse {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
  }

  const state = encodeState({ projectId, sourceId, userId });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleSheetsRedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function handleGoogleSheetsCallback(
  code: string,
  state: string,
): Promise<NextResponse> {
  const decoded = decodeSheetsState(state);
  if (!decoded) {
    return new NextResponse("Invalid OAuth state", { status: 400 });
  }

  const [project] = await db
    .select({ id: websiteProjectsTable.id })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, decoded.projectId))
    .limit(1);

  if (!project) {
    return new NextResponse("Project not found", { status: 404 });
  }

  const [source] = await db
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
    return new NextResponse("Source not found", { status: 404 });
  }

  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, decoded.userId))
    .limit(1);

  const membership = await getOrgMembership(decoded.userId);
  const authorized =
    isSuperAdmin(user?.role) ||
    (isSiteAdmin(membership?.orgRole) &&
      (await requireProjectAccess(decoded.projectId, decoded.userId)).ok);

  if (!authorized) {
    return NextResponse.redirect(`${appOrigin()}/search/keywords?sheets=forbidden&tab=import`);
  }

  try {
    const tokens = await exchangeGoogleSheetsCode(code);
    await db
      .update(articleIdeaSourcesTable)
      .set({
        encryptedConfig: encryptStoredTokens(tokens),
        syncStatus: "idle",
        syncError: null,
      })
      .where(eq(articleIdeaSourcesTable.id, decoded.sourceId));

    return NextResponse.redirect(
      `${appOrigin()}/search/keywords?sheets=connected&tab=import`,
    );
  } catch {
    return NextResponse.redirect(`${appOrigin()}/search/keywords?sheets=error&tab=import`);
  }
}
