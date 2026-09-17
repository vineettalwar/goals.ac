import { resolveGoogleOAuthCredentials } from "@workspace/platform-admin";
import { eq } from "drizzle-orm";
import type { GoalsD1Database } from "@workspace/db/d1";
import { platformSettingsTable } from "@workspace/db/schema-sqlite";
import type { SearchPropertyAuthEnv, StoredTokens } from "./types";

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

export async function exchangeGoogleCode(
  env: SearchPropertyAuthEnv,
  code: string,
  redirectUri: string,
): Promise<StoredTokens & { email?: string }> {
  const google = await resolveGoogleOAuthCredentials(env);
  if (!google) {
    throw new Error("Google OAuth is not configured");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: google.clientId,
      client_secret: google.clientSecret,
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
