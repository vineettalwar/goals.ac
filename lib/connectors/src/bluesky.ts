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
