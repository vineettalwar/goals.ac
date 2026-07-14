import crypto from "crypto";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { connectorFetch } from "@workspace/connectors/connector-fetch";

export interface WebhookCredentials {
  url: string;
  signingSecret: string;
}

export interface WebhookArticlePayload {
  title: string;
  slug?: string;
  bodyMarkdown: string;
  bodyHtml?: string;
  metaDescription?: string;
  keywords?: string[];
  faq?: { question: string; answer: string }[];
  citations?: { text: string; url: string; source: string }[];
  jsonLd?: object;
  publishedStatus: "draft" | "publish";
  /** Full structured export (webhook v2, BYOK+) */
  canonical?: {
    id: string;
    markdown: string;
    meta: Record<string, unknown>;
    formatType?: string;
  };
}

export interface WebhookPublishResult {
  status: number;
  body?: string;
}

function sign(secret: string, rawBody: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

async function postEvent(
  credentials: WebhookCredentials,
  event: string,
  payload: unknown
): Promise<WebhookPublishResult> {
  await assertPublicUrl(credentials.url);

  const rawBody = JSON.stringify(payload);
  const signature = sign(credentials.signingSecret, rawBody);

  const res = await connectorFetch(credentials.url, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      "X-GoalsAC-Event": event,
      "X-GoalsAC-Signature": signature,
    },
    body: rawBody,
  });

  if (res.status >= 300 && res.status < 400) {
    throw new Error("Webhook redirects are not allowed");
  }

  const bodyText = await res.text().catch(() => undefined);

  if (!res.ok) {
    throw new Error(`Webhook endpoint returned HTTP ${res.status}`);
  }

  return { status: res.status, body: bodyText };
}

export async function publishToWebhook(
  credentials: WebhookCredentials,
  article: WebhookArticlePayload
): Promise<WebhookPublishResult> {
  return postEvent(credentials, "article.publish", article);
}

export async function testWebhookConnection(
  credentials: WebhookCredentials
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const result = await postEvent(credentials, "article.test", {
      message: "This is a test ping from goals.ac to verify your webhook connection.",
      sentAt: new Date().toISOString(),
    });
    return { ok: true, status: result.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
