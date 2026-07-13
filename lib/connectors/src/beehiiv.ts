import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface BeehiivCredentials {
  apiKey: string;
  publicationId: string;
}

export interface BeehiivPostResult {
  postId: string;
  url: string;
}

const BEEHIIV_API = "https://api.beehiiv.com/v2";

export async function publishToBeehiiv(
  credentials: BeehiivCredentials,
  title: string,
  bodyMarkdown: string,
): Promise<BeehiivPostResult> {
  const url = `${BEEHIIV_API}/publications/${credentials.publicationId}/posts`;
  await assertPublicUrl(url);
  const htmlContent = await marked(bodyMarkdown);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      subtitle: title,
      content_html: htmlContent,
      status: "draft",
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Beehiiv API error: ${res.status}`);
  }

  const data = (await res.json()) as { data?: { id?: string; web_url?: string } };
  return {
    postId: data.data?.id ?? "",
    url: data.data?.web_url ?? `https://app.beehiiv.com/posts/${data.data?.id ?? ""}`,
  };
}

export async function testBeehiivConnection(
  credentials: BeehiivCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `${BEEHIIV_API}/publications/${credentials.publicationId}`;
    await assertPublicUrl(url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.apiKey}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid API key or publication ID" };
    }
    return { ok: false, error: `Beehiiv API error: ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
