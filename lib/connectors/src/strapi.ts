import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface StrapiCredentials {
  baseUrl: string;
  apiToken: string;
  contentType: string;
  publishStatus?: "draft" | "live";
}

export interface StrapiPostResult {
  documentId: string;
  url: string;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export async function publishToStrapi(
  credentials: StrapiCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
  fieldsOverride?: Record<string, unknown>,
): Promise<StrapiPostResult> {
  const base = credentials.baseUrl.replace(/\/$/, "");
  const url = `${base}/api/${credentials.contentType}`;
  await assertPublicUrl(url);
  const htmlContent = await marked(bodyMarkdown);
  const isLive = status === "published" || credentials.publishStatus === "live";

  const data = fieldsOverride ?? {
    title,
    slug: slugify(title),
    content: htmlContent,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        ...data,
        publishedAt: isLive ? new Date().toISOString() : null,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? `Strapi API error: ${res.status}`);
  }

  const responseData = (await res.json()) as { data?: { id?: number; documentId?: string } };
  const documentId = String(responseData.data?.documentId ?? responseData.data?.id ?? "");
  return { documentId, url: `${base}/admin/content-manager/collection-types/api::${credentials.contentType}.${credentials.contentType}/${documentId}` };
}

export async function testStrapiConnection(
  credentials: StrapiCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const base = credentials.baseUrl.replace(/\/$/, "");
    const url = `${base}/api/${credentials.contentType}?pagination[limit]=1`;
    await assertPublicUrl(url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.apiToken}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid API token" };
    }
    return { ok: false, error: `Strapi API error: ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
