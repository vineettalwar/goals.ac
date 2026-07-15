import crypto from "crypto";
import { marked } from "marked";
import {
  downloadAndOptimizeImage,
  optimizeImageBuffer,
  type OptimizedImage,
} from "@workspace/media";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import {
  decodeRasterFeaturedDataUri,
  isRasterFeaturedDataUri,
} from "./wordpress-images";

export interface GhostCredentials {
  apiUrl: string;
  adminApiKey: string; // "id:secret" — secret is hex-encoded
}

export interface GhostPostResult {
  postId: string;
  url: string;
}

export interface GhostImageResult {
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

/** Multipart upload → Ghost-hosted URL for `feature_image`. */
export async function uploadGhostImage(
  credentials: GhostCredentials,
  params: { buffer: Buffer; filename: string; mimeType: string },
): Promise<GhostImageResult> {
  const uploadUrl = `${apiBase(credentials.apiUrl)}/images/upload/`;
  await assertPublicUrl(uploadUrl);

  const form = new FormData();
  const blob = new Blob([new Uint8Array(params.buffer)], { type: params.mimeType });
  form.append("file", blob, params.filename);
  form.append("purpose", "image");

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: makeAuthHeader(credentials.adminApiKey) },
    body: form,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { errors?: { message?: string }[] };
    if (res.status === 401) throw new Error("Ghost authentication failed. Check your Admin API key.");
    if (res.status === 403) throw new Error("Ghost user does not have permission to upload images.");
    throw new Error(data.errors?.[0]?.message ?? `Ghost image upload error: ${res.status}`);
  }

  const data = (await res.json()) as { images?: { url?: string }[] };
  const url = data.images?.[0]?.url;
  if (!url) throw new Error("Ghost API returned no image URL.");
  return { url };
}

/**
 * Resolve featured image to a Ghost-hosted URL.
 * Accepts https (downloaded) or data:image/png|jpeg base64; SVG and other schemes skipped.
 */
export async function resolveGhostFeatureImage(
  credentials: GhostCredentials,
  featuredImageUrl?: string | null,
): Promise<string | undefined> {
  const raw = featuredImageUrl?.trim();
  if (!raw) return undefined;

  let optimized: OptimizedImage;
  if (isRasterFeaturedDataUri(raw)) {
    const decoded = decodeRasterFeaturedDataUri(raw);
    if (!decoded) return undefined;
    optimized = await optimizeImageBuffer(decoded.buffer, "featured", {
      maxWidth: 1920,
      quality: 85,
    });
  } else if (/^https?:\/\//i.test(raw)) {
    optimized = await downloadAndOptimizeImage(raw, "featured", {
      maxWidth: 1920,
      quality: 85,
    });
  } else {
    return undefined;
  }

  const uploaded = await uploadGhostImage(credentials, {
    buffer: optimized.buffer,
    filename: optimized.filename,
    mimeType: optimized.mimeType,
  });
  return uploaded.url;
}

export async function publishToGhost(
  credentials: GhostCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "published" = "draft",
  metaDescription?: string,
  tags?: string[],
  htmlContentOverride?: string,
  featuredImageUrl?: string | null,
): Promise<GhostPostResult> {
  const base = apiBase(credentials.apiUrl);
  const postsUrl = `${base}/posts/?source=html`;
  await assertPublicUrl(postsUrl);

  const featureImage = await resolveGhostFeatureImage(credentials, featuredImageUrl);

  const post: Record<string, unknown> = {
    title,
    html: htmlContentOverride ?? (await marked(bodyMarkdown)),
    status,
  };
  if (metaDescription) post["custom_excerpt"] = metaDescription.slice(0, 300);
  if (tags?.length) post["tags"] = tags.map((name) => ({ name }));
  if (featureImage) post["feature_image"] = featureImage;

  return postToGhost(credentials, postsUrl, post);
}

/** Publish a post using native Ghost 5 Lexical JSON (Admin API default format). */
export async function publishToGhostLexical(
  credentials: GhostCredentials,
  title: string,
  lexical: string,
  status: "draft" | "published" = "draft",
  metaDescription?: string,
  tags?: string[],
  featuredImageUrl?: string | null,
): Promise<GhostPostResult> {
  const base = apiBase(credentials.apiUrl);
  const postsUrl = `${base}/posts/`;
  await assertPublicUrl(postsUrl);

  const featureImage = await resolveGhostFeatureImage(credentials, featuredImageUrl);

  const post: Record<string, unknown> = { title, lexical, status };
  if (metaDescription) post["custom_excerpt"] = metaDescription.slice(0, 300);
  if (tags?.length) post["tags"] = tags.map((name) => ({ name }));
  if (featureImage) post["feature_image"] = featureImage;

  return postToGhost(credentials, postsUrl, post);
}

async function postToGhost(
  credentials: GhostCredentials,
  postsUrl: string,
  post: Record<string, unknown>,
): Promise<GhostPostResult> {
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
