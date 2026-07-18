import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export { splitTwitterThread, isTwitterThreadOverLimit, maxTwitterThreadTweetLength } from "./twitter-thread";

export interface TwitterCredentials {
  accessToken: string;
}

export interface TwitterPublishResult {
  tweetIds: string[];
  postUrls: string[];
}

const X_API = "https://api.x.com";

export async function publishThreadToTwitter(
  credentials: TwitterCredentials,
  tweets: string[],
): Promise<TwitterPublishResult> {
  await assertPublicUrl(X_API);

  const tweetIds: string[] = [];
  const postUrls: string[] = [];
  let previousTweetId: string | undefined;

  for (const tweetText of tweets) {
    const body: Record<string, unknown> = { text: tweetText.slice(0, 280) };
    if (previousTweetId) {
      body.reply = { in_reply_to_tweet_id: previousTweetId };
    }

    const response = await fetch(`${X_API}/2/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("X token expired. Reconnect in Project Settings → Publishing.");
      }
      const errText = await response.text().catch(() => "");
      throw new Error(`X API error: ${response.status}${errText ? ` — ${errText.slice(0, 200)}` : ""}`);
    }

    const data = (await response.json()) as { data?: { id: string } };
    const id = data.data?.id;
    if (!id) throw new Error("X API returned no tweet id");
    previousTweetId = id;
    tweetIds.push(id);
    postUrls.push(`https://x.com/i/web/status/${id}`);
  }

  return { tweetIds, postUrls };
}

export async function testTwitterConnection(
  credentials: TwitterCredentials,
): Promise<{ ok: boolean; screenName?: string; error?: string }> {
  try {
    await assertPublicUrl(X_API);
    const res = await fetch(`${X_API}/2/users/me?user.fields=username`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    if (!res.ok) {
      return { ok: false, error: res.status === 401 ? "Token expired or invalid" : `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { data?: { username?: string; id?: string } };
    return { ok: true, screenName: data.data?.username };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

export async function fetchTwitterPostMetrics(
  credentials: TwitterCredentials,
  tweetId: string,
): Promise<import("./social-metrics-types").NormalizedPostMetrics> {
  await assertPublicUrl(X_API);
  const res = await fetch(
    `${X_API}/2/tweets/${encodeURIComponent(tweetId)}?tweet.fields=public_metrics`,
    { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
  );
  if (!res.ok) {
    return { impressions: null, likes: null, comments: null, shares: null, clicks: null };
  }
  const data = (await res.json()) as {
    data?: {
      public_metrics?: {
        impression_count?: number;
        like_count?: number;
        reply_count?: number;
        retweet_count?: number;
        quote_count?: number;
      };
    };
  };
  const m = data.data?.public_metrics;
  return {
    impressions: m?.impression_count ?? null,
    likes: m?.like_count ?? null,
    comments: m?.reply_count ?? null,
    shares: (m?.retweet_count ?? 0) + (m?.quote_count ?? 0) || null,
    clicks: null,
  };
}
