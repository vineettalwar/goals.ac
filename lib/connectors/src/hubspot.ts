import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface HubSpotCredentials {
  accessToken: string;
  blogId: string;
  publishStatus?: "draft" | "live";
}

export interface HubSpotPostResult {
  postId: string;
  url: string;
}

const HUBSPOT_API = "https://api.hubapi.com";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export async function publishToHubSpot(
  credentials: HubSpotCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
): Promise<HubSpotPostResult> {
  const url = `${HUBSPOT_API}/cms/v3/blogs/posts`;
  await assertPublicUrl(url);
  const htmlContent = await marked(bodyMarkdown);
  const isLive = status === "published" || credentials.publishStatus === "live";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: title,
      slug: slugify(title),
      postBody: htmlContent,
      contentGroupId: credentials.blogId,
      publishImmediately: isLive,
      state: isLive ? "PUBLISHED" : "DRAFT",
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `HubSpot CMS API error: ${res.status}`);
  }

  const data = (await res.json()) as { id?: string; url?: string };
  return {
    postId: data.id ?? "",
    url: data.url ?? `https://app.hubspot.com/blog/${credentials.blogId}/posts/${data.id}`,
  };
}

export async function testHubSpotConnection(
  credentials: HubSpotCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `${HUBSPOT_API}/cms/v3/blogs/posts?limit=1&contentGroupId=${encodeURIComponent(credentials.blogId)}`;
    await assertPublicUrl(url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid access token or blog ID" };
    }
    return { ok: false, error: `HubSpot API error: ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
