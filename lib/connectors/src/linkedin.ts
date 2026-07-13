import type { NormalizedPostMetrics } from "./social-metrics-types";
import { EMPTY_POST_METRICS } from "./social-metrics-types";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { downloadAndOptimizeImage } from "@workspace/media";

export interface LinkedInCredentials {
  accessToken: string;
  authorUrn: string;
}

export interface LinkedInPublishResult {
  postId: string;
  postUrl: string;
}

export interface LinkedInImageOptions {
  imageUrl?: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
  imageFilename?: string;
  visibility?: "PUBLIC" | "CONNECTIONS";
}

const LINKEDIN_API = "https://api.linkedin.com";

function markdownToLinkedInText(bodyMarkdown: string): string {
  return bodyMarkdown
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function uploadLinkedInImage(
  credentials: LinkedInCredentials,
  buffer: Buffer,
  filename: string,
): Promise<string> {
  await assertPublicUrl(LINKEDIN_API);

  const initRes = await fetch(`${LINKEDIN_API}/rest/images?action=initializeUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
      "Linkedin-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: credentials.authorUrn,
      },
    }),
  });

  if (!initRes.ok) {
    const errText = await initRes.text().catch(() => "");
    throw new Error(`LinkedIn image init failed: ${initRes.status}${errText ? ` — ${errText.slice(0, 200)}` : ""}`);
  }

  const initData = (await initRes.json()) as {
    value?: { uploadUrl?: string; image?: string };
  };
  const uploadUrl = initData.value?.uploadUrl;
  const imageUrn = initData.value?.image;
  if (!uploadUrl || !imageUrn) {
    throw new Error("LinkedIn image init returned incomplete data");
  }

  await assertPublicUrl(uploadUrl);

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(buffer),
  });

  if (!uploadRes.ok) {
    throw new Error(`LinkedIn image upload failed: ${uploadRes.status}`);
  }

  return imageUrn;
}

async function resolveImageBuffer(
  options: LinkedInImageOptions,
  filenameBase: string,
): Promise<{ buffer: Buffer; filename: string } | null> {
  if (options.imageBuffer) {
    return {
      buffer: options.imageBuffer,
      filename: options.imageFilename ?? `${filenameBase}.webp`,
    };
  }
  if (options.imageUrl) {
    const optimized = await downloadAndOptimizeImage(options.imageUrl, filenameBase);
    return { buffer: optimized.buffer, filename: optimized.filename };
  }
  return null;
}

export async function publishToLinkedIn(
  credentials: LinkedInCredentials,
  title: string,
  bodyMarkdown: string,
  options?: LinkedInImageOptions,
): Promise<LinkedInPublishResult> {
  await assertPublicUrl(LINKEDIN_API);

  const commentary = markdownToLinkedInText(
    title ? `${title}\n\n${bodyMarkdown}` : bodyMarkdown,
  ).slice(0, 3000);

  const filenameBase = title.slice(0, 40) || "post-image";
  const imagePayload = await resolveImageBuffer(options ?? {}, filenameBase);

  let imageUrn: string | undefined;
  if (imagePayload) {
    imageUrn = await uploadLinkedInImage(
      credentials,
      imagePayload.buffer,
      imagePayload.filename,
    );
  }

  const postBody: Record<string, unknown> = {
    author: credentials.authorUrn,
    commentary,
    visibility: options?.visibility ?? "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED" },
    lifecycleState: "PUBLISHED",
  };

  if (imageUrn) {
    postBody.content = { media: { id: imageUrn } };
  }

  const response = await fetch(`${LINKEDIN_API}/rest/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
      "Linkedin-Version": "202401",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(postBody),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("LinkedIn token expired. Reconnect in Project Settings → Publishing.");
    }
    const errText = await response.text().catch(() => "");
    throw new Error(`LinkedIn API error: ${response.status}${errText ? ` — ${errText.slice(0, 200)}` : ""}`);
  }

  const postId = response.headers.get("x-restli-id") ?? "";
  if (!postId) {
    const data = (await response.json().catch(() => ({}))) as { id?: string };
    const id = data.id ?? "unknown";
    return {
      postId: id,
      postUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}`,
    };
  }

  return {
    postId,
    postUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`,
  };
}

export async function testLinkedInConnection(
  credentials: LinkedInCredentials,
): Promise<{ ok: boolean; displayName?: string; error?: string }> {
  try {
    await assertPublicUrl(LINKEDIN_API);
    const res = await fetch(`${LINKEDIN_API}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    if (!res.ok) {
      return { ok: false, error: res.status === 401 ? "Token expired or invalid" : `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { name?: string; sub?: string };
    return { ok: true, displayName: data.name ?? data.sub };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

export async function fetchLinkedInAuthorUrn(accessToken: string): Promise<string> {
  await assertPublicUrl(LINKEDIN_API);
  const res = await fetch(`${LINKEDIN_API}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch LinkedIn profile");
  const data = (await res.json()) as { sub?: string };
  if (!data.sub) throw new Error("LinkedIn profile missing member id");
  return `urn:li:person:${data.sub}`;
}

/** Best-effort engagement for a share URN (may return partial data). */
export async function fetchLinkedInPostMetrics(
  credentials: LinkedInCredentials,
  postId: string,
): Promise<NormalizedPostMetrics> {
  await assertPublicUrl(LINKEDIN_API);
  const urn = postId.startsWith("urn:") ? postId : `urn:li:share:${postId}`;
  const res = await fetch(
    `${LINKEDIN_API}/rest/socialActions/${encodeURIComponent(urn)}`,
    {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Linkedin-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    },
  );
  if (!res.ok) return { ...EMPTY_POST_METRICS };
  const data = (await res.json()) as {
    likesSummary?: { totalLikes?: number };
    commentsSummary?: { totalFirstLevelComments?: number };
  };
  return {
    impressions: null,
    likes: data.likesSummary?.totalLikes ?? null,
    comments: data.commentsSummary?.totalFirstLevelComments ?? null,
    shares: null,
    clicks: null,
  };
}
