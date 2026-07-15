import { db } from "@workspace/db";
import {
  contentPiecesTable,
  socialPostMetricsTable,
  SOCIAL_FORMAT_TYPES,
  SOCIAL_PLATFORM_IDS,
  SOCIAL_PLATFORM_TO_FORMAT,
  FORMAT_TO_SOCIAL_PLATFORM,
  type ContentPieceApprovalStatus,
  type SocialFormatType,
  type SocialPlatformId,
} from "@workspace/db/schema-sqlite";
import { and, asc, desc, eq, getTableColumns, inArray, isNotNull, or } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import { getAccessibleProject, parsePositiveInt } from "./project-access";

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
