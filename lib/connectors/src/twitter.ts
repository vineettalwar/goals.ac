import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface TwitterCredentials {
  accessToken: string;
}

export interface TwitterPublishResult {
  tweetIds: string[];
  postUrls: string[];
}

const X_API = "https://api.x.com";

export function splitTwitterThread(bodyMarkdown: string): string[] {
  const numbered = bodyMarkdown.match(/^\d+\/\s*.+$/gm);
  if (numbered && numbered.length > 0) {
    return numbered.map((line) => line.replace(/^\d+\/\s*/, "").trim().slice(0, 280));
  }

  const paragraphs = bodyMarkdown
    .split(/\n{2,}/)
    .map((p) => p.replace(/^#+\s+/gm, "").replace(/\*\*/g, "").trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return paragraphs.map((p) => p.slice(0, 280));
  }

  const chunks: string[] = [];
  let remaining = bodyMarkdown.replace(/^#+\s+/gm, "").replace(/\*\*/g, "").trim();
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, 280));
    remaining = remaining.slice(280);
  }
  return chunks.length > 0 ? chunks : [bodyMarkdown.slice(0, 280)];
}

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
