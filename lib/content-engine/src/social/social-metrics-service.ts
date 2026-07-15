import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, countAsInt } from "@workspace/db";
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
      postCount: countAsInt(),
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

/** Minimum published posts with metrics before analytics slot bias is applied. */
export const MIN_ENGAGEMENT_SLOT_SAMPLES = 3;

export type EngagementPostedSample = {
  postedAt: Date;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  impressions: number | null;
};

export type EngagementSlotBias = {
  /** Local hours (0–23), strongest first. */
  preferredHours: number[];
  /** Local weekdays (0=Sun … 6=Sat), strongest first. */
  preferredDays: number[];
  sampleSize: number;
  /** True when sampleSize meets the minimum and at least one hour/day beat the prior. */
  sufficient: boolean;
};

/** Engagement weight: comments/shares/clicks count more than likes; impressions are a weak prior signal. */
export function scoreSocialEngagement(sample: EngagementPostedSample): number {
  const interactions =
    (sample.likes ?? 0) +
    (sample.comments ?? 0) * 2 +
    (sample.shares ?? 0) * 3 +
    (sample.clicks ?? 0) * 2;
  if (interactions > 0) return interactions;
  // Posts with only impression counts still contribute a weak signal.
  return (sample.impressions ?? 0) * 0.01;
}

function localHourAndDow(
  date: Date,
  timeZone: string,
): { hour: number; dow: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekday = get("weekday");
  const dowMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  // Intl may emit "24" for midnight in some locales; normalize to 0.
  const hourRaw = Number(get("hour"));
  const hour = hourRaw === 24 ? 0 : hourRaw;
  return { hour, dow: dowMap[weekday] ?? 0 };
}

type BucketScore = { total: number; count: number };

function bayesianAvg(bucket: BucketScore, priorMean: number, priorStrength: number): number {
  return (bucket.total + priorMean * priorStrength) / (bucket.count + priorStrength);
}

function rankBuckets(
  buckets: Map<number, BucketScore>,
  priorMean: number,
  priorStrength: number,
  limit: number,
): number[] {
  return [...buckets.entries()]
    .map(([key, bucket]) => ({
      key,
      score: bayesianAvg(bucket, priorMean, priorStrength),
      count: bucket.count,
    }))
    .filter((entry) => entry.score > priorMean || entry.count >= 2)
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, limit)
    .map((entry) => entry.key);
}

/**
 * Pure scorer for analytics best-time mode.
 * Buckets posts by project-local hour and weekday; shrinks sparse buckets toward the mean.
 */
export function buildEngagementSlotBias(
  samples: EngagementPostedSample[],
  timeZone: string,
  options?: { minSamples?: number; topHours?: number; topDays?: number },
): EngagementSlotBias | null {
  const minSamples = options?.minSamples ?? MIN_ENGAGEMENT_SLOT_SAMPLES;
  const topHours = options?.topHours ?? 3;
  const topDays = options?.topDays ?? 4;
  const priorStrength = 2;

  const usable = samples.filter((sample) => {
    if (Number.isNaN(sample.postedAt.getTime())) return false;
    return (
      sample.likes != null ||
      sample.comments != null ||
      sample.shares != null ||
      sample.clicks != null ||
      sample.impressions != null
    );
  });

  if (usable.length === 0) return null;

  const hourBuckets = new Map<number, BucketScore>();
  const dayBuckets = new Map<number, BucketScore>();
  let totalScore = 0;

  for (const sample of usable) {
    const score = scoreSocialEngagement(sample);
    totalScore += score;
    const { hour, dow } = localHourAndDow(sample.postedAt, timeZone);
    const hourBucket = hourBuckets.get(hour) ?? { total: 0, count: 0 };
    hourBuckets.set(hour, { total: hourBucket.total + score, count: hourBucket.count + 1 });
    const dayBucket = dayBuckets.get(dow) ?? { total: 0, count: 0 };
    dayBuckets.set(dow, { total: dayBucket.total + score, count: dayBucket.count + 1 });
  }

  const priorMean = totalScore / usable.length;
  const preferredHours = rankBuckets(hourBuckets, priorMean, priorStrength, topHours);
  const preferredDays = rankBuckets(dayBuckets, priorMean, priorStrength, topDays);
  const sufficient =
    usable.length >= minSamples && (preferredHours.length > 0 || preferredDays.length > 0);

  return {
    preferredHours,
    preferredDays,
    sampleSize: usable.length,
    sufficient,
  };
}

async function loadEngagementSamples(
  projectId: number,
  platform: SocialPlatformId,
  days: number,
): Promise<EngagementPostedSample[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      scheduledAt: contentPiecesTable.scheduledAt,
      updatedAt: contentPiecesTable.updatedAt,
      impressions: socialPostMetricsTable.impressions,
      likes: socialPostMetricsTable.likes,
      comments: socialPostMetricsTable.comments,
      shares: socialPostMetricsTable.shares,
      clicks: socialPostMetricsTable.clicks,
    })
    .from(contentPiecesTable)
    .innerJoin(
      socialPostMetricsTable,
      and(
        eq(socialPostMetricsTable.contentPieceId, contentPiecesTable.id),
        eq(socialPostMetricsTable.platform, platform),
      ),
    )
    .where(
      and(
        eq(contentPiecesTable.websiteProjectId, projectId),
        eq(contentPiecesTable.publishPlatform, platform),
        eq(contentPiecesTable.status, "published"),
        inArray(contentPiecesTable.formatType, SOCIAL_FORMAT_LIST),
        sql`coalesce(${contentPiecesTable.scheduledAt}, ${contentPiecesTable.updatedAt}) >= ${since}`,
      ),
    )
    .orderBy(desc(contentPiecesTable.updatedAt))
    .limit(200);

  return rows.map((row) => ({
    postedAt: row.scheduledAt ?? row.updatedAt,
    impressions: row.impressions,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    clicks: row.clicks,
  }));
}

/**
 * Project-local hour/day engagement bias for `bestTimeMode: analytics`.
 * Returns null when no metric rows exist; `sufficient` is false when samples are too sparse.
 */
export async function getEngagementSlotBias(
  projectId: number,
  platform: SocialPlatformId,
  timeZone: string,
  options?: { days?: number; minSamples?: number },
): Promise<EngagementSlotBias | null> {
  const samples = await loadEngagementSamples(projectId, platform, options?.days ?? 90);
  return buildEngagementSlotBias(samples, timeZone || "UTC", {
    minSamples: options?.minSamples,
  });
}

/** Hour with highest average engagement (project TZ = UTC). Prefer `getEngagementSlotBias`. */
export async function getTopEngagementHour(
  projectId: number,
  platform: SocialPlatformId,
): Promise<number | null> {
  const bias = await getEngagementSlotBias(projectId, platform, "UTC");
  if (!bias?.sufficient || bias.preferredHours.length === 0) return null;
  return bias.preferredHours[0] ?? null;
}
