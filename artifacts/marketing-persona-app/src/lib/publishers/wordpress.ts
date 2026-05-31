import { marked } from "marked";
import { assertPublicUrl } from "@/lib/ssrf-guard";

export interface WordPressCredentials {
  siteUrl: string;
  username: string;
  appPassword: string;
}

export interface WordPressPostResult {
  postId: number;
  url: string;
}

function makeAuthHeader(username: string, appPassword: string): string {
  return "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");
}

export async function publishToWordPress(
  credentials: WordPressCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "publish" = "draft",
  metaDescription?: string,
  categoryIds?: number[]
): Promise<WordPressPostResult> {
  const apiBase = credentials.siteUrl.replace(/\/$/, "") + "/wp-json/wp/v2";
  await assertPublicUrl(apiBase + "/posts");

  const htmlContent = await marked(bodyMarkdown);

  const body: Record<string, unknown> = {
    title,
    content: htmlContent,
    status,
  };
  if (categoryIds?.length) body.categories = categoryIds;
  if (metaDescription) {
    body.meta = { _yoast_wpseo_metadesc: metaDescription };
  }

  const res = await fetch(`${apiBase}/posts`, {
    method: "POST",
    headers: {
      Authorization: makeAuthHeader(credentials.username, credentials.appPassword),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    if (res.status === 401) throw new Error("WordPress authentication failed. Check your application password.");
    if (res.status === 403) throw new Error("WordPress user does not have permission to create posts.");
    throw new Error(data.message ?? `WordPress API error: ${res.status}`);
  }

  const post = await res.json() as { id: number; link: string };
  return { postId: post.id, url: post.link };
}

export async function testWordPressConnection(
  credentials: WordPressCredentials
): Promise<{ ok: boolean; siteName?: string; error?: string }> {
  try {
    const apiBase = credentials.siteUrl.replace(/\/$/, "") + "/wp-json/wp/v2";
    await assertPublicUrl(apiBase + "/users/me");

    const res = await fetch(`${apiBase}/users/me`, {
      headers: { Authorization: makeAuthHeader(credentials.username, credentials.appPassword) },
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: authentication failed` };
    }

    const user = await res.json() as { name?: string; capabilities?: Record<string, boolean> };
    const canPublish = user.capabilities?.["publish_posts"] ?? true;
    if (!canPublish) {
      return { ok: false, error: "This user does not have permission to create posts." };
    }

    return { ok: true, siteName: user.name };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
