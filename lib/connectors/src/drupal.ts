import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface DrupalCredentials {
  siteUrl: string;
  authType: "basic" | "bearer";
  username?: string; // for basic auth
  password?: string; // for basic auth
  accessToken?: string; // for bearer auth
}

export interface DrupalPostResult {
  nodeId: string; // UUID
  url: string;
}

function jsonApiBase(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "") + "/jsonapi";
}

function makeHeaders(credentials: DrupalCredentials): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/vnd.api+json",
    Accept: "application/vnd.api+json",
  };

  if (credentials.authType === "bearer") {
    if (!credentials.accessToken)
      throw new Error("Bearer auth requires accessToken.");
    headers.Authorization = `Bearer ${credentials.accessToken}`;
  } else {
    if (!credentials.username || !credentials.password)
      throw new Error("Basic auth requires username and password.");
    headers.Authorization =
      "Basic " +
      Buffer.from(`${credentials.username}:${credentials.password}`).toString(
        "base64",
      );
  }

  return headers;
}

function resolveDrupalStatus(status: "draft" | "published"): string {
  return status === "published" ? "published" : "draft";
}

export async function publishToDrupal(
  credentials: DrupalCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
  contentType: string = "article",
  metaDescription?: string,
  tags?: string[],
): Promise<DrupalPostResult> {
  const base = jsonApiBase(credentials.siteUrl);
  const nodeUrl = `${base}/node/${contentType}`;
  await assertPublicUrl(nodeUrl);

  const htmlContent = await marked(bodyMarkdown);

  const attributes: Record<string, unknown> = {
    title,
    body: {
      value: htmlContent,
      format: "full_html",
      processed: htmlContent,
    },
    status: resolveDrupalStatus(status),
  };
  if (metaDescription) {
    attributes.field_meta_description = {
      value: metaDescription.slice(0, 160),
    };
  }

  const relationships: Record<string, unknown> | undefined = tags?.length
    ? {
        field_tags: {
          data: tags.map((tag) => ({
            type: "taxonomy_term--tags",
            attributes: { name: tag },
          })),
        },
      }
    : undefined;

  const payload = {
    data: {
      type: `node--${contentType}`,
      attributes,
      ...(relationships ? { relationships } : {}),
    },
  };

  const res = await fetch(nodeUrl, {
    method: "POST",
    headers: makeHeaders(credentials),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      errors?: { detail?: string }[];
      message?: string;
    };
    if (res.status === 401)
      throw new Error("Drupal authentication failed. Check your credentials.");
    if (res.status === 403)
      throw new Error(
        "Drupal user does not have permission to create content.",
      );
    throw new Error(
      data.errors?.[0]?.detail ??
        data.message ??
        `Drupal API error: ${res.status}`,
    );
  }

  const created = (await res.json()) as {
    data: { id: string; attributes?: { path?: { alias?: string } } };
  };

  const nodeId = created.data.id;
  const pathAlias = created.data.attributes?.path?.alias;
  const url = pathAlias
    ? `${credentials.siteUrl.replace(/\/$/, "")}${pathAlias}`
    : `${credentials.siteUrl.replace(/\/$/, "")}/node/${nodeId}`;

  return { nodeId, url };
}

export async function testDrupalConnection(
  credentials: DrupalCredentials,
): Promise<{ ok: boolean; siteName?: string; error?: string }> {
  try {
    const base = jsonApiBase(credentials.siteUrl);
    const rootUrl = `${base}/`;
    await assertPublicUrl(rootUrl);

    const res = await fetch(rootUrl, {
      headers: makeHeaders(credentials),
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: authentication failed` };
    }

    const data = (await res.json()) as {
      meta?: { links?: { self?: { href?: string } } };
      data?: { id?: string; attributes?: { name?: string } };
    };

    // Try to get site info from the JSON:API root resource
    const siteUrl = `${base}/config/system/site`;
    const siteRes = await fetch(siteUrl, { headers: makeHeaders(credentials) });
    if (siteRes.ok) {
      const siteData = (await siteRes.json()) as {
        data?: { attributes?: { name?: string } };
      };
      return { ok: true, siteName: siteData.data?.attributes?.name };
    }

    return { ok: true, siteName: data.data?.attributes?.name };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
