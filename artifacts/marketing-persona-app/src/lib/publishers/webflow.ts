import { marked } from "marked";
import { assertPublicUrl } from "@/lib/ssrf-guard";

const WEBFLOW_API = "https://api.webflow.com/v2";

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
): Promise<string> {
  await assertPublicUrl(WEBFLOW_API);

  const htmlContent = await marked(bodyMarkdown);
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
      isDraft: true,
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
  return `https://webflow.com/dashboard/collections/${collectionId}/items/${item.id}`;
}
