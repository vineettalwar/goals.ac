import { db } from "./db";
import { countAsInt } from "@workspace/db";
import {
  contentPiecesTable,
  socialPostMetricsTable,
  websiteProjectsTable,
  DEFAULT_SOCIAL_SCHEDULE_SETTINGS,
  SOCIAL_FORMAT_TYPES,
  SOCIAL_PLATFORM_IDS,
  SOCIAL_PLATFORM_TO_FORMAT,
  FORMAT_TO_SOCIAL_PLATFORM,
  type ContentPieceApprovalStatus,
  type SocialFormatType,
  type SocialHistorySyncMeta,
  type SocialPlatformId,
  type SocialScheduleSettings,
} from "@workspace/db/schema-sqlite";
import { and, asc, desc, eq, getTableColumns, inArray, isNotNull, or, sql } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import {
  decryptCmsCredentials,
  type CmsIntegrationCredentials,
} from "@workspace/content-engine/support/publishing/cms-integrations";
import { getAccessibleProject, parsePositiveInt } from "./project-access";

function parseSocialScheduleSettings(raw: unknown): SocialScheduleSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SOCIAL_SCHEDULE_SETTINGS };
  const settings = raw as SocialScheduleSettings;
  return {
    ...DEFAULT_SOCIAL_SCHEDULE_SETTINGS,
    ...settings,
    platforms: {
      ...DEFAULT_SOCIAL_SCHEDULE_SETTINGS.platforms,
      ...(settings.platforms ?? {}),
    },
  };
}

const SOCIAL_FORMAT_LIST = [...SOCIAL_FORMAT_TYPES];

const APPROVAL_STATUSES = new Set<ContentPieceApprovalStatus>([
  "draft",
  "pending_review",
  "approved",
  "rejected",
]);

function isValidSocialPlatform(value: string): value is SocialPlatformId {
  return (SOCIAL_PLATFORM_IDS as readonly string[]).includes(value);
}

function platformForPiece(piece: {
  formatType: string;
  publishPlatform: string | null;
}): SocialPlatformId | null {
  if (piece.publishPlatform && piece.publishPlatform in SOCIAL_PLATFORM_TO_FORMAT) {
    return piece.publishPlatform as SocialPlatformId;
  }
  const format = piece.formatType as SocialFormatType;
  if (format in FORMAT_TO_SOCIAL_PLATFORM) {
    return FORMAT_TO_SOCIAL_PLATFORM[format];
  }
  return null;
}

async function listSocialQueue(params: {
  projectId: number;
  platform?: SocialPlatformId;
  approvalStatus?: ContentPieceApprovalStatus;
  limit?: number;
}) {
  const conditions = [
    eq(contentPiecesTable.websiteProjectId, params.projectId),
    inArray(contentPiecesTable.formatType, SOCIAL_FORMAT_LIST),
    or(
      isNotNull(contentPiecesTable.scheduledAt),
      inArray(contentPiecesTable.approvalStatus, ["pending_review", "approved", "draft"]),
    ),
  ];

  if (params.platform) {
    conditions.push(eq(contentPiecesTable.formatType, SOCIAL_PLATFORM_TO_FORMAT[params.platform]));
  }
  if (params.approvalStatus) {
    conditions.push(eq(contentPiecesTable.approvalStatus, params.approvalStatus));
  }

  return db
    .select(getTableColumns(contentPiecesTable))
    .from(contentPiecesTable)
    .where(and(...conditions))
    .orderBy(
      asc(contentPiecesTable.scheduledAt),
      asc(contentPiecesTable.queuePosition),
      desc(contentPiecesTable.createdAt),
    )
    .limit(params.limit ?? 100);
}

async function getSocialPerformance(
  projectId: number,
  filters?: { platform?: SocialPlatformId; days?: number },
) {
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

  const performanceRows = rows.map((row) => ({
    contentPieceId: row.contentPieceId,
    title: row.title,
    platform: row.platform ?? "unknown",
    publishedUrl: row.publishedUrl,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    impressions: row.impressions,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    clicks: row.clicks,
    syncedAt: row.syncedAt?.toISOString() ?? null,
  }));

  const totals = performanceRows.reduce(
    (acc, row) => ({
      impressions: (acc.impressions ?? 0) + (row.impressions ?? 0),
      likes: (acc.likes ?? 0) + (row.likes ?? 0),
      comments: (acc.comments ?? 0) + (row.comments ?? 0),
      shares: (acc.shares ?? 0) + (row.shares ?? 0),
      clicks: (acc.clicks ?? 0) + (row.clicks ?? 0),
    }),
    { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 },
  );

  return { rows: performanceRows, totals };
}

export async function handleSocialQueueGet(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const match = path.match(/^\/api\/website-projects\/(\d+)\/social\/queue$/);
  if (!match || request.method !== "GET") return null;

  const projectId = Number.parseInt(match[1]!, 10);
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const url = new URL(request.url);
  const platformRaw = url.searchParams.get("platform");
  const approvalRaw = url.searchParams.get("approvalStatus");
  const platform =
    platformRaw && isValidSocialPlatform(platformRaw) ? platformRaw : undefined;
  const approvalStatus =
    approvalRaw && APPROVAL_STATUSES.has(approvalRaw as ContentPieceApprovalStatus)
      ? (approvalRaw as ContentPieceApprovalStatus)
      : undefined;

  const pieces = await listSocialQueue({ projectId, platform, approvalStatus });

  return withCors(
    request,
    Response.json({
      items: pieces.map((piece) => ({
        ...piece,
        platform: platformForPiece(piece),
        scheduledAt: piece.scheduledAt?.toISOString() ?? null,
        approvedAt: piece.approvedAt?.toISOString() ?? null,
      })),
    }),
  );
}

export async function handleSocialMetricsGet(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const match = path.match(/^\/api\/website-projects\/(\d+)\/social\/metrics$/);
  if (!match || request.method !== "GET") return null;

  const projectId = Number.parseInt(match[1]!, 10);
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const url = new URL(request.url);
  const platformParam = url.searchParams.get("platform");
  const platform =
    platformParam && isValidSocialPlatform(platformParam) ? platformParam : undefined;
  const days = parsePositiveInt(url.searchParams.get("days")) ?? 30;

  const performance = await getSocialPerformance(projectId, { platform, days });
  return withCors(request, Response.json(performance));
}

export async function handleSocialScheduleSettingsGet(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const match = path.match(/^\/api\/website-projects\/(\d+)\/social\/schedule-settings$/);
  if (!match || request.method !== "GET") return null;

  const projectId = Number.parseInt(match[1]!, 10);
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const [row] = await db
    .select({ socialScheduleSettings: websiteProjectsTable.socialScheduleSettings })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  return withCors(
    request,
    Response.json({
      settings: parseSocialScheduleSettings(row?.socialScheduleSettings),
    }),
  );
}

export async function handleSocialHistorySyncGet(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const match = path.match(/^\/api\/website-projects\/(\d+)\/social\/history-sync$/);
  if (!match || request.method !== "GET") return null;

  const projectId = Number.parseInt(match[1]!, 10);
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const [row] = await db
    .select({
      socialHistorySyncMeta: websiteProjectsTable.socialHistorySyncMeta,
      cmsIntegrations: websiteProjectsTable.cmsIntegrations,
    })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  const meta = (row?.socialHistorySyncMeta ?? {}) as SocialHistorySyncMeta;
  const creds = row
    ? decryptCmsCredentials((row.cmsIntegrations ?? {}) as CmsIntegrationCredentials)
    : null;

  const platforms: Partial<
    Record<
      SocialPlatformId,
      { connected?: boolean; lastSyncedAt?: string; postCount?: number; error?: string }
    >
  > = {};

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

  return withCors(request, Response.json({ platforms }));
}

export async function handleSocialMetricsSyncGet(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const match = path.match(/^\/api\/website-projects\/(\d+)\/social\/metrics\/sync$/);
  if (!match || request.method !== "GET") return null;

  const projectId = Number.parseInt(match[1]!, 10);
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const [stats] = await db
    .select({
      lastSyncedAt: sql<string | null>`max(${socialPostMetricsTable.syncedAt})`,
      postCount: countAsInt(),
    })
    .from(socialPostMetricsTable)
    .innerJoin(contentPiecesTable, eq(socialPostMetricsTable.contentPieceId, contentPiecesTable.id))
    .where(eq(contentPiecesTable.websiteProjectId, projectId));

  return withCors(
    request,
    Response.json({
      lastSyncedAt: stats?.lastSyncedAt ?? null,
      postCount: stats?.postCount ?? 0,
    }),
  );
}
