import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface ConvertKitCredentials {
  apiSecret: string;
  formId?: string;
}

export interface ConvertKitPostResult {
  broadcastId: string;
  url: string;
}

const CONVERTKIT_API = "https://api.convertkit.com/v3";

export async function publishToConvertKit(
  credentials: ConvertKitCredentials,
  title: string,
  bodyMarkdown: string,
): Promise<ConvertKitPostResult> {
  const url = `${CONVERTKIT_API}/broadcasts`;
  await assertPublicUrl(url);
  const htmlContent = await marked(bodyMarkdown);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_secret: credentials.apiSecret,
      subject: title,
      content: htmlContent,
      description: title,
      public: false,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string; error?: string };
    throw new Error(body.message ?? body.error ?? `ConvertKit API error: ${res.status}`);
  }

  const data = (await res.json()) as { broadcast?: { id?: number } };
  const broadcastId = String(data.broadcast?.id ?? "");
  return {
    broadcastId,
    url: `https://app.convertkit.com/broadcasts/${broadcastId}`,
  };
}

export async function testConvertKitConnection(
  credentials: ConvertKitCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `${CONVERTKIT_API}/account?api_secret=${encodeURIComponent(credentials.apiSecret)}`;
    await assertPublicUrl(url);
    const res = await fetch(url);
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid API secret" };
    }
    return { ok: false, error: `ConvertKit API error: ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
