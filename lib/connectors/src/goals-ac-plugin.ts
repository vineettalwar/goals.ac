import crypto from "crypto";
import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { connectorFetch } from "@workspace/connectors/connector-fetch";

/** CMS platforms that expose the goals.ac plugin HTTP contract. */
export type GoalsAcPluginPlatform = "wordpress" | "drupal" | "joomla" | "shopify" | "typo3";

export interface GoalsAcPluginCredentials {
  siteUrl: string;
  siteKey: string;
  platform: GoalsAcPluginPlatform;
}

export interface GoalsAcLayoutSection {
  layout_id: string;
  layout_settings?: Record<string, unknown>;
  components: Array<{
    type: string;
    uuid: string;
    region: string;
    configuration: Record<string, unknown>;
    additional?: Record<string, unknown>;
  }>;
}

export interface GoalsAcContentElement {
  ctype: string;
  fields: Record<string, unknown>;
  colPos?: number;
  sorting?: number;
}

export interface GoalsAcShopifySection {
  type: string;
  settings: Record<string, unknown>;
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
  seo?: Record<string, string | undefined>;
  update_id?: string | number;
  /** Canonical output mode (contract v0.2) */
  output_mode?: string;
  /** WordPress editor output mode (alias for output_mode) */
  editor_mode?: "classic" | "gutenberg" | "elementor" | "divi";
  /** Elementor layout JSON for _elementor_data meta */
  elementor_data?: string;
  /** Drupal Layout Builder sections */
  layout?: { sections: GoalsAcLayoutSection[] };
  layout_data?: string;
  layout_storage_field?: string;
  /** TYPO3 content elements */
  content_elements?: GoalsAcContentElement[];
  replace_strategy?: "managed_only" | "full_replace";
  /** Shopify structured sections */
  sections?: GoalsAcShopifySection[];
  metafield_namespace?: string;
  metafield_key?: string;
  template_suffix?: string;
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
  capabilities: Record<string, boolean | string | string[]>;
  detected_builders?: string[];
  /** @deprecated Use recommended_output_mode */
  recommended_editor_mode?: string;
  output_modes?: string[];
  recommended_output_mode?: string;
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

  const res = await connectorFetch(url, {
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

export function parseAvailableOutputModes(health: GoalsAcHealthResponse): string[] {
  const fromCapabilities = health.capabilities?.output_modes;
  if (Array.isArray(fromCapabilities)) {
    return fromCapabilities.filter((m): m is string => typeof m === "string");
  }
  if (Array.isArray(health.output_modes)) {
    return health.output_modes;
  }
  const builders = health.detected_builders;
  if (Array.isArray(builders) && builders.length > 0) {
    const modes = ["classic"];
    if (builders.includes("gutenberg")) modes.push("gutenberg");
    if (builders.includes("elementor")) modes.push("elementor");
    if (builders.includes("divi")) modes.push("divi");
    return modes;
  }
  return [];
}

/** Resolve recommended output mode from plugin health (contract v0.2 + WordPress legacy). */
export function parseRecommendedOutputMode(health: GoalsAcHealthResponse): string | undefined {
  if (typeof health.recommended_output_mode === "string" && health.recommended_output_mode) {
    return health.recommended_output_mode;
  }
  if (typeof health.recommended_editor_mode === "string" && health.recommended_editor_mode) {
    return health.recommended_editor_mode;
  }
  const available = parseAvailableOutputModes(health);
  return available.length === 1 ? available[0] : undefined;
}

export async function testGoalsAcPluginConnection(
  credentials: GoalsAcPluginCredentials,
): Promise<{ ok: boolean; health?: GoalsAcHealthResponse; error?: string }> {
  try {
    const url = goalsAcApiUrl(credentials, "health");
    await assertPublicUrl(url);

    const res = await connectorFetch(url, {
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

export interface GoalsAcMediaUploadPayload {
  filename: string;
  mimeType: string;
  dataBase64: string;
  alt?: string;
  title?: string;
  caption?: string;
}

export interface GoalsAcMediaUploadResult {
  id: number;
  sourceUrl: string;
}

export async function uploadGoalsAcPluginMedia(
  credentials: GoalsAcPluginCredentials,
  payload: GoalsAcMediaUploadPayload,
): Promise<GoalsAcMediaUploadResult> {
  const result = await goalsAcRequest<{ id: number; source_url: string }>(
    credentials,
    "POST",
    "media",
    {
      filename: payload.filename,
      mime_type: payload.mimeType,
      data: payload.dataBase64,
      alt: payload.alt,
      title: payload.title,
      caption: payload.caption,
    },
  );

  return {
    id: result.id,
    sourceUrl: result.source_url,
  };
}
