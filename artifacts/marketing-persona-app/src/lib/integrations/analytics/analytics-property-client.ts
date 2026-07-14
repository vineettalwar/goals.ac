import { decryptSecret, encryptSecret } from "@workspace/security/encryption";
import { normalizeHttpUrl } from "../../utils/normalize-url";

export type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
};

export type Ga4PropertySummary = {
  propertyId: string;
  propertyName: string;
  streamId: string | null;
  streamUri: string | null;
};

function appOrigin(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3001";
}

export function googleAnalyticsRedirectUri(): string {
  return `${appOrigin()}/api/auth/google-analytics/callback`;
}

export function parseStoredTokens(encryptedTokens: string): StoredTokens {
  return JSON.parse(decryptSecret(encryptedTokens)) as StoredTokens;
}

export function encryptStoredTokens(tokens: StoredTokens): string {
  return encryptSecret(JSON.stringify(tokens));
}

export function normalizeHost(url: string): string {
  try {
    return new URL(normalizeHttpUrl(url)).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]?.toLowerCase() ?? url;
  }
}

export function ga4PropertyMatchesProject(projectUrl: string, streamUri: string | null): boolean {
  if (!streamUri) return false;
  return normalizeHost(projectUrl) === normalizeHost(streamUri);
}

export function formatGa4PropertyLabel(property: Ga4PropertySummary): string {
  if (property.streamUri) {
    try {
      return new URL(property.streamUri).hostname;
    } catch {
      return property.streamUri;
    }
  }
  return property.propertyName || property.propertyId.replace(/^properties\//, "");
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
  tokens: StoredTokens,
): Promise<{ accessToken: string; tokens: StoredTokens; refreshed: boolean }> {
  const expiresSoon = tokens.expiresAt != null && tokens.expiresAt <= Date.now() + 60_000;
  if (!expiresSoon) {
    return { accessToken: tokens.accessToken, tokens, refreshed: false };
  }

  const refreshed = await refreshGoogleTokens(tokens);
  return {
    accessToken: refreshed.accessToken,
    tokens: refreshed,
    refreshed: refreshed.accessToken !== tokens.accessToken || refreshed.expiresAt !== tokens.expiresAt,
  };
}

type AccountSummary = {
  propertySummaries?: Array<{
    property?: string;
    displayName?: string;
  }>;
};

async function listAccountSummaries(accessToken: string): Promise<AccountSummary[]> {
  const summaries: AccountSummary[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return summaries;

    const data = (await res.json()) as {
      accountSummaries?: AccountSummary[];
      nextPageToken?: string;
    };
    summaries.push(...(data.accountSummaries ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return summaries;
}

type DataStream = {
  name?: string;
  type?: string;
  webStreamData?: { defaultUri?: string };
};

async function listWebDataStream(
  accessToken: string,
  propertyId: string,
): Promise<{ streamId: string | null; streamUri: string | null }> {
  let pageToken: string | undefined;
  let fallback: { streamId: string | null; streamUri: string | null } = {
    streamId: null,
    streamUri: null,
  };

  do {
    const url = new URL(
      `https://analyticsadmin.googleapis.com/v1beta/${propertyId}/dataStreams`,
    );
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return fallback;

    const data = (await res.json()) as {
      dataStreams?: DataStream[];
      nextPageToken?: string;
    };

    for (const stream of data.dataStreams ?? []) {
      const streamId = stream.name ?? null;
      const streamUri = stream.webStreamData?.defaultUri ?? null;
      if (stream.type === "WEB_DATA_STREAM" && streamUri) {
        return { streamId, streamUri };
      }
      if (!fallback.streamId && streamId) {
        fallback = { streamId, streamUri };
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return fallback;
}

export async function listGa4PropertiesForConnection(
  accessToken: string,
): Promise<Ga4PropertySummary[]> {
  const accountSummaries = await listAccountSummaries(accessToken);
  const properties: Ga4PropertySummary[] = [];

  for (const account of accountSummaries) {
    for (const summary of account.propertySummaries ?? []) {
      if (!summary.property) continue;
      const { streamId, streamUri } = await listWebDataStream(accessToken, summary.property);
      properties.push({
        propertyId: summary.property,
        propertyName: summary.displayName ?? summary.property,
        streamId,
        streamUri,
      });
    }
  }

  return properties;
}

export function rankProperties(projectUrl: string, properties: Ga4PropertySummary[]) {
  const unique = new Map<string, Ga4PropertySummary>();
  for (const property of properties) {
    unique.set(property.propertyId, property);
  }

  return [...unique.values()]
    .map((property) => ({
      propertyId: property.propertyId,
      propertyName: property.propertyName,
      streamId: property.streamId,
      streamUri: property.streamUri,
      label: formatGa4PropertyLabel(property),
      recommended: ga4PropertyMatchesProject(projectUrl, property.streamUri),
    }))
    .sort((a, b) => {
      if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
}

export async function exchangeGoogleCode(code: string): Promise<StoredTokens & { email?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleAnalyticsRedirectUri(),
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
