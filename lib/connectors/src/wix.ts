import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface WixCredentials {
  accessToken: string;
  siteId: string;
  memberId?: string;
  publishStatus?: "draft" | "live";
}

export interface WixPostResult {
  postId: string;
  url: string;
}

const WIX_API = "https://www.wixapis.com/blog/v3";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export async function publishToWix(
  credentials: WixCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
): Promise<WixPostResult> {
  await assertPublicUrl(WIX_API);
  const htmlContent = await marked(bodyMarkdown);
  const publishStatus =
    status === "published" || credentials.publishStatus === "live" ? "PUBLISHED" : "DRAFT";

  const res = await fetch(`${WIX_API}/posts`, {
    method: "POST",
    headers: {
      Authorization: credentials.accessToken,
      "Content-Type": "application/json",
      "wix-site-id": credentials.siteId,
    },
    body: JSON.stringify({
      post: {
        title,
        slug: slugify(title),
        richContent: {
          nodes: [{ type: "HTML", htmlData: { html: htmlContent } }],
        },
        publishStatus,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Wix Blog API error: ${res.status}`);
  }

  const data = (await res.json()) as { post?: { id?: string; url?: { base?: string; path?: string } } };
  const postId = data.post?.id ?? "";
  const url = data.post?.url?.path
    ? `${data.post.url.base ?? ""}${data.post.url.path}`
    : `https://www.wix.com/dashboard/${credentials.siteId}/blog/posts/${postId}`;
  return { postId, url };
}

export async function testWixConnection(
  credentials: WixCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await assertPublicUrl(WIX_API);
    const res = await fetch(`${WIX_API}/posts?paging.limit=1`, {
      headers: {
        Authorization: credentials.accessToken,
        "wix-site-id": credentials.siteId,
      },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid access token or site ID" };
    }
    return { ok: false, error: `Wix API error: ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
