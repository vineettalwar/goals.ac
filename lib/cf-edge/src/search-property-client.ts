import type { SearchPropertyProvider } from "@workspace/db/schema-sqlite";
import { decryptSecret, encryptSecret } from "@workspace/security/encryption";

export type SearchPropertyTokenEnv = {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  BING_WEBMASTER_CLIENT_ID?: string;
  BING_WEBMASTER_CLIENT_SECRET?: string;
};

export type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
};

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

export function formatPropertyLabel(propertyUrl: string): string {
  if (propertyUrl.startsWith("sc-domain:")) {
    return propertyUrl.slice("sc-domain:".length);
  }
  try {
    return new URL(propertyUrl).hostname;
  } catch {
    return propertyUrl;
  }
}

export function parseStoredTokens(encryptedTokens: string): StoredTokens {
  return JSON.parse(decryptSecret(encryptedTokens)) as StoredTokens;
}

export function encryptStoredTokens(tokens: StoredTokens): string {
  return encryptSecret(JSON.stringify(tokens));
}

async function refreshGoogleTokens(
  tokens: StoredTokens,
  env: SearchPropertyTokenEnv,
): Promise<StoredTokens> {
  if (!tokens.refreshToken) return tokens;

  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
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

async function refreshBingTokens(
  tokens: StoredTokens,
  env: SearchPropertyTokenEnv,
): Promise<StoredTokens> {
  if (!tokens.refreshToken) return tokens;

  const clientId = env.BING_WEBMASTER_CLIENT_ID?.trim();
  const clientSecret = env.BING_WEBMASTER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return tokens;

  const res = await fetch("https://www.bing.com/webmasters/token", {
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
  env: SearchPropertyTokenEnv,
): Promise<{ accessToken: string; tokens: StoredTokens; refreshed: boolean }> {
  const expiresSoon = tokens.expiresAt != null && tokens.expiresAt <= Date.now() + 60_000;
  if (!expiresSoon) {
    return { accessToken: tokens.accessToken, tokens, refreshed: false };
  }

  const refreshed =
    provider === "google_search_console"
      ? await refreshGoogleTokens(tokens, env)
      : await refreshBingTokens(tokens, env);

  return {
    accessToken: refreshed.accessToken,
    tokens: refreshed,
    refreshed:
      refreshed.accessToken !== tokens.accessToken || refreshed.expiresAt !== tokens.expiresAt,
  };
}

async function listGscProperties(accessToken: string): Promise<string[]> {
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { siteEntry?: Array<{ siteUrl?: string }> };
  return (data.siteEntry ?? []).map((site) => site.siteUrl).filter((url): url is string => Boolean(url));
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
  return (data.d ?? []).map((site) => site.Url).filter((url): url is string => Boolean(url));
}

export async function listPropertiesForProvider(
  provider: SearchPropertyProvider,
  accessToken: string,
): Promise<string[]> {
  return provider === "google_search_console"
    ? listGscProperties(accessToken)
    : listBingSites(accessToken);
}

export function rankProperties(projectUrl: string, properties: string[]) {
  const unique = [...new Set(properties)];
  return unique
    .map((propertyUrl) => ({
      propertyUrl,
      label: formatPropertyLabel(propertyUrl),
      recommended: propertyMatchesProject(projectUrl, propertyUrl),
    }))
    .sort((a, b) => {
      if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
}
