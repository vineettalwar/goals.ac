import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

const WEBFLOW_API = "https://api.webflow.com/v2";

export type WebflowPublishStatus = "draft" | "live";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export async function publishToWebflow(
  apiToken: string,
  collectionId: string,
  bodyFieldSlug: string,
  title: string,
  bodyMarkdown: string,
  options?: { publishStatus?: WebflowPublishStatus; htmlContent?: string },
): Promise<string> {
  await assertPublicUrl(WEBFLOW_API);

  const publishStatus = options?.publishStatus ?? "draft";
  const htmlContent = options?.htmlContent ?? (await marked(bodyMarkdown));
  const slug = slugify(title) + "-" + Date.now().toString(36);

  const createRes = await fetch(`${WEBFLOW_API}/collections/${collectionId}/items`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      fieldData: {
        name: title,
        slug,
        [bodyFieldSlug]: htmlContent,
      },
      isDraft: publishStatus === "draft",
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.json().catch(() => ({})) as { message?: string; code?: string };
    if (createRes.status === 401 || createRes.status === 403) {
      throw new Error("Webflow authentication failed. Check your API token.");
    }
    if (createRes.status === 404) {
      throw new Error("Webflow collection not found. Check the collection ID.");
    }
    throw new Error(body.message ?? `Webflow API error: ${createRes.status}`);
  }

  const item = await createRes.json() as { id: string; fieldData?: { slug?: string } };

  if (publishStatus === "live" && item.id) {
    const publishRes = await fetch(`${WEBFLOW_API}/collections/${collectionId}/items/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ itemIds: [item.id] }),
    });
    if (!publishRes.ok) {
      const body = await publishRes.json().catch(() => ({})) as { message?: string };
      throw new Error(body.message ?? `Webflow publish error: ${publishRes.status}`);
    }
  }

  return `https://webflow.com/dashboard/collections/${collectionId}/items/${item.id}`;
}

export async function testWebflowConnection(
  apiToken: string,
  collectionId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `${WEBFLOW_API}/collections/${collectionId}`;
    await assertPublicUrl(url);
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        accept: "application/json",
      },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid API token" };
    }
    if (res.status === 404) {
      return { ok: false, error: "Collection not found" };
    }
    return { ok: false, error: `Webflow API error: ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
