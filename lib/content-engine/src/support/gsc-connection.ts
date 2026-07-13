import type { AnalyticsPropertyProvider, SearchPropertyProvider } from "@workspace/db/schema";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";

export type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
};

function appOrigin(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3001";
}

export function parseStoredTokens(encryptedTokens: string): StoredTokens {
  return JSON.parse(decryptSecret(encryptedTokens)) as StoredTokens;
}

export function encryptStoredTokens(tokens: StoredTokens): string {
  return encryptSecret(JSON.stringify(tokens));
}

async function refreshGoogleTokens(tokens: StoredTokens): Promise<StoredTokens> {
  if (!tokens.refreshToken) return tokens;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return tokens;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
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

export async function resolveAccessToken(
  provider: SearchPropertyProvider | AnalyticsPropertyProvider,
  tokens: StoredTokens,
): Promise<{ accessToken: string; tokens: StoredTokens; refreshed: boolean }> {
  const expiresSoon = tokens.expiresAt != null && tokens.expiresAt <= Date.now() + 60_000;
  if (!expiresSoon) {
    return { accessToken: tokens.accessToken, tokens, refreshed: false };
  }

  const refreshed =
    provider === "google_search_console" || provider === "google_analytics_4"
      ? await refreshGoogleTokens(tokens)
      : tokens;
  return {
    accessToken: refreshed.accessToken,
    tokens: refreshed,
    refreshed: refreshed.accessToken !== tokens.accessToken || refreshed.expiresAt !== tokens.expiresAt,
  };
}

export function googleSheetsRedirectUri(): string {
  return `${appOrigin()}/api/auth/google-sheets/callback`;
}

export async function exchangeGoogleSheetsCode(code: string): Promise<StoredTokens & { email?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleSheetsRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Google Sheets token exchange failed");
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

export function parseSpreadsheetUrl(url: string): { spreadsheetId: string; gid?: string } | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match?.[1]) return null;
    const gid = parsed.hash.match(/gid=(\d+)/)?.[1] ?? parsed.searchParams.get("gid") ?? undefined;
    return { spreadsheetId: match[1], gid: gid ?? undefined };
  } catch {
    return null;
  }
}

export async function fetchSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Sheets API failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}
