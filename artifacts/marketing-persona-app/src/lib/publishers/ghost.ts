import crypto from "crypto";
import { marked } from "marked";
import { assertPublicUrl } from "@/lib/ssrf-guard";

export interface GhostCredentials {
  apiUrl: string;
  adminApiKey: string; // "id:secret" — secret is hex-encoded
}

export interface GhostPostResult {
  postId: string;
  url: string;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/**
 * Signs a short-lived HS256 JWT for the Ghost Admin API, per Ghost's
 * documented auth scheme: https://ghost.org/docs/admin-api/#token-authentication
 */
function signGhostAdminToken(adminApiKey: string): string {
  const parts = adminApiKey.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Invalid Ghost Admin API key format. Expected \"id:secret\".");
  }
  const [id, secretHex] = parts as [string, string];
  const secret = Buffer.from(secretHex, "hex");

  const header = { alg: "HS256", typ: "JWT", kid: id };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now, exp: now + 5 * 60, aud: "/admin/" };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(signingInput).digest();

  return `${signingInput}.${base64url(signature)}`;
}

function makeAuthHeader(adminApiKey: string): string {
  return `Ghost ${signGhostAdminToken(adminApiKey)}`;
}

function apiBase(apiUrl: string): string {
  return apiUrl.replace(/\/$/, "") + "/ghost/api/admin";
}

export async function publishToGhost(
  credentials: GhostCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
  metaDescription?: string,
  tags?: string[]
): Promise<GhostPostResult> {
  const base = apiBase(credentials.apiUrl);
  const postsUrl = `${base}/posts/?source=html`;
  await assertPublicUrl(postsUrl);

  const htmlContent = await marked(bodyMarkdown);

  const post: Record<string, unknown> = {
    title,
    html: htmlContent,
    status,
  };
  if (metaDescription) post["custom_excerpt"] = metaDescription.slice(0, 300);
  if (tags?.length) post["tags"] = tags.map((name) => ({ name }));

  const res = await fetch(postsUrl, {
    method: "POST",
    headers: {
      Authorization: makeAuthHeader(credentials.adminApiKey),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ posts: [post] }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { errors?: { message?: string }[] };
    if (res.status === 401) throw new Error("Ghost authentication failed. Check your Admin API key.");
    if (res.status === 403) throw new Error("Ghost user does not have permission to create posts.");
    throw new Error(data.errors?.[0]?.message ?? `Ghost API error: ${res.status}`);
  }

  const data = await res.json() as { posts?: { id: string; url: string }[] };
  const created = data.posts?.[0];
  if (!created) throw new Error("Ghost API returned no post.");
  return { postId: created.id, url: created.url };
}

export async function testGhostConnection(
  credentials: GhostCredentials
): Promise<{ ok: boolean; siteTitle?: string; error?: string }> {
  try {
    const siteUrl = `${apiBase(credentials.apiUrl)}/site/`;
    await assertPublicUrl(siteUrl);

    const res = await fetch(siteUrl, {
      headers: { Authorization: makeAuthHeader(credentials.adminApiKey) },
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: authentication failed` };
    }

    const data = await res.json() as { site?: { title?: string } };
    return { ok: true, siteTitle: data.site?.title };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
