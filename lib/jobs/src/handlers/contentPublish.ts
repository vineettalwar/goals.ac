import { eq, and, lte, notInArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable, SOCIAL_FORMAT_TYPES } from "@workspace/db";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { ContentPublishPayload, ScheduledPublishSweepPayload, PgBoss } from "@workspace/jobs";
import { decryptCmsCredentials, type CmsIntegrationCredentials } from "@workspace/content-engine/support/publishing/cms-integrations";
import { parseAutopilotSettings, wordpressPublishStatus } from "@workspace/content-engine/support/autopilot/autopilot-scheduler";
import { publishPieceToSocial, isSocialPlatform } from "@workspace/content-engine/support/social/social-publish";
import { listDueSocialPieces } from "@workspace/content-engine/support/social/social-queue-service";
import { featuredImageFromMetadata } from "@workspace/content-engine/articles/article-image-enricher";
import {
  publishPieceToDestination,
  publishBlogPieceToPrimaryDestination,
  resolvePrimaryEspDestination,
} from "@workspace/content-engine/support/publishing/publish-destination";
import { withPublishRecord } from "@workspace/content-engine/support/publishing/publish-records";
import { logger } from "../logger";
import { seedSocialPostMetrics } from "@workspace/content-engine/social/social-metrics-service";

const FORMAT_TO_PLATFORM: Record<string, string> = {
  linkedin_post: "linkedin",
  twitter_thread: "twitter",
  instagram_post: "instagram",
  facebook_post: "facebook",
  bluesky_post: "bluesky",
  mastodon_post: "mastodon",
  email_sequence: "beehiiv",
};

function featuredImageFromPiece(piece: {
  bodyMarkdown: string;
  pieceMetadata?: { featuredImageUrl?: string; images?: import("@workspace/db").ContentPieceImageRef[] } | null;
}): string | undefined {
  return featuredImageFromMetadata({
    bodyMarkdown: piece.bodyMarkdown,
    pieceMetadata: piece.pieceMetadata,
  });
}

async function publishPiece(pieceId: number, userId: number): Promise<void> {
  const [piece] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, pieceId))
    .limit(1);
  if (!piece) throw new Error("Content piece not found");
  if (piece.status === "published") return;

  const [project] = await db
    .select({
      cmsIntegrations: websiteProjectsTable.cmsIntegrations,
      autopilotSettings: websiteProjectsTable.autopilotSettings,
    })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const autopilot = parseAutopilotSettings(project.autopilotSettings);
  const wpStatus = wordpressPublishStatus(autopilot);
  const creds = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
  const platform = piece.publishPlatform ?? FORMAT_TO_PLATFORM[piece.formatType];
  const publishable = {
    id: piece.id,
    title: piece.title,
    bodyMarkdown: piece.bodyMarkdown,
    targetKeyword: piece.targetKeyword,
    formatType: piece.formatType,
    pieceMetadata: piece.pieceMetadata,
  };
  const imageUrl = featuredImageFromPiece(piece);

  let publishedUrl: string | null = null;
  let publishPlatform = platform ?? piece.publishPlatform;
  let remotePostId: string | undefined;

  const runPublish = async (): Promise<{
    publishedUrl: string;
    publishPlatform: string;
    remotePostId?: string;
  }> => {
    if (platform && isSocialPlatform(platform)) {
      const result = await publishPieceToSocial(
        platform,
        {
          id: piece.id,
          title: piece.title,
          bodyMarkdown: piece.bodyMarkdown,
          websiteProjectId: piece.websiteProjectId,
          featuredImageUrl: imageUrl,
          pieceMetadata: piece.pieceMetadata,
        },
        userId,
        creds,
      );
      return {
        publishedUrl: result.publishedUrl,
        publishPlatform: result.publishPlatform,
        remotePostId: result.remotePostId,
      };
    }
    if (piece.formatType === "email_sequence") {
      const espPlatform = resolvePrimaryEspDestination(creds, platform);
      if (!espPlatform) {
        throw new Error("No email platform connected for email_sequence format.");
      }
      const result = await publishPieceToDestination(espPlatform, publishable, creds);
      return { publishedUrl: result.publishedUrl, publishPlatform: result.publishPlatform };
    }
    if (platform) {
      const result = await publishPieceToDestination(platform, publishable, creds, {
        status: wpStatus,
        featuredImageUrl: featuredImageFromPiece(piece),
      });
      return { publishedUrl: result.publishedUrl, publishPlatform: result.publishPlatform };
    }
    const result = await publishBlogPieceToPrimaryDestination(publishable, creds, {
      status: wpStatus,
      featuredImageUrl: featuredImageFromPiece(piece),
    });
    return { publishedUrl: result.publishedUrl, publishPlatform: result.publishPlatform };
  };

  const recordProvider = platform ?? piece.publishPlatform ?? "auto";
  const publishOutcome = await withPublishRecord(
    {
      contentPieceId: pieceId,
      websiteProjectId: piece.websiteProjectId,
      provider: recordProvider,
    },
    async () => {
      const result = await runPublish();
      return {
        publishedUrl: result.publishedUrl,
        publishPlatform: result.publishPlatform,
        remotePostId: result.remotePostId,
      };
    },
  );

  publishedUrl = publishOutcome.publishedUrl;
  publishPlatform = publishOutcome.publishPlatform;
  remotePostId = publishOutcome.remotePostId;

  await db
    .update(contentPiecesTable)
    .set({ status: "published", publishedUrl, publishPlatform, publishError: null })
    .where(eq(contentPiecesTable.id, pieceId));

  if (remotePostId && publishPlatform && isSocialPlatform(publishPlatform)) {
    await seedSocialPostMetrics({
      contentPieceId: pieceId,
      platform: publishPlatform,
      remotePostId,
    });
  }

  const { ingestPublishedContentPiece } = await import(
    "@workspace/content-engine/support/brand/brand-voice-generation"
  );
  await ingestPublishedContentPiece(
    piece.websiteProjectId,
    pieceId,
    piece.title,
    piece.bodyMarkdown ?? "",
    publishedUrl,
  ).catch((err: unknown) => {
    logger.warn({ err, contentPieceId: pieceId }, "Brand voice ingest after publish failed");
  });
}

export async function registerContentPublishHandler(boss: PgBoss): Promise<void> {
  await boss.work<ContentPublishPayload>(QUEUES.contentPublish, async ([job]) => {
    const { contentPieceId, userId } = job.data;
    try {
      await publishPiece(contentPieceId, userId);
      logger.info({ contentPieceId }, "Content publish job completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Publish failed";
      await db
        .update(contentPiecesTable)
        .set({ publishError: message, status: "ready" })
        .where(eq(contentPiecesTable.id, contentPieceId));
      logger.error({ err, contentPieceId }, "Content publish job failed");
      throw err;
    }
  });
}

export async function registerScheduledPublishSweepHandler(boss: PgBoss): Promise<void> {
  await boss.work<ScheduledPublishSweepPayload>(QUEUES.scheduledPublishSweep, async () => {
    const today = new Date().toISOString().slice(0, 10);
    const socialDue = await listDueSocialPieces(new Date());

    const blogDue = await db
      .select({
        id: contentPiecesTable.id,
        websiteProjectId: contentPiecesTable.websiteProjectId,
      })
      .from(contentPiecesTable)
      .innerJoin(websiteProjectsTable, eq(contentPiecesTable.websiteProjectId, websiteProjectsTable.id))
      .where(
        and(
          lte(contentPiecesTable.plannedDate, today),
          eq(contentPiecesTable.status, "ready"),
          notInArray(contentPiecesTable.formatType, [...SOCIAL_FORMAT_TYPES]),
        ),
      );

    const duePieces = [
      ...socialDue.map((p: { id: number; websiteProjectId: number; userId: number }) => ({
        id: p.id,
        websiteProjectId: p.websiteProjectId,
        userId: p.userId,
      })),
      ...(
        await Promise.all(
          blogDue.map(async (piece) => {
            const [project] = await db
              .select({ userId: websiteProjectsTable.userId })
              .from(websiteProjectsTable)
              .where(eq(websiteProjectsTable.id, piece.websiteProjectId))
              .limit(1);
            return project ? { id: piece.id, websiteProjectId: piece.websiteProjectId, userId: project.userId } : null;
          }),
        )
      ).filter((p): p is { id: number; websiteProjectId: number; userId: number } => p !== null),
    ];

    logger.info({ count: duePieces.length, social: socialDue.length, blog: blogDue.length }, "Scheduled publish sweep");

    for (const piece of duePieces) {
      await enqueue(QUEUES.contentPublish, { contentPieceId: piece.id, userId: piece.userId });
    }
  });
}

export { publishPiece };
