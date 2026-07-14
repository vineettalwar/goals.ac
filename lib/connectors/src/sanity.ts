import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface SanityFieldMapping {
  titleField?: string;
  bodyField?: string;
  slugField?: string;
  metaDescriptionField?: string;
}

export interface SanityCredentials {
  projectId: string;
  dataset: string;
  token: string;
  documentType: string;
  fieldMapping: SanityFieldMapping;
}

export interface SanityPostResult {
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

export async function publishToSanity(
  credentials: SanityCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
  fieldsOverride?: Record<string, unknown>,
): Promise<SanityPostResult> {
  const mapping = credentials.fieldMapping;
  const titleField = mapping.titleField ?? "title";
  const bodyField = mapping.bodyField ?? "body";
  const slugField = mapping.slugField ?? "slug";
  const htmlContent = await marked(bodyMarkdown);

  const url = `https://${credentials.projectId}.api.sanity.io/v2021-06-07/data/mutate/${credentials.dataset}`;
  await assertPublicUrl(url);

  const doc: Record<string, unknown> = fieldsOverride
    ? { _type: credentials.documentType, ...fieldsOverride }
    : {
        _type: credentials.documentType,
        [titleField]: title,
        [bodyField]: htmlContent,
        [slugField]: { _type: "slug", current: slugify(title) },
      };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mutations: [{ create: doc }],
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; error?: { description?: string } };
    throw new Error(body.error?.description ?? body.message ?? `Sanity API error: ${res.status}`);
  }

  const data = (await res.json()) as { results?: Array<{ id?: string }> };
  const documentId = data.results?.[0]?.id ?? "";
  return {
    documentId,
    url: `https://www.sanity.io/manage/project/${credentials.projectId}/dataset/${credentials.dataset}/structure/${credentials.documentType};${documentId}`,
  };
}

export async function testSanityConnection(
  credentials: SanityCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `https://${credentials.projectId}.api.sanity.io/v2021-06-07/data/query/${credentials.dataset}?query=*%5B0%5D`;
    await assertPublicUrl(url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.token}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid token" };
    }
    return { ok: false, error: `Sanity API error: ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
