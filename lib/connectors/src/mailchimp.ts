import { marked } from "marked";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

export interface MailchimpCredentials {
  apiKey: string;
  serverPrefix: string;
  listId: string;
}

export interface MailchimpPostResult {
  campaignId: string;
  url: string;
}

export async function publishToMailchimp(
  credentials: MailchimpCredentials,
  title: string,
  bodyMarkdown: string,
): Promise<MailchimpPostResult> {
  const base = `https://${credentials.serverPrefix}.api.mailchimp.com/3.0`;
  const htmlContent = await marked(bodyMarkdown);

  const createUrl = `${base}/campaigns`;
  await assertPublicUrl(createUrl);

  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "regular",
      recipients: { list_id: credentials.listId },
      settings: {
        subject_line: title,
        title,
        from_name: "goals.ac",
        reply_to: "noreply@goals.ac",
      },
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.json().catch(() => ({})) as { detail?: string };
    throw new Error(body.detail ?? `Mailchimp campaign create error: ${createRes.status}`);
  }

  const campaign = (await createRes.json()) as { id?: string };
  const campaignId = campaign.id ?? "";

  const contentUrl = `${base}/campaigns/${campaignId}/content`;
  await assertPublicUrl(contentUrl);
  const contentRes = await fetch(contentUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ html: htmlContent }),
  });

  if (!contentRes.ok) {
    const body = await contentRes.json().catch(() => ({})) as { detail?: string };
    throw new Error(body.detail ?? `Mailchimp content error: ${contentRes.status}`);
  }

  return {
    campaignId,
    url: `https://${credentials.serverPrefix}.admin.mailchimp.com/campaigns/edit?id=${campaignId}`,
  };
}

export async function testMailchimpConnection(
  credentials: MailchimpCredentials,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `https://${credentials.serverPrefix}.api.mailchimp.com/3.0/lists/${credentials.listId}`;
    await assertPublicUrl(url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.apiKey}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid API key or list ID" };
    }
    return { ok: false, error: `Mailchimp API error: ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}
