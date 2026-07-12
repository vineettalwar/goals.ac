import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface LinkedInCredentials {
  accessToken: string;
  authorUrn: string;
}

export interface LinkedInPublishResult {
  postId: string;
  postUrl: string;
}

const LINKEDIN_API = "https://api.linkedin.com";

function markdownToLinkedInText(bodyMarkdown: string): string {
  return bodyMarkdown
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function publishToLinkedIn(
  credentials: LinkedInCredentials,
  title: string,
  bodyMarkdown: string,
  options?: { visibility?: "PUBLIC" | "CONNECTIONS" },
): Promise<LinkedInPublishResult> {
  await assertPublicUrl(LINKEDIN_API);

  const commentary = markdownToLinkedInText(
    title ? `${title}\n\n${bodyMarkdown}` : bodyMarkdown,
  ).slice(0, 3000);

  const response = await fetch(`${LINKEDIN_API}/rest/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
      "Linkedin-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: credentials.authorUrn,
      commentary,
      visibility: options?.visibility ?? "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED" },
      lifecycleState: "PUBLISHED",
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("LinkedIn token expired. Reconnect in Project Settings → Publishing.");
    }
    const errText = await response.text().catch(() => "");
    throw new Error(`LinkedIn API error: ${response.status}${errText ? ` — ${errText.slice(0, 200)}` : ""}`);
  }

  const postId = response.headers.get("x-restli-id") ?? "";
  if (!postId) {
    const data = (await response.json().catch(() => ({}))) as { id?: string };
    const id = data.id ?? "unknown";
    return {
      postId: id,
      postUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}`,
    };
  }

  return {
    postId,
    postUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`,
  };
}

export async function testLinkedInConnection(
  credentials: LinkedInCredentials,
): Promise<{ ok: boolean; displayName?: string; error?: string }> {
  try {
    await assertPublicUrl(LINKEDIN_API);
    const res = await fetch(`${LINKEDIN_API}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    if (!res.ok) {
      return { ok: false, error: res.status === 401 ? "Token expired or invalid" : `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { name?: string; sub?: string };
    return { ok: true, displayName: data.name ?? data.sub };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

export async function fetchLinkedInAuthorUrn(accessToken: string): Promise<string> {
  await assertPublicUrl(LINKEDIN_API);
  const res = await fetch(`${LINKEDIN_API}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch LinkedIn profile");
  const data = (await res.json()) as { sub?: string };
  if (!data.sub) throw new Error("LinkedIn profile missing member id");
  return `urn:li:person:${data.sub}`;
}
