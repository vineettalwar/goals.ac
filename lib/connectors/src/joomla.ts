import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface JoomlaCredentials {
  siteUrl: string;
  apiToken: string;
}

export interface JoomlaPostResult {
  articleId: number;
  url: string;
}

function apiBase(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "") + "/api/index.php/v1";
}

function makeHeaders(apiToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}

export async function publishToJoomla(
  credentials: JoomlaCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "publish" | "pending" = "draft",
  categoryId?: number,
  metaDescription?: string,
  tags?: string[],
): Promise<JoomlaPostResult> {
  const base = apiBase(credentials.siteUrl);
  const articlesUrl = `${base}/content/articles`;
  await assertPublicUrl(articlesUrl);

  const htmlContent = await marked(bodyMarkdown);

  const body: Record<string, unknown> = {
    title,
    articletext: htmlContent,
    state: status === "publish" ? 1 : status === "pending" ? 2 : 0,
  };
  if (categoryId) body.catid = categoryId;
  if (metaDescription) body.metadesc = metaDescription.slice(0, 300);
  if (tags?.length) body.tags = tags;

  const res = await fetch(articlesUrl, {
    method: "POST",
    headers: makeHeaders(credentials.apiToken),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      errors?: string[];
    };
    if (res.status === 401)
      throw new Error("Joomla authentication failed. Check your API token.");
    if (res.status === 403)
      throw new Error(
        "Joomla token does not have permission to create articles.",
      );
    throw new Error(
      data.errors?.[0] ?? data.message ?? `Joomla API error: ${res.status}`,
    );
  }

  const location = res.headers.get("location") ?? "";
  const articleIdMatch = location.match(/\/(\d+)$/);
  const articleId = articleIdMatch ? parseInt(articleIdMatch[1], 10) : 0;

  let url = `${credentials.siteUrl.replace(/\/$/, "")}/index.php`;
  if (articleId) url = `${url}?id=${articleId}&format=html`;
  if (!articleId && !res.ok)
    throw new Error("Joomla API did not return an article ID.");

  // Some Joomla versions return the body directly
  if (!articleId) {
    const created = (await res.json().catch(() => ({}))) as {
      id?: number;
      link?: string;
    };
    if (created.id) {
      return {
        articleId: created.id,
        url:
          created.link ??
          `${credentials.siteUrl.replace(/\/$/, "")}/index.php?id=${created.id}&format=html`,
      };
    }
  }

  return { articleId, url };
}

export async function testJoomlaConnection(
  credentials: JoomlaCredentials,
): Promise<{ ok: boolean; siteName?: string; error?: string }> {
  try {
    const base = apiBase(credentials.siteUrl);
    const meUrl = `${base}/users/me`;
    await assertPublicUrl(meUrl);

    const res = await fetch(meUrl, {
      headers: makeHeaders(credentials.apiToken),
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: authentication failed` };
    }

    const data = (await res.json()) as {
      name?: string;
      username?: string;
      siteName?: string;
    };
    return { ok: true, siteName: data.siteName ?? data.name ?? data.username };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}
