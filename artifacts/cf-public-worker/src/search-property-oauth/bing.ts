import { eq } from "drizzle-orm";
import type { GoalsD1Database } from "@workspace/db/d1";
import { platformSettingsTable } from "@workspace/db/schema-sqlite";
import { resolveBingWebmasterOAuthCredentials } from "@workspace/platform-admin";
import { BING_OAUTH_TOKEN_URL } from "@workspace/cf-edge/search-property-client";
import type { SearchPropertyAuthEnv, StoredTokens } from "./types";

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

export async function exchangeBingCode(
  env: SearchPropertyAuthEnv,
  code: string,
  redirectUri: string,
): Promise<StoredTokens> {
  const bing = await resolveBingWebmasterOAuthCredentials(env);
  if (!bing) {
    throw new Error("Bing Webmaster OAuth is not configured");
  }

  const res = await fetch(BING_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: bing.clientId,
      client_secret: bing.clientSecret,
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
