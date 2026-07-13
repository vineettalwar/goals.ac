import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import type { NormalizedPostMetrics } from "./social-metrics-types";
import { EMPTY_POST_METRICS } from "./social-metrics-types";

export interface MetaCredentials {
  accessToken: string;
  pageId: string;
  instagramAccountId?: string;
}

export interface MetaPublishResult {
  postId: string;
  postUrl: string;
}

const GRAPH_API = "https://graph.facebook.com/v21.0";

function captionFromMarkdown(bodyMarkdown: string): string {
  return bodyMarkdown
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export async function publishToFacebookPage(
  credentials: MetaCredentials,
  bodyMarkdown: string,
): Promise<MetaPublishResult> {
  const url = `${GRAPH_API}/${credentials.pageId}/feed`;
  await assertPublicUrl(url);

  const message = captionFromMarkdown(bodyMarkdown).slice(0, 63206);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      access_token: credentials.accessToken,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Facebook API error: ${res.status}`);
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Facebook API returned no post id");
  return { postId: data.id, postUrl: `https://www.facebook.com/${data.id}` };
}

function extractFirstImageUrl(bodyMarkdown: string): string | undefined {
  const match = bodyMarkdown.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/);
  return match?.[1];
}

export async function publishToInstagram(
  credentials: MetaCredentials,
  bodyMarkdown: string,
  options?: { imageUrl?: string },
): Promise<MetaPublishResult> {
  if (!credentials.instagramAccountId) {
    throw new Error("No Instagram Business account linked to this Facebook Page.");
  }

  const caption = captionFromMarkdown(bodyMarkdown).slice(0, 2200);
  const imageUrl = options?.imageUrl ?? extractFirstImageUrl(bodyMarkdown);
  if (!imageUrl) {
    throw new Error(
      "Instagram requires an image. Add a featured image URL in content metadata or include an image in markdown.",
    );
  }

  await assertPublicUrl(imageUrl);
  const createUrl = `${GRAPH_API}/${credentials.instagramAccountId}/media`;
  await assertPublicUrl(createUrl);

  const containerRes = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      caption,
      access_token: credentials.accessToken,
      image_url: imageUrl,
    }),
  });

  if (!containerRes.ok) {
    const err = (await containerRes.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Instagram API error: ${containerRes.status}`);
  }

  const container = (await containerRes.json()) as { id?: string };
  if (!container.id) throw new Error("Instagram API returned no container id");

  const publishUrl = `${GRAPH_API}/${credentials.instagramAccountId}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: credentials.accessToken,
    }),
  });

  if (!publishRes.ok) {
    const err = (await publishRes.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Instagram publish error: ${publishRes.status}`);
  }

  const published = (await publishRes.json()) as { id?: string };
  if (!published.id) throw new Error("Instagram API returned no media id");
  return {
    postId: published.id,
    postUrl: `https://www.instagram.com/p/${published.id}`,
  };
}

export async function testMetaConnection(
  credentials: MetaCredentials,
): Promise<{ ok: boolean; pageName?: string; instagramUsername?: string; error?: string }> {
  try {
    const pageUrl = `${GRAPH_API}/${credentials.pageId}?fields=name,instagram_business_account{id,username}&access_token=${encodeURIComponent(credentials.accessToken)}`;
    await assertPublicUrl(pageUrl);
    const res = await fetch(pageUrl);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as {
      name?: string;
      instagram_business_account?: { username?: string };
    };
    return {
      ok: true,
      pageName: data.name,
      instagramUsername: data.instagram_business_account?.username,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

export interface MetaPageInfo {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramAccountId?: string;
  instagramUsername?: string;
}

/** Exchange a short-lived user token for a long-lived token (~60 days). */
export async function exchangeMetaLongLivedToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const url = `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`;
  await assertPublicUrl(url);
  const res = await fetch(url);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Failed to exchange Meta token");
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Meta token exchange returned no access token");
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function fetchMetaPages(userAccessToken: string): Promise<MetaPageInfo[]> {
  const url = `${GRAPH_API}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(userAccessToken)}`;
  await assertPublicUrl(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch Facebook Pages");
  const data = (await res.json()) as {
    data?: Array<{
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string; username?: string };
    }>;
  };
  return (data.data ?? []).map((p) => ({
    pageId: p.id,
    pageName: p.name,
    pageAccessToken: p.access_token,
    instagramAccountId: p.instagram_business_account?.id,
    instagramUsername: p.instagram_business_account?.username,
  }));
}

async function fetchMetaInsights(
  postId: string,
  accessToken: string,
  metrics: string[],
): Promise<Record<string, number>> {
  const url = `${GRAPH_API}/${postId}/insights?metric=${metrics.join(",")}&access_token=${encodeURIComponent(accessToken)}`;
  await assertPublicUrl(url);
  const res = await fetch(url);
  if (!res.ok) return {};
  const data = (await res.json()) as {
    data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
  };
  const out: Record<string, number> = {};
  for (const row of data.data ?? []) {
    if (row.name && row.values?.[0]?.value != null) {
      out[row.name] = row.values[0].value;
    }
  }
  return out;
}

export async function fetchFacebookPostMetrics(
  credentials: MetaCredentials,
  postId: string,
): Promise<NormalizedPostMetrics> {
  const insights = await fetchMetaInsights(postId, credentials.accessToken, [
    "post_impressions",
    "post_engaged_users",
    "post_clicks",
  ]);
  const reactionsUrl = `${GRAPH_API}/${postId}?fields=reactions.summary(true),comments.summary(true),shares&access_token=${encodeURIComponent(credentials.accessToken)}`;
  await assertPublicUrl(reactionsUrl);
  const res = await fetch(reactionsUrl);
  if (!res.ok) {
    return {
      impressions: insights.post_impressions ?? null,
      likes: null,
      comments: null,
      shares: null,
      clicks: insights.post_clicks ?? null,
    };
  }
  const data = (await res.json()) as {
    reactions?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
    shares?: { count?: number };
  };
  return {
    impressions: insights.post_impressions ?? null,
    likes: data.reactions?.summary?.total_count ?? null,
    comments: data.comments?.summary?.total_count ?? null,
    shares: data.shares?.count ?? null,
    clicks: insights.post_clicks ?? null,
  };
}

export async function fetchInstagramPostMetrics(
  credentials: MetaCredentials,
  mediaId: string,
): Promise<NormalizedPostMetrics> {
  const insights = await fetchMetaInsights(mediaId, credentials.accessToken, [
    "impressions",
    "reach",
    "likes",
    "comments",
    "shares",
    "saved",
  ]);
  return {
    impressions: insights.impressions ?? insights.reach ?? null,
    likes: insights.likes ?? null,
    comments: insights.comments ?? null,
    shares: insights.shares ?? null,
    clicks: null,
  };
}
