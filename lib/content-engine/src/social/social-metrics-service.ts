import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  contentPiecesTable,
  socialPostMetricsTable,
  SOCIAL_FORMAT_TYPES,
  type SocialPlatformId,
} from "@workspace/db/schema";
import { fetchLinkedInPostMetrics } from "@workspace/connectors/linkedin";
import { fetchTwitterPostMetrics } from "@workspace/connectors/twitter";
import {
  fetchFacebookPostMetrics,
  fetchInstagramPostMetrics,
} from "@workspace/connectors/meta";
import { fetchBlueskyPostMetrics } from "@workspace/connectors/bluesky";
import { fetchMastodonPostMetrics } from "@workspace/connectors/mastodon";
import type { NormalizedPostMetrics } from "@workspace/connectors/social-metrics-types";
import {
  decryptCmsCredentials,
  type CmsIntegrationCredentials,
} from "../support/publishing/cms-integrations";
import { getSocialAccessToken } from "../support/social/social-tokens";
import { logger } from "../core/logger";

const SOCIAL_FORMAT_LIST = [...SOCIAL_FORMAT_TYPES];

export type SocialMetricsSyncResult = {
  rowsUpserted: number;
  errors: number;
};

export type SocialMetricsSyncStatus = {
  lastSyncedAt: string | null;
  postCount: number;
};

export type SocialPerformanceRow = {
  contentPieceId: number;
  title: string;
  platform: string;
  publishedUrl: string | null;
  scheduledAt: string | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  syncedAt: string | null;
};

export async function seedSocialPostMetrics(params: {
  contentPieceId: number;
  platform: string;
  remotePostId: string;
}): Promise<void> {
  await db
    .insert(socialPostMetricsTable)
    .values({
      contentPieceId: params.contentPieceId,
      platform: params.platform,
      remotePostId: params.remotePostId,
    })
    .onConflictDoUpdate({
      target: [socialPostMetricsTable.contentPieceId, socialPostMetricsTable.platform],
      set: {
        remotePostId: params.remotePostId,
        syncedAt: new Date(),
      },
    });
}

async function upsertMetrics(
  contentPieceId: number,
  platform: string,
  remotePostId: string,
  metrics: NormalizedPostMetrics,
): Promise<void> {
  await db
    .insert(socialPostMetricsTable)
    .values({
      contentPieceId,
      platform,
      remotePostId,
      impressions: metrics.impressions,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      clicks: metrics.clicks,
    })
    .onConflictDoUpdate({
      target: [socialPostMetricsTable.contentPieceId, socialPostMetricsTable.platform],
      set: {
        remotePostId,
        impressions: metrics.impressions,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        clicks: metrics.clicks,
        syncedAt: new Date(),
      },
    });
}

async function fetchPlatformMetrics(
  platform: SocialPlatformId,
  remotePostId: string,
  creds: CmsIntegrationCredentials,
  projectId: number,
  userId: number,
): Promise<NormalizedPostMetrics> {
  switch (platform) {
    case "linkedin": {
      if (!creds.linkedin) return { impressions: null, likes: null, comments: null, shares: null, clicks: null };
      const accessToken = await getSocialAccessToken(projectId, userId, "linkedin");
      return fetchLinkedInPostMetrics(
        { accessToken, authorUrn: creds.linkedin.authorUrn },
        remotePostId,
      );
    }
    case "twitter": {
      if (!creds.twitter) return { impressions: null, likes: null, comments: null, shares: null, clicks: null };
      const accessToken = await getSocialAccessToken(projectId, userId, "twitter");
      return fetchTwitterPostMetrics({ accessToken }, remotePostId);
    }
    case "facebook": {
      if (!creds.meta) return { impressions: null, likes: null, comments: null, shares: null, clicks: null };
      const accessToken = await getSocialAccessToken(projectId, userId, "meta");
      return fetchFacebookPostMetrics(
        { accessToken, pageId: creds.meta.pageId, instagramAccountId: creds.meta.instagramAccountId },
        remotePostId,
      );
    }
    case "instagram": {
      if (!creds.meta) return { impressions: null, likes: null, comments: null, shares: null, clicks: null };
      const accessToken = await getSocialAccessToken(projectId, userId, "meta");
      return fetchInstagramPostMetrics(
        { accessToken, pageId: creds.meta.pageId, instagramAccountId: creds.meta.instagramAccountId },
        remotePostId,
      );
    }
    case "bluesky": {
      if (!creds.bluesky) return { impressions: null, likes: null, comments: null, shares: null, clicks: null };
      return fetchBlueskyPostMetrics(creds.bluesky, remotePostId);
    }
    case "mastodon": {
      if (!creds.mastodon) return { impressions: null, likes: null, comments: null, shares: null, clicks: null };
      return fetchMastodonPostMetrics(creds.mastodon, remotePostId);
    }
    default:
      return { impressions: null, likes: null, comments: null, shares: null, clicks: null };
  }
}

export async function syncSocialPostMetrics(
  projectId: number,
  userId: number,
): Promise<SocialMetricsSyncResult> {
  const { websiteProjectsTable } = await import("@workspace/db/schema");
  const [projectRow] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations, userId: websiteProjectsTable.userId })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!projectRow) throw new Error("Project not found");

  const creds = decryptCmsCredentials(
    (projectRow.cmsIntegrations ?? {}) as CmsIntegrationCredentials,
  );
  const resolvedUserId = userId || projectRow.userId;

  const publishedPieces = await db
    .select({
      id: contentPiecesTable.id,
      publishPlatform: contentPiecesTable.publishPlatform,
    })
    .from(contentPiecesTable)
    .where(
      and(
        eq(contentPiecesTable.websiteProjectId, projectId),
        eq(contentPiecesTable.status, "published"),
        inArray(contentPiecesTable.formatType, SOCIAL_FORMAT_LIST),
      ),
    );

  let rowsUpserted = 0;
  let errors = 0;

  for (const piece of publishedPieces) {
    const platform = piece.publishPlatform as SocialPlatformId | null;
    if (!platform) continue;

    const [metricsRow] = await db
      .select()
      .from(socialPostMetricsTable)
      .where(
        and(
          eq(socialPostMetricsTable.contentPieceId, piece.id),
          eq(socialPostMetricsTable.platform, platform),
        ),
      )
      .limit(1);

    const remotePostId = metricsRow?.remotePostId;
    if (!remotePostId) continue;

    try {
      const metrics = await fetchPlatformMetrics(
        platform,
        remotePostId,
        creds,
        projectId,
        resolvedUserId,
      );
      await upsertMetrics(piece.id, platform, remotePostId, metrics);
      rowsUpserted += 1;
    } catch (err) {
      errors += 1;
      logger.warn({ err, contentPieceId: piece.id, platform }, "Social metrics fetch failed");
    }
  }

  return { rowsUpserted, errors };
}

export async function getSocialMetricsSyncStatus(projectId: number): Promise<SocialMetricsSyncStatus> {
  const [stats] = await db
    .select({
      lastSyncedAt: sql<string | null>`max(${socialPostMetricsTable.syncedAt})`,
      postCount: sql<number>`count(*)::int`,
    })
    .from(socialPostMetricsTable)
    .innerJoin(contentPiecesTable, eq(socialPostMetricsTable.contentPieceId, contentPiecesTable.id))
    .where(eq(contentPiecesTable.websiteProjectId, projectId));

  return {
    lastSyncedAt: stats?.lastSyncedAt ?? null,
    postCount: stats?.postCount ?? 0,
  };
}

export async function getSocialPerformance(
  projectId: number,
  filters?: { platform?: SocialPlatformId; days?: number },
): Promise<{ rows: SocialPerformanceRow[]; totals: NormalizedPostMetrics }> {
  const days = filters?.days ?? 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const conditions = [
    eq(contentPiecesTable.websiteProjectId, projectId),
    inArray(contentPiecesTable.formatType, SOCIAL_FORMAT_LIST),
    eq(contentPiecesTable.status, "published"),
  ];
  if (filters?.platform) {
    conditions.push(eq(contentPiecesTable.publishPlatform, filters.platform));
  }

  const rows = await db
    .select({
      contentPieceId: contentPiecesTable.id,
      title: contentPiecesTable.title,
      platform: contentPiecesTable.publishPlatform,
      publishedUrl: contentPiecesTable.publishedUrl,
      scheduledAt: contentPiecesTable.scheduledAt,
      impressions: socialPostMetricsTable.impressions,
      likes: socialPostMetricsTable.likes,
      comments: socialPostMetricsTable.comments,
      shares: socialPostMetricsTable.shares,
      clicks: socialPostMetricsTable.clicks,
      syncedAt: socialPostMetricsTable.syncedAt,
    })
    .from(contentPiecesTable)
    .leftJoin(
      socialPostMetricsTable,
      and(
        eq(socialPostMetricsTable.contentPieceId, contentPiecesTable.id),
        eq(socialPostMetricsTable.platform, contentPiecesTable.publishPlatform),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(contentPiecesTable.updatedAt))
    .limit(200);

  const performanceRows: SocialPerformanceRow[] = rows.map((r) => ({
    contentPieceId: r.contentPieceId,
    title: r.title,
    platform: r.platform ?? "unknown",
    publishedUrl: r.publishedUrl,
    scheduledAt: r.scheduledAt?.toISOString() ?? null,
    impressions: r.impressions,
    likes: r.likes,
    comments: r.comments,
    shares: r.shares,
    clicks: r.clicks,
    syncedAt: r.syncedAt?.toISOString() ?? null,
  }));

  const totals = performanceRows.reduce(
    (acc, row) => ({
      impressions: (acc.impressions ?? 0) + (row.impressions ?? 0),
      likes: (acc.likes ?? 0) + (row.likes ?? 0),
      comments: (acc.comments ?? 0) + (row.comments ?? 0),
      shares: (acc.shares ?? 0) + (row.shares ?? 0),
      clicks: (acc.clicks ?? 0) + (row.clicks ?? 0),
    }),
    { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 } as NormalizedPostMetrics,
  );

  return { rows: performanceRows, totals };
}

export async function sweepSocialMetricsSyncProjects(): Promise<void> {
  const { websiteProjectsTable } = await import("@workspace/db/schema");
  const projects = await db
    .select({ id: websiteProjectsTable.id, userId: websiteProjectsTable.userId })
    .from(websiteProjectsTable);

  for (const project of projects) {
    try {
      await syncSocialPostMetrics(project.id, project.userId);
    } catch (err) {
      logger.warn({ err, projectId: project.id }, "Social metrics sweep failed");
    }
  }
}

/** Hour with highest average engagement from synced metrics (for analytics slot mode). */
export async function getTopEngagementHour(projectId: number, platform: SocialPlatformId): Promise<number | null> {
  const { rows } = await getSocialPerformance(projectId, { platform, days: 30 });
  if (rows.length === 0) return null;

  const hourScores = new Map<number, { total: number; count: number }>();
  for (const row of rows) {
    if (!row.scheduledAt) continue;
    const hour = new Date(row.scheduledAt).getUTCHours();
    const engagement =
      (row.likes ?? 0) + (row.comments ?? 0) + (row.shares ?? 0) + (row.clicks ?? 0);
    const current = hourScores.get(hour) ?? { total: 0, count: 0 };
    hourScores.set(hour, { total: current.total + engagement, count: current.count + 1 });
  }

  let bestHour: number | null = null;
  let bestAvg = -1;
  for (const [hour, { total, count }] of hourScores) {
    const avg = total / count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestHour = hour;
    }
  }
  return bestHour;
}
