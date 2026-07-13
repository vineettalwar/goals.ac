import crypto from "crypto";
import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

/** CMS platforms that expose the goals.ac plugin HTTP contract. */
export type GoalsAcPluginPlatform = "wordpress" | "drupal" | "joomla" | "shopify" | "typo3";

export interface GoalsAcPluginCredentials {
  siteUrl: string;
  siteKey: string;
  platform: GoalsAcPluginPlatform;
}

export interface GoalsAcPublishPayload {
  title: string;
  content: string;
  status?: "draft" | "publish" | "pending" | "published";
  slug?: string;
  categories?: number[] | string[];
  tags?: number[] | string[];
  featured_image_id?: number;
  meta?: Record<string, string>;
  update_id?: string | number;
  /** Shopify only */
  blogId?: string;
}

export interface GoalsAcPublishResult {
  remote_id: string | number;
  url: string;
  action: "created" | "updated";
}

export interface GoalsAcHealthResponse {
  version: string;
  cms_version: string;
  capabilities: Record<string, boolean>;
}

export const GOALS_HMAC_HEADERS = {
  timestamp: "X-Goals-Timestamp",
  nonce: "X-Goals-Nonce",
  signature: "X-Goals-Signature",
  idempotency: "X-Idempotency-Key",
} as const;

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sign(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body: string,
  siteKey: string,
): string {
  const canonical = [
    method.toUpperCase(),
    path,
    timestamp,
    nonce,
    sha256(body),
  ].join("\n");
  return crypto.createHmac("sha256", siteKey).update(canonical).digest("hex");
}

export function buildGoalsAcAuthHeaders(
  method: string,
  signPath: string,
  body: string,
  siteKey: string,
): Record<string, string> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString("hex");
  const signature = sign(method, signPath, timestamp, nonce, body, siteKey);

  return {
    [GOALS_HMAC_HEADERS.timestamp]: timestamp,
    [GOALS_HMAC_HEADERS.nonce]: nonce,
    [GOALS_HMAC_HEADERS.signature]: signature,
  };
}

function normalizeBaseUrl(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "");
}

/** URL path segment used in HMAC canonical string (must match plugin verifier). */
export function goalsAcSignPath(
  platform: GoalsAcPluginPlatform,
  endpoint: string,
): string {
  const normalized = endpoint.replace(/^\//, "");
  switch (platform) {
    case "wordpress":
    case "shopify":
      return `/goals-ac/v1/${normalized}`;
    case "drupal":
      return `/goals-ac/${normalized}`;
    case "joomla":
      return `/api/index.php/v1/goals-ac/${normalized}`;
    case "typo3":
      return `/goals-ac/v1/${normalized}`;
  }
}

/** Full HTTP URL for a plugin endpoint. */
export function goalsAcApiUrl(
  credentials: GoalsAcPluginCredentials,
  endpoint: string,
): string {
  const base = normalizeBaseUrl(credentials.siteUrl);
  const normalized = endpoint.replace(/^\//, "");

  switch (credentials.platform) {
    case "wordpress":
      return `${base}/wp-json/goals-ac/v1/${normalized}`;
    case "drupal":
      return `${base}/goals-ac/${normalized}`;
    case "joomla":
      return `${base}/api/index.php/v1/goals-ac/${normalized}`;
    case "shopify":
      return `${base}/goals-ac/v1/${normalized}`;
    case "typo3":
      return `${base}/goals-ac/v1/${normalized}`;
  }
}

async function goalsAcRequest<T>(
  credentials: GoalsAcPluginCredentials,
  method: string,
  endpoint: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const url = goalsAcApiUrl(credentials, endpoint);
  await assertPublicUrl(url);

  const rawBody = body === undefined ? "" : JSON.stringify(body);
  const signPath = goalsAcSignPath(credentials.platform, endpoint);
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...buildGoalsAcAuthHeaders(method, signPath, rawBody, credentials.siteKey),
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (idempotencyKey) {
    headers[GOALS_HMAC_HEADERS.idempotency] = idempotencyKey;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : rawBody,
  });

  const text = await res.text().catch(() => "");
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const message =
      (data as { message?: string; error?: string }).message ??
      (data as { error?: string }).error ??
      `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export async function testGoalsAcPluginConnection(
  credentials: GoalsAcPluginCredentials,
): Promise<{ ok: boolean; health?: GoalsAcHealthResponse; error?: string }> {
  try {
    const url = goalsAcApiUrl(credentials, "health");
    await assertPublicUrl(url);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const health = (await res.json()) as GoalsAcHealthResponse;
    return { ok: true, health };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

export async function publishToGoalsAcPlugin(
  credentials: GoalsAcPluginCredentials,
  payload: GoalsAcPublishPayload,
  options?: { idempotencyKey?: string; markdown?: boolean },
): Promise<GoalsAcPublishResult> {
  const content =
    options?.markdown && payload.content
      ? await marked(payload.content)
      : payload.content;

  const body: Record<string, unknown> = {
    ...payload,
    content,
    status:
      payload.status === "published" ? "publish" : (payload.status ?? "draft"),
  };

  const result = await goalsAcRequest<GoalsAcPublishResult>(
    credentials,
    "POST",
    "content",
    body,
    options?.idempotencyKey,
  );

  return {
    remote_id: result.remote_id,
    url: result.url,
    action: result.action ?? "created",
  };
}

export async function fetchGoalsAcSiteGraph<T = unknown>(
  credentials: GoalsAcPluginCredentials,
): Promise<T> {
  return goalsAcRequest<T>(credentials, "GET", "site-graph");
}

export async function injectGoalsAcSchema(
  credentials: GoalsAcPluginCredentials,
  schema: { json_ld?: unknown; llms_txt?: string },
): Promise<{ ok?: boolean; status?: string }> {
  return goalsAcRequest(credentials, "POST", "schema", schema);
}
