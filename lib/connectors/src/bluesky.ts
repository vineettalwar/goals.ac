import { Agent } from "@atproto/api";

export interface BlueskyCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  did: string;
  handle?: string;
  /** Serialized OAuth session for token refresh via @atproto/oauth-client-node */
  sessionJson?: string;
}

export interface BlueskyPublishResult {
  postUri: string;
  postUrl: string;
}

function captionFromMarkdown(bodyMarkdown: string): string {
  return bodyMarkdown
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

/** Bluesky post limit is 300 graphemes; approximate with 300 chars for v1. */
export function truncateBlueskyText(text: string, max = 300): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export async function publishToBluesky(
  credentials: BlueskyCredentials,
  bodyMarkdown: string,
  agent?: Agent,
): Promise<BlueskyPublishResult> {
  const text = truncateBlueskyText(captionFromMarkdown(bodyMarkdown));
  const resolvedAgent =
    agent ??
    new Agent({
      service: "https://bsky.social",
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

  const result = await resolvedAgent.post({ text });
  const postUri = result.uri;
  const handle = credentials.handle ?? credentials.did;
  const rkey = postUri.split("/").pop() ?? "";
  const postUrl = credentials.handle
    ? `https://bsky.app/profile/${handle}/post/${rkey}`
    : `https://bsky.app/profile/${credentials.did}/post/${rkey}`;

  return { postUri, postUrl };
}

export async function testBlueskyConnection(
  credentials: BlueskyCredentials,
  agent?: Agent,
): Promise<{ ok: boolean; handle?: string; error?: string }> {
  try {
    const resolvedAgent =
      agent ??
      new Agent({
        service: "https://bsky.social",
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });
    const profile = await resolvedAgent.getProfile({ actor: credentials.did });
    return {
      ok: true,
      handle: profile.data.handle ?? credentials.handle,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

/** Recent post texts from an author's feed (for brand voice / history sync). */
export async function fetchBlueskyAuthorPosts(
  credentials: BlueskyCredentials,
  limit = 50,
  agent?: Agent,
): Promise<string[]> {
  if (!credentials.accessToken || !credentials.did) return [];
  const resolvedAgent =
    agent ??
    new Agent({
      service: "https://bsky.social",
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
  const feed = await resolvedAgent.getAuthorFeed({
    actor: credentials.did,
    limit,
  });
  return (feed.data.feed ?? [])
    .map((item) => item.post?.record)
    .filter((record): record is { text?: string } => Boolean(record && typeof record === "object"))
    .map((record) => (record.text ?? "").trim())
    .filter(Boolean);
}

export async function fetchBlueskyPostMetrics(
  credentials: BlueskyCredentials,
  postUri: string,
  agent?: Agent,
): Promise<import("./social-metrics-types").NormalizedPostMetrics> {
  const resolvedAgent =
    agent ??
    new Agent({
      service: "https://bsky.social",
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
  try {
    const thread = await resolvedAgent.getPostThread({ uri: postUri, depth: 0 });
    const threadNode = thread.data.thread;
    const post = threadNode && "post" in threadNode ? threadNode.post : undefined;
    return {
      impressions: null,
      likes: post?.likeCount ?? null,
      comments: post?.replyCount ?? null,
      shares: post?.repostCount ?? null,
      clicks: null,
    };
  } catch {
    return { impressions: null, likes: null, comments: null, shares: null, clicks: null };
  }
}
