import { db, jsonTextEquals } from "@workspace/db";
import {
  contentPiecesTable,
  websiteProjectsTable,
  type ContentFormatType,
  type ContentPiece,
  type ContentPieceApprovalStatus,
  type SocialScheduleSettings,
  DEFAULT_SOCIAL_SCHEDULE_SETTINGS,
  FORMAT_TO_SOCIAL_PLATFORM,
  SOCIAL_FORMAT_TYPES,
  type SocialFormatType,
  type SocialPlatformId,
  SOCIAL_PLATFORM_TO_FORMAT,
} from "@workspace/db/schema";
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { repurposeContentPiece } from "../../content/content-studio-generator";
import type { UnifiedBrandContext } from "../../brand/brand-voice";
import type { AiProviderOptions } from "@workspace/ai-providers";
import { getTopEngagementHour } from "../../social/social-metrics-service";
import { featuredImageFromMetadata } from "../../articles/article-image-enricher";
import type { ContentPieceMetadata } from "@workspace/db";

function localPartsInTimezone(date: Date, timeZone: string): { year: number; month: number; day: number; hour: number; minute: number; dow: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekday = get("weekday");
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    dow: dowMap[weekday] ?? 0,
  };
}

function zonedDateTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const parts = localPartsInTimezone(guess, timeZone);
  const displayed = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  return new Date(guess.getTime() + (wanted - displayed));
}

const SOCIAL_FORMAT_LIST = [...SOCIAL_FORMAT_TYPES] as ContentFormatType[];

export function parseSocialScheduleSettings(
  raw: unknown,
): SocialScheduleSettings {
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

export function platformForPiece(piece: Pick<ContentPiece, "formatType" | "publishPlatform">): SocialPlatformId | null {
  if (piece.publishPlatform && piece.publishPlatform in SOCIAL_PLATFORM_TO_FORMAT) {
    return piece.publishPlatform as SocialPlatformId;
  }
  const format = piece.formatType as SocialFormatType;
  if (format in FORMAT_TO_SOCIAL_PLATFORM) {
    return FORMAT_TO_SOCIAL_PLATFORM[format];
  }
  return null;
}

export async function listSocialQueue(params: {
  projectId: number;
  platform?: SocialPlatformId;
  approvalStatus?: ContentPieceApprovalStatus;
  limit?: number;
}): Promise<ContentPiece[]> {
  const conditions = [
    eq(contentPiecesTable.websiteProjectId, params.projectId),
    inArray(contentPiecesTable.formatType, SOCIAL_FORMAT_LIST),
    or(
      isNotNull(contentPiecesTable.scheduledAt),
      inArray(contentPiecesTable.approvalStatus, ["pending_review", "approved", "draft"]),
    ),
  ];

  if (params.platform) {
    const format = SOCIAL_PLATFORM_TO_FORMAT[params.platform];
    conditions.push(eq(contentPiecesTable.formatType, format));
  }
  if (params.approvalStatus) {
    conditions.push(eq(contentPiecesTable.approvalStatus, params.approvalStatus));
  }

  return db
    .select()
    .from(contentPiecesTable)
    .where(and(...conditions))
    .orderBy(
      asc(contentPiecesTable.scheduledAt),
      asc(contentPiecesTable.queuePosition),
      desc(contentPiecesTable.createdAt),
    )
    .limit(params.limit ?? 100);
}

export async function scheduleSocialPiece(params: {
  pieceId: number;
  scheduledAt: Date;
  queuePosition?: number | null;
}): Promise<ContentPiece | null> {
  const [updated] = await db
    .update(contentPiecesTable)
    .set({
      scheduledAt: params.scheduledAt,
      queuePosition: params.queuePosition ?? null,
      status: "ready",
    })
    .where(eq(contentPiecesTable.id, params.pieceId))
    .returning();
  return updated ?? null;
}

export async function submitPieceForReview(pieceId: number): Promise<ContentPiece | null> {
  const [updated] = await db
    .update(contentPiecesTable)
    .set({ approvalStatus: "pending_review", status: "ready" })
    .where(eq(contentPiecesTable.id, pieceId))
    .returning();
  return updated ?? null;
}

export async function approvePiece(pieceId: number, userId: number): Promise<ContentPiece | null> {
  const [updated] = await db
    .update(contentPiecesTable)
    .set({
      approvalStatus: "approved",
      approvedByUserId: userId,
      approvedAt: new Date(),
      status: "ready",
    })
    .where(eq(contentPiecesTable.id, pieceId))
    .returning();
  return updated ?? null;
}

export async function rejectPiece(pieceId: number): Promise<ContentPiece | null> {
  const [updated] = await db
    .update(contentPiecesTable)
    .set({ approvalStatus: "rejected", status: "draft" })
    .where(eq(contentPiecesTable.id, pieceId))
    .returning();
  return updated ?? null;
}

function nextSlotFromSettings(
  settings: SocialScheduleSettings,
  platform: SocialPlatformId,
  after: Date,
  projectId?: number,
): Date | null {
  const config = settings.platforms[platform];
  if (!config?.enabled) return null;

  const timeZone = settings.timezone || "UTC";
  const afterLocal = localPartsInTimezone(after, timeZone);

  for (let dayOffset = 0; dayOffset < 21; dayOffset++) {
    const candidateDay = new Date(Date.UTC(afterLocal.year, afterLocal.month - 1, afterLocal.day + dayOffset));
    const local = localPartsInTimezone(candidateDay, timeZone);
    if (!config.preferredDays.includes(local.dow)) continue;

    const times = config.preferredTimes;

    for (const time of times) {
      const [hh, mm] = time.split(":").map(Number);
      const slot = zonedDateTimeToUtc(timeZone, local.year, local.month, local.day, hh ?? 9, mm ?? 0);
      if (slot > after) return slot;
    }
  }
  return null;
}

export async function suggestNextSlot(
  projectId: number,
  platform: SocialPlatformId,
): Promise<Date | null> {
  const [project] = await db
    .select({ socialScheduleSettings: websiteProjectsTable.socialScheduleSettings })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);
  if (!project) return null;

  const settings = parseSocialScheduleSettings(project.socialScheduleSettings);
  const format = SOCIAL_PLATFORM_TO_FORMAT[platform];

  const [latest] = await db
    .select({ scheduledAt: contentPiecesTable.scheduledAt })
    .from(contentPiecesTable)
    .where(
      and(
        eq(contentPiecesTable.websiteProjectId, projectId),
        eq(contentPiecesTable.formatType, format),
        isNotNull(contentPiecesTable.scheduledAt),
      ),
    )
    .orderBy(desc(contentPiecesTable.scheduledAt))
    .limit(1);

  const after = latest?.scheduledAt ? new Date(latest.scheduledAt) : new Date();
  const config = settings.platforms[platform];
  if (config?.minHoursBetweenPosts) {
    after.setHours(after.getHours() + config.minHoursBetweenPosts);
  }

  if (settings.bestTimeMode === "analytics") {
    const topHour = await getTopEngagementHour(projectId, platform);
    if (topHour != null && config) {
      const patched = {
        ...settings,
        platforms: {
          ...settings.platforms,
          [platform]: {
            ...config,
            preferredTimes: [`${String(topHour).padStart(2, "0")}:00`],
          },
        },
      };
      return nextSlotFromSettings(patched, platform, after, projectId);
    }
  }

  return nextSlotFromSettings(settings, platform, after, projectId);
}

export async function createMultiPlatformBundle(params: {
  projectId: number;
  parentPieceId: number;
  platforms: SocialPlatformId[];
  brand: UnifiedBrandContext;
  userApiKey?: string | null;
  aiProviderOptions?: AiProviderOptions;
}): Promise<ContentPiece[]> {
  const [parent] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, params.parentPieceId))
    .limit(1);
  if (!parent) throw new Error("Source content piece not found");

  const created: ContentPiece[] = [];
  for (const platform of params.platforms) {
    const format = SOCIAL_PLATFORM_TO_FORMAT[platform];
    const generated = await repurposeContentPiece(
      format,
      params.brand,
      parent.bodyMarkdown,
      parent.targetKeyword || parent.title,
      params.userApiKey,
      params.aiProviderOptions,
    );

    const slot = await suggestNextSlot(params.projectId, platform);
    // Instagram needs a public image URL; inherit parent featured/stock when repurpose
    // did not attach one (image enricher sets metadata on longform / LinkedIn generates).
    let pieceMetadata: ContentPieceMetadata | null = generated.pieceMetadata ?? null;
    if (platform === "instagram") {
      const parentMeta = (parent.pieceMetadata ?? {}) as ContentPieceMetadata;
      const parentFeatured =
        parentMeta.featuredImageUrl ??
        featuredImageFromMetadata({
          bodyMarkdown: parent.bodyMarkdown,
          pieceMetadata: parentMeta,
        });
      const hasOwnImage =
        Boolean(pieceMetadata?.featuredImageUrl) ||
        Boolean(pieceMetadata?.images?.length) ||
        Boolean(
          featuredImageFromMetadata({
            bodyMarkdown: generated.body_markdown,
            pieceMetadata: pieceMetadata,
          }),
        );
      if (!hasOwnImage && (parentFeatured || parentMeta.images?.length || parentMeta.ogImageUrl)) {
        pieceMetadata = {
          ...pieceMetadata,
          featuredImageUrl: pieceMetadata?.featuredImageUrl ?? parentFeatured ?? parentMeta.featuredImageUrl,
          ogImageUrl: pieceMetadata?.ogImageUrl ?? parentMeta.ogImageUrl,
          images: pieceMetadata?.images?.length ? pieceMetadata.images : parentMeta.images,
        };
      }
    }
    const canAutoSchedule =
      platform !== "instagram" ||
      Boolean(
        featuredImageFromMetadata({
          bodyMarkdown: generated.body_markdown,
          pieceMetadata,
        }) ||
          pieceMetadata?.featuredImageUrl ||
          pieceMetadata?.images?.some((img) => img.publishedUrl || img.remoteUrl) ||
          pieceMetadata?.ogImageUrl,
      );
    const [piece] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: params.projectId,
        parentPieceId: parent.id,
        formatType: format,
        title: generated.title,
        targetKeyword: generated.target_keyword || parent.targetKeyword,
        bodyMarkdown: generated.body_markdown,
        wordCount: generated.body_markdown.split(/\s+/).filter(Boolean).length,
        status: "draft",
        approvalStatus: "draft",
        publishPlatform: platform,
        scheduledAt: canAutoSchedule ? slot : null,
        pieceMetadata,
      })
      .returning();
    if (piece) created.push(piece);
  }
  return created;
}

export async function listDueSocialPieces(now = new Date()): Promise<
  { id: number; websiteProjectId: number; userId: number }[]
> {
  const rows = await db
    .select({
      id: contentPiecesTable.id,
      websiteProjectId: contentPiecesTable.websiteProjectId,
      userId: websiteProjectsTable.userId,
      approvalStatus: contentPiecesTable.approvalStatus,
      socialScheduleSettings: websiteProjectsTable.socialScheduleSettings,
      formatType: contentPiecesTable.formatType,
    })
    .from(contentPiecesTable)
    .innerJoin(
      websiteProjectsTable,
      eq(contentPiecesTable.websiteProjectId, websiteProjectsTable.id),
    )
    .where(
      and(
        inArray(contentPiecesTable.formatType, SOCIAL_FORMAT_LIST),
        eq(contentPiecesTable.status, "ready"),
        isNotNull(contentPiecesTable.scheduledAt),
        lte(contentPiecesTable.scheduledAt, now),
        or(
          eq(contentPiecesTable.approvalStatus, "approved"),
          eq(contentPiecesTable.approvalStatus, "draft"),
        ),
      ),
    );

  return rows
    .filter((row) => {
      const settings = parseSocialScheduleSettings(row.socialScheduleSettings);
      const platform = FORMAT_TO_SOCIAL_PLATFORM[row.formatType as SocialFormatType];
      const config = settings.platforms[platform];
      if (!config?.requireApproval) return true;
      return row.approvalStatus === "approved";
    })
    .map((row) => ({
      id: row.id,
      websiteProjectId: row.websiteProjectId,
      userId: row.userId,
    }));
}

export async function listEvergreenCandidates(now = new Date()): Promise<ContentPiece[]> {
  return db
    .select()
    .from(contentPiecesTable)
    .where(
      and(
        eq(contentPiecesTable.status, "published"),
        inArray(contentPiecesTable.formatType, SOCIAL_FORMAT_LIST),
        jsonTextEquals(contentPiecesTable.evergreenConfig, "enabled", "true"),
      ),
    )
    .limit(50);
}

export function isEvergreenDue(piece: ContentPiece, now = new Date()): boolean {
  const config = piece.evergreenConfig;
  if (!config?.enabled) return false;
  if (config.maxRecycles != null && (config.recycleCount ?? 0) >= config.maxRecycles) {
    return false;
  }
  const base = piece.approvedAt ?? piece.updatedAt ?? piece.createdAt;
  if (!base) return false;
  const due = new Date(base);
  due.setDate(due.getDate() + (config.recycleIntervalDays || 90));
  return due <= now;
}
