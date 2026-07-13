import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface SquarespaceCredentials {
  apiKey: string;
  siteId: string;
  publishStatus?: "draft" | "live";
}

export interface SquarespacePostResult {
  postId: string;
  url: string;
}

const SQUARESPACE_API = "https://api.squarespace.com/1.0";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export async function publishToSquarespace(
  credentials: SquarespaceCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
): Promise<SquarespacePostResult> {
  const url = `${SQUARESPACE_API}/commerce/blogs/${credentials.siteId}/posts`;
  await assertPublicUrl(url);
  const htmlContent = await marked(bodyMarkdown);
  const isLive = status === "published" || credentials.publishStatus === "live";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "goals.ac/1.0",
    },
    body: JSON.stringify({
      title,
      urlSlug: slugify(title),
      body: htmlContent,
      publishOn: isLive ? new Date().toISOString() : undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Squarespace API error: ${res.status}`);
  }

  const data = (await res.json()) as { id?: string; fullUrl?: string };
  return {
    postId: data.id ?? "",
    url: data.fullUrl ?? `https://squarespace.com/config/pages/${credentials.siteId}`,
  };
}

export async function testSquarespaceConnection(
  credentials: SquarespaceCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `${SQUARESPACE_API}/commerce/blogs/${credentials.siteId}/posts?limit=1`;
    await assertPublicUrl(url);
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        "User-Agent": "goals.ac/1.0",
      },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid API key or site ID" };
    }
    return { ok: false, error: `Squarespace API error: ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
