import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface ContentfulFieldMapping {
  titleField?: string;
  bodyField?: string;
  slugField?: string;
  metaDescriptionField?: string;
}

export interface ContentfulCredentials {
  accessToken: string;
  spaceId: string;
  environmentId: string;
  contentTypeId: string;
  fieldMapping: ContentfulFieldMapping;
}

export interface ContentfulPostResult {
  entryId: string;
  url: string;
}

const CONTENTFUL_API = "https://api.contentful.com";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export async function publishToContentful(
  credentials: ContentfulCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
  fieldsOverride?: Record<string, unknown>,
): Promise<ContentfulPostResult> {
  const mapping = credentials.fieldMapping;
  const titleField = mapping.titleField ?? "title";
  const bodyField = mapping.bodyField ?? "body";
  const slugField = mapping.slugField ?? "slug";
  const htmlContent = await marked(bodyMarkdown);

  const url = `${CONTENTFUL_API}/spaces/${credentials.spaceId}/environments/${credentials.environmentId}/entries`;
  await assertPublicUrl(url);

  const fieldValues: Record<string, unknown> = fieldsOverride ?? {
    [titleField]: title,
    [bodyField]: htmlContent,
    [slugField]: slugify(title),
  };

  const fields: Record<string, Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(fieldValues)) {
    fields[key] = { "en-US": value };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/vnd.contentful.management.v1+json",
      "X-Contentful-Content-Type": credentials.contentTypeId,
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Contentful API error: ${res.status}`);
  }

  const entry = (await res.json()) as { sys?: { id?: string; version?: number } };
  const entryId = entry.sys?.id ?? "";

  if (status === "published" && entryId && entry.sys?.version) {
    const publishUrl = `${CONTENTFUL_API}/spaces/${credentials.spaceId}/environments/${credentials.environmentId}/entries/${entryId}/published`;
    await assertPublicUrl(publishUrl);
    await fetch(publishUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "X-Contentful-Version": String(entry.sys.version),
      },
    });
  }

  return {
    entryId,
    url: `https://app.contentful.com/spaces/${credentials.spaceId}/entries/${entryId}`,
  };
}

export async function testContentfulConnection(
  credentials: ContentfulCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `${CONTENTFUL_API}/spaces/${credentials.spaceId}/environments/${credentials.environmentId}`;
    await assertPublicUrl(url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid access token" };
    }
    return { ok: false, error: `Contentful API error: ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
