import { db } from "@workspace/db";
import {
  brandProfilesTable,
  SOCIAL_PLATFORM_IDS,
  type SocialPlatformId,
  type SocialHistorySyncMeta,
  type SocialHistorySyncPlatformStatus,
} from "@workspace/db/schema";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { fetchBlueskyAuthorPosts } from "@workspace/connectors/bluesky";
import { ingestBrandVoiceDocuments } from "../brand/brand-voice-indexer";
import {
  decryptCmsCredentials,
  type CmsIntegrationCredentials,
} from "../support/publishing/cms-integrations";
import { refreshLinkedInToken } from "../support/social/social-tokens";
import { mergeImportedSamples } from "../platform-voice/platform-voice-import-service";
import { defaultChannelForPlatform } from "../platform-voice/registry";
import { logger } from "../core/logger";

const MAX_SOCIAL_POSTS = 50;
const GRAPH_API = "https://graph.facebook.com/v21.0";

type BrandVoiceSocialSource =
  | "social_linkedin"
  | "social_twitter"
  | "social_facebook"
  | "social_instagram"
  | "social_bluesky"
  | "social_mastodon";

const PLATFORM_BRAND_SOURCE: Record<SocialPlatformId, BrandVoiceSocialSource> = {
  linkedin: "social_linkedin",
  twitter: "social_twitter",
  facebook: "social_facebook",
  instagram: "social_instagram",
  bluesky: "social_bluesky",
  mastodon: "social_mastodon",
};

export type SocialHistorySyncResult = {
  platform: SocialPlatformId;
  postCount: number;
  brandVoiceIngested: boolean;
  platformVoiceUpdated: boolean;
  error?: string;
};

export type SocialHistorySyncStatus = {
  platforms: Partial<Record<SocialPlatformId, SocialHistorySyncPlatformStatus>>;
};

async function loadProjectCreds(projectId: number): Promise<CmsIntegrationCredentials | null> {
  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) return null;
  return decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
}

async function persistPlatformVoice(
  projectId: number,
  platform: SocialPlatformId,
  samples: string[],
): Promise<boolean> {
  if (samples.length === 0) return false;

  const [brand] = await db
    .select({ platformVoices: brandProfilesTable.platformVoices })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, projectId))
    .limit(1);
  if (!brand) return false;

  const platformVoices = mergeImportedSamples({
    voices: brand.platformVoices,
    platform,
    channel: defaultChannelForPlatform(platform),
    samples,
    source: "oauth",
  });

  await db
    .update(brandProfilesTable)
    .set({ platformVoices })
    .where(eq(brandProfilesTable.websiteProjectId, projectId));

  return true;
}

async function ingestBrandVoicePosts(
  projectId: number,
  platform: SocialPlatformId,
  sourceKey: string,
  title: string,
  posts: string[],
): Promise<boolean> {
  if (posts.length === 0) return false;
  const combined = posts.join("\n\n---\n\n");
  await ingestBrandVoiceDocuments(projectId, [
    {
      sourceType: PLATFORM_BRAND_SOURCE[platform],
      sourceUrl: sourceKey,
      title,
      text: combined,
      metadata: { postCount: posts.length },
      replaceExisting: true,
    },
  ]);
  return true;
}

async function updateSyncMeta(
  projectId: number,
  platform: SocialPlatformId,
  status: SocialHistorySyncPlatformStatus,
): Promise<void> {
  const [project] = await db
    .select({ socialHistorySyncMeta: websiteProjectsTable.socialHistorySyncMeta })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) return;

  const current = (project.socialHistorySyncMeta ?? {}) as SocialHistorySyncMeta;
  await db
    .update(websiteProjectsTable)
    .set({
      socialHistorySyncMeta: {
        ...current,
        [platform]: status,
      },
    })
    .where(eq(websiteProjectsTable.id, projectId));
}

async function fetchLinkedInPosts(
  projectId: number,
  userId: number,
  creds: CmsIntegrationCredentials,
): Promise<string[]> {
  if (!creds.linkedin?.accessToken || !creds.linkedin.authorUrn) return [];
  const accessToken = await refreshLinkedInToken(projectId, userId);
  const res = await fetch(
    `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(creds.linkedin.authorUrn)})&count=${MAX_SOCIAL_POSTS}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    },
  );
  if (!res.ok) {
    throw new Error(res.status === 403 ? "LinkedIn permission denied — reconnect your account" : `LinkedIn API error: ${res.status}`);
  }
  const data = (await res.json()) as { elements?: Array<{ commentary?: string; text?: string }> };
  return (data.elements ?? [])
    .map((post) => (post.commentary ?? post.text ?? "").trim())
    .filter(Boolean);
}

async function fetchTwitterPosts(creds: CmsIntegrationCredentials): Promise<string[]> {
  if (!creds.twitter?.accessToken || !creds.twitter.userId) return [];
  const res = await fetch(
    `https://api.twitter.com/2/users/${creds.twitter.userId}/tweets?max_results=${Math.min(MAX_SOCIAL_POSTS, 100)}&tweet.fields=text`,
    { headers: { Authorization: `Bearer ${creds.twitter.accessToken}` } },
  );
  if (!res.ok) {
    throw new Error(res.status === 403 ? "X permission denied — reconnect your account" : `X API error: ${res.status}`);
  }
  const data = (await res.json()) as { data?: Array<{ text?: string }> };
  return (data.data ?? []).map((t) => (t.text ?? "").trim()).filter(Boolean);
}

async function fetchFacebookPosts(creds: CmsIntegrationCredentials): Promise<string[]> {
  if (!creds.meta?.accessToken || !creds.meta.pageId) return [];
  const url = `${GRAPH_API}/${creds.meta.pageId}/posts?fields=message&limit=${MAX_SOCIAL_POSTS}&access_token=${encodeURIComponent(creds.meta.accessToken)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(res.status === 403 ? "Facebook permission denied — reconnect Meta" : `Facebook API error: ${res.status}`);
  }
  const data = (await res.json()) as { data?: Array<{ message?: string }> };
  return (data.data ?? []).map((p) => (p.message ?? "").trim()).filter(Boolean);
}

async function fetchInstagramPosts(creds: CmsIntegrationCredentials): Promise<string[]> {
  if (!creds.meta?.accessToken || !creds.meta.instagramAccountId) return [];
  const url = `${GRAPH_API}/${creds.meta.instagramAccountId}/media?fields=caption&limit=${MAX_SOCIAL_POSTS}&access_token=${encodeURIComponent(creds.meta.accessToken)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(res.status === 403 ? "Instagram permission denied — reconnect Meta" : `Instagram API error: ${res.status}`);
  }
  const data = (await res.json()) as { data?: Array<{ caption?: string }> };
  return (data.data ?? []).map((p) => (p.caption ?? "").trim()).filter(Boolean);
}

async function fetchBlueskyPosts(creds: CmsIntegrationCredentials): Promise<string[]> {
  if (!creds.bluesky) return [];
  return fetchBlueskyAuthorPosts(creds.bluesky, MAX_SOCIAL_POSTS);
}

async function fetchMastodonPosts(creds: CmsIntegrationCredentials): Promise<string[]> {
  if (!creds.mastodon?.accessToken || !creds.mastodon.accountId || !creds.mastodon.instanceUrl) return [];
  const origin = creds.mastodon.instanceUrl.replace(/\/+$/, "");
  const url = `${origin}/api/v1/accounts/${creds.mastodon.accountId}/statuses?limit=${MAX_SOCIAL_POSTS}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${creds.mastodon.accessToken}` },
  });
  if (!res.ok) {
    throw new Error(res.status === 403 ? "Mastodon permission denied — reconnect your account" : `Mastodon API error: ${res.status}`);
  }
  const data = (await res.json()) as Array<{ content?: string }>;
  return data
    .map((s) =>
      (s.content ?? "")
        .replace(/<[^>]+>/g, "")
        .trim(),
    )
    .filter(Boolean);
}

const FETCHERS: Record<
  SocialPlatformId,
  (projectId: number, userId: number, creds: CmsIntegrationCredentials) => Promise<string[]>
> = {
  linkedin: (projectId, userId, creds) => fetchLinkedInPosts(projectId, userId, creds),
  twitter: (_projectId, _userId, creds) => fetchTwitterPosts(creds),
  facebook: (_projectId, _userId, creds) => fetchFacebookPosts(creds),
  instagram: (_projectId, _userId, creds) => fetchInstagramPosts(creds),
  bluesky: (_projectId, _userId, creds) => fetchBlueskyPosts(creds),
  mastodon: (_projectId, _userId, creds) => fetchMastodonPosts(creds),
};

const PLATFORM_TITLES: Record<SocialPlatformId, string> = {
  linkedin: "LinkedIn posts",
  twitter: "Twitter/X posts",
  facebook: "Facebook posts",
  instagram: "Instagram captions",
  bluesky: "Bluesky posts",
  mastodon: "Mastodon toots",
};

function sourceKeyForPlatform(platform: SocialPlatformId, creds: CmsIntegrationCredentials): string {
  switch (platform) {
    case "linkedin":
      return `linkedin:posts:${creds.linkedin?.authorUrn ?? ""}`;
    case "twitter":
      return `twitter:user:${creds.twitter?.userId ?? ""}`;
    case "facebook":
      return `facebook:page:${creds.meta?.pageId ?? ""}`;
    case "instagram":
      return `instagram:account:${creds.meta?.instagramAccountId ?? ""}`;
    case "bluesky":
      return `bluesky:did:${creds.bluesky?.did ?? ""}`;
    case "mastodon":
      return `mastodon:account:${creds.mastodon?.accountId ?? ""}`;
  }
}

export async function syncSocialHistoryForPlatform(
  projectId: number,
  userId: number,
  platform: SocialPlatformId,
): Promise<SocialHistorySyncResult> {
  const creds = await loadProjectCreds(projectId);
  if (!creds) {
    return { platform, postCount: 0, brandVoiceIngested: false, platformVoiceUpdated: false, error: "Project not found" };
  }

  try {
    const posts = await FETCHERS[platform](projectId, userId, creds);
    const brandVoiceIngested = await ingestBrandVoicePosts(
      projectId,
      platform,
      sourceKeyForPlatform(platform, creds),
      PLATFORM_TITLES[platform],
      posts,
    );
    const platformVoiceUpdated = await persistPlatformVoice(projectId, platform, posts);

    const status: SocialHistorySyncPlatformStatus = {
      lastSyncedAt: new Date().toISOString(),
      postCount: posts.length,
    };
    await updateSyncMeta(projectId, platform, status);

    return { platform, postCount: posts.length, brandVoiceIngested, platformVoiceUpdated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    logger.warn({ err, projectId, platform }, "Social history sync failed");
    await updateSyncMeta(projectId, platform, { error: message, lastSyncedAt: new Date().toISOString() });
    return {
      platform,
      postCount: 0,
      brandVoiceIngested: false,
      platformVoiceUpdated: false,
      error: message,
    };
  }
}

export async function syncSocialHistory(
  projectId: number,
  userId: number,
  platformFilter?: SocialPlatformId,
): Promise<SocialHistorySyncResult[]> {
  const platforms = platformFilter ? [platformFilter] : [...SOCIAL_PLATFORM_IDS];
  const results: SocialHistorySyncResult[] = [];
  for (const platform of platforms) {
    results.push(await syncSocialHistoryForPlatform(projectId, userId, platform));
  }
  return results;
}

export async function getSocialHistorySyncStatus(projectId: number): Promise<SocialHistorySyncStatus> {
  const [project] = await db
    .select({
      socialHistorySyncMeta: websiteProjectsTable.socialHistorySyncMeta,
      cmsIntegrations: websiteProjectsTable.cmsIntegrations,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  const meta = (project?.socialHistorySyncMeta ?? {}) as SocialHistorySyncMeta;
  const creds = project
    ? decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials)
    : null;

  const platforms: Partial<Record<SocialPlatformId, SocialHistorySyncPlatformStatus>> = {};
  for (const platform of SOCIAL_PLATFORM_IDS) {
    const connected = Boolean(
      platform === "linkedin"
        ? creds?.linkedin?.accessToken
        : platform === "twitter"
          ? creds?.twitter?.accessToken
          : platform === "facebook" || platform === "instagram"
            ? creds?.meta?.accessToken
            : platform === "bluesky"
              ? creds?.bluesky?.accessToken
              : creds?.mastodon?.accessToken,
    );
    platforms[platform] = {
      connected,
      ...meta[platform],
    };
  }

  return { platforms };
}

export async function sweepSocialHistorySyncProjects(): Promise<void> {
  const projects = await db
    .select({ id: websiteProjectsTable.id, userId: websiteProjectsTable.userId })
    .from(websiteProjectsTable);

  for (const project of projects) {
    try {
      await syncSocialHistory(project.id, project.userId);
    } catch (err) {
      logger.warn({ err, projectId: project.id }, "Social history sweep failed for project");
    }
  }
}
