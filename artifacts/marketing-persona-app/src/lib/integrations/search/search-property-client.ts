import type { SearchPropertyProvider } from "@workspace/db/schema";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import { resolveBingWebmasterOAuthCredentials } from "../../platform/bing-webmaster-credentials";
import { resolveGoogleOAuthCredentials } from "../../platform/google-oauth-credentials";

export {
  formatPropertyLabel,
  listPropertiesForProvider,
  normalizeHost,
  pickSearchProperty,
  propertyMatchesProject,
  rankProperties,
} from "@workspace/cf-edge/search-property-client";

export type StoredTokens = {
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

export function parseStoredTokens(encryptedTokens: string): StoredTokens {
  return JSON.parse(decryptSecret(encryptedTokens)) as StoredTokens;
}

export function encryptStoredTokens(tokens: StoredTokens): string {
  return encryptSecret(JSON.stringify(tokens));
}

async function refreshGoogleTokens(tokens: StoredTokens): Promise<StoredTokens> {
  if (!tokens.refreshToken) return tokens;

  const google = await resolveGoogleOAuthCredentials();
  if (!google) return tokens;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: google.clientId,
      client_secret: google.clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return tokens;

  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
    token_type?: string;
  };

  return {
    ...tokens,
    accessToken: data.access_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : tokens.expiresAt,
    tokenType: data.token_type ?? tokens.tokenType,
  };
}

async function refreshBingTokens(tokens: StoredTokens): Promise<StoredTokens> {
  if (!tokens.refreshToken) return tokens;

  const bing = await resolveBingWebmasterOAuthCredentials();
  if (!bing) return tokens;

  const res = await fetch("https://www.bing.com/webmasters/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: bing.clientId,
      client_secret: bing.clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return tokens;

  const data = (await res.json()) as {
    access_token: string;
    expires_in?: number;
    token_type?: string;
    refresh_token?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tokens.refreshToken,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : tokens.expiresAt,
    tokenType: data.token_type ?? tokens.tokenType,
  };
}

export async function resolveAccessToken(
  provider: SearchPropertyProvider,
  tokens: StoredTokens,
): Promise<{ accessToken: string; tokens: StoredTokens; refreshed: boolean }> {
  const expiresSoon = tokens.expiresAt != null && tokens.expiresAt <= Date.now() + 60_000;
  if (!expiresSoon) {
    return { accessToken: tokens.accessToken, tokens, refreshed: false };
  }

  const refreshed =
    provider === "google_search_console" ? await refreshGoogleTokens(tokens) : await refreshBingTokens(tokens);
  return {
    accessToken: refreshed.accessToken,
    tokens: refreshed,
    refreshed: refreshed.accessToken !== tokens.accessToken || refreshed.expiresAt !== tokens.expiresAt,
  };
}
export async function exchangeGoogleCode(code: string): Promise<StoredTokens & { email?: string }> {
  const google = await resolveGoogleOAuthCredentials();
  if (!google) {
    throw new Error("Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: google.clientId,
      client_secret: google.clientSecret,
      redirect_uri: redirectUri("google_search_console"),
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

export async function exchangeBingCode(code: string): Promise<StoredTokens> {
  const bing = await resolveBingWebmasterOAuthCredentials();
  if (!bing) throw new Error("Bing Webmaster OAuth is not configured");
  const res = await fetch("https://www.bing.com/webmasters/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: bing.clientId,
      client_secret: bing.clientSecret,
      redirect_uri: redirectUri("bing_webmaster"),
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
