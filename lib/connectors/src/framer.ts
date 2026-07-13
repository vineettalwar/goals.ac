import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface FramerCredentials {
  apiToken: string;
  collectionId: string;
  titleFieldSlug: string;
  bodyFieldSlug: string;
  publishStatus?: "draft" | "live";
}

export interface FramerPostResult {
  itemId: string;
  url: string;
}

const FRAMER_API = "https://api.framer.com/v1";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export async function publishToFramer(
  credentials: FramerCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
): Promise<FramerPostResult> {
  const url = `${FRAMER_API}/cms/collections/${credentials.collectionId}/items`;
  await assertPublicUrl(url);
  const htmlContent = await marked(bodyMarkdown);
  const isLive = status === "published" || credentials.publishStatus === "live";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: slugify(title),
      fieldData: {
        [credentials.titleFieldSlug]: title,
        [credentials.bodyFieldSlug]: htmlContent,
      },
      draft: !isLive,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Framer CMS API error: ${res.status}`);
  }

  const data = (await res.json()) as { id?: string; slug?: string };
  const itemId = data.id ?? "";
  return {
    itemId,
    url: `https://framer.com/projects/cms/${credentials.collectionId}/items/${itemId}`,
  };
}

export async function testFramerConnection(
  credentials: FramerCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `${FRAMER_API}/cms/collections/${credentials.collectionId}`;
    await assertPublicUrl(url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.apiToken}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid API token" };
    }
    if (res.status === 404) {
      return { ok: false, error: "Collection not found" };
    }
    return { ok: false, error: `Framer API error: ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
