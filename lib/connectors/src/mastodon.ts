import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface MastodonCredentials {
  instanceUrl: string;
  accessToken: string;
  accountId: string;
  username: string;
  clientId: string;
  clientSecret: string;
}

export interface MastodonPublishResult {
  postId: string;
  postUrl: string;
}

function normalizeInstanceUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function captionFromMarkdown(bodyMarkdown: string): string {
  return bodyMarkdown
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function normalizeMastodonInstance(raw: string): string {
  const url = new URL(normalizeInstanceUrl(raw));
  if (!url.hostname.includes(".")) {
    throw new Error("Enter a valid Mastodon instance URL (e.g. mastodon.social)");
  }
  return url.origin;
}

export interface MastodonAppRegistration {
  clientId: string;
  clientSecret: string;
}

export async function registerMastodonApp(
  instanceUrl: string,
  redirectUri: string,
  clientName = "goals.ac",
): Promise<MastodonAppRegistration> {
  const origin = normalizeMastodonInstance(instanceUrl);
  const url = `${origin}/api/v1/apps`;
  await assertPublicUrl(url);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: clientName,
      redirect_uris: redirectUri,
      scopes: "read write:statuses",
      website: "https://goals.ac",
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Mastodon app registration failed: ${res.status}`);
  }

  const data = (await res.json()) as { client_id?: string; client_secret?: string };
  if (!data.client_id || !data.client_secret) {
    throw new Error("Mastodon app registration returned incomplete credentials");
  }
  return { clientId: data.client_id, clientSecret: data.client_secret };
}

export async function publishToMastodon(
  credentials: MastodonCredentials,
  bodyMarkdown: string,
): Promise<MastodonPublishResult> {
  const origin = normalizeMastodonInstance(credentials.instanceUrl);
  const url = `${origin}/api/v1/statuses`;
  await assertPublicUrl(url);

  const content = captionFromMarkdown(bodyMarkdown);
  const body: Record<string, string> = { status: content };
  if (content.length > 500) {
    body.spoiler_text = "Continued";
    body.status = content.slice(0, 490) + "…";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Mastodon API error: ${res.status}`);
  }

  const data = (await res.json()) as { id?: string; url?: string };
  if (!data.id) throw new Error("Mastodon API returned no post id");
  return {
    postId: data.id,
    postUrl: data.url ?? `${origin}/@${credentials.username}/${data.id}`,
  };
}

export async function testMastodonConnection(
  credentials: MastodonCredentials,
): Promise<{ ok: boolean; username?: string; error?: string }> {
  try {
    const origin = normalizeMastodonInstance(credentials.instanceUrl);
    const url = `${origin}/api/v1/accounts/verify_credentials`;
    await assertPublicUrl(url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { username?: string; acct?: string };
    return { ok: true, username: data.acct ?? data.username };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

export async function fetchMastodonAccount(
  instanceUrl: string,
  accessToken: string,
): Promise<{ id: string; username: string }> {
  const origin = normalizeMastodonInstance(instanceUrl);
  const url = `${origin}/api/v1/accounts/verify_credentials`;
  await assertPublicUrl(url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to verify Mastodon account");
  const data = (await res.json()) as { id?: string; username?: string };
  if (!data.id || !data.username) throw new Error("Invalid Mastodon account response");
  return { id: data.id, username: data.username };
}

export async function fetchMastodonPostMetrics(
  credentials: MastodonCredentials,
  postId: string,
): Promise<import("./social-metrics-types").NormalizedPostMetrics> {
  const origin = normalizeMastodonInstance(credentials.instanceUrl);
  const url = `${origin}/api/v1/statuses/${postId}`;
  await assertPublicUrl(url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${credentials.accessToken}` },
  });
  if (!res.ok) {
    return { impressions: null, likes: null, comments: null, shares: null, clicks: null };
  }
  const data = (await res.json()) as {
    favourites_count?: number;
    reblogs_count?: number;
    replies_count?: number;
  };
  return {
    impressions: null,
    likes: data.favourites_count ?? null,
    comments: data.replies_count ?? null,
    shares: data.reblogs_count ?? null,
    clicks: null,
  };
}
