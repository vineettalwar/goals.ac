import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { connectorFetch } from "./connector-fetch";

export interface WordPressCredentials {
  siteUrl: string;
  username: string;
  appPassword: string;
}

export interface WordPressPostResult {
  postId: number;
  url: string;
  /**
   * Set when SEO meta was sent to core REST but WordPress did not echo it back
   * unchanged — meaning the site has no plugin/mu-plugin registering those
   * meta keys with `show_in_rest`, so the description/title/focus keyword
   * were silently dropped. Core REST cannot register third-party meta keys
   * for the customer, so this is a customer-facing signal, not a retryable
   * error.
   */
  metaWarning?: string;
}

export interface WordPressMediaResult {
  id: number;
  sourceUrl: string;
}

function makeAuthHeader(username: string, appPassword: string): string {
  return "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");
}

export async function uploadWordPressMedia(
  credentials: WordPressCredentials,
  params: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    alt?: string;
    title?: string;
    caption?: string;
  },
): Promise<WordPressMediaResult> {
  const apiBase = credentials.siteUrl.replace(/\/$/, "") + "/wp-json/wp/v2";
  await assertPublicUrl(apiBase + "/media");

  const form = new FormData();
  const blob = new Blob([new Uint8Array(params.buffer)], { type: params.mimeType });
  form.append("file", blob, params.filename);
  if (params.alt) form.append("alt_text", params.alt);
  if (params.title) form.append("title", params.title);
  if (params.caption) form.append("caption", params.caption);

  const res = await connectorFetch(`${apiBase}/media`, {
    method: "POST",
    headers: {
      Authorization: makeAuthHeader(credentials.username, credentials.appPassword),
    },
    body: form,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? `WordPress media upload error: ${res.status}`);
  }

  const media = (await res.json()) as { id: number; source_url?: string; guid?: { rendered?: string } };
  return {
    id: media.id,
    sourceUrl: media.source_url ?? media.guid?.rendered ?? "",
  };
}

/** True when a value WordPress echoed back for a meta key matches what we sent. */
function metaKeyPersisted(sentValue: string, echoed: unknown): boolean {
  return typeof echoed === "string" && echoed === sentValue;
}

/**
 * Core REST only persists meta keys a plugin (or mu-plugin) registered with
 * `show_in_rest`. Unregistered keys are accepted (no error) and silently
 * dropped. The only reliable way to know whether our SEO meta actually landed
 * is to check what the API echoed back in its response against what we sent —
 * so callers can surface a real warning instead of assuming success.
 */
function detectMetaWarning(
  sentMeta: Record<string, string> | undefined,
  echoedMeta: unknown,
): string | undefined {
  if (!sentMeta || Object.keys(sentMeta).length === 0) return undefined;
  const echoed = echoedMeta && typeof echoedMeta === "object" ? (echoedMeta as Record<string, unknown>) : {};
  const anyPersisted = Object.entries(sentMeta).some(([key, value]) => metaKeyPersisted(value, echoed[key]));
  if (anyPersisted) return undefined;
  return (
    "SEO meta (description, title, focus keyword) was sent but WordPress did not " +
    "confirm it was stored. Core REST only saves SEO-plugin meta fields that the " +
    "plugin has explicitly registered for the API — install the goals.ac plugin, " +
    "or a helper mu-plugin, to have this data reach Yoast/RankMath/etc."
  );
}

async function fetchExistingPost(
  apiBase: string,
  postId: string,
  credentials: WordPressCredentials,
): Promise<{ id: number } | null> {
  await assertPublicUrl(`${apiBase}/posts/${postId}`);
  const res = await connectorFetch(`${apiBase}/posts/${postId}?context=edit`, {
    headers: { Authorization: makeAuthHeader(credentials.username, credentials.appPassword) },
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { id?: number } | null;
  return data?.id ? { id: data.id } : null;
}

export async function publishToWordPress(
  credentials: WordPressCredentials,
  title: string,
  bodyMarkdown: string,
  status: "draft" | "publish" = "draft",
  metaDescription?: string,
  categoryIds?: number[],
  meta?: Record<string, string>,
  options?: { featuredMediaId?: number; htmlContent?: string; existingRemoteId?: string },
): Promise<WordPressPostResult> {
  const apiBase = credentials.siteUrl.replace(/\/$/, "") + "/wp-json/wp/v2";
  await assertPublicUrl(apiBase + "/posts");

  const htmlContent = options?.htmlContent ?? (await marked(bodyMarkdown));

  const body: Record<string, unknown> = {
    title,
    content: htmlContent,
    status,
  };
  if (categoryIds?.length) body.categories = categoryIds;
  if (options?.featuredMediaId) body.featured_media = options.featuredMediaId;
  const sentMeta =
    meta && Object.keys(meta).length > 0
      ? meta
      : metaDescription
        ? { _yoast_wpseo_metadesc: metaDescription }
        : undefined;
  if (sentMeta) body.meta = sentMeta;

  // Idempotent create-or-update: a previously recorded remote post id (see
  // publish_records / getLatestPublishedRemoteId) is checked and, when it
  // still exists on the remote site, updated in place rather than blindly
  // POSTing a new post. This is what makes republish safe after a lost
  // response, a worker timeout, or the scheduled-publish sweep re-selecting
  // a "ready" piece that in fact already published.
  let updateId: string | undefined;
  if (options?.existingRemoteId) {
    const existing = await fetchExistingPost(apiBase, options.existingRemoteId, credentials);
    if (existing) updateId = String(existing.id);
    // Falls through to create when the remote post is gone (e.g. deleted on
    // the WP side) — nothing left to update against.
  }

  const url = updateId ? `${apiBase}/posts/${updateId}` : `${apiBase}/posts`;
  let res: Response;
  try {
    res = await connectorFetch(url, {
      method: updateId ? "PUT" : "POST",
      headers: {
        Authorization: makeAuthHeader(credentials.username, credentials.appPassword),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(
        "WordPress did not respond in time. The post may or may not have been created — " +
          "check the site before retrying to avoid a duplicate.",
      );
    }
    throw err;
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) throw new Error("WordPress authentication failed. Check your application password.");
    if (res.status === 403) throw new Error("WordPress user does not have permission to create posts.");
    throw new Error(data.message ?? `WordPress API error: ${res.status}`);
  }

  const post = (await res.json()) as { id: number; link: string; meta?: unknown };
  const metaWarning = detectMetaWarning(sentMeta, post.meta);
  return { postId: post.id, url: post.link, ...(metaWarning ? { metaWarning } : {}) };
}

export async function testWordPressConnection(
  credentials: WordPressCredentials
): Promise<{ ok: boolean; siteName?: string; error?: string }> {
  try {
    const apiBase = credentials.siteUrl.replace(/\/$/, "") + "/wp-json/wp/v2";
    // `context=edit` is required — WordPress only includes `capabilities` on
    // the user object in edit context. Without it every account (including
    // Contributor/Author, which cannot publish) reads as "connected" because
    // there is nothing to check the capability against.
    await assertPublicUrl(apiBase + "/users/me?context=edit");

    const res = await connectorFetch(`${apiBase}/users/me?context=edit`, {
      headers: { Authorization: makeAuthHeader(credentials.username, credentials.appPassword) },
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: authentication failed` };
    }

    const user = (await res.json()) as { name?: string; capabilities?: Record<string, boolean> };
    // Fail closed: if the site did not report capabilities at all (unexpected
    // response shape, non-standard REST setup, etc.) treat that as "cannot
    // confirm publish permission" rather than assuming the best.
    const canPublish = user.capabilities?.["publish_posts"] === true;
    if (!canPublish) {
      return { ok: false, error: "This user does not have permission to create posts." };
    }

    return { ok: true, siteName: user.name };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { ok: false, error: "Connection to WordPress timed out." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
